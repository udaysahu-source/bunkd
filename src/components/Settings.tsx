"use client";
// File: src/components/Settings.tsx
import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  LogOut,
  Target,
  CalendarRange,
  Moon,
  Sun,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";

export default function Settings() {
  const { settings, updateSettings } = useStore();
  const [cycleStartDay, setCycleStartDay] = useState("1");
  const [targetPercentage, setTargetPercentage] = useState("75");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load current values
  useEffect(() => {
    if (settings) {
      setTimeout(() => {
        setCycleStartDay(settings.cycleStartDay.toString());
        setTargetPercentage(settings.targetPercentage.toString());
      }, 0);
    }
  }, [settings]);

  // Load and configure theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setTimeout(() => {
      setTheme(isDark ? "dark" : "light");
    }, 0);
  }, []);

  const handleToggleTheme = () => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains("dark");
    
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    setLoading(true);

    const dayVal = parseInt(cycleStartDay);
    const pctVal = parseInt(targetPercentage);

    if (isNaN(dayVal) || dayVal < 1 || dayVal > 28) {
      setSaveStatus({
        type: "error",
        message: "Cycle start day must be between 1 and 28."
      });
      setLoading(false);
      return;
    }

    if (isNaN(pctVal) || pctVal < 1 || pctVal > 100) {
      setSaveStatus({
        type: "error",
        message: "Target percentage must be between 1% and 100%."
      });
      setLoading(false);
      return;
    }

    try {
      await updateSettings(dayVal, pctVal);
      setSaveStatus({
        type: "success",
        message: "Settings updated successfully!"
      });
    } catch (err) {
      console.error(err);
      const error = err as Error;
      setSaveStatus({
        type: "error",
        message: error.message || "Failed to save settings."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        if (auth.currentUser?.isAnonymous) {
          // Delete the anonymous user account to keep Firebase Auth clean
          await auth.currentUser.delete();
          // Clear Guest local storage data
          localStorage.removeItem("bunkd_guest_settings");
          localStorage.removeItem("bunkd_guest_attendance");
        } else {
          await signOut(auth);
        }
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white leading-none">
          Settings
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Customize your tracking preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Core Config Card */}
        <motion.div className="glass-card rounded-3xl p-6 glass-shimmer">
          <h3 className="text-base font-bold text-white mb-5">
            Attendance Preferences
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-4">
              {/* Target Percentage */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  <span>Target Attendance %</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={targetPercentage}
                    onChange={(e) => setTargetPercentage(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg glass-input text-white text-sm font-semibold focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 pl-1 leading-relaxed">
                  Used to calculate safe bunks and lectures needed
                </p>
              </div>

              {/* Cycle Start Day */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cycle Start Day</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={cycleStartDay}
                  onChange={(e) => setCycleStartDay(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg glass-input text-white text-sm font-semibold focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-2 pl-1 leading-relaxed">
                  Monthly cycle start (1-28). Defines your attendance cycle
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {saveStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2"
                  style={{
                    background: saveStatus.type === "success"
                      ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    border: saveStatus.type === "success"
                      ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.15)",
                    color: saveStatus.type === "success" ? "#34D399" : "#F87171"
                  }}
                >
                  {saveStatus.type === "success" ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{saveStatus.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 glass-button-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </motion.button>
          </form>
        </motion.div>

        {/* System Options Card */}
        <motion.div className="glass-card rounded-3xl p-6 space-y-4 glass-shimmer">
          <h3 className="text-base font-bold text-white mb-4">
            Application
          </h3>

          {/* Theme Toggle */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-4 glass-inner rounded-2xl cursor-pointer hover:bg-white/[0.02] transition-all"
            onClick={handleToggleTheme}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">Theme</span>
              <p className="text-[10px] text-zinc-500">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 glass-button-brand rounded-xl text-white"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.div>
          </motion.div>

          {/* Logout Button */}
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-bold text-red-400"
            style={{
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.12)"
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </motion.button>
        </motion.div>

        {/* Info Card */}
        <div className="rounded-2xl p-4 glass-shimmer"
          style={{
            background: "rgba(139, 92, 246, 0.04)",
            border: "1px solid rgba(139, 92, 246, 0.1)"
          }}>
          <div className="flex gap-3">
            <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-300 mb-1">About Bunkd</p>
              <p className="text-[10px] text-purple-300/60 leading-relaxed">
                Track Smart. Bunk Safe. Your premium attendance tracker for college students.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
