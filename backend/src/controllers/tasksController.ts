import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { firestoreService } from "../services/firestoreService";

export const tasksController = {
  // Fetch all tasks for authenticated user
  async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const tasks = await firestoreService.getTasks(userId);
      res.json(tasks);
    } catch (err: any) {
      console.error("Error in getTasks controller:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  },

  // Create new task for authenticated user
  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { title, description, deadline, estimatedHours, category, priority, status } = req.body;

      if (!title || !deadline) {
        return res.status(400).json({ error: "Title and deadline are required" });
      }

      const newTask = await firestoreService.createTask(userId, {
        title,
        description: description || "",
        deadline,
        estimatedHours: parseFloat(estimatedHours) || 1,
        category: category || "General",
        priority: priority || "Medium",
        status: status || "pending"
      });

      res.status(201).json(newTask);
    } catch (err: any) {
      console.error("Error in createTask controller:", err);
      res.status(500).json({ error: "Failed to create task" });
    }
  },

  // Update existing task
  async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const taskData = req.body;

      if (!id) {
        return res.status(400).json({ error: "Task ID is required" });
      }

      await firestoreService.updateTask(userId, id, taskData);
      res.json({ success: true, message: "Task updated successfully" });
    } catch (err: any) {
      console.error("Error in updateTask controller:", err);
      res.status(500).json({ error: err.message || "Failed to update task" });
    }
  },

  // Delete existing task
  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Task ID is required" });
      }

      await firestoreService.deleteTask(userId, id);
      res.json({ success: true, message: "Task deleted successfully" });
    } catch (err: any) {
      console.error("Error in deleteTask controller:", err);
      res.status(500).json({ error: err.message || "Failed to delete task" });
    }
  }
};
