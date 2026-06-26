import { db } from "../config/firebase";

export interface Task {
  id?: string;
  title: string;
  description?: string;
  deadline: string;
  estimatedHours: number;
  category: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "completed";
  createdAt?: string;
}

export interface UserProfile {
  userId: string;
  calendarConnected: boolean;
  calendarAccessToken?: string;
  calendarLastSynced?: string;
  cachedEvents?: any[];
}

export const firestoreService = {
  // Task CRUD operations
  async getTasks(userId: string): Promise<Task[]> {
    try {
      const querySnapshot = await db.collection("users").doc(userId).collection("tasks").get();
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      return tasks;
    } catch (err) {
      console.error("Error in firestoreService.getTasks:", err);
      throw err;
    }
  },

  async createTask(userId: string, taskData: Omit<Task, "id">): Promise<Task> {
    try {
      const taskDocRef = db.collection("users").doc(userId).collection("tasks").doc();
      const newTask = {
        ...taskData,
        userId,
        createdAt: new Date().toISOString()
      };
      await taskDocRef.set(newTask);
      return { id: taskDocRef.id, ...newTask };
    } catch (err) {
      console.error("Error in firestoreService.createTask:", err);
      throw err;
    }
  },

  async updateTask(userId: string, taskId: string, taskData: Partial<Task>): Promise<void> {
    try {
      const taskDocRef = db.collection("users").doc(userId).collection("tasks").doc(taskId);
      await taskDocRef.update(taskData);
    } catch (err) {
      console.error("Error in firestoreService.updateTask:", err);
      throw err;
    }
  },

  async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      const taskDocRef = db.collection("users").doc(userId).collection("tasks").doc(taskId);
      await taskDocRef.delete();
    } catch (err) {
      console.error("Error in firestoreService.deleteTask:", err);
      throw err;
    }
  },

  // User Profile / Calendar State operations
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const docRef = db.collection("users").doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { userId, ...docSnap.data() } as UserProfile;
      }
      // Return default profile if not exists
      return {
        userId,
        calendarConnected: false
      };
    } catch (err) {
      console.error("Error in firestoreService.getUserProfile:", err);
      return { userId, calendarConnected: false };
    }
  },

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = db.collection("users").doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        await docRef.update(profileData);
      } else {
        await docRef.set({ ...profileData, userId });
      }
    } catch (err) {
      console.error("Error in firestoreService.updateUserProfile:", err);
      throw err;
    }
  }
};
