import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { geminiService } from "../services/geminiService";

export const aiController = {
  // GET: Retrieve diagnostics data about the Gemini configuration and health
  async getDiagnostics(req: AuthenticatedRequest, res: Response) {
    try {
      const diag = geminiService.getDiagnostics();
      res.json(diag);
    } catch (err: any) {
      console.error("Error in AI diagnostics controller:", err);
      res.status(500).json({ error: "Failed to load Gemini diagnostics info" });
    }
  },

  // POST: Prioritize tasks based on deadline proximity and effort estimates
  async prioritize(req: AuthenticatedRequest, res: Response) {
    try {
      const { tasks, currentTime } = req.body;
      const tasksToPrioritize = tasks || [];

      console.log("[AI Controller] Prioritize request received.");
      const analysis = await geminiService.analyzeAndPrioritize(tasksToPrioritize, currentTime || new Date().toISOString());
      
      // If the service indicates a 403 Permission Denied or key issue, we still return 200 with fallback data plus the metadata
      res.json(analysis);
    } catch (err: any) {
      console.error("Unhandled error in AI prioritize controller:", err);
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
        return res.status(403).json({
          success: false,
          source: "gemini",
          errorCode: 403,
          errorType: "PERMISSION_DENIED",
          message: "Gemini project access is restricted (403). Local fallback offline engine is fully active to handle your request."
        });
      }
      res.status(500).json({ error: "Failed to perform AI task prioritization" });
    }
  },

  // POST: Break down a task into actionable micro-subtasks
  async generateSubtasks(req: AuthenticatedRequest, res: Response) {
    try {
      const { task } = req.body;
      if (!task) {
        return res.status(400).json({ error: "Task data is required" });
      }

      console.log("[AI Controller] Subtasks generation request received.");
      const result = await geminiService.generateSubtasks(task);
      res.json(result);
    } catch (err: any) {
      console.error("Unhandled error in AI subtasks controller:", err);
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
        return res.status(403).json({
          success: false,
          source: "gemini",
          errorCode: 403,
          errorType: "PERMISSION_DENIED",
          message: "Gemini project access is restricted (403). Local fallback offline engine is fully active to handle your request."
        });
      }
      res.status(500).json({ error: "Failed to generate AI subtasks" });
    }
  },

  // POST: Generate daily structured hour-by-hour focus plan
  async generateDailyPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { tasks, calendarEvents, currentTime } = req.body;
      const tasksToPlan = tasks || [];
      const events = calendarEvents || [];

      console.log("[AI Controller] Focus plan request received.");
      const plan = await geminiService.generateDailyPlan(
        tasksToPlan,
        currentTime || new Date().toISOString(),
        events
      );
      res.json(plan);
    } catch (err: any) {
      console.error("Unhandled error in AI daily plan controller:", err);
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
        return res.status(403).json({
          success: false,
          source: "gemini",
          errorCode: 403,
          errorType: "PERMISSION_DENIED",
          message: "Gemini project access is restricted (403). Local fallback offline engine is fully active to handle your request."
        });
      }
      res.status(500).json({ error: "Failed to generate focus plan" });
    }
  },

  // POST: Proactive productivity chat advisor
  async chat(req: AuthenticatedRequest, res: Response) {
    try {
      const { message, chatHistory, tasks, calendarEvents, currentTime } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message content is required" });
      }

      console.log("[AI Controller] Chat request received.");
      const tasksToChat = tasks || [];
      const events = calendarEvents || [];

      const response = await geminiService.chat(
        message,
        chatHistory || [],
        tasksToChat,
        currentTime || new Date().toISOString(),
        events
      );
      res.json(response);
    } catch (err: any) {
      console.error("Unhandled error in AI chat controller:", err);
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
        return res.status(403).json({
          success: false,
          source: "gemini",
          errorCode: 403,
          errorType: "PERMISSION_DENIED",
          message: "Gemini project access is restricted (403). Local fallback offline engine is fully active to handle your request."
        });
      }
      res.status(500).json({ error: "Failed to process chat assistant query" });
    }
  }
};
