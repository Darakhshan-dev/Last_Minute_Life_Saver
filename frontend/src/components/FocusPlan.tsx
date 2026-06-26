import React, { useState } from "react";
import { Task, Subtask, PlanBlock } from "../types";
import { apiService } from "../services/api";
import { Play, Sparkles, CheckSquare, Square, RefreshCw, CalendarRange, Clock, AlertCircle } from "lucide-react";

interface FocusPlanProps {
  tasks: Task[];
  recommendation: {
    taskId: string;
    title: string;
    actionReason: string;
    suggestedTimeBlockMinutes: number;
  } | null;
  planBlocks: PlanBlock[];
  focusSummary: string;
  onGenerateDailyPlan: () => void;
  onCompleteTask: (taskId: string) => void;
  loadingPlan: boolean;
}

export default function FocusPlan({
  tasks,
  recommendation,
  planBlocks,
  focusSummary,
  onGenerateDailyPlan,
  onCompleteTask,
  loadingPlan,
}: FocusPlanProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [activeSubtaskTaskId, setActiveSubtaskTaskId] = useState<string | null>(null);

  // Load micro-subtasks for recommended task
  const handleGenerateSubtasks = async (task: Task) => {
    setLoadingSubtasks(true);
    setActiveSubtaskTaskId(task.id);
    try {
      const data = await apiService.breakTaskIntoSubtasks(task);
      if (data.subtasks) {
        setSubtasks(
          data.subtasks.map((st: any, idx: number) => ({
            id: `sub_${task.id}_${idx}`,
            taskId: task.id,
            title: st.title,
            estimatedMinutes: st.estimatedMinutes,
            completed: false,
            order: st.order,
            description: st.description,
          }))
        );
      }
    } catch (err) {
      console.error("Error breaking task into subtasks:", err);
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st))
    );
  };

  const recommendedTask = tasks.find((t) => t.id === recommendation?.taskId);

  return (
    <div className="space-y-6">
      {/* Sparkle Banner - Next Best Task To Do Now */}
      <div id="ai_focus_plan" className="bg-gradient-to-br from-indigo-950 via-neutral-900 to-neutral-950 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10"></div>
        
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles size={18} />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            Recommended Action Now
          </span>
        </div>

        {recommendation && recommendedTask ? (
          <div>
            <h3 className="text-xl font-extrabold text-white mb-2 leading-snug">
              {recommendedTask.title}
            </h3>
            <p className="text-sm text-neutral-300 mb-4 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/10 italic">
              " {recommendation.actionReason} "
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 mb-6">
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-indigo-400" />
                Est. Session: {recommendation.suggestedTimeBlockMinutes} minutes
              </span>
              <span className="bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/20">
                {recommendedTask.category}
              </span>
            </div>

            {/* Subtasks breakdown area */}
            <div className="space-y-3">
              {activeSubtaskTaskId === recommendedTask.id ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Action Steps Checklist
                    </span>
                    {loadingSubtasks && <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>}
                  </div>

                  {subtasks.length > 0 ? (
                    <div className="space-y-2 bg-neutral-950/40 border border-neutral-850 p-4 rounded-xl max-h-60 overflow-y-auto">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => toggleSubtask(st.id)}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-neutral-900/50 cursor-pointer transition select-none"
                        >
                          <span className="text-neutral-400 shrink-0 mt-0.5">
                            {st.completed ? (
                              <CheckSquare size={16} className="text-emerald-500" />
                            ) : (
                              <Square size={16} />
                            )}
                          </span>
                          <div className="flex-1">
                            <p className={`text-xs font-semibold ${st.completed ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
                              {st.title} ({st.estimatedMinutes}m)
                            </p>
                            {st.description && (
                              <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                                {st.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {subtasks.every((st) => st.completed) && (
                        <div className="mt-4 pt-3 border-t border-neutral-850 flex justify-between items-center">
                          <p className="text-xs text-emerald-400 font-mono">✓ All subtasks completed!</p>
                          <button
                            onClick={() => onCompleteTask(recommendedTask.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Mark Main Task Done
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    !loadingSubtasks && (
                      <p className="text-xs text-neutral-500 italic">No subtasks generated yet.</p>
                    )
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onCompleteTask(recommendedTask.id)}
                    className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Quick Complete
                  </button>
                  <button
                    onClick={() => handleGenerateSubtasks(recommendedTask)}
                    disabled={loadingSubtasks}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-950/40"
                  >
                    <Play size={14} />
                    Break Into Action Steps
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-400 text-sm">
            No recommendation generated yet. Please add tasks with deadline dates.
          </div>
        )}
      </div>

      {/* Daily Action Plan Calendar Blocks */}
      <div id="daily_action_plan" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CalendarRange size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Execution Blocks</h3>
              <p className="text-[11px] text-neutral-400 font-mono">AI-Generated Focus Timeline</p>
            </div>
          </div>

          <button
            onClick={onGenerateDailyPlan}
            disabled={loadingPlan || tasks.length === 0}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loadingPlan ? "animate-spin" : ""} />
            Re-Plan Today
          </button>
        </div>

        {loadingPlan ? (
          <div className="flex flex-col justify-center items-center py-12 text-neutral-400 gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-emerald-400 animate-pulse">Consulting Planner Agent...</p>
          </div>
        ) : planBlocks.length > 0 ? (
          <div className="space-y-4">
            {focusSummary && (
              <p className="text-xs font-medium text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 p-2.5 rounded-xl text-center leading-relaxed font-mono">
                🎯 {focusSummary}
              </p>
            )}

            <div className="relative pl-4 border-l-2 border-neutral-800 space-y-4 ml-2">
              {planBlocks.map((block, index) => (
                <div key={index} className="relative group">
                  {/* Indicator Dot */}
                  <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-neutral-900 ${
                    block.type === "focus"
                      ? "bg-indigo-500"
                      : block.type === "break"
                        ? "bg-emerald-500"
                        : block.type === "buffer"
                          ? "bg-amber-500"
                          : "bg-neutral-500"
                  }`}></span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">
                        {block.timeSlot}
                      </span>
                      <span className={`text-xs font-extrabold uppercase tracking-widest ${
                        block.type === "focus"
                          ? "text-indigo-400"
                          : block.type === "break"
                            ? "text-emerald-400"
                            : block.type === "buffer"
                              ? "text-amber-400"
                              : "text-neutral-400"
                      }`}>
                        {block.type}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition">
                      {block.title}
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                      {block.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800 flex flex-col items-center justify-center p-4">
            <AlertCircle className="text-neutral-500 mb-2" size={24} />
            <p className="text-xs text-neutral-400 mb-2">No active action blocks generated.</p>
            <button
              onClick={onGenerateDailyPlan}
              disabled={tasks.length === 0}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              Generate Savior Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
