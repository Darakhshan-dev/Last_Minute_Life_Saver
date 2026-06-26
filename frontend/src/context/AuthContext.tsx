import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, loginAnonymously, logout, setAccessToken } from "../services/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result) {
        // Send access token to backend to connect calendar automatically
        await fetch("/api/calendar/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${result.user.uid}`
          },
          body: JSON.stringify({ accessToken: result.accessToken })
        }).catch((e) => console.warn("Auto-linking calendar to backend failed during login:", e));
      }
    } catch (err) {
      console.error("Sign-In error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignInAnonymously = async () => {
    setLoading(true);
    try {
      await loginAnonymously();
    } catch (err) {
      console.error("Anonymous Sign-In error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signInAnonymously: handleSignInAnonymously,
        signOut: handleSignOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
