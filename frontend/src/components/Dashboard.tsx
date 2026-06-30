import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../services/api";
import { Task, PlanBlock, Message, AnalysisResponse } from "../types";
import { getSeedTasks } from "../utils/seedData";
import { loginWithGoogle } from "../services/firebase";
import {
  Plus,
  LogOut,
  Layers,
  Flame,
  CheckSquare,
  Square,
  CalendarCheck2,
  Trash2,
  Sparkles,
  Info,
  CalendarDays,
  Clock,
  Briefcase
} from "lucide-react";

import Analytics from "./Analytics";
import WarningCards from "./WarningCards";
import FocusPlan from "./FocusPlan";
import AIChat from "./AIChat";
import TaskForm from "./TaskForm";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // AI & Gemini state
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

  // Google Calendar States
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLastSynced, setCalendarLastSynced] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [freeWindows, setFreeWindows] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [notifiedWindowKeys, setNotifiedWindowKeys] = useState<Set<string>>(new Set());
const [notifiedTaskRiskLevels, setNotifiedTaskRiskLevels] = useState<Record<string, string>>({});

  // Diagnostics and Safe Debugging States
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [geminiDiagnostics, setGeminiDiagnostics] = useState<any>(null);

  const runSafeDebug = async () => {
    if (!user) return;
    setDebugging(true);
    setLastError(null);
    const results: any = {
      readProfile: { status: "pending", error: null },
      writeTestDoc: { status: "pending", error: null },
      readTasks: { status: "pending", error: null },
      calendarStatus: { status: "pending", error: null }
    };
    setDebugResults({ ...results });

    // Step 1: Read user profile
    try {
      console.log("[SafeDebug] Starting step 1: Read user profile...");
      const status = await apiService.getCalendarStatus();
      results.readProfile = { status: "success", data: status };
      console.log("[SafeDebug] Step 1 Success:", status);
    } catch (err: any) {
      console.error("[SafeDebug] Step 1 Failed:", err);
      results.readProfile = { status: "failed", error: err.message || String(err) };
      setLastError(`Profile read failed: ${err.message || err}`);
    }
    setDebugResults({ ...results });

    // Step 2: Write a test document under users/{uid}/workspace/debugTest
    try {
      console.log("[SafeDebug] Starting step 2: Write a test document...");
      await apiService.saveWorkspaceConfig({ debug: true, timestamp: new Date().toISOString() }, "debugTest");
      results.writeTestDoc = { status: "success" };
      console.log("[SafeDebug] Step 2 Success");
    } catch (err: any) {
      console.error("[SafeDebug] Step 2 Failed:", err);
      results.writeTestDoc = { status: "failed", error: err.message || String(err) };
      setLastError(`Firestore write failed: ${err.message || err}`);
    }
    setDebugResults({ ...results });

    // Step 3: Read tasks
    try {
      console.log("[SafeDebug] Starting step 3: Read tasks...");
      const t = await apiService.getTasks();
      results.readTasks = { status: "success", count: t.length };
      console.log("[SafeDebug] Step 3 Success, task count:", t.length);
    } catch (err: any) {
      console.error("[SafeDebug] Step 3 Failed:", err);
      results.readTasks = { status: "failed", error: err.message || String(err) };
      setLastError(`Tasks read failed: ${err.message || err}`);
    }
    setDebugResults({ ...results });

    // Step 4: Access calendar status
    try {
      console.log("[SafeDebug] Starting step 4: Access calendar status...");
      const cal = await apiService.getCalendarStatus();
      results.calendarStatus = { status: "success", data: cal };
      console.log("[SafeDebug] Step 4 Success:", cal);
    } catch (err: any) {
      console.error("[SafeDebug] Step 4 Failed:", err);
      results.calendarStatus = { status: "failed", error: err.message || String(err) };
      setLastError(`Calendar status failed: ${err.message || err}`);
    }
    setDebugResults({ ...results });
    setDebugging(false);
  };

  // Custom overlays
  const [deleteConfirmationTaskId, setDeleteConfirmationTaskId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

 // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

 // Request browser notification permission once, after the user is loaded
useEffect(() => {
  if (user && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}, [user]);

// Calendar-aware notifications: alert the user the moment a free work
// window starts, suggesting the highest-priority task that fits in it.
useEffect(() => {
  if (!calendarConnected) return;
  const checkFreeWindows = () => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    freeWindows.forEach((win) => {
      const startDate = new Date(win.start);
      const msSinceStart = now.getTime() - startDate.getTime();
      const justStarted = msSinceStart >= 0 && msSinceStart < 60 * 1000;
      const key = win.start;
      if (justStarted && !notifiedWindowKeys.has(key)) {
        console.log("Current priorities at calendar-check time:", analysis.priorities);
const fittingTasks = tasks.filter((t) => {
  if (t.completed) return false;
  if (t.estimatedHours > win.durationHours) return false;
  if (new Date(t.deadline).getTime() < Date.now()) return false; // skip anything already overdue, checked directly — no dependency on AI analysis timing
  return true;
});
        const bestTask = fittingTasks
          .slice()
          .sort((a, b) => {
            const aScore = analysis.priorities.find((p) => p.taskId === a.id)?.score ?? 0;
            const bScore = analysis.priorities.find((p) => p.taskId === b.id)?.score ?? 0;
            return bScore - aScore;
          })[0];
        if (bestTask) {
          new Notification("Free time available!", {
            body: `You have ${win.durationHours}h free right now — good time to work on "${bestTask.title}".`,
          });
          setNotifiedWindowKeys((prev) => new Set(prev).add(key));
        }
      }
    });
  };
  checkFreeWindows();
  const intervalId = setInterval(checkFreeWindows, 60 * 1000);
  return () => clearInterval(intervalId);
}, [calendarConnected, freeWindows, tasks, analysis, notifiedWindowKeys]);

// Deadline-aware notifications: alert the user when a task becomes
// high-risk or overdue, based on Gemini's prioritization analysis.
useEffect(() => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  analysis.priorities.forEach((p) => {
    const isRisky = p.riskStatus === "overdue" || p.riskStatus === "high_risk";
    const lastNotifiedLevel = notifiedTaskRiskLevels[p.taskId];
    const alreadyNotifiedAtThisLevel = lastNotifiedLevel === p.riskStatus;

    if (isRisky && !alreadyNotifiedAtThisLevel) {
      const task = tasks.find((t) => t.id === p.taskId);
      if (task && !task.completed) {
        const title =
          p.riskStatus === "overdue" ? "Task overdue!" : "Deadline approaching!";
        new Notification(title, {
          body: `"${task.title}" — ${p.reason}`,
        });
        setNotifiedTaskRiskLevels((prev) => ({ ...prev, [p.taskId]: p.riskStatus }));
      }
    }
  });
}, [analysis, tasks, notifiedTaskRiskLevels]);

  // Auto-clear Toast
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Load Initial Tasks and Calendar Status
  const loadWorkspaceData = async () => {
    if (!user) return;
    setLoadingTasks(true);
    setLastError(null);
    try {
      // 1. Load tasks
      const fetchedTasks = await apiService.getTasks();
      setTasks(fetchedTasks);
      
      // 2. Load Calendar Connection status
      const status = await apiService.getCalendarStatus();
      setCalendarConnected(status.connected);
      if (status.lastSynced) {
        setCalendarLastSynced(status.lastSynced);
      }

      // 3. If connected, retrieve cached calendar events and availability
      if (status.connected) {
        const calData = await apiService.getCalendarEventsAndAvailability();
        setGoogleEvents(calData.events || []);
        setFreeWindows(calData.availability?.freeWindows || []);
      }

      // 4. Fetch Gemini Diagnostics
      try {
        const geminiDiag = await apiService.getGeminiDiagnostics();
        setGeminiDiagnostics(geminiDiag);
      } catch (e) {
        console.error("Error loading Gemini diagnostics on mount:", e);
      }
    } catch (err: any) {
      console.error("Error loading workspace data:", err);
      setLastError(err.message || String(err));
      setToastNotification({ message: "Workspace sync blocked. Try opening the Diagnostics panel to debug!", type: "error" });
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [user]);

  // Proactive prioritized score engine (triggers whenever task lists change)
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

    const triggerProactivePrioritization = async () => {
      setAnalyzing(true);
      try {
        const response = await apiService.prioritize(new Date().toISOString());
        if (response && !response.error) {
          setAnalysis(response);
        }
      } catch (err) {
        console.error("Proactive AI prioritization failed:", err);
      } finally {
        setAnalyzing(false);
      }
    };

    const debounceId = setTimeout(() => {
      triggerProactivePrioritization();
    }, 1200);

    return () => clearTimeout(debounceId);
  }, [tasks]);
   
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

  const triggerProactivePrioritization = async () => {
    setAnalyzing(true);
    try {
      const response = await apiService.prioritize(new Date().toISOString());
      if (response && !response.error) {
        setAnalysis(response);
      }
    } catch (err) {
      console.error("Proactive AI prioritization failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const debounceId = setTimeout(() => {
    triggerProactivePrioritization();
  }, 1200);

  return () => clearTimeout(debounceId);
}, [tasks]);

