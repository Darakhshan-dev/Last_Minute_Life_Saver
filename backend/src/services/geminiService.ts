import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared Diagnostics State
let lastErrorDetails: {
  code: number | string | null;
  status: string | null;
  message: string | null;
  timestamp: string | null;
} = {
  code: null,
  status: null,
  message: null,
  timestamp: null
};

let isFallbackActive = false;
let isInitializedSuccessfully = false;

// Initialize the Gemini client lazily to prevent crashing on startup if key is missing
let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "placeholder-key-for-initialization",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Detailed error parsing helper distinguishing multiple levels of failure
function parseGeminiError(err: any): { code: number | string; status: string; message: string } {
  const errorMessage = err?.message || String(err);
  
  // 1. Missing API Key
  if (!process.env.GEMINI_API_KEY) {
    return {
      code: "MISSING_KEY",
      status: "MISSING_API_KEY",
      message: "No Gemini API key is configured. The app is running smoothly in free fallback mode with offline AI. You can optionally connect a free-tier API key in Settings > Secrets."
    };
  }

  // 2. Project Denied Access (403 Status / PERMISSION_DENIED)
  if (
    errorMessage.includes("403") || 
    errorMessage.includes("PERMISSION_DENIED") || 
    errorMessage.includes("denied access") ||
    errorMessage.includes("entitlement") ||
    errorMessage.includes("project has been denied access")
  ) {
    return {
      code: 403,
      status: "PERMISSION_DENIED",
      message: "Gemini project entitlement access was denied (403). Running beautifully in free fallback mode with local task prioritization."
    };
  }

  // 3. Invalid API Key (400 Status / INVALID_ARGUMENT / API key not valid)
  if (
    errorMessage.includes("API key not valid") || 
    errorMessage.includes("key is invalid") || 
    errorMessage.includes("INVALID_KEY") ||
    errorMessage.includes("invalid key") ||
    (errorMessage.includes("400") && errorMessage.includes("key"))
  ) {
    return {
      code: 400,
      status: "INVALID_API_KEY",
      message: "The configured Gemini API key is invalid. The resilient local fallback engine is active and handling your queries."
    };
  }

  // 4. Quota Issue (429 Status / RESOURCE_EXHAUSTED)
  if (
    errorMessage.includes("429") || 
    errorMessage.includes("RESOURCE_EXHAUSTED") || 
    errorMessage.includes("quota") ||
    errorMessage.includes("rate limit")
  ) {
    return {
      code: 429,
      status: "QUOTA_EXCEEDED",
      message: "Gemini free-tier quota limits have been reached. Fallback local advisor has taken over automatically."
    };
  }

  // 5. Model Not Found (404 Status / NOT_FOUND)
  if (
    errorMessage.includes("404") || 
    errorMessage.includes("not found") || 
    errorMessage.includes("NOT_FOUND")
  ) {
    return {
      code: 404,
      status: "MODEL_NOT_FOUND",
      message: "The free-tier model was not found. Please verify that gemini-2.5-flash is supported."
    };
  }

  // Generic Error
  return {
    code: err?.status || err?.code || "UNKNOWN",
    status: "API_ERROR",
    message: errorMessage
  };
}

