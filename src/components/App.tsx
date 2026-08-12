"use client";
// File: src/components/App.tsx
import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import AuthForm from "./AuthForm";
import Dashboard from "./Dashboard";
import Calendar from "./Calendar";
import Settings from "./Settings";
import FirebaseSetupGuide from "./FirebaseSetupGuide";
import InstallPrompt from "./InstallPrompt";
import ProfileModal from "./ProfileModal";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, CalendarDays, Settings as SettingsIcon } from "lucide-react";

export default function App() {
  const { user, authLoading, isFirebaseConfigured, initialize, profile, profileLoading } = useStore();
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "settings">("dashboard");

  console.log("App.tsx: Render", { authLoading, user, isFirebaseConfigured });

  useEffect(() => {
    console.log("App.tsx: useEffect [initialize] running");
    const cleanup = initialize();
    
    // Load theme configuration
    const isDark = localStorage.getItem("theme") === "dark" || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      window.document.documentElement.classList.add("dark");
    } else {
      window.document.documentElement.classList.remove("dark");
    }
    
    // Register PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }

    return () => {
      cleanup();
    };
  }, [initialize]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-bunkd-bg-dark glass-bg-mesh flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [0.95, 1, 0.95], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 glass-button-brand rounded-2xl flex items-center justify-center glow-purple"
          >
            <span className="text-white font-bold text-lg">B</span>
          </motion.div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-bold uppercase tracking-widest text-zinc-500"
          >
            Loading Bunkd
          </motion.span>
        </motion.div>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return <FirebaseSetupGuide />;
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!profile || !profile.semester) {
    return <ProfileModal />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard key="dashboard" />;
      case "calendar":
        return <Calendar key="calendar" />;
      case "settings":
        return <Settings key="settings" />;
      default:
        return <Dashboard key="dashboard" />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-bunkd-bg-dark glass-bg-mesh text-zinc-900 dark:text-white flex flex-col relative transition-colors duration-300">
      {/* Ambient glow orbs — decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-purple-600/[0.05] dark:bg-purple-600/[0.07] blur-[120px] rounded-full" />
        <div className="absolute top-1/2 -right-24 w-[300px] h-[300px] bg-purple-500/[0.03] dark:bg-purple-500/[0.05] blur-[100px] rounded-full" />
        <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] bg-violet-600/[0.03] dark:bg-violet-600/[0.04] blur-[110px] rounded-full" />
      </div>

      <InstallPrompt />

      {/* ── Glass Header ── */}
      <header className="sticky top-0 glass-header z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 glass-button-brand rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
              Bunkd
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-6 pb-28 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Glass Bottom Navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 pointer-events-none z-50">
        {/* Fade gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-bunkd-bg-dark via-white/80 dark:via-bunkd-bg-dark/80 to-transparent pointer-events-none" />
        
        <nav className="max-w-md mx-auto glass-nav rounded-2xl p-1.5 flex items-center justify-between pointer-events-auto relative glass-shimmer">
          {/* Dashboard Tab */}
          <motion.button
            onClick={() => setActiveTab("dashboard")}
            className="flex-1 flex flex-col items-center py-2.5 rounded-xl relative transition-all group cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "dashboard" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 rounded-xl -z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  boxShadow: "0 0 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <LayoutDashboard
              className={`w-5 h-5 transition-all duration-200 ${
                activeTab === "dashboard"
                  ? "text-purple-650 dark:text-purple-400 scale-110"
                  : "text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-650 dark:group-hover:text-zinc-400"
              }`}
            />
            <span
              className={`text-xs font-bold mt-1.5 tracking-wider uppercase transition-colors duration-200 ${
                activeTab === "dashboard"
                  ? "text-purple-650 dark:text-purple-400"
                  : "text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-650 dark:group-hover:text-zinc-400"
              }`}
            >
              Home
            </span>
          </motion.button>

          {/* Calendar Tab */}
          <motion.button
            onClick={() => setActiveTab("calendar")}
            className="flex-1 flex flex-col items-center py-2.5 rounded-xl relative transition-all group cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "calendar" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 rounded-xl -z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  boxShadow: "0 0 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <CalendarDays
              className={`w-5 h-5 transition-all duration-200 ${
                activeTab === "calendar"
                  ? "text-purple-650 dark:text-purple-400 scale-110"
                  : "text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-650 dark:group-hover:text-zinc-400"
              }`}
            />
            <span
              className={`text-xs font-bold mt-1.5 tracking-wider uppercase transition-colors duration-200 ${
                activeTab === "calendar"
                  ? "text-purple-650 dark:text-purple-400"
                  : "text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-650 dark:group-hover:text-zinc-400"
              }`}
            >
              Calendar
            </span>
          </motion.button>

          {/* Settings Tab */}
          <motion.button
            onClick={() => setActiveTab("settings")}
            className="flex-1 flex flex-col items-center py-2.5 rounded-xl relative transition-all group cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "settings" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 rounded-xl -z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  boxShadow: "0 0 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <SettingsIcon
              className={`w-5 h-5 transition-all duration-200 ${
                activeTab === "settings"
                  ? "text-purple-650 dark:text-purple-400 scale-110"
                  : "text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-650 dark:group-hover:text-zinc-400"
              }`}
            />
            <span
              className={`text-xs font-bold mt-1.5 tracking-wider uppercase transition-colors duration-200 ${
                activeTab === "settings"
                  ? "text-purple-650 dark:text-purple-400"
                  : "text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-650 dark:group-hover:text-zinc-400"
              }`}
            >
              Settings
            </span>
          </motion.button>
        </nav>
      </div>
    </div>
  );
}
