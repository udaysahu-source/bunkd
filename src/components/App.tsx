"use client";
// File: src/components/App.tsx
import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import AuthForm from "./AuthForm";
import Dashboard from "./Dashboard";
import Calendar from "./Calendar";
import Settings from "./Settings";
import FirebaseSetupGuide from "./FirebaseSetupGuide";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, CalendarDays, Settings as SettingsIcon, Sparkles } from "lucide-react";

export default function App() {
  const { user, authLoading, isFirebaseConfigured, initialize } = useStore();
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "settings">("dashboard");

  useEffect(() => {
    // Initialize auth and store subscriptions
    const cleanup = initialize();
    
    // Load theme configuration
    const isDark = localStorage.getItem("theme") === "dark" || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      window.document.documentElement.classList.add("dark");
    } else {
      window.document.documentElement.classList.remove("dark");
    }
    
    return () => {
      cleanup();
    };
  }, [initialize]);

  useEffect(() => {
    if (!authLoading && !user && isFirebaseConfigured) {
      window.location.href = "/login";
    }
  }, [user, authLoading, isFirebaseConfigured]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.95, 1, 0.95], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3.5"
        >
          <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white dark:text-zinc-900 animate-pulse" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Loading Bunkd...
          </span>
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-350 flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 bg-zinc-50/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-zinc-200/20 dark:border-zinc-800/20 z-40 transition-colors">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Bunkd
            </span>
          </div>

          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2.5 py-1 rounded-full border border-zinc-200/10 dark:border-zinc-700/10 max-w-[140px] truncate">
            {user.email}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-50/90 dark:via-zinc-950/90 to-transparent pointer-events-none z-45">
        <nav className="max-w-md mx-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/40 dark:border-zinc-800/40 shadow-xl rounded-full p-2 flex items-center justify-between pointer-events-auto">
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className="flex-1 flex flex-col items-center py-2.5 rounded-full relative transition-all"
          >
            {activeTab === "dashboard" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/80 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <LayoutDashboard
              className={`w-5 h-5 transition-colors ${
                activeTab === "dashboard"
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors ${
                activeTab === "dashboard"
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              Metrics
            </span>
          </button>

          {/* Calendar Tab */}
          <button
            onClick={() => setActiveTab("calendar")}
            className="flex-1 flex flex-col items-center py-2.5 rounded-full relative transition-all"
          >
            {activeTab === "calendar" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/80 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <CalendarDays
              className={`w-5 h-5 transition-colors ${
                activeTab === "calendar"
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors ${
                activeTab === "calendar"
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              Calendar
            </span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setActiveTab("settings")}
            className="flex-1 flex flex-col items-center py-2.5 rounded-full relative transition-all"
          >
            {activeTab === "settings" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/80 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <SettingsIcon
              className={`w-5 h-5 transition-colors ${
                activeTab === "settings"
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors ${
                activeTab === "settings"
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              Config
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
