/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import SignIn from "./components/SignIn";
import Dashboard from "./components/Dashboard";
import { ShieldAlert } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-center items-center gap-4">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-2xl animate-pulse">
          <ShieldAlert size={28} />
        </div>
        <p className="text-xs font-mono text-neutral-400 tracking-widest animate-pulse uppercase">
          Activating Savior Core...
        </p>
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <SignIn onSignInSuccess={() => {}} />;
}
