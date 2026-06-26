import React from "react";
import { AlertTriangle, Calendar, ShieldAlert } from "lucide-react";

interface WarningCard {
  type: "miss_deadline" | "high_load" | "start_today" | "general";
  title: string;
  message: string;
  taskId?: string;
}

interface WarningCardsProps {
  warnings: WarningCard[];
  onFocusTask?: (taskId: string) => void;
}

export default function WarningCards({ warnings, onFocusTask }: WarningCardsProps) {
  if (warnings.length === 0) return null;

  return (
    <div id="warning_cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {warnings.map((warn, index) => {
        const isMissDeadline = warn.type === "miss_deadline";
        const isHighLoad = warn.type === "high_load";

        return (
          <div
            key={index}
            className={`border rounded-2xl p-4 flex gap-3 relative overflow-hidden transition duration-200 hover:-translate-y-0.5 shadow-md ${
              isMissDeadline
                ? "bg-red-500/10 border-red-500/20 text-red-200"
                : isHighLoad
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-200"
            }`}
          >
            {/* Left Accent Bar */}
            <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              isMissDeadline ? "bg-red-500" : isHighLoad ? "bg-amber-500" : "bg-blue-500"
            }`}></span>

            <div className={`p-2 rounded-xl h-fit ${
              isMissDeadline
                ? "bg-red-500/10 text-red-400"
                : isHighLoad
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-blue-500/10 text-blue-400"
            }`}>
              {isMissDeadline ? (
                <ShieldAlert size={20} />
              ) : isHighLoad ? (
                <AlertTriangle size={20} />
              ) : (
                <Calendar size={20} />
              )}
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-bold text-white leading-tight mb-1">
                {warn.title}
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed mb-2">
                {warn.message}
              </p>

              {warn.taskId && onFocusTask && (
                <button
                  onClick={() => onFocusTask(warn.taskId!)}
                  className={`text-xs font-bold uppercase tracking-wider font-mono hover:underline ${
                    isMissDeadline
                      ? "text-red-400 hover:text-red-300"
                      : isHighLoad
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-blue-400 hover:text-blue-300"
                  }`}
                >
                  Focus This Task →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
