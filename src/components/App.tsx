"use client";
// File: src/components/App.tsx
import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import AuthForm from "./AuthForm";
import Dashboard from "./Dashboard";
import Calendar from "./Calendar";
import Insights from "./Insights";
import Timetable from "./Timetable";
import Settings from "./Settings";
import FirebaseSetupGuide from "./FirebaseSetupGuide";
import InstallPrompt from "./InstallPrompt";
import ProfileModal from "./ProfileModal";
import GlobalToast from "./GlobalToast";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  TrendingUp,
  CalendarClock,
  Sliders,
  GraduationCap
} from "lucide-react";

type NavigationTab = "dashboard" | "calendar" | "insights" | "timetable" | "settings";

export default function App() {
  const { user, authLoading, isFirebaseConfigured, initialize, profile, profileLoading, settings } = useStore();
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");

  useEffect(() => {
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
      <div className="min-h-screen bg-zinc-50 dark:bg-[#12101e] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">
            B
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Loading Bunkd...
          </span>
        </div>
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

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar & Logs", icon: CalendarDays },
    { id: "insights", label: "Analytics", icon: TrendingUp },
    { id: "timetable", label: "Timetable", icon: CalendarClock },
    { id: "settings", label: "Settings", icon: Sliders },
  ] as const;

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard key="dashboard" />;
      case "calendar":
        return <Calendar key="calendar" />;
      case "insights":
        return <Insights key="insights" />;
      case "timetable":
        return <Timetable key="timetable" />;
      case "settings":
        return <Settings key="settings" />;
      default:
        return <Dashboard key="dashboard" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#12101e] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row transition-colors duration-200">
      <GlobalToast />
      <InstallPrompt />

      {/* ──── DESKTOP SIDEBAR NAVIGATION (md and above) ──── */}
      <aside className="hidden md:flex flex-col w-64 app-sidebar shrink-0 p-5 justify-between sticky top-0 h-screen z-30">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
              B
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-100 block">
                Bunkd
              </span>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 block -mt-0.5">
                Attendance Intelligence
              </span>
            </div>
          </div>

          {/* Student Status Summary Card */}
          <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-[#151224] border border-zinc-200 dark:border-[#2c2547] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {profile?.name || "Student"}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Sem {profile?.semester}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>{profile?.department || "General"}</span>
              <span>Target: {settings?.targetPercentage ?? 75}%</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between px-2">
          <span>Bunkd v1.2</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="System Online" />
        </div>
      </aside>

      {/* ──── MOBILE TOP HEADER (below md) ──── */}
      <header className="md:hidden sticky top-0 app-header z-40 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs">
            B
          </div>
          <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
            Bunkd
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            Sem {profile?.semester}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            {settings?.targetPercentage ?? 75}%
          </span>
        </div>
      </header>

      {/* ──── MAIN WORKSPACE AREA ──── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ──── MOBILE BOTTOM NAVIGATION (below md) ──── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 app-nav-bottom px-2 py-1.5">
        <nav className="flex items-center justify-around">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "text-purple-600 dark:text-purple-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] mt-1 tracking-tight">
                  {id === "dashboard" ? "Home" : id === "calendar" ? "Logs" : id === "insights" ? "Insights" : id === "timetable" ? "Schedule" : "Settings"}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
