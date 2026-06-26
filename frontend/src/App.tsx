import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SignIn from "./components/SignIn";
import Dashboard from "./components/Dashboard";
import { Flame } from "lucide-react";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center font-sans gap-4 select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 animate-pulse">
            <Flame size={32} />
          </div>
          <div className="absolute inset-0 border border-red-500/30 rounded-2xl animate-ping opacity-25"></div>
        </div>
        <div className="text-center">
          <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">Last-Minute Life Saver</h2>
          <p className="text-[10px] text-neutral-400 mt-1 font-mono animate-pulse">Establishing secure workspace sync...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <SignIn />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
