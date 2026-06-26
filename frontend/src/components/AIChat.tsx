import React, { useState, useRef, useEffect } from "react";
import { Message, Task } from "../types";
import { Send, Bot, User, Trash2 } from "lucide-react";

interface AIChatProps {
  tasks: Task[];
  onSendMessage: (text: string) => void;
  chatHistory: Message[];
  loading: boolean;
  onClearChat: () => void;
}

export default function AIChat({ tasks, onSendMessage, chatHistory, loading, onClearChat }: AIChatProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleSuggestedClick = (action: string) => {
    if (loading) return;
    onSendMessage(action);
  };

  return (
    <div id="ai_chat_assistant" className="bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col h-[500px] shadow-lg relative overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-950/60 px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Savior AI Coach</h3>
            <span className="text-[10px] text-emerald-400 font-mono animate-pulse">● Proactive Assistance</span>
          </div>
        </div>

        {chatHistory.length > 0 && (
          <button
            onClick={onClearChat}
            className="text-neutral-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-neutral-850"
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Bot size={36} className="text-red-500/30 mb-3 animate-bounce" />
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">Interactive Deadline Rescue</h4>
            <p className="text-xs text-neutral-400 max-w-[240px] leading-relaxed">
              Ask me how to survive overlapping workloads, schedule a buffer, or break down prep work.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "ai" && (
                <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <Bot size={12} />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-neutral-950 text-neutral-100 rounded-tr-none border border-neutral-850"
                  : "bg-neutral-850 text-neutral-200 rounded-tl-none border border-neutral-800"
              }`}>
                {/* Parse basic markdown linebreaks and bullets */}
                <div className="space-y-1.5 whitespace-pre-line font-sans">
                  {msg.text}
                </div>

                {/* Show suggested follow-up actions if present (only on AI messages) */}
                {msg.sender === "ai" && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-neutral-800">
                    {msg.suggestedActions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestedClick(act.action)}
                        className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === "user" && (
                <div className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
                  <User size={12} />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <Bot size={12} />
            </div>
            <div className="bg-neutral-850 border border-neutral-800 rounded-2xl rounded-tl-none p-3 max-w-[85%] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Starts (when chat is empty) */}
      {chatHistory.length === 0 && (
        <div className="p-3 bg-neutral-950/40 border-t border-neutral-800 space-y-1.5 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono px-1">Quick Prompts:</p>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => handleSuggestedClick("What should I do first today?")}
              className="text-left w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 font-mono text-[10px] px-3 py-2 rounded-xl transition flex items-center justify-between"
            >
              <span>"What should I do first today?"</span>
              <span className="text-red-400">➔</span>
            </button>
            <button
              onClick={() => handleSuggestedClick("Help me plan the next 3 hours.")}
              className="text-left w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 font-mono text-[10px] px-3 py-2 rounded-xl transition flex items-center justify-between"
            >
              <span>"Help me plan the next 3 hours."</span>
              <span className="text-red-400">➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-800 bg-neutral-950/50 flex gap-2 shrink-0">
        <input
          type="text"
          placeholder={loading ? "Coach is replying..." : "Ask what to prioritize next..."}
          disabled={loading}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-red-600 hover:bg-red-500 text-white p-2.5 rounded-xl transition disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
