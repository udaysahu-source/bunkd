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
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, CalendarDays, Settings as SettingsIcon } from "lucide-react";

export default function App() {
  const { user, authLoading, isFirebaseConfigured, initialize } = useStore();
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
    
    return () => {
      cleanup();
    };
  }, [initialize]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-bunkd-bg-dark flex flex-col items-center justify-center transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.95, 1, 0.95], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <div className="w-5 h-5 bg-white rounded-lg" />
          </motion.div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
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
    <div className="min-h-screen bg-white dark:bg-bunkd-bg-dark text-gray-900 dark:text-white transition-colors duration-300 flex flex-col">
      <InstallPrompt />
      {/* Header Bar */}
      <header className="sticky top-0 bg-white/70 dark:bg-bunkd-bg-dark/70 backdrop-blur-md border-b border-gray-200/50 dark:border-bunkd-border-dark z-40 transition-colors">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Bunkd Logo/Icon */}
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
              Bunkd
            </span>
          </div>

          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-bunkd-card-dark px-2.5 py-1.5 rounded-full border border-gray-200/50 dark:border-bunkd-border-dark max-w-[140px] truncate">
            {user.email}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-6 pb-24">
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

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-bunkd-bg-dark via-white/95 dark:via-bunkd-bg-dark/95 to-transparent pointer-events-none z-45">
        <nav className="max-w-md mx-auto bg-white/85 dark:bg-bunkd-card-dark/85 backdrop-blur-xl border border-gray-200/40 dark:border-bunkd-border-dark shadow-2xl rounded-2xl p-2 flex items-center justify-between pointer-events-auto">
          {/* Dashboard Tab */}
          <motion.button
            onClick={() => setActiveTab("dashboard")}
            className="flex-1 flex flex-col items-center py-3 rounded-xl relative transition-all group"
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "dashboard" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <LayoutDashboard
              className={`w-5 h-5 transition-all ${
                activeTab === "dashboard"
                  ? "text-purple-600 dark:text-purple-400 scale-110"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-1.5 tracking-wider uppercase transition-colors ${
                activeTab === "dashboard"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
              }`}
            >
              Dashboard
            </span>
          </motion.button>

          {/* Calendar Tab */}
          <motion.button
            onClick={() => setActiveTab("calendar")}
            className="flex-1 flex flex-col items-center py-3 rounded-xl relative transition-all group"
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "calendar" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <CalendarDays
              className={`w-5 h-5 transition-all ${
                activeTab === "calendar"
                  ? "text-purple-600 dark:text-purple-400 scale-110"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-1.5 tracking-wider uppercase transition-colors ${
                activeTab === "calendar"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
              }`}
            >
              Calendar
            </span>
          </motion.button>

          {/* Settings Tab */}
          <motion.button
            onClick={() => setActiveTab("settings")}
            className="flex-1 flex flex-col items-center py-3 rounded-xl relative transition-all group"
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "settings" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <SettingsIcon
              className={`w-5 h-5 transition-all ${
                activeTab === "settings"
                  ? "text-purple-600 dark:text-purple-400 scale-110"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-1.5 tracking-wider uppercase transition-colors ${
                activeTab === "settings"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
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
