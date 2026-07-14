"use client";
// File: src/components/AuthForm.tsx
import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, KeyRound, Mail, AlertCircle, RefreshCw, User } from "lucide-react";
import FirebaseSetupGuide from "./FirebaseSetupGuide";

export default function AuthForm() {
  const { user, isFirebaseConfigured, initialize } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("AuthForm.tsx: Render", { user, isFirebaseConfigured });

  React.useEffect(() => {
    // Bind auth listener so Zustand store is updated upon sign-in/sign-up
    const cleanup = initialize();
    return () => {
      cleanup();
    };
  }, [initialize]);

  React.useEffect(() => {
    console.log("AuthForm.tsx: useEffect redirect check", { userEmail: user?.email ?? null, isFirebaseConfigured });
    if (user && isFirebaseConfigured) {
      console.log("AuthForm.tsx: User logged in, redirecting to '/'");
      window.location.href = "/";
    }
  }, [user, isFirebaseConfigured]);

  if (!isFirebaseConfigured) {
    return <FirebaseSetupGuide />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = "Authentication failed. Please try again.";
      if (err.code === "auth/invalid-credential") {
        friendlyMessage = "Incorrect email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "An account already exists with this email.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      setError("Failed to log in as guest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl rounded-3xl p-8 flex flex-col items-center"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Bunkd
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {isSignUp ? "Create an account to start tracking" : "Sign in to access your attendance"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 pl-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/35 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Log In"
            )}
          </button>

          <div className="relative flex items-center justify-center my-3 w-full">
            <div className="border-t border-zinc-200/40 dark:border-zinc-800/40 w-full"></div>
            <span className="absolute bg-white dark:bg-zinc-900 px-3 text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Or</span>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-3.5 bg-zinc-150 hover:bg-zinc-200/60 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold rounded-2xl border border-zinc-200/10 dark:border-zinc-700/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            <span>Continue as Guest</span>
          </button>
        </form>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors mt-6 font-medium"
        >
          {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
        </button>
      </motion.div>
    </div>
  );
}
