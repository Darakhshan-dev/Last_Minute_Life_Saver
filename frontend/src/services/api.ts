import { auth, db } from "./firebase";
import { Task } from "../types";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  addDoc
} from "firebase/firestore";

// Get secure headers containing the User's UID as Authorization token
const getHeaders = () => {
  const user = auth.currentUser;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (user) {
    headers["Authorization"] = `Bearer ${user.uid}`;
  }
  return headers;
};

// Helper to obtain current user's profile document reference
const getUserProfileDocRef = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User is not authenticated");
  return doc(db, "users", user.uid);
};

// Helper to analyze availability client-side
function analyzeAvailabilityClient(events: any[], currentTimeStr?: string) {
  const startRange = currentTimeStr ? new Date(currentTimeStr) : new Date();
  const endRange = new Date(startRange.getTime() + 2 * 24 * 60 * 60 * 1000); // 48-hour outlook

  const busySlots = events
    .map((ev) => {
      const start = new Date(ev.start?.dateTime || ev.start?.date || "");
      const end = new Date(ev.end?.dateTime || ev.end?.date || "");
      return { title: ev.summary || "Busy Slot", start, end };
    })
    .filter((slot) => {
      return slot.end > startRange && slot.start < endRange;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const freeWindows: any[] = [];
  let currentPointer = new Date(startRange);

  for (const slot of busySlots) {
    if (slot.start > currentPointer) {
      const durationHours = (slot.start.getTime() - currentPointer.getTime()) / (1000 * 60 * 60);
      if (durationHours >= 0.5) {
        freeWindows.push({
          start: currentPointer.toISOString(),
          end: slot.start.toISOString(),
          durationHours: parseFloat(durationHours.toFixed(1))
        });
      }
    }
    if (slot.end > currentPointer) {
      currentPointer = new Date(slot.end);
    }
  }

  if (endRange > currentPointer) {
    const durationHours = (endRange.getTime() - currentPointer.getTime()) / (1000 * 60 * 60);
    if (durationHours >= 0.5) {
      freeWindows.push({
        start: currentPointer.toISOString(),
        end: endRange.toISOString(),
        durationHours: parseFloat(durationHours.toFixed(1))
      });
    }
  }

  return {
    busySlots: busySlots.map((s) => ({
      title: s.title,
      start: s.start.toISOString(),
      end: s.end.toISOString()
    })),
    freeWindows
  };
}

export const apiService = {
  // --- Task CRUD Endpoints (Client-Side Firestore) ---
  async getTasks(): Promise<Task[]> {
    const user = auth.currentUser;
    if (!user) {
      console.warn("[apiService] getTasks called, but user is not authenticated!");
      throw new Error("User is not authenticated");
    }
    
    try {
      const q = collection(db, "users", user.uid, "tasks");
      const querySnapshot = await getDocs(q);
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      return tasks;
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/read error fetching tasks for user ${user.uid} at users/${user.uid}/tasks:`, error);
      throw new Error(`Firestore read failed: ${error.message || error}`);
    }
  },

  async createTask(task: Omit<Task, "id" | "userId" | "createdAt">): Promise<Task> {
    const user = auth.currentUser;
    if (!user) {
      console.warn("[apiService] createTask called, but user is not authenticated!");
      throw new Error("User is not authenticated");
    }
    
    const newTask = {
      ...task,
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "tasks"), newTask);
      return { id: docRef.id, ...newTask };
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/write error creating task for user ${user.uid} at users/${user.uid}/tasks:`, error);
      throw new Error(`Firestore write failed: ${error.message || error}`);
    }
  },

  async updateTask(taskId: string, task: Partial<Task>): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      console.warn("[apiService] updateTask called, but user is not authenticated!");
      throw new Error("User is not authenticated");
    }
    
    try {
      const taskDocRef = doc(db, "users", user.uid, "tasks", taskId);
      await updateDoc(taskDocRef, task);
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/update error updating task ${taskId} for user ${user.uid} at users/${user.uid}/tasks/${taskId}:`, error);
      throw new Error(`Firestore update failed: ${error.message || error}`);
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      console.warn("[apiService] deleteTask called, but user is not authenticated!");
      throw new Error("User is not authenticated");
    }
    
    try {
      const taskDocRef = doc(db, "users", user.uid, "tasks", taskId);
      await deleteDoc(taskDocRef);
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/delete error deleting task ${taskId} for user ${user.uid} at users/${user.uid}/tasks/${taskId}:`, error);
      throw new Error(`Firestore delete failed: ${error.message || error}`);
    }
  },

  // --- Workspace Configurations under users/{uid}/workspace ---
  async getWorkspaceConfig(docId: string = "default"): Promise<any> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    try {
      const docRef = doc(db, "users", user.uid, "workspace", docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/read error reading workspace config for user ${user.uid} at users/${user.uid}/workspace/${docId}:`, error);
      throw new Error(`Firestore read failed: ${error.message || error}`);
    }
  },

  async saveWorkspaceConfig(data: any, docId: string = "default"): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    try {
      const docRef = doc(db, "users", user.uid, "workspace", docId);
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/write error saving workspace config for user ${user.uid} at users/${user.uid}/workspace/${docId}:`, error);
      throw new Error(`Firestore write failed: ${error.message || error}`);
    }
  },

  // --- Daily Plans under users/{uid}/dailyPlans ---
  async getDailyPlan(docId: string): Promise<any> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    try {
      const docRef = doc(db, "users", user.uid, "dailyPlans", docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/read error reading daily plan for user ${user.uid} at users/${user.uid}/dailyPlans/${docId}:`, error);
      throw new Error(`Firestore read failed: ${error.message || error}`);
    }
  },

  async saveDailyPlan(plan: any, docId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    try {
      const docRef = doc(db, "users", user.uid, "dailyPlans", docId);
      await setDoc(docRef, { ...plan, updatedAt: new Date().toISOString() });
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/write error saving daily plan for user ${user.uid} at users/${user.uid}/dailyPlans/${docId}:`, error);
      throw new Error(`Firestore write failed: ${error.message || error}`);
    }
  },

  // --- Insights under users/{uid}/insights ---
  async getInsights(docId: string = "latest"): Promise<any> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    try {
      const docRef = doc(db, "users", user.uid, "insights", docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/read error reading insights for user ${user.uid} at users/${user.uid}/insights/${docId}:`, error);
      throw new Error(`Firestore read failed: ${error.message || error}`);
    }
  },

  async saveInsights(insights: any, docId: string = "latest"): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    try {
      const docRef = doc(db, "users", user.uid, "insights", docId);
      await setDoc(docRef, { ...insights, updatedAt: new Date().toISOString() });
    } catch (error: any) {
      console.error(`[apiService] Firestore permission/write error saving insights for user ${user.uid} at users/${user.uid}/insights/${docId}:`, error);
      throw new Error(`Firestore write failed: ${error.message || error}`);
    }
  },

  // --- Gemini AI Endpoints (Stateless Backend proxies) ---
  async prioritize(currentTime: string): Promise<any> {
    const tasks = await this.getTasks();
    const res = await fetch("/api/ai/prioritize", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ tasks, currentTime })
    });
    if (!res.ok) throw new Error("Failed to perform task prioritization");
    return res.json();
  },

  async breakTaskIntoSubtasks(task: Task): Promise<any> {
    const res = await fetch("/api/ai/subtasks", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ task })
    });
    if (!res.ok) throw new Error("Failed to break down task");
    return res.json();
  },

  async generateDailyPlan(currentTime: string): Promise<any> {
    const tasks = await this.getTasks();
    
    let calendarEvents: any[] = [];
    try {
      const docSnap = await getDoc(getUserProfileDocRef());
      if (docSnap.exists()) {
        calendarEvents = docSnap.data().cachedEvents || [];
      }
    } catch (err) {
      console.error("Error getting calendar events for daily plan:", err);
    }
    
    const res = await fetch("/api/ai/focus-plan", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ tasks, calendarEvents, currentTime })
    });
    if (!res.ok) throw new Error("Failed to map daily focus plan");
    return res.json();
  },

  async chat(message: string, chatHistory: any[], currentTime: string): Promise<any> {
    const tasks = await this.getTasks();
    
    let calendarEvents: any[] = [];
    try {
      const docSnap = await getDoc(getUserProfileDocRef());
      if (docSnap.exists()) {
        calendarEvents = docSnap.data().cachedEvents || [];
      }
    } catch (err) {
      console.error("Error getting calendar events for chat:", err);
    }
    
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, chatHistory, tasks, calendarEvents, currentTime })
    });
    if (!res.ok) throw new Error("Failed to process conversation");
    return res.json();
  },

  // --- Google Calendar Endpoints (Stateless backend syncing) ---
  async getCalendarStatus(): Promise<any> {
    const user = auth.currentUser;
    if (!user) return { connected: false, lastSynced: null };
    
    try {
      const docSnap = await getDoc(getUserProfileDocRef());
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          connected: data.calendarConnected || false,
          lastSynced: data.calendarLastSynced || null
        };
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
    return { connected: false, lastSynced: null };
  },

  async connectCalendar(accessToken: string): Promise<any> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    
    const profileRef = getUserProfileDocRef();
    const docSnap = await getDoc(profileRef);
    const updateData = {
      calendarConnected: accessToken ? true : false,
      calendarAccessToken: accessToken || null,
      calendarLastSynced: accessToken ? new Date().toISOString() : null,
      cachedEvents: accessToken ? [] : null
    };
    
    if (docSnap.exists()) {
      await updateDoc(profileRef, updateData);
    } else {
      await setDoc(profileRef, { ...updateData, userId: user.uid });
    }
    
    return { success: true, message: accessToken ? "Calendar connected successfully!" : "Calendar disconnected successfully!" };
  },

  async syncCalendar(): Promise<any> {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not authenticated");
    
    const profileRef = getUserProfileDocRef();
    const docSnap = await getDoc(profileRef);
    if (!docSnap.exists()) {
      throw new Error("Google Calendar is not connected");
    }
    
    const data = docSnap.data();
    if (!data.calendarConnected || !data.calendarAccessToken) {
      throw new Error("Google Calendar is not connected");
    }
    
    const res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ accessToken: data.calendarAccessToken })
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        await updateDoc(profileRef, { calendarConnected: false });
        throw new Error("EXPIRED");
      }
      throw new Error("Failed to sync Google Calendar events");
    }
    
    const result = await res.json();
    
    await updateDoc(profileRef, {
      calendarLastSynced: result.lastSynced,
      cachedEvents: result.events || []
    });
    
    return result;
  },

  async getCalendarEventsAndAvailability(): Promise<any> {
    const user = auth.currentUser;
    if (!user) {
      return { connected: false, events: [], availability: { busySlots: [], freeWindows: [] } };
    }
    
    try {
      const docSnap = await getDoc(getUserProfileDocRef());
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.calendarConnected && data.cachedEvents) {
          const events = data.cachedEvents || [];
          const analysis = analyzeAvailabilityClient(events);
          return {
            connected: true,
            lastSynced: data.calendarLastSynced,
            events: events,
            availability: analysis
          };
        }
      }
    } catch (err) {
      console.error("Error fetching calendar events and availability:", err);
    }
    
    return { connected: false, events: [], availability: { busySlots: [], freeWindows: [] } };
  },

  async getGeminiDiagnostics(): Promise<any> {
    try {
      const res = await fetch("/api/diagnostics/gemini");
      if (!res.ok) {
        throw new Error("Failed to load Gemini diagnostics");
      }
      return await res.json();
    } catch (error: any) {
      console.error("[apiService] getGeminiDiagnostics error:", error);
      return {
        apiKeyPresent: false,
        clientInitialized: false,
        modelName: "gemini-2.5-flash",
        lastErrorCode: "FETCH_FAILED",
        lastErrorType: "CLIENT_ERROR",
        lastErrorMessage: error?.message || String(error),
        fallbackActive: true,
        timestamp: new Date().toISOString()
      };
    }
  }
};