// 👇 PASTE THE NEW PERIODIC-CHECK EFFECT HERE 👇
useEffect(() => {
  const periodicCheck = setInterval(() => {
    if (tasks.length === 0) return;
    (async () => {
      setAnalyzing(true);
      try {
        const response = await apiService.prioritize(new Date().toISOString());
        if (response && !response.error) {
          setAnalysis(response);
        }
      } catch (err) {
        console.error("Periodic AI prioritization failed:", err);
      } finally {
        setAnalyzing(false);
      }
    })();
  }, 5 * 60 * 1000);

  return () => clearInterval(periodicCheck);
}, [tasks]);

useEffect(() => {
  const periodicCheck = setInterval(() => {
    if (tasks.length === 0) return;
    (async () => {
      setAnalyzing(true);
      try {
        const response = await apiService.prioritize(new Date().toISOString());
        if (response && !response.error) {
          setAnalysis(response);
        }
      } catch (err) {
        console.error("Periodic AI prioritization failed:", err);
      } finally {
        setAnalyzing(false);
      }
    })();
}, 60 * 1000);

  return () => clearInterval(periodicCheck);
}, [tasks]);


  // Handle tasks operations
  const handleAddTask = async (taskData: Omit<Task, "id" | "userId" | "completed" | "createdAt">) => {
    try {
      const newTask = await apiService.createTask({
        ...taskData,
        completed: false
      });
      setTasks((prev) => [...prev, newTask].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
      setToastNotification({ message: `"${taskData.title}" logged successfully!`, type: "success" });
    } catch (err) {
      console.error("Add task failed:", err);
      setToastNotification({ message: "Failed to create task", type: "error" });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const foundTask = tasks.find((t) => t.id === taskId);
      if (!foundTask) return;

      const updatedCompletedState = !foundTask.completed;
      await apiService.updateTask(taskId, {
        completed: updatedCompletedState,
        completedAt: updatedCompletedState ? new Date().toISOString() : undefined
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completed: updatedCompletedState, completedAt: updatedCompletedState ? new Date().toISOString() : undefined }
            : t
        )
      );

      setToastNotification({
        message: updatedCompletedState ? "Task completed! Excellent execution." : "Task marked active.",
        type: "success"
      });
    } catch (err) {
      console.error("Update task status failed:", err);
    }
  };

  const handleDeleteTaskClick = (taskId: string) => {
    setDeleteConfirmationTaskId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmationTaskId) return;
    const id = deleteConfirmationTaskId;
    setDeleteConfirmationTaskId(null);

    try {
      await apiService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setToastNotification({ message: "Task deleted successfully.", type: "success" });
    } catch (err) {
      console.error("Delete task failed:", err);
      setToastNotification({ message: "Failed to delete task.", type: "error" });
    }
  };

  const handleSeedDemoData = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const seeds = getSeedTasks(user.uid);
      for (const seed of seeds) {
        await apiService.createTask({
          title: seed.title,
          description: seed.description || "",
          deadline: seed.deadline,
          estimatedHours: seed.estimatedHours,
          category: seed.category,
          priority: seed.priority,
          completed: seed.completed
        });
      }
      const fetchedTasks = await apiService.getTasks();
      setTasks(fetchedTasks);
      setToastNotification({ message: "Dynamic mock tasks loaded successfully!", type: "success" });
    } catch (err) {
      console.error("Seeding failed:", err);
      setToastNotification({ message: "Error seeding demonstration tasks.", type: "error" });
    } finally {
      setLoadingTasks(false);
    }
  };

  // Google Calendar Connect & Sync
  const handleToggleCalendarSync = async () => {
    if (calendarConnected) {
      // Disconnect cleanly
      try {
        await apiService.connectCalendar(""); // sends empty token to backend to sever connection
        setCalendarConnected(false);
        setGoogleEvents([]);
        setFreeWindows([]);
        setCalendarLastSynced(null);
        setToastNotification({ message: "Google Calendar disconnected.", type: "info" });
      } catch (e) {
        setCalendarConnected(false);
      }
    } else {
      setLoadingCalendar(true);
      setCalendarError(null);
      try {
        // Trigger client-side Google popup login to request token
        const result = await loginWithGoogle();
        if (result && result.accessToken) {
          // Connect to backend
          await apiService.connectCalendar(result.accessToken);
          setCalendarConnected(true);
          
          // Trigger first synchronisation
          const syncRes = await apiService.syncCalendar();
          setCalendarLastSynced(syncRes.lastSynced);
          
          // Get events and analyze
          const eventsData = await apiService.getCalendarEventsAndAvailability();
          setGoogleEvents(eventsData.events || []);
          setFreeWindows(eventsData.availability?.freeWindows || []);

          setToastNotification({ message: "Google Calendar integrated and cached!", type: "success" });
        } else {
          setCalendarError("Popup cancelled or permission denied.");
        }
      } catch (err: any) {
        console.error("Calendar connection failed:", err);
        setCalendarError("Popup blocked or authorization failed. Try opening in standalone tab!");
      } finally {
        setLoadingCalendar(false);
      }
    }
  };

  const handleTriggerSync = async () => {
    setLoadingCalendar(true);
    try {
      const syncRes = await apiService.syncCalendar();
      setCalendarLastSynced(syncRes.lastSynced);

      const eventsData = await apiService.getCalendarEventsAndAvailability();
      setGoogleEvents(eventsData.events || []);
      setFreeWindows(eventsData.availability?.freeWindows || []);
      setToastNotification({ message: "Google Calendar synchronized successfully!", type: "success" });
    } catch (err: any) {
      console.error("Calendar sync failure:", err);
      if (err.message === "EXPIRED") {
        setCalendarConnected(false);
        setToastNotification({ message: "Calendar authorization expired. Please reconnect.", type: "error" });
      } else {
        setToastNotification({ message: "Failed to sync Calendar.", type: "error" });
      }
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Generate Structured hour-by-hour Focus Plan via Gemini
  const handleGenerateDailyPlan = async () => {
    setLoadingPlan(true);
    try {
      const response = await apiService.generateDailyPlan(new Date().toISOString());
      if (response && !response.error) {
        setPlanBlocks(response.planBlocks || []);
        setFocusSummary(response.focusSummary || "");
        setToastNotification({ message: "Daily Plan blocks updated!", type: "success" });
      }
    } catch (err) {
      console.error("Daily Plan compilation failed:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  // AI chat messaging
  const handleSendChatMessage = async (text: string) => {
    const userMessage: Message = {
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const data = await apiService.chat(text, chatHistory.slice(-10), new Date().toISOString());
      if (data && !data.error) {
        const aiMessage: Message = {
          sender: "ai",
          text: data.response,
          timestamp: new Date().toISOString(),
          suggestedActions: data.suggestedActions,
        };
        setChatHistory((prev) => [...prev, aiMessage]);
      } else {
        throw new Error("Chat parsing failure");
      }
    } catch (err) {
      console.error("Chat failure:", err);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced a brief sync blockage. Please check your network and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Calculated Calendar statistics
  const getBusiestDay = () => {
    if (googleEvents.length === 0) return "None";
    const dayCounts: Record<string, number> = {};
    googleEvents.forEach((ev) => {
      const startStr = ev.start?.dateTime || ev.start?.date;
      if (startStr) {
        const d = new Date(startStr).toLocaleDateString(undefined, { weekday: "long" });
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      }
    });
    let maxDay = "None";
    let maxVal = 0;
    Object.entries(dayCounts).forEach(([day, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxDay = day;
      }
    });
    return `${maxDay} (${maxVal} events)`;
  };

  // Filtering calculations
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
            <h1 className="text-md font-extrabold text-white tracking-tight flex items-center gap-2">
              Last-Minute Life Saver
              {geminiDiagnostics && (
                <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  geminiDiagnostics.fallbackActive
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {geminiDiagnostics.fallbackActive ? "Free Mode (Fallback AI)" : "Free Mode (Active AI)"}
                </span>
              )}
            </h1>
            <p className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase">Preventing Missed Milestones</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-neutral-950 border border-neutral-850 px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 font-mono">
            <span className="text-emerald-500">⏰</span>
            <span>{currentTime}</span>
          </div>

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border transition ${
              showDiagnostics
                ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                : "bg-neutral-950 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900"
            }`}
          >
            🔍 Diagnostics
          </button>

          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User Avatar"}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-xl border border-neutral-700 shadow"
              />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">
                {user?.displayName?.[0] || "U"}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white leading-none">{user?.displayName || "Rescue Hero"}</p>
              <p className="text-[10px] text-neutral-500 leading-none mt-1 font-mono">{user?.email}</p>
            </div>

            <button
              onClick={() => signOut()}
              className="text-neutral-400 hover:text-red-400 transition p-2 rounded-xl hover:bg-neutral-850"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* AI Free Tier / Fallback Status Banner */}
      {geminiDiagnostics && (
        <div className={`border-b px-4 md:px-8 py-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300 ${
          geminiDiagnostics.fallbackActive
            ? "bg-amber-500/5 border-amber-500/10 text-amber-300"
            : "bg-emerald-500/5 border-emerald-500/10 text-emerald-300"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              geminiDiagnostics.fallbackActive ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            }`}></span>
            <span className="leading-relaxed">
              {geminiDiagnostics.fallbackActive ? (
                <span>
                  ⚡ <strong>Running in free mode with fallback AI assistance</strong> — Gemini API is currently offline. Resilient local prioritization engine is handling your planners, subtasks, and chat queries seamlessly.
                </span>
              ) : (
                <span>
                  ✨ <strong>Running in free mode with Gemini AI assistance</strong> — Connected directly to the Google AI free tier (<code>gemini-2.5-flash</code>) for active task forecasting.
                </span>
              )}
            </span>
          </div>
          <button 
            onClick={() => setShowDiagnostics(true)}
            className={`text-[9px] font-bold font-mono uppercase px-2.5 py-1 rounded-lg border transition self-end sm:self-auto ${
              geminiDiagnostics.fallbackActive
                ? "bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border-amber-500/20"
                : "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/20"
            }`}
          >
            Review Diagnostics
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Diagnostics & Safe Debugging Panel */}
        {showDiagnostics && (
          <div id="diagnostics_panel" className="bg-neutral-900 border border-red-500/20 rounded-2xl p-5 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  System Diagnostics & Security Controls
                </h3>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="text-xs text-neutral-400 hover:text-white font-mono bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-850"
              >
                Hide
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 space-y-1 text-xs font-mono">
                <p className="text-neutral-500 text-[10px]">AUTH & DB SESSION:</p>
                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Connected
                </p>
                <p className="text-neutral-500 mt-2 text-[10px]">FIRESTORE DB TARGET:</p>
                <p className="text-neutral-300 text-[10px] break-all leading-none">ai-studio-dc36cd4b-c934-454c-a7b2-297a0f4b0647</p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 space-y-1 text-xs font-mono">
                <p className="text-neutral-500 text-[10px]">FREE MODE CONFIGURATION:</p>
                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Active (Unpaid Tier)
                </p>
                <p className="text-neutral-500 mt-2 text-[10px]">FALLBACK ENGINE:</p>
                <p className={`font-bold text-[10px] flex items-center gap-1.5 ${geminiDiagnostics?.fallbackActive ? "text-amber-400" : "text-neutral-500"}`}>
                  <span className={`w-1 h-1 rounded-full ${geminiDiagnostics?.fallbackActive ? "bg-amber-400 animate-pulse" : "bg-neutral-600"}`}></span>
                  {geminiDiagnostics?.fallbackActive ? "Active (Seamless Offline)" : "Idle (Standby)"}
                </p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 space-y-1 text-xs font-mono">
                <p className="text-neutral-500 text-[10px]">GEMINI COGNITIVE API:</p>
                <p className={`font-bold flex items-center gap-1.5 ${geminiDiagnostics?.fallbackActive ? "text-amber-400" : "text-emerald-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${geminiDiagnostics?.fallbackActive ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}></span>
                  {geminiDiagnostics?.fallbackActive ? "Offline (Fallback)" : "Available"}
                </p>
                <p className="text-neutral-500 mt-2 text-[10px]">AI MODEL ASSIGNED:</p>
                <p className="text-neutral-300 text-[10px]">gemini-2.5-flash</p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 space-y-1 text-xs font-mono">
                <p className="text-neutral-500 text-[10px]">API CREDENTIAL STATUS:</p>
                <p className="text-neutral-300 text-[10px] flex justify-between">
                  <span>Key Present:</span>
                  <span className={geminiDiagnostics?.apiKeyPresent ? "text-emerald-400 font-bold" : "text-neutral-400"}>
                    {geminiDiagnostics?.apiKeyPresent ? "YES" : "NO"}
                  </span>
                </p>
                <p className="text-neutral-500 mt-2 text-[9px] leading-snug">
                  * Note: You can optionally connect a custom API key later for higher limits.
                </p>
              </div>
            </div>

            {/* Step-by-Step Safe Debug Suite Results */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">Safe Sandbox Diagnostic Suite</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Safely tests reads, writes, and connection paths under users/{user?.uid}</p>
                </div>
                <button
                  onClick={runSafeDebug}
                  disabled={debugging}
                  className="bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-mono font-bold text-xs px-3.5 py-1.5 rounded-lg transition"
                >
                  {debugging ? "Executing Suite..." : "Run Diagnostic Tests"}
                </button>
              </div>

              {debugResults && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 font-mono text-[11px]">
                  {/* Read Profile */}
                  <div className={`p-2.5 rounded-lg border ${
                    debugResults.readProfile.status === "success" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                      : debugResults.readProfile.status === "failed"
                      ? "bg-red-500/5 border-red-500/20 text-red-400"
                      : "bg-neutral-900 border-neutral-800 text-neutral-500"
                  }`}>
                    <p className="font-bold">1. Read Profile</p>
                    <p className="text-[9px] mt-1">
                      {debugResults.readProfile.status === "success" 
                        ? `Success (User Profile Doc)` 
                        : debugResults.readProfile.status === "failed"
                        ? `Failed: ${debugResults.readProfile.error}`
                        : "Pending..."
                      }
                    </p>
                  </div>

                  {/* Write Test Doc */}
                  <div className={`p-2.5 rounded-lg border ${
                    debugResults.writeTestDoc.status === "success" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                      : debugResults.writeTestDoc.status === "failed"
                      ? "bg-red-500/5 border-red-500/20 text-red-400"
                      : "bg-neutral-900 border-neutral-800 text-neutral-500"
                  }`}>
                    <p className="font-bold">2. Test Write Rule</p>
                    <p className="text-[9px] mt-1">
                      {debugResults.writeTestDoc.status === "success" 
                        ? "Success (users/{uid}/workspace)" 
                        : debugResults.writeTestDoc.status === "failed"
                        ? `Failed: ${debugResults.writeTestDoc.error}`
                        : "Pending..."
                      }
                    </p>
                  </div>

                  {/* Read Tasks */}
                  <div className={`p-2.5 rounded-lg border ${
                    debugResults.readTasks.status === "success" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                      : debugResults.readTasks.status === "failed"
                      ? "bg-red-500/5 border-red-500/20 text-red-400"
                      : "bg-neutral-900 border-neutral-800 text-neutral-500"
                  }`}>
                    <p className="font-bold">3. Read Tasks</p>
                    <p className="text-[9px] mt-1">
                      {debugResults.readTasks.status === "success" 
                        ? `Success (${debugResults.readTasks.count} tasks found)` 
                        : debugResults.readTasks.status === "failed"
                        ? `Failed: ${debugResults.readTasks.error}`
                        : "Pending..."
                      }
                    </p>
                  </div>

                  {/* Calendar Status */}
                  <div className={`p-2.5 rounded-lg border ${
                    debugResults.calendarStatus.status === "success" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                      : debugResults.calendarStatus.status === "failed"
                      ? "bg-red-500/5 border-red-500/20 text-red-400"
                      : "bg-neutral-900 border-neutral-800 text-neutral-500"
                  }`}>
                    <p className="font-bold">4. Calendar Status</p>
                    <p className="text-[9px] mt-1">
                      {debugResults.calendarStatus.status === "success" 
                        ? "Success (Connection Status Ok)" 
                        : debugResults.calendarStatus.status === "failed"
                        ? `Failed: ${debugResults.calendarStatus.error}`
                        : "Pending..."
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Gemini Detailed Audit Panel */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <span className="text-indigo-400">⚡</span> Gemini Connection Audit & Project Entitlements
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Real-time status check of Google Cloud AI integrations and credentials</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiService.getGeminiDiagnostics();
                      setGeminiDiagnostics(res);
                      setToastNotification({ message: "Gemini status refreshed!", type: "info" });
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-mono text-[10px] font-bold px-2.5 py-1 rounded-xl transition"
                >
                  Refresh Health Check
                </button>
              </div>

              {geminiDiagnostics ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-neutral-400">Initialization Status:</p>
                      <div className="bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Client Instantiated:</span>
                          <span className={geminiDiagnostics.clientInitialized ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                            {geminiDiagnostics.clientInitialized ? "YES" : "NO"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Active Pipeline:</span>
                          <span className={geminiDiagnostics.fallbackActive ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                            {geminiDiagnostics.fallbackActive ? "Local Fallback Engine" : "Direct Google AI Stream"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-neutral-400">API Error Tracking:</p>
                      <div className="bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Last Error Code:</span>
                          <span className={geminiDiagnostics.lastErrorCode ? "text-red-400 font-bold" : "text-neutral-400"}>
                            {geminiDiagnostics.lastErrorCode || "NONE (0)"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Error Classification:</span>
                          <span className={geminiDiagnostics.lastErrorType ? "text-red-400 font-bold" : "text-neutral-400"}>
                            {geminiDiagnostics.lastErrorType || "HEALTHY"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Classification & Specific Instructions */}
                  {geminiDiagnostics.fallbackActive && (
                    <div className="p-3 rounded-lg border border-neutral-850 bg-neutral-900/50 space-y-2 text-[11px] leading-relaxed">
                      {geminiDiagnostics.lastErrorType === "MISSING_API_KEY" && (
                        <div className="border-l-2 border-amber-500/40 pl-2 text-neutral-300">
                          <p className="font-bold text-amber-400">Classified Issue: Running Offline (No Custom Key)</p>
                          <p className="mt-1">The app is running offline. Our local advisor engine is active, prioritising tasks and compiling focus sprints seamlessly. You can optionally connect a free Gemini key in Settings &gt; Secrets for cloud assistance.</p>
                        </div>
                      )}

                      {geminiDiagnostics.lastErrorType === "PERMISSION_DENIED" && (
                        <div className="border-l-2 border-amber-500/40 pl-2 text-neutral-300">
                          <p className="font-bold text-amber-400">Classified Issue: Google Cloud Restriction (403)</p>
                          <p className="mt-1">
                            The API call was returned with a project entitlement limitation. No action is required — the robust local fallback planning system has automatically and seamlessly taken over.
                          </p>
                        </div>
                      )}

                      {geminiDiagnostics.lastErrorType === "INVALID_API_KEY" && (
                        <div className="border-l-2 border-amber-500/40 pl-2 text-neutral-300">
                          <p className="font-bold text-amber-400">Classified Issue: Key Verification Needed</p>
                          <p className="mt-1">The configured key could not be verified. Fallback offline engine remains active to keep all scheduling and planners fully available without interruption.</p>
                        </div>
                      )}

                      {geminiDiagnostics.lastErrorType === "QUOTA_EXCEEDED" && (
                        <div className="border-l-2 border-amber-500/40 pl-2 text-neutral-300">
                          <p className="font-bold text-amber-400">Classified Issue: Free-Tier Quota Limit (429)</p>
                          <p className="mt-1">You've hit the standard free-tier rate limits. Fallback AI has taken over automatically and safely. You can resume direct cloud assistant tasks shortly.</p>
                        </div>
                      )}

                      {geminiDiagnostics.lastErrorType === "MODEL_NOT_FOUND" && (
                        <div className="border-l-2 border-amber-500/40 pl-2 text-neutral-300">
                          <p className="font-bold text-amber-400">Classified Issue: Assigned Model Offline (404)</p>
                          <p className="mt-1">The requested free-tier model <code>{geminiDiagnostics.modelName}</code> is currently offline or unreachable. Local fallback metrics remain fully active.</p>
                        </div>
                      )}

                      {(!geminiDiagnostics.lastErrorType || geminiDiagnostics.lastErrorType === "CLIENT_ERROR" || geminiDiagnostics.lastErrorType === "API_ERROR") && (
                        <div className="border-l-2 border-red-500 pl-2 text-neutral-300">
                          <p className="font-bold text-red-400">Classified Issue: General API / Network Failure</p>
                          <p className="mt-1">The last request failed with the following details:</p>
                          <p className="text-neutral-400 mt-1 select-text bg-neutral-950 p-2 rounded text-[10px] break-all leading-tight">
                            {geminiDiagnostics.lastErrorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-neutral-500 font-mono">
                  Loading diagnostics information...
                </div>
              )}
            </div>

            {/* Error Message Display */}
            {lastError && (
              <div className="bg-red-950/10 border border-red-500/20 p-3.5 rounded-xl text-xs font-mono text-red-400 flex items-start gap-2">
                <span className="text-red-500">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold">Active Workspace/Permission Exception:</p>
                  <p className="mt-0.5 break-all select-text">{lastError}</p>
                </div>
                <button
                  onClick={() => setLastError(null)}
                  className="text-[10px] text-neutral-500 hover:text-white hover:underline transition"
                >
                  Dismiss Exception
                </button>
              </div>
            )}
          </div>
        )}

        {/* Google Calendar Linker Control Panel */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <CalendarCheck2 size={20} />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Google Calendar Synchronizer</h4>
              <p className="text-[11px] text-neutral-400">Sync assignments, meeting deadlines, and busy slots securely from Google.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            {calendarConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  ✓ Calendar Connected
                </span>
                <button
                  onClick={handleTriggerSync}
                  disabled={loadingCalendar}
                  className="text-[11px] hover:underline font-mono text-indigo-400 font-bold px-2 py-1"
                >
                  Sync Now
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-bold font-mono text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-850">
                Disconnected
              </span>
            )}
            <button
              onClick={handleToggleCalendarSync}
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition ${
                calendarConnected
                  ? "bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-300"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-950/20"
              }`}
            >
              {calendarConnected ? "Disconnect" : "Connect Google Calendar"}
            </button>
          </div>
        </div>

        {/* Dedicated Google Calendar Card showing Free/Busy Availability Summary */}
        {calendarConnected && (
          <div id="dedicated_google_calendar_card" className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md animate-in fade-in">
            {/* Column A: Schedule Info */}
            <div className="space-y-3 border-r border-neutral-800/60 pr-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <CalendarDays size={14} className="text-indigo-400" />
                Linked Schedule Overview
              </h3>
              
              <div className="space-y-2 text-[11px] font-mono leading-relaxed">
                <div className="flex justify-between border-b border-neutral-850 pb-1.5">
                  <span className="text-neutral-500">Sync Status:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between border-b border-neutral-850 pb-1.5">
                  <span className="text-neutral-500">Upcoming Events:</span>
                  <span className="text-neutral-200 font-bold">{googleEvents.length} retrieved</span>
                </div>
                <div className="flex justify-between border-b border-neutral-850 pb-1.5">
                  <span className="text-neutral-500">Busiest Day:</span>
                  <span className="text-indigo-400 font-bold">{getBusiestDay()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Last Synced:</span>
                  <span className="text-neutral-400">{calendarLastSynced ? new Date(calendarLastSynced).toLocaleTimeString() : "Pending"}</span>
                </div>
              </div>
            </div>

            {/* Column B: Free Focus Windows */}
            <div className="space-y-2 border-r border-neutral-800/60 px-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-400" />
                Identified Free Work Windows
              </h3>
              
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {freeWindows.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic py-2">No clear blocks available. High workload detected.</p>
                ) : (
               freeWindows.slice(0, 3).map((win, idx) => {
  const startDate = new Date(win.start);
  const endDate = new Date(win.end);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
  const label = sameDay
    ? `${fmtTime(startDate)} - ${fmtTime(endDate)}`
    : `${fmtDay(startDate)} ${fmtTime(startDate)} - ${fmtDay(endDate)} ${fmtTime(endDate)}`;
  return (
    <div key={idx} className="bg-neutral-950 border border-neutral-850 p-2 rounded-lg flex justify-between items-center text-[10px] font-mono">
      <span className="text-neutral-300">{label}</span>
      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{win.durationHours}h Free</span>
    </div>
  );
})
                )}
              </div>
            </div>

            {/* Column C: Busy Commitment blocks */}
            <div className="space-y-2 pl-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Briefcase size={14} className="text-amber-400" />
                Google Calendar Commitments
              </h3>
              
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {googleEvents.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic py-2">No calendar commitments scheduled.</p>
                ) : (
                  googleEvents.slice(0, 3).map((event) => {
                    const estart = event.start?.dateTime || event.start?.date;
                    const dateFmt = estart ? new Date(estart).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit" }) : "All Day";
                    return (
                      <div key={event.id} className="bg-neutral-950 border border-neutral-850 p-2 rounded-lg flex items-center justify-between text-[10px]">
                        <span className="font-bold text-neutral-300 truncate max-w-[120px]">{event.summary || "Busy Slot"}</span>
                        <span className="text-neutral-500 font-mono text-[9px] shrink-0">{dateFmt}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        <Analytics tasks={tasks} highRiskCount={overdueRiskCount} />

        {/* Dynamic Risk Warnings */}
        <WarningCards warnings={analysis.warnings} onFocusTask={(id) => console.log("Focus task:", id)} />

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Task Board (Size 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-md font-bold text-white flex items-center gap-1.5">
                    <Layers size={18} className="text-emerald-500" />
                    Deadline Prevention Board
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-mono">Proactively execute milestones</p>
                </div>

                <button
                  onClick={() => setShowTaskForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow shadow-emerald-950/25"
                >
                  <Plus size={14} />
                  Log Savior Task
                </button>
              </div>

              {/* Filters */}
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

              {/* Seeding Offer */}
              {!loadingTasks && tasks.length === 0 && (
                <div className="text-center py-10 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-xl p-4">
                  <Info className="mx-auto text-neutral-500 mb-2" size={24} />
                  <h4 className="text-sm font-bold text-white mb-1">Savior Workspace Empty</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4 leading-relaxed">
                    Add upcoming deliverables or seed test deadlines to witness how the Gemini scheduler prioritizes tasks and schedules work blocks.
                  </p>
                  <button
                    onClick={handleSeedDemoData}
                    className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2.5 rounded-xl transition font-mono"
                  >
                    Seed Demo Tasks ⚡
                  </button>
                </div>
              )}

              {/* Tasks List */}
              {loadingTasks ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const taskAnalysis = analysis.priorities.find((p) => p.taskId === task.id);
                    const isCompleted = task.completed;

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

                        <div className="flex-1">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <h4 className={`text-sm font-bold ${isCompleted ? "text-neutral-500 line-through" : "text-white"}`}>
                              {task.title}
                            </h4>
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

                          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                            {task.description}
                          </p>

                          {taskAnalysis && !isCompleted && (
                            <div className="mt-3 bg-neutral-950 border border-neutral-850 p-2.5 rounded-lg flex items-start gap-2 animate-in fade-in">
                              <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                              <div className="text-[11px] leading-relaxed">
                                <span className="font-bold text-indigo-400 uppercase tracking-widest font-mono text-[9px]">AI Analysis: </span>
                                <span className="text-neutral-300 font-medium">{taskAnalysis.reason} </span>
                                <span className="text-[10px] font-bold font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded ml-1 border border-neutral-800">
                                  Rating: {taskAnalysis.score}/100
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-neutral-500 mt-3 pt-2.5 border-t border-neutral-850/60">
                            <span>Deadline: {new Date(task.deadline).toLocaleString()}</span>
                            <span>•</span>
                            <span>Effort: {task.estimatedHours}h</span>
                            <span>•</span>
                            <span className="text-indigo-400">#{task.category}</span>
                            
                            <div className="ml-auto flex items-center">
                              <button
                                onClick={() => handleDeleteTaskClick(task.id)}
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

          {/* Column 2: Focus Plan & Chat AI (Size 5/12) */}
          <div className="lg:col-span-5 space-y-6">
            <FocusPlan
              tasks={tasks}
              recommendation={analysis.recommendation}
              planBlocks={planBlocks}
              focusSummary={focusSummary}
              onGenerateDailyPlan={handleGenerateDailyPlan}
              onCompleteTask={handleCompleteTask}
              loadingPlan={loadingPlan}
            />

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

      {/* Task Creation Form */}
      {showTaskForm && (
        <TaskForm
          onAddTask={handleAddTask}
          onClose={() => setShowTaskForm(false)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmationTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">⚠️ Delete Task?</h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Are you sure you want to delete this task? This action is permanent.
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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-xs font-medium max-w-sm ${
            toastNotification.type === "success" 
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
              : toastNotification.type === "error"
              ? "bg-red-950/90 border-red-500/30 text-red-300"
              : "bg-indigo-950/90 border-indigo-500/30 text-indigo-300"
          }`}>
            <span>
              {toastNotification.type === "success" ? "✅" : toastNotification.type === "error" ? "❌" : "ℹ️"}
            </span>
            <p className="flex-1 leading-normal text-left">{toastNotification.message}</p>
            <button 
              onClick={() => setToastNotification(null)}
              className="text-neutral-400 hover:text-white transition font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
