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
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          Customize your tracking preferences and application settings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Core Config Card */}
        <motion.div className="bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
            Attendance Preferences
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-4">
              {/* Target Percentage */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 pl-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-500" />
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
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark focus:border-purple-500 dark:focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20 focus:outline-none text-gray-900 dark:text-white text-sm transition-all font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">%</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 pl-1 leading-relaxed">
                  Used to calculate safe bunks and lectures needed
                </p>
              </div>

              {/* Cycle Start Day */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 pl-1 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-purple-500" />
                  <span>Cycle Start Day</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={cycleStartDay}
                  onChange={(e) => setCycleStartDay(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark focus:border-purple-500 dark:focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20 focus:outline-none text-gray-900 dark:text-white text-sm transition-all font-medium"
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 pl-1 leading-relaxed">
                  Monthly cycle start (1-28). Defines your attendance cycle boundaries
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {saveStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                    saveStatus.type === "success"
                      ? "bg-green-50/60 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/30 text-green-700 dark:text-green-300"
                      : "bg-red-50/60 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/30 text-red-700 dark:text-red-300"
                  }`}
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
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </motion.button>
          </form>
        </motion.div>

        {/* System Options Card */}
        <motion.div className="bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Application
          </h3>

          {/* Theme Toggle */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-bunkd-bg-secondary-dark transition-all"
            onClick={handleToggleTheme}
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-900 dark:text-white block">Theme</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white shadow-md"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.div>
          </motion.div>

          {/* Logout Button */}
          <motion.button
            onClick={handleLogout}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 bg-red-50/60 hover:bg-red-100/60 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200/50 dark:border-red-500/30 text-red-700 dark:text-red-300 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </motion.button>
        </motion.div>

        {/* Info Card */}
        <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-200/50 dark:border-purple-500/20 rounded-2xl p-4">
          <div className="flex gap-3">
            <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 mb-1">About Bunkd</p>
              <p className="text-[10px] text-purple-800/70 dark:text-purple-300/70 leading-relaxed">
                Track Smart. Bunk Safe. Your premium attendance tracker for college students, built with speed and elegance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
