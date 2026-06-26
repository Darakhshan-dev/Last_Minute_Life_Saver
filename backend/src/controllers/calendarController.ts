import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { calendarService } from "../services/calendarService";

export const calendarController = {
  // GET: Retrieve Google Calendar connection status (Stubbed - handled client-side)
  async getStatus(req: AuthenticatedRequest, res: Response) {
    res.json({
      connected: false,
      lastSynced: null
    });
  },

  // POST: Securely connect calendar (Stubbed - handled client-side)
  async connect(req: AuthenticatedRequest, res: Response) {
    res.json({ success: true, message: "Calendar connected successfully!" });
  },

  // POST: Trigger calendar synchronization
  async sync(req: AuthenticatedRequest, res: Response) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: "Access token is required" });
      }

      // Fetch calendar events
      const events = await calendarService.fetchUpcomingEvents(accessToken);
      
      // Analyze free slots & availability
      const analysis = calendarService.analyzeAvailability(events);

      res.json({
        success: true,
        lastSynced: new Date().toISOString(),
        eventsCount: events.length,
        events,
        analysis
      });
    } catch (err: any) {
      console.error("Error during sync:", err);
      // Check if it's token expiration
      if (err.message && err.message.includes("401")) {
        return res.status(401).json({ error: "Google Calendar authorization has expired. Please reconnect." });
      }
      res.status(500).json({ error: "Failed to sync calendar events." });
    }
  },

  // GET: Retrieve cached Google Calendar events and availability slots (Stubbed - handled client-side)
  async getEvents(req: AuthenticatedRequest, res: Response) {
    res.json({ connected: false, events: [], availability: { busySlots: [], freeWindows: [] } });
  }
};
