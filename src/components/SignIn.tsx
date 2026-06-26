import React, { useState } from "react";
import { loginWithGoogle, loginAnonymously } from "../firebase";
import { ShieldAlert, Zap, Clock, Compass, Play } from "lucide-react";

interface SignInProps {
  onSignInSuccess: () => void;
}

export default function SignIn({ onSignInSuccess }: SignInProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect if the app is currently loaded inside an iframe (like the AI Studio preview)
  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSignInSuccess();
    } catch (err: any) {
      console.warn("Google popup blocked/failed. Offering fallback advice.", err);
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";

      if (errorCode.includes("popup-blocked") || errorMsg.includes("popup-blocked")) {
        setError(
          "Pop-up Blocked! Your browser blocked the Google Sign-In window. " +
          "Please enable pop-ups for this site, or click 'Open in new tab' at the top-right of this preview panel to log in without restrictions."
        );
      } else if (errorCode.includes("cancelled-popup-request") || errorMsg.includes("cancelled-popup-request") || errorMsg.includes("Assertion failed")) {
        setError(
          "Authentication request timed out or cancelled. " +
          "Tip: Open this app in a standalone tab using the 'Open in new tab' button at the top-right of the preview to sign in instantly!"
        );
      } else {
        setError(
          "Google Sign-In failed in this preview container. " +
          "Tip: Opening the app in a new tab by clicking the button in the top-right corner bypasses iframe restrictions completely!"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await loginAnonymously();
      onSignInSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to initiate sandboxed demo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="signin_page" className="min-h-screen bg-neutral-950 text-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Background decoration elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-700"></div>

      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative">
        {isIframe && (
          <div className="mb-6 p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
            <span className="shrink-0 mt-0.5">💡</span>
            <div>
              <p className="font-bold text-white mb-0.5">Running inside AI Studio Preview Frame</p>
              <p className="text-indigo-200/80">If Google login popups are blocked or cancelled, click the <span className="font-semibold text-white">"Open in new tab"</span> button at the top right of this preview pane to sign in seamlessly!</p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-2xl mb-4 animate-bounce">
            <ShieldAlert size={36} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-sans">
            Last-Minute Life Saver
          </h1>
          <p className="text-neutral-400 text-sm">
            AI-Powered Deadline Prevention Companion
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 bg-neutral-950/50 p-3 rounded-xl border border-neutral-850">
            <Zap className="text-emerald-500 shrink-0 mt-1" size={18} />
            <div>
              <h3 className="text-xs font-semibold text-neutral-200">Intelligent Prioritization</h3>
              <p className="text-xs text-neutral-400">Gemini automatically scores deadlines, efforts, and consequences.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-950/50 p-3 rounded-xl border border-neutral-850">
            <Clock className="text-amber-500 shrink-0 mt-1" size={18} />
            <div>
              <h3 className="text-xs font-semibold text-neutral-200">Focus Planning</h3>
              <p className="text-xs text-neutral-400">Hour-by-hour dynamic plan blocks tailored to keep you on schedule.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-950/50 p-3 rounded-xl border border-neutral-850">
            <Compass className="text-blue-500 shrink-0 mt-1" size={18} />
            <div>
              <h3 className="text-xs font-semibold text-neutral-200">Conversational Rescue</h3>
              <p className="text-xs text-neutral-400">Chat with an assistant that acts as a proactive, encouraging coach.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left leading-relaxed font-sans">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            id="sandbox_signin_button"
            onClick={handleDemoSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg shadow-emerald-950/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Play size={18} />
                <span>Instant Sandbox Demo Access</span>
              </>
            )}
          </button>

          <button
            id="google_signin_button"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-neutral-950 font-medium py-3 px-4 rounded-xl transition duration-200 shadow-md disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.46-4.53z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-neutral-500 mt-6 font-mono leading-relaxed">
          Google Sign-In may require pop-ups enabled. Use Sandbox Access for an offline, database-powered trial instantly.
        </p>
      </div>
    </div>
  );
}
