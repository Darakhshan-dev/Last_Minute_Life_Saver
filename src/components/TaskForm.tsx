import React, { useState } from "react";
import { Task } from "../types";
import { Calendar, Clock, Tag, AlertTriangle, Plus, X } from "lucide-react";

interface TaskFormProps {
  onAddTask: (taskData: Omit<Task, "id" | "userId" | "completed" | "createdAt">) => void;
  onClose: () => void;
}

export default function TaskForm({ onAddTask, onClose }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [category, setCategory] = useState<Task["category"]>("Assignment");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please provide a task title.");
      return;
    }
    if (!deadline) {
      setError("Please specify a clear deadline.");
      return;
    }
    const hours = parseFloat(estimatedHours);
    if (isNaN(hours) || hours <= 0) {
      setError("Please specify a realistic estimated effort in hours.");
      return;
    }

    onAddTask({
      title,
      description,
      deadline,
      estimatedHours: hours,
      category,
      priority,
    });

    // Reset Form
    setTitle("");
    setDescription("");
    setDeadline("");
    setEstimatedHours("");
    setCategory("Assignment");
    setPriority("Medium");
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div id="add_task_modal" className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition duration-150"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="text-emerald-500" size={24} />
          Log Urgent Commitment
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2 font-mono">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CS301 Fine-tuning assignment submission"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Description / Consequences
            </label>
            <textarea
              placeholder="What happens if you miss this? What details are needed?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Deadline Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 text-neutral-500" size={16} />
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-700 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Estimated Effort (Hours) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3 text-neutral-500" size={16} />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder="e.g. 2.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-700 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-3 text-neutral-500" size={16} />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Task["category"])}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-700 transition appearance-none"
                >
                  <option value="Assignment">Assignment</option>
                  <option value="Bill">Bill / Payment</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Interview">Interview Prep</option>
                  <option value="Commitment">Important Commitment</option>
                  <option value="Other">Other Event</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Risk Priority
              </label>
              <div className="flex gap-2">
                {["Low", "Medium", "High"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p as Task["priority"])}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                      priority === p
                        ? p === "High"
                          ? "bg-red-500/20 border-red-500 text-red-400"
                          : p === "Medium"
                            ? "bg-amber-500/20 border-amber-500 text-amber-400"
                            : "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-750"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-emerald-950/20"
            >
              Add Savior Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