export const geminiService = {
  // Check the diagnostics status of Gemini
  getDiagnostics() {
    return {
      apiKeyPresent: !!process.env.GEMINI_API_KEY,
      clientInitialized: isInitializedSuccessfully,
      modelName: "gemini-2.5-flash",
      lastErrorCode: lastErrorDetails.code,
      lastErrorType: lastErrorDetails.status,
      lastErrorMessage: lastErrorDetails.message,
      lastErrorTimestamp: lastErrorDetails.timestamp,
      fallbackActive: isFallbackActive,
      freeModeActive: true,
      timestamp: new Date().toISOString()
    };
  },

  // Perform startup self-check and auto-enable fallback if it fails
  async runStartupSelfCheck(): Promise<any> {
    console.log("[Gemini Startup Self-Check] Commencing configuration and entitlement audit...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("[Gemini Startup Self-Check] Offline mode active: No GEMINI_API_KEY is configured.");
      isFallbackActive = true;
      lastErrorDetails = {
        code: "MISSING_KEY",
        status: "MISSING_API_KEY",
        message: "The GEMINI_API_KEY environment variable is not defined in Settings > Secrets.",
        timestamp: new Date().toISOString()
      };
      return { success: false, error: "Missing API Key" };
    }

    try {
      const ai = getAIClient();
      console.log("[Gemini Startup Self-Check] Gemini client initialized. Verifying API connectivity...");
      
      // Perform a tiny, fast connectivity request to verify project access/key validity
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello, reply with only the word OK",
      });

      const responseText = response.text?.trim() || "";
      console.log("[Gemini Startup Self-Check] SUCCESS: Gemini API responded with text:", responseText);
      isInitializedSuccessfully = true;
      isFallbackActive = false;
      lastErrorDetails = {
        code: null,
        status: "HEALTHY",
        message: "Startup self-check completed and passed successfully.",
        timestamp: new Date().toISOString()
      };
      return { success: true };
    } catch (err: any) {
      isFallbackActive = true;
      isInitializedSuccessfully = false;
      
      const parsed = parseGeminiError(err);
      lastErrorDetails = {
        code: parsed.code,
        status: parsed.status,
        message: parsed.message,
        timestamp: new Date().toISOString()
      };

      console.log(`[Gemini Startup Self-Check] Info: Gemini free tier mode engaged (status: ${parsed.status}). Fallback offline engine successfully activated.`);
      return { success: false, error: parsed.message };
    }
  },

  // 1. Analyze and Prioritize Tasks
  async analyzeAndPrioritize(tasks: any[], currentTime: string): Promise<any> {
    console.log(`[Gemini Request] analyzeAndPrioritize invoked. Tasks count: ${tasks?.length || 0}`);
    
    if (isFallbackActive || !process.env.GEMINI_API_KEY) {
      console.log("[Gemini Engine] Using local prioritization engine (unpaid/offline flow active).");
      const fallbackData = this.fallbackPrioritization(tasks, currentTime);
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: lastErrorDetails.code || "OFFLINE_MODE",
        errorType: lastErrorDetails.status || "FALLBACK",
        message: lastErrorDetails.message || "Running in offline fallback mode.",
        fallbackActive: true
      };
    }

    if (!tasks || tasks.length === 0) {
      return {
        priorities: [],
        recommendation: null,
        warnings: [
          {
            type: "general",
            title: "No active tasks",
            message: "Add some urgent tasks or commitments to unlock AI-powered prevention plans."
          }
        ],
        insights: [
          {
            category: "Getting Started",
            tip: "An assistant is only as good as its intel. Add tasks with clear deadlines and effort estimates to get personalized risk detection."
          }
        ]
      };
    }

    try {
      const prompt = `
        You are the "Last-Minute Life Saver" core prioritization engine. 
        Analyze the following user tasks relative to the current local time: ${currentTime}.
        
        Tasks list:
        ${JSON.stringify(tasks, null, 2)}
        
        Perform an agentic planning analysis:
        1. Calculate a priority score (1 to 100) for each task based on:
           - Proximity of deadline (closer = higher score)
           - Estimated effort (longer effort near deadline = massive risk / extremely high score)
           - Priority field (High/Medium/Low)
           - Urgency of consequences (e.g. exams, bill payments, interviews have higher penalty)
        2. Set urgency ("high", "medium", "low") and riskStatus ("overdue", "high_risk", "at_risk", "safe").
        3. Write a sharp, human-like reason explaining why it is prioritized. Keep reasons brief (under 15 words) and highly direct.
        4. Select ONE best task to recommend the user do NOW. This must be the highest leverage task to prevent a last-minute disaster. Specify an appropriate focus session duration (e.g., 25 min, 50 min) based on the task effort.
        5. Generate up to 3 warning cards. Detect if tasks are at risk of missing deadlines (e.g., effort > remaining time, or multiple high-priority tasks overlapping soon).
        6. Provide 2-3 personalized, short, coach-like productivity insights (under 20 words each) tailored to their workload.
      `;

      const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priorities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    urgency: { type: Type.STRING, description: "high, medium, or low" },
                    riskStatus: { type: Type.STRING, description: "overdue, high_risk, at_risk, or safe" },
                    reason: { type: Type.STRING }
                  },
                  required: ["taskId", "score", "urgency", "riskStatus", "reason"]
                }
              },
              recommendation: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  actionReason: { type: Type.STRING, description: "Compelling explanation of why to start this now" },
                  suggestedTimeBlockMinutes: { type: Type.NUMBER }
                },
                required: ["taskId", "title", "actionReason", "suggestedTimeBlockMinutes"]
              },
              warnings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "miss_deadline, high_load, start_today, or general" },
                    title: { type: Type.STRING },
                    message: { type: Type.STRING },
                    taskId: { type: Type.STRING }
                  },
                  required: ["type", "title", "message"]
                }
              },
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    tip: { type: Type.STRING }
                  },
                  required: ["category", "tip"]
                }
              }
            },
            required: ["priorities", "recommendation", "warnings", "insights"]
          }
        }
      });

      // Clear any previous error and mark fallback as inactive
      isFallbackActive = false;
      return JSON.parse(response.text?.trim() || "{}");
    } catch (error: any) {
      const parsed = parseGeminiError(error);
      lastErrorDetails = {
        code: parsed.code,
        status: parsed.status,
        message: parsed.message,
        timestamp: new Date().toISOString()
      };
      isFallbackActive = true;

      console.log(`[Gemini Engine] Info: Prioritization processed using local engine. Status: ${parsed.status}.`);
      
      const fallbackData = this.fallbackPrioritization(tasks, currentTime);
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: parsed.code,
        errorType: parsed.status,
        message: parsed.message,
        fallbackActive: true
      };
    }
  },

  // 2. Break Large Tasks into Subtasks
  async generateSubtasks(task: any): Promise<any> {
    console.log(`[Gemini Request] generateSubtasks invoked for task: ${task?.title}`);
    if (!task) {
      throw new Error("Task data is required for subtask generation");
    }

    if (isFallbackActive || !process.env.GEMINI_API_KEY) {
      console.log("[Gemini Engine] Using local subtask generator (unpaid/offline flow active).");
      const fallbackData = {
        subtasks: [
          {
            title: `Analyze core requirements`,
            estimatedMinutes: 15,
            order: 1,
            description: `Review requirements and prepare a solid execution roadmap for "${task.title}".`
          },
          {
            title: "Design outline or model draft",
            estimatedMinutes: 30,
            order: 2,
            description: "Establish structural details to quickly bypass starting friction."
          },
          {
            title: "Execute heavy implementation",
            estimatedMinutes: 45,
            order: 3,
            description: "Conduct primary work, build core modules or write main components."
          },
          {
            title: "Polish and review",
            estimatedMinutes: 15,
            order: 4,
            description: "Check for compliance, fix issues, and finalize deliverables."
          }
        ]
      };
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: lastErrorDetails.code || "OFFLINE_MODE",
        errorType: lastErrorDetails.status || "FALLBACK",
        message: lastErrorDetails.message || "Running in offline fallback mode.",
        fallbackActive: true
      };
    }

    try {
      const prompt = `
        You are an expert project manager and cognitive load reducer.
        Break down the following task into a logical sequence of 3-6 actionable, bite-sized subtasks to eliminate procrastination and make starting trivial.
        
        Task Details:
        - Title: ${task.title}
        - Description: ${task.description || "No description provided"}
        - Estimated Effort: ${task.estimatedHours} hours
        - Category: ${task.category}
        - Priority: ${task.priority}
        
        Each subtask must contain:
        1. A short, concrete action-oriented title (e.g., "Draft outline on scratchpad", NOT "Plan writing").
        2. Estimated minutes required (usually 15 to 45 minutes to keep it manageable).
        3. A sequential order number.
        4. A brief, tactical description of exactly what to do.
      `;

      const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    estimatedMinutes: { type: Type.NUMBER },
                    order: { type: Type.NUMBER },
                    description: { type: Type.STRING }
                  },
                  required: ["title", "estimatedMinutes", "order", "description"]
                }
              }
            },
            required: ["subtasks"]
          }
        }
      });

      // Clear any previous error and mark fallback as inactive
      isFallbackActive = false;
      return JSON.parse(response.text?.trim() || "{}");
    } catch (error: any) {
      const parsed = parseGeminiError(error);
      lastErrorDetails = {
        code: parsed.code,
        status: parsed.status,
        message: parsed.message,
        timestamp: new Date().toISOString()
      };
      isFallbackActive = true;

      console.log(`[Gemini Engine] Info: Subtask compilation bypassed to local engine. Status: ${parsed.status}.`);
      
      const fallbackData = {
        subtasks: [
          {
            title: `Analyze core requirements`,
            estimatedMinutes: 15,
            order: 1,
            description: `Review requirements and prepare a solid execution roadmap for "${task.title}".`
          },
          {
            title: "Design outline or model draft",
            estimatedMinutes: 30,
            order: 2,
            description: "Establish structural details to quickly bypass starting friction."
          },
          {
            title: "Execute heavy implementation",
            estimatedMinutes: 45,
            order: 3,
            description: "Conduct primary work, build core modules or write main components."
          },
          {
            title: "Polish and review",
            estimatedMinutes: 15,
            order: 4,
            description: "Check for compliance, fix issues, and finalize deliverables."
          }
        ]
      };
      
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: parsed.code,
        errorType: parsed.status,
        message: parsed.message,
        fallbackActive: true
      };
    }
  },

  // 3. Generate structured Focus Plan incorporating Calendar data
  async generateDailyPlan(tasks: any[], currentTime: string, calendarEvents: any[]): Promise<any> {
    console.log(`[Gemini Request] generateDailyPlan invoked. Tasks count: ${tasks?.length || 0}, Events count: ${calendarEvents?.length || 0}`);
    
    if (isFallbackActive || !process.env.GEMINI_API_KEY) {
      console.log("[Gemini Engine] Using local scheduler (unpaid/offline flow active).");
      const fallbackData = this.fallbackDailyPlan(tasks, currentTime, calendarEvents);
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: lastErrorDetails.code || "OFFLINE_MODE",
        errorType: lastErrorDetails.status || "FALLBACK",
        message: lastErrorDetails.message || "Running in offline fallback mode.",
        fallbackActive: true
      };
    }

    try {
      const prompt = `
        You are the "Last-Minute Life Saver" focus scheduler.
        Generate a realistic, focused hour-by-hour or block-by-block Focus Plan for today, starting from the current local time: ${currentTime}.
        
        We want to block out time dynamically to tackle urgent or high-risk tasks while inserting necessary micro-breaks or buffers to prevent burnout.
        
        IMPORTANT: Take into account these upcoming Google Calendar events. You MUST NOT schedule focus blocks during these times, as the user is busy! Instead, include "calendar" block types representing these commitments so the user sees a combined timeline.
        Calendar events:
        ${JSON.stringify(calendarEvents || [], null, 2)}
        
        Active tasks list:
        ${JSON.stringify(tasks || [], null, 2)}
        
        Output an array of planning blocks. Types allowed: "focus" (deep work on a task), "break" (5-15 min rest), "buffer" (admin/planning/breathing room), "calendar" (for Google Calendar events).
        Limit the plan to the next 6-8 hours of constructive time.
        
        Provide a highly motivating, short action-oriented focus summary (max 40 words). This summary MUST mention specific Google Calendar insights where relevant, such as:
        - "You are free from 6 PM to 7 PM, work on Assignment 2"
        - "Tomorrow is overloaded with meetings, let's start this task today"
      `;

      const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timeSlot: { type: Type.STRING, description: "e.g., 09:00 - 10:00" },
                    type: { type: Type.STRING, description: "focus, break, buffer, or calendar" },
                    title: { type: Type.STRING },
                    taskId: { type: Type.STRING, description: "Referenced taskId if it is a focus block" },
                    description: { type: Type.STRING, description: "Actionable focus or event instructions" }
                  },
                  required: ["timeSlot", "type", "title", "description"]
                }
              },
              focusSummary: { type: Type.STRING }
            },
            required: ["planBlocks", "focusSummary"]
          }
        }
      });

      // Clear any previous error and mark fallback as inactive
      isFallbackActive = false;
      return JSON.parse(response.text?.trim() || "{}");
    } catch (error: any) {
      const parsed = parseGeminiError(error);
      lastErrorDetails = {
        code: parsed.code,
        status: parsed.status,
        message: parsed.message,
        timestamp: new Date().toISOString()
      };
      isFallbackActive = true;

      console.log(`[Gemini Engine] Info: Daily plan compiled using local engine. Status: ${parsed.status}.`);
      
      const fallbackData = this.fallbackDailyPlan(tasks, currentTime, calendarEvents);
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: parsed.code,
        errorType: parsed.status,
        message: parsed.message,
        fallbackActive: true
      };
    }
  },

  // 4. Context-Aware Chat Assistant
  async chat(message: string, chatHistory: any[], tasks: any[], currentTime: string, calendarEvents: any[]): Promise<any> {
    console.log(`[Gemini Request] chat invoked. Message: "${message}"`);
    
    if (isFallbackActive || !process.env.GEMINI_API_KEY) {
      console.log("[Gemini Engine] Using local chat assistant (unpaid/offline flow active).");
      const fallbackData = this.fallbackChat(message, tasks, currentTime);
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: lastErrorDetails.code || "OFFLINE_MODE",
        errorType: lastErrorDetails.status || "FALLBACK",
        message: lastErrorDetails.message || "Running in offline fallback mode.",
        fallbackActive: true
      };
    }

    try {
      const prompt = `
        You are the ultimate human-centric, proactive, agentic productivity assistant for the "Last-Minute Life Saver" application.
        
        Your goal is to save the user from missing deadlines, falling behind, and procrastinating.
        You must guide action, prioritize deadline prevention, planning, and execution.
        Never just say "Sure, here is your list." Instead, say "I analyzed your deadlines and calendar, and here is exactly how we are going to tackle this..."
        
        Current Local Time: ${currentTime}
        
        Active Tasks List:
        ${JSON.stringify(tasks || [], null, 2)}
        
        Google Calendar Commitments:
        ${JSON.stringify(calendarEvents || [], null, 2)}
        
        Conversation History:
        ${JSON.stringify(chatHistory || [], null, 2)}
        
        User message: "${message}"
        
        Provide:
        1. A conversational response formatted in crisp, easy-to-read Markdown. Emphasize urgency, actionable guidance, and keep it under 150 words. Be specific about their calendar commitments if they overlap with task deadlines.
        2. 2-3 suggested quick action buttons the user can click in the UI to resolve issues (e.g. "Generate plan blocks", "Identify high-risk task", "Break down my exam prep").
      `;

      const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING, description: "Markdown styled assistant response" },
              suggestedActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "Button text" },
                    action: { type: Type.STRING, description: "Specific topic/prompt triggered by the button" }
                  },
                  required: ["label", "action"]
                }
              }
            },
            required: ["response", "suggestedActions"]
          }
        }
      });

      // Clear any previous error and mark fallback as inactive
      isFallbackActive = false;
      return JSON.parse(response.text?.trim() || "{}");
    } catch (error: any) {
      const parsed = parseGeminiError(error);
      lastErrorDetails = {
        code: parsed.code,
        status: parsed.status,
        message: parsed.message,
        timestamp: new Date().toISOString()
      };
      isFallbackActive = true;

      console.log(`[Gemini Engine] Info: Chat request processed using local engine. Status: ${parsed.status}.`);
      
      const fallbackData = this.fallbackChat(message, tasks, currentTime);
      return {
        ...fallbackData,
        success: false,
        source: "gemini",
        errorCode: parsed.code,
        errorType: parsed.status,
        message: parsed.message,
        fallbackActive: true
      };
    }
  },

  // --- Local Fallback Engines to ensure absolute resilience ---
  fallbackPrioritization(tasks: any[], currentTime: string): any {
    const priorities = tasks.map((task: any) => {
      let score = 30;

      if (task.category === "Assignment" || task.category === "Exam") score += 15;
      else if (task.category === "Bill") score += 20;
      else if (task.category === "Meeting" || task.category === "Interview") score += 25;

      if (task.priority === "High") score += 20;
      else if (task.priority === "Medium") score += 10;
      else if (task.priority === "Low") score += 5;

      const deadlineTime = new Date(task.deadline).getTime();
      const currentMs = new Date(currentTime).getTime();
      const hoursRemaining = (deadlineTime - currentMs) / (1000 * 60 * 60);

      let riskStatus = "safe";
      let urgency = "low";
      let reason = "Ample time remains to finish.";

      if (hoursRemaining < 0) {
        score += 45;
        riskStatus = "overdue";
        urgency = "high";
        reason = "Past stated deadline!";
      } else if (hoursRemaining <= 12) {
        score += 35;
        riskStatus = "high_risk";
        urgency = "high";
        reason = `Urgent! Only ${Math.round(hoursRemaining)}h left.`;
      } else if (hoursRemaining <= 24) {
        score += 25;
        riskStatus = "high_risk";
        urgency = "high";
        reason = "Due tomorrow. Action needed.";
      } else if (hoursRemaining <= 48) {
        score += 15;
        riskStatus = "at_risk";
        urgency = "medium";
        reason = "Approaching mid-term deadline.";
      }

      if (hoursRemaining > 0 && task.estimatedHours > hoursRemaining) {
        score += 20;
        riskStatus = "high_risk";
        urgency = "high";
        reason = "Effort estimate exceeds remaining hours!";
      }

      return {
        taskId: task.id,
        score: Math.min(Math.max(score, 1), 100),
        urgency,
        riskStatus,
        reason,
      };
    });

    priorities.sort((a: any, b: any) => b.score - a.score);

    let recommendation = null;
    if (tasks.length > 0) {
      const topPriority = priorities[0];
      const topTask = tasks.find((t: any) => t.id === topPriority.taskId);
      if (topTask) {
        recommendation = {
          taskId: topTask.id,
          title: topTask.title,
          actionReason: `Focus here. The risk rating is ${topPriority.score}/100 and demands immediate progress.`,
          suggestedTimeBlockMinutes: topTask.estimatedHours > 2 ? 50 : 25,
        };
      }
    }

    const warnings = [];
    const highRiskCount = priorities.filter(
      (p: any) => p.riskStatus === "high_risk" || p.riskStatus === "overdue"
    ).length;

    if (highRiskCount > 0) {
      warnings.push({
        type: "high_load",
        title: `${highRiskCount} High-Risk Milestones`,
        message: "You have several tight deadlines requiring focused coordination today.",
        taskId: priorities[0]?.taskId,
      });
    } else {
      warnings.push({
        type: "general",
        title: "Deadlines in clean status",
        message: "All current tasks are spaced out safely. Maintain the rhythm!",
      });
    }

    const insights = [
      {
        category: "Focused Sprints",
        tip: "Employ 25-minute sprints to conquer administrative items.",
      },
      {
        category: "Cognitive Load",
        tip: "Avoid procrastination by creating subtask lists for complex tasks.",
      }
    ];

    return { priorities, recommendation, warnings, insights };
  },

  fallbackDailyPlan(tasks: any[], currentTime: string, calendarEvents: any[]): any {
    const activeTasks = tasks || [];
    const planBlocks = [];
    
    const now = new Date(currentTime);
    let currentHour = now.getHours();
    let currentMinute = now.getMinutes() >= 30 ? 30 : 0;
    
    const formatTime = (h: number, m: number) => {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      return `${hh}:${mm}`;
    };

    // First add Google Calendar busy blocks if any
    if (calendarEvents && calendarEvents.length > 0) {
      calendarEvents.slice(0, 2).forEach((event) => {
        const estart = new Date(event.start?.dateTime || event.start?.date);
        const eend = new Date(event.end?.dateTime || event.end?.date);
        planBlocks.push({
          timeSlot: `${formatTime(estart.getHours(), estart.getMinutes())} - ${formatTime(eend.getHours(), eend.getMinutes())}`,
          type: "calendar",
          title: `Google Event: ${event.summary}`,
          description: "Stated busy slot on linked Google Calendar."
        });
      });
    }

    if (activeTasks.length > 0) {
      const t1 = activeTasks[0];
      planBlocks.push({
        timeSlot: `${formatTime(currentHour, currentMinute)} - ${formatTime(currentHour + 1, currentMinute)}`,
        type: "focus",
        title: `Deep Work: ${t1.title}`,
        taskId: t1.id,
        description: "Focus purely on core milestones. Minimize external distractions completely."
      });
      currentHour += 1;

      planBlocks.push({
        timeSlot: `${formatTime(currentHour, currentMinute)} - ${formatTime(currentHour, currentMinute + 15)}`,
        type: "break",
        title: "Rejuvenating Rest Break",
        description: "Step away from screens, do light stretching, and refresh."
      });
      currentMinute += 15;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }

      const t2 = activeTasks[1] || t1;
      planBlocks.push({
        timeSlot: `${formatTime(currentHour, currentMinute)} - ${formatTime(currentHour + 1, currentMinute)}`,
        type: "focus",
        title: `Deep Work: ${t2.title}`,
        taskId: t2.id,
        description: "Maintain execution velocity. Build progress increments on task milestones."
      });
    } else {
      planBlocks.push({
        timeSlot: `${formatTime(currentHour, currentMinute)} - ${formatTime(currentHour + 1, currentMinute)}`,
        type: "buffer",
        title: "Strategic Planning",
        description: "You have no active high-risk deadlines! Use this window to review upcoming milestones."
      });
    }

    return {
      planBlocks,
      focusSummary: "Heuristically structured hour-by-hour timeline prioritizing approaching deadlines and calendar availability."
    };
  },

  fallbackChat(message: string, tasks: any[], currentTime: string): any {
    const activeCount = tasks ? tasks.length : 0;
    const msgLower = message.toLowerCase();
    
    let adviceText = "";
    let suggestedActions = [
      { label: "Plan next 3 hours", action: "Help me plan the next 3 hours." },
      { label: "What to do first?", action: "What should I do first today?" }
    ];

    if (msgLower.includes("plan") || msgLower.includes("schedule")) {
      adviceText = `I've prepared a custom focus plan to block out your time effectively! 
      
      With **${activeCount} active items** on your plate, it is crucial to avoid context switching.
      
      *Your Immediate Sprint:*
      1. Click **"Generate structured plan blocks"** above to map out a clear hour-by-hour roadmap.
      2. Alternate 50-minute deep work intervals with 10-minute rest breaks.
      3. Commit strictly to the single highest-priority task first.`;
    } else if (activeCount > 0) {
      const topTask = tasks[0];
      adviceText = `Let's tackle your priorities systematically! Your closest impending milestone is **"${topTask.title}"** (due ${new Date(topTask.deadline).toLocaleDateString()}).
      
      *Proactive Defense Blueprint:*
      - **Divide & Conquer**: Click **"Generate Subtasks"** next to this task to eliminate starting anxiety.
      - **Deep focus**: Dedicate a clear 25-minute block with all notifications silenced.
      - **Buffer**: Build extra time padding for this item in case of unforeseen scope creep.
      
      How can I help you set up or divide this task right now?`;
    } else {
      adviceText = `Excellent news! You have no pending urgent deadlines or high-risk tasks left on your list. 
      
      This is the perfect window to proactively map out future goals or take a well-deserved rest.
      
      If you want to run a dry run, click **"Seed Sandbox Demo Data"** to load realistic deadlines and practice planning with me!`;
    }

    return {
      response: adviceText,
      suggestedActions
    };
  }
};
