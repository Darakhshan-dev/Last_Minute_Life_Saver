import React from "react";
import { Task } from "../types";
import { CheckCircle2, AlertTriangle, ListTodo, TrendingUp } from "lucide-react";

interface AnalyticsProps {
  tasks: Task[];
  highRiskCount: number;
}

export default function Analytics({ tasks, highRiskCount }: AnalyticsProps) {
  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);

  // Group completed tasks by day of the week for completion trend
  const getCompletionDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();

    // Map completed tasks over the last 7 days
    completedTasks.forEach((task) => {
      if (task.completedAt) {
        const completedDate = new Date(task.completedAt);
        const timeDiff = today.getTime() - completedDate.getTime();
        const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));

        if (diffDays >= 0 && diffDays < 7) {
          const dayIndex = completedDate.getDay();
          counts[dayIndex]++;
        }
      }
    });

    // Reorder so today is at the end
    const orderedDays: string[] = [];
    const orderedCounts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayIdx = d.getDay();
      orderedDays.push(days[dayIdx]);
      orderedCounts.push(counts[dayIdx]);
    }

    return { labels: orderedDays, values: orderedCounts };
  };

  const { labels, values } = getCompletionDays();
  const maxVal = Math.max(...values, 2); // default minimum ceiling for rendering scale

  // SVG dimensions for chart
  const width = 500;
  const height = 110;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Build SVG Path points
  const points = values.map((val, idx) => {
    const x = padding + (idx * chartWidth) / (values.length - 1);
    const y = height - padding - (val * chartHeight) / maxVal;
    return { x, y };
  });

  const linePath = points.reduce((pathStr, p, idx) => {
    return pathStr + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, "");

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  return (
    <div id="analytics_summary" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Metric 1: Pending */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">Pending Tasks</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{pendingTasks.length}</h3>
        </div>
        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
          <ListTodo size={20} />
        </div>
      </div>

      {/* Metric 2: Completed */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">Completed</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{completedTasks.length}</h3>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 size={20} />
        </div>
      </div>

      {/* Metric 3: High Risk */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">High Risk</span>
          <h3 className="text-3xl font-extrabold text-red-400 mt-1">{highRiskCount}</h3>
        </div>
        <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
          <AlertTriangle size={20} />
        </div>
      </div>

      {/* Area Line Chart for Completion Trend */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between shadow-md md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-400" />
            7-Day Completion Trend
          </span>
        </div>

        <div className="w-full h-[64px] shrink-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Line */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#262626" strokeWidth={1} />

            {/* Area Path */}
            {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

            {/* Line Path */}
            {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}

            {/* Dots */}
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r={values[idx] > 0 ? 3.5 : 2} fill={values[idx] > 0 ? "#10b981" : "#525252"} />
            ))}
          </svg>
        </div>

        <div className="flex justify-between px-1 text-[9px] font-bold font-mono text-neutral-500 mt-1">
          {labels.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
