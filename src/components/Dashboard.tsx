import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { logout, db, getAccessToken, setAccessToken, loginWithGoogle } from "../firebase";
import { Task, PlanBlock, Message, AnalysisResponse } from "../types";
import { getSeedTasks } from "../seedData";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";

import {
  Plus,
  LogOut,
  Calendar,
  Layers,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info,
  Flame,
  CheckSquare,
  Square,
  CalendarCheck2,
  Trash2,
} from "lucide-react";

import Analytics from "./Analytics";
import WarningCards from "./WarningCards";
import FocusPlan from "./FocusPlan";
import AIChat from "./AIChat";
import TaskForm from "./TaskForm";

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [useLocalStorageFallback, setUseLocalStorageFallback] = useState(false);

  // Gemini state
  const [analysis, setAnalysis] = useState<AnalysisResponse>({
    priorities: [],
    recommendation: null,
    warnings: [],
    insights: [],
  });
  const [planBlocks, setPlanBlocks] = useState<PlanBlock[]>([]);
  const [focusSummary, setFocusSummary] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  
  // Loading states
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  
  // Local time state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Google Calendar Integration states
  const [calendarSynced, setCalendarSynced] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);

  // Custom confirmation & notification overlay states
  const [deleteConfirmationTaskId, setDeleteConfirmationTaskId] = useState<string | null>(null);
  const [syncConfirmationTask, setSyncConfirmationTask] = useState<Task | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Auto-clear Toast Notification after 5 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const fetchGoogleCalendarEvents = async (token: string) => {
    setLoadingCalendar(true);
    setCalendarError(null);
    try {
      const nowISO = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowISO}&maxResults=10&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }
      const data = await res.json();
      setGoogleEvents(data.items || []);
    } catch (err: any) {
      console.error("Fetch Google Calendar error:", err);
      setCalendarError("Could not retrieve calendar events. Please try reconnecting.");
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for cached Google OAuth access token on load
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      setCalendarSynced(true);
      fetchGoogleCalendarEvents(token);
    }
  }, []);

  // Listen to Firestore tasks query filtered by current user
  useEffect(() => {
    if (!user) return;

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const taskList: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          taskList.push({
            id: doc.id,
            ...data,
          } as Task);
        });
        // Sort tasks by deadline
        taskList.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setTasks(taskList);
        setLoadingTasks(false);
        setUseLocalStorageFallback(false);
      }, (error) => {
        console.warn("Firestore access restricted, falling back to secure Local Storage mode:", error);
        setUseLocalStorageFallback(true);
        const stored = localStorage.getItem(`tasks_${user.uid}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Task[];
            setTasks(parsed);
          } catch (e) {
            setTasks([]);
          }
        } else {
          setTasks([]);
        }
        setLoadingTasks(false);
      });
    } catch (error) {
      console.warn("Firestore setup exception, using Local Storage mode:", error);
      setUseLocalStorageFallback(true);
      const stored = localStorage.getItem(`tasks_${user.uid}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Task[];
          setTasks(parsed);
        } catch (e) {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
      setLoadingTasks(false);
    }

    return () => unsubscribe();
  }, [user]);

  // Proactive analysis trigger: run Gemini analysis whenever tasks list changes
  useEffect(() => {
    if (tasks.length === 0) {
      setAnalysis({
        priorities: [],
        recommendation: null,
        warnings: [],
        insights: [],
      });
      return;
    }

    const triggerProactiveAnalysis = async () => {
      setAnalyzing(true);
      try {
        const response = await fetch("/api/gemini/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: tasks.filter(t => !t.completed),
            currentTime: new Date().toISOString()
          }),
        });
        const data = await response.json();
        if (data && !data.error) {
          setAnalysis(data);
        }
      } catch (err) {
        console.error("Proactive prioritization analysis failed:", err);
      } finally {
        setAnalyzing(false);
      }
    };

    const timeoutId = setTimeout(() => {
      triggerProactiveAnalysis();
    }, 1000); // debounce rapid changes

    return () => clearTimeout(timeoutId);
  }, [tasks]);

  // Seed tasks demo helper
  const handleSeedDemoData = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const seeds = getSeedTasks(user.uid);
      if (useLocalStorageFallback) {
        const updated = [...tasks, ...seeds.map(s => ({
          id: Math.random().toString(36).substring(2, 9),
          ...s
        }))].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setTasks(updated);
        localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      } else {
        const batch = writeBatch(db);
        seeds.forEach((seed) => {
          const newDocRef = doc(collection(db, "tasks"));
          batch.set(newDocRef, seed);
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Seeding demo data failed, using local storage fallback:", err);
      const seeds = getSeedTasks(user.uid);
      const updated = [...tasks, ...seeds.map(s => ({
        id: Math.random().toString(36).substring(2, 9),
        ...s
      }))].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      setTasks(updated);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      setUseLocalStorageFallback(true);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Add a task
  const handleAddTask = async (taskData: Omit<Task, "id" | "userId" | "completed" | "createdAt">) => {
    try {
      if (useLocalStorageFallback) {
        const newTask: Task = {
          id: Math.random().toString(36).substring(2, 9),
          ...taskData,
          userId: user.uid,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        const updated = [...tasks, newTask].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setTasks(updated);
        localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
        setShowTaskForm(false);
      } else {
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          userId: user.uid,
          completed: false,
          createdAt: new Date().toISOString(),
        });
        setShowTaskForm(false);
      }
    } catch (err) {
      console.error("Failed to add task to Firestore, writing to local storage:", err);
      const newTask: Task = {
        id: Math.random().toString(36).substring(2, 9),
        ...taskData,
        userId: user.uid,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [...tasks, newTask].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      setTasks(updated);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      setShowTaskForm(false);
      setUseLocalStorageFallback(true);
    }
  };

  // Complete a task
  const handleCompleteTask = async (taskId: string) => {
    try {
      if (useLocalStorageFallback) {
        const updated = tasks.map(t => {
          if (t.id === taskId) {
            const newCompletedState = !t.completed;
            return {
              ...t,
              completed: newCompletedState,
              completedAt: newCompletedState ? new Date().toISOString() : undefined,
            };
          }
          return t;
        });
        setTasks(updated);
        localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      } else {
        const taskRef = doc(db, "tasks", taskId);
        const foundTask = tasks.find(t => t.id === taskId);
        const newCompletedState = foundTask ? !foundTask.completed : true;

        await updateDoc(taskRef, {
          completed: newCompletedState,
          completedAt: newCompletedState ? new Date().toISOString() : null,
        });
      }
    } catch (err) {
      console.error("Failed to complete task on Firestore, updating local storage:", err);
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          const newCompletedState = !t.completed;
          return {
            ...t,
            completed: newCompletedState,
            completedAt: newCompletedState ? new Date().toISOString() : undefined,
          };
        }
        return t;
      });
      setTasks(updated);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      setUseLocalStorageFallback(true);
    }
  };

  // Delete task click triggering
  const handleDeleteTask = (taskId: string) => {
    setDeleteConfirmationTaskId(taskId);
  };

  // Actual execution after custom modal confirmation
  const confirmDeleteTask = async () => {
    if (!deleteConfirmationTaskId) return;
    const taskId = deleteConfirmationTaskId;
    setDeleteConfirmationTaskId(null);
    try {
      if (useLocalStorageFallback) {
        const updated = tasks.filter(t => t.id !== taskId);
        setTasks(updated);
        localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      } else {
        await deleteDoc(doc(db, "tasks", taskId));
      }
      setToastNotification({ message: "Task deleted successfully.", type: "success" });
    } catch (err) {
      console.error("Failed to delete task on Firestore, deleting locally:", err);
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      setUseLocalStorageFallback(true);
      setToastNotification({ message: "Task removed from local offline storage.", type: "success" });
    }
  };

  // Generate Daily structured Focus blocks
  const handleGenerateDailyPlan = async () => {
    setLoadingPlan(true);
    try {
      const activeTasks = tasks.filter(t => !t.completed);
      const response = await fetch("/api/gemini/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks,
          currentTime: new Date().toISOString()
        }),
      });
      const data = await response.json();
      if (data && !data.error) {
        setPlanBlocks(data.planBlocks || []);
        setFocusSummary(data.focusSummary || "");
      }
    } catch (err) {
      console.error("Failed to generate daily action plan:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Chat agent communication handler
  const handleSendChatMessage = async (text: string) => {
    const userMessage: Message = {
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const activeTasks = tasks.filter(t => !t.completed);
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chatHistory: chatHistory.slice(-10), // pass recent history
          tasks: activeTasks,
          currentTime: new Date().toISOString()
        }),
      });

      const data = await response.json();
      if (data && !data.error) {
        const aiMessage: Message = {
          sender: "ai",
          text: data.response,
          timestamp: new Date().toISOString(),
          suggestedActions: data.suggestedActions,
        };
        setChatHistory((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || "Failed chat reply");
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced a brief sync blockage. Please check your network and retry requesting prioritization advice.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Google Calendar Connector
  const handleToggleCalendarSync = async () => {
    if (calendarSynced) {
      // Disconnect
      setCalendarSynced(false);
      setGoogleEvents([]);
      setAccessToken(null);
      setToastNotification({ message: "Google Calendar disconnected.", type: "info" });
    } else {
      // Connect
      setLoadingCalendar(true);
      setCalendarError(null);
      try {
        let token = getAccessToken();
        if (!token) {
          // Trigger Google sign-in to request/refresh the access token
          await loginWithGoogle();
          token = getAccessToken();
        }
        
        if (token) {
          setCalendarSynced(true);
          await fetchGoogleCalendarEvents(token);
          setToastNotification({ message: "Google Calendar connected successfully!", type: "success" });
        } else {
          setCalendarError("Authentication failed. No access token received from Google.");
        }
      } catch (err: any) {
        console.error("Connect Google Calendar Error:", err);
        const errorMsg = err?.message || "";
        if (errorMsg.includes("popup-blocked")) {
          setCalendarError("Pop-up Blocked! Please click 'Open in new tab' at the top-right of the preview pane to sign in seamlessly.");
        } else if (errorMsg.includes("cancelled-popup-request")) {
          setCalendarError("Request cancelled or timed out. Please try again or open this app in a new tab.");
        } else {
          setCalendarError("Failed to connect. Check popup permissions or open this app in a new tab.");
        }
      } finally {
        setLoadingCalendar(false);
      }
    }
  };

  const handleSyncTaskToGoogleCalendar = (task: Task) => {
    setSyncConfirmationTask(task);
  };

  const executeSyncTaskToGoogleCalendar = async () => {
    if (!syncConfirmationTask) return;
    const task = syncConfirmationTask;
    setSyncConfirmationTask(null);

    const token = getAccessToken();
    if (!token) {
      setToastNotification({
        message: "Google Calendar connection expired. Please reconnect.",
        type: "error"
      });
      setCalendarSynced(false);
      return;
    }

    setSyncingTaskId(task.id);
    try {
      // Calculate end time (estimated hours, defaulting to 1 hour if not set)
      const startTime = new Date(task.deadline);
      const estimatedHours = task.estimatedHours || 1;
      const endTime = new Date(startTime.getTime() + estimatedHours * 60 * 60 * 1000);

      const event = {
        summary: `🚨 DEADLINE: ${task.title}`,
        description: `Task logged in Last-Minute Life Saver.
Category: ${task.category}
Priority: ${task.priority}
Estimated Hours required: ${task.estimatedHours}h`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 3 * 60 },  // 3 hours before
          ],
        },
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        throw new Error(`Google Calendar API error: ${res.statusText}`);
      }

      setToastNotification({
        message: `Successfully synced "${task.title}" to your Google Calendar!`,
        type: "success"
      });
      await fetchGoogleCalendarEvents(token);
    } catch (err: any) {
      console.error("Failed to sync task to calendar:", err);
      setToastNotification({
        message: "Failed to sync event. Ensure calendar permissions are granted.",
        type: "error"
      });
    } finally {
      setSyncingTaskId(null);
    }
  };

  // Derived metrics
  const activeTasks = tasks.filter((t) => !t.completed);
  const overdueRiskCount = analysis.priorities.filter(
    (p) => p.riskStatus === "overdue" || p.riskStatus === "high_risk"
  ).length;

  const filteredTasks = tasks.filter((t) => {
    if (categoryFilter === "All") return true;
    if (categoryFilter === "Active") return !t.completed;
    if (categoryFilter === "Completed") return t.completed;
    return t.category === categoryFilter;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none pb-12">
      {/* Navigation Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-xl font-bold animate-pulse">
            <Flame size={18} />
          </div>
          <div>
            <h1 className="text-md font-extrabold text-white tracking-tight">Last-Minute Life Saver</h1>
            <p className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase">Preventing Missed Milestones</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Sync status / clock */}
          <div className="hidden md:flex items-center gap-2 bg-neutral-950 border border-neutral-850 px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 font-mono">
            <span className="text-emerald-500">⏰</span>
            <span>{currentTime}</span>
          </div>

          {/* User profile and logout */}
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User Avatar"}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-xl border border-neutral-700 shadow"
              />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">
                {user.displayName?.[0] || "U"}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white leading-none">{user.displayName || "Rescue Hero"}</p>
              <p className="text-[10px] text-neutral-500 leading-none mt-1 font-mono">{user.email}</p>
            </div>

            <button
              onClick={() => logout()}
              className="text-neutral-400 hover:text-red-400 transition p-2 rounded-xl hover:bg-neutral-850"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-6 space-y-6">
        
        {useLocalStorageFallback && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <Flame size={20} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-white">Instant Sandbox Mode Enabled</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">Firestore cloud database is currently offline or restricted. Your tasks are securely saved locally in your browser's sandbox!</p>
              </div>
            </div>
            <button 
              onClick={handleSeedDemoData}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5"
            >
              🚀 Seed Sandbox Demo Data
            </button>
          </div>
        )}

        {/* Sync Banner & Google Calendar Connection option */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <CalendarCheck2 size={20} />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Google Calendar Synchronizer</h4>
              <p className="text-[11px] text-neutral-400">Sync assignments, meeting deadlines, and invoices into your workspace.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {calendarSynced ? (
              <span className="text-[11px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                ✓ Google Calendar Connected
              </span>
            ) : (
              <span className="text-[11px] font-bold font-mono text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-850">
                Not Connected
              </span>
            )}
            <button
              onClick={handleToggleCalendarSync}
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition ${
                calendarSynced
                  ? "bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-300"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-950/20"
              }`}
            >
              {calendarSynced ? "Disconnect" : "Connect Google Calendar"}
            </button>
          </div>
        </div>

        {/* Live Google Calendar Event List */}
        {calendarSynced && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md animate-fade-in">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <CalendarCheck2 size={14} className="text-indigo-400" />
              Live Google Calendar Upcoming Schedule
            </h3>
            {loadingCalendar ? (
              <div className="flex items-center gap-2 py-4 text-xs text-neutral-400 font-mono">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Retrieving real-time schedule...</span>
              </div>
            ) : calendarError ? (
              <div className="text-xs text-red-400 font-mono py-2">{calendarError}</div>
            ) : googleEvents.length === 0 ? (
              <div className="text-xs text-neutral-500 font-mono py-2">
                No upcoming events found on your primary calendar. Sync a savior task or schedule events in Google Calendar to display them here!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {googleEvents.map((event: any) => {
                  const startStr = event.start?.dateTime || event.start?.date;
                  const dateFormatted = startStr ? new Date(startStr).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "All Day";

                  return (
                    <div key={event.id} className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl flex items-start gap-2.5 hover:border-neutral-750 transition">
                      <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                        <CalendarCheck2 size={12} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-neutral-200 truncate">{event.summary || "Untitled Event"}</h4>
                        <p className="text-[10px] font-mono text-neutral-400 mt-1">{dateFormatted}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics row */}
        <Analytics tasks={tasks} highRiskCount={overdueRiskCount} />

        {/* Dynamic warning cards */}
        <WarningCards warnings={analysis.warnings} onFocusTask={(id) => console.log("Focus task:", id)} />

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Task boards / lists (Size: 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header controls for tasks */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-md font-bold text-white flex items-center gap-1.5">
                    <Layers size={18} className="text-emerald-500" />
                    Deadline Prevention Board
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-mono">Keep track of crucial deliverables</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow shadow-emerald-950/25"
                  >
                    <Plus size={14} />
                    Log Savior Task
                  </button>
                </div>
              </div>

              {/* Task filters */}
              <div className="flex flex-wrap gap-1 bg-neutral-950 border border-neutral-850 p-1.5 rounded-xl mb-4 text-xs font-mono">
                {["All", "Active", "Completed", "Assignment", "Bill", "Meeting", "Interview"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCategoryFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg transition font-bold text-[11px] ${
                      categoryFilter === filter
                        ? "bg-neutral-900 border border-neutral-800 text-white"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Seeding offer if no tasks */}
              {!loadingTasks && tasks.length === 0 && (
                <div className="text-center py-10 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-xl p-4">
                  <Info className="mx-auto text-neutral-500 mb-2" size={24} />
                  <h4 className="text-sm font-bold text-white mb-1">Your Life Saver Workspace is Empty</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4 leading-relaxed">
                    Log your upcoming deadlines or seed dynamic test tasks to witness how Gemini prioritizes and creates action timelines.
                  </p>
                  <button
                    onClick={handleSeedDemoData}
                    className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2.5 rounded-xl transition font-mono"
                  >
                    Seed Demo Savior Tasks ⚡
                  </button>
                </div>
              )}

              {/* Task list loader */}
              {loadingTasks ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const taskAnalysis = analysis.priorities.find((p) => p.taskId === task.id);
                    const isCompleted = task.completed;
                    const isHighPriority = task.priority === "High";

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-xl border transition duration-200 flex gap-4 ${
                          isCompleted
                            ? "bg-neutral-950/40 border-neutral-900 opacity-60"
                            : taskAnalysis?.urgency === "high"
                              ? "bg-neutral-900 border-red-500/20 hover:border-red-500/40"
                              : "bg-neutral-900 border-neutral-800 hover:border-neutral-750"
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="text-neutral-400 hover:text-emerald-500 transition shrink-0 mt-1"
                        >
                          {isCompleted ? (
                            <CheckSquare size={18} className="text-emerald-500" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>

                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <h4 className={`text-sm font-bold ${isCompleted ? "text-neutral-500 line-through" : "text-white"}`}>
                              {task.title}
                            </h4>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                task.priority === "High"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/25"
                                  : task.priority === "Medium"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              }`}>
                                {task.priority} Priority
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                            {task.description}
                          </p>

                          {/* Priority rationale generated by Gemini */}
                          {taskAnalysis && !isCompleted && (
                            <div className="mt-3 bg-neutral-950 border border-neutral-850 p-2.5 rounded-lg flex items-start gap-2">
                              <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                              <div className="text-[11px] leading-relaxed">
                                <span className="font-bold text-indigo-400 uppercase tracking-widest font-mono text-[9px]">AI Priority Logic: </span>
                                <span className="text-neutral-300 font-medium">{taskAnalysis.reason} </span>
                                <span className="text-[10px] font-bold font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded ml-1 border border-neutral-800">
                                  Score: {taskAnalysis.score}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Task footer metadata */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-neutral-500 mt-3 pt-2.5 border-t border-neutral-850/60">
                            <span>Deadline: {new Date(task.deadline).toLocaleString()}</span>
                            <span>•</span>
                            <span>Effort: {task.estimatedHours}h</span>
                            <span>•</span>
                            <span className="text-indigo-400">#{task.category}</span>
                            
                            <div className="ml-auto flex items-center">
                              {calendarSynced && !isCompleted && (
                                <button
                                  onClick={() => handleSyncTaskToGoogleCalendar(task)}
                                  disabled={syncingTaskId === task.id}
                                  className="mr-3 text-indigo-400 hover:text-indigo-300 disabled:text-indigo-600 transition flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg"
                                  title="Sync to Google Calendar"
                                >
                                  {syncingTaskId === task.id ? (
                                    <div className="w-2.5 h-2.5 border border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <CalendarCheck2 size={11} className="text-indigo-400" />
                                  )}
                                  <span>Sync Cal</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-neutral-600 hover:text-red-400 transition"
                                title="Delete task"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: AI focus plan and Assistant chatbot (Size: 5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Focus Plan & Recommended Task */}
            <FocusPlan
              tasks={tasks}
              recommendation={analysis.recommendation}
              planBlocks={planBlocks}
              focusSummary={focusSummary}
              onGenerateDailyPlan={handleGenerateDailyPlan}
              onCompleteTask={handleCompleteTask}
              loadingPlan={loadingPlan}
            />

            {/* AI Assistant Chatbot panel */}
            <AIChat
              tasks={tasks}
              onSendMessage={handleSendChatMessage}
              chatHistory={chatHistory}
              loading={chatLoading}
              onClearChat={() => setChatHistory([])}
            />
          </div>
        </div>
      </main>

      {/* Task Creation Form Modal */}
      {showTaskForm && (
        <TaskForm
          onAddTask={handleAddTask}
          onClose={() => setShowTaskForm(false)}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmationTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-up">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              ⚠️ Delete Task?
            </h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmationTaskId(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-red-950/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Calendar Sync Confirmation Modal */}
      {syncConfirmationTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-up">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              📅 Sync Task to Google Calendar
            </h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Would you like to sync the task <span className="text-indigo-400 font-semibold">"{syncConfirmationTask.title}"</span> as an event on your primary Google Calendar?
            </p>
            <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl mb-6 text-[11px] font-mono text-neutral-400 space-y-1">
              <div><span className="text-neutral-500">Event:</span> 🚨 DEADLINE: {syncConfirmationTask.title}</div>
              <div><span className="text-neutral-500">Date/Time:</span> {new Date(syncConfirmationTask.deadline).toLocaleString()}</div>
              <div><span className="text-neutral-500">Category:</span> #{syncConfirmationTask.category}</div>
              <div><span className="text-neutral-500">Duration:</span> {syncConfirmationTask.estimatedHours || 1}h (estimated)</div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setSyncConfirmationTask(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={executeSyncTaskToGoogleCalendar}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-950/20"
              >
                Sync Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-xs font-medium max-w-sm ${
            toastNotification.type === "success" 
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
              : toastNotification.type === "error"
              ? "bg-red-950/90 border-red-500/30 text-red-300"
              : "bg-indigo-950/90 border-indigo-500/30 text-indigo-300"
          }`}>
            <span className="text-base">
              {toastNotification.type === "success" ? "✅" : toastNotification.type === "error" ? "❌" : "ℹ️"}
            </span>
            <p className="flex-1 leading-normal text-left">{toastNotification.message}</p>
            <button 
              onClick={() => setToastNotification(null)}
              className="text-neutral-400 hover:text-white transition font-bold shrink-0 ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
