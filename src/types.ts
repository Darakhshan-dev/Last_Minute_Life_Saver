export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // ISO format: YYYY-MM-DDTHH:mm
  estimatedHours: number;
  category: "Assignment" | "Bill" | "Meeting" | "Interview" | "Commitment" | "Other";
  priority: "High" | "Medium" | "Low";
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  order: number;
  description?: string;
}

export interface PriorityAnalysis {
  taskId: string;
  score: number;
  urgency: "high" | "medium" | "low";
  riskStatus: "overdue" | "high_risk" | "at_risk" | "safe";
  reason: string;
}

export interface AnalysisResponse {
  priorities: PriorityAnalysis[];
  recommendation: {
    taskId: string;
    title: string;
    actionReason: string;
    suggestedTimeBlockMinutes: number;
  } | null;
  warnings: Array<{
    type: "miss_deadline" | "high_load" | "start_today" | "general";
    title: string;
    message: string;
    taskId?: string;
  }>;
  insights: Array<{
    category: string;
    tip: string;
  }>;
}

export interface PlanBlock {
  timeSlot: string;
  type: "focus" | "break" | "buffer" | "admin";
  title: string;
  taskId?: string;
  description: string;
}

export interface DailyPlanResponse {
  planBlocks: PlanBlock[];
  focusSummary: string;
}

export interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  suggestedActions?: Array<{ label: string; action: string }>;
}
