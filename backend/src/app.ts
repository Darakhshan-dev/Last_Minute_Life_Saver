import express from "express";
import tasksRouter from "./routes/tasks";
import aiRouter from "./routes/ai";
import calendarRouter from "./routes/calendar";
import { geminiService } from "./services/geminiService";

const app = express();

// Middleware
app.use(express.json());

// Modular API Routers
app.use("/api/tasks", tasksRouter);
app.use("/api/ai", aiRouter);
app.use("/api/calendar", calendarRouter);

// Base Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Last-Minute Life Saver Core API Server",
    timestamp: new Date().toISOString()
  });
});

// Gemini Diagnostics Endpoint
app.get("/api/diagnostics/gemini", (req, res) => {
  try {
    res.json(geminiService.getDiagnostics());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch diagnostics", details: err?.message || err });
  }
});

export default app;
