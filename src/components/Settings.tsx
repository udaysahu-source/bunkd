"use client";
// File: src/components/Settings.tsx
import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useStore } from "../store/useStore";
import { motion } from "framer-motion";
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
      setCycleStartDay(settings.cycleStartDay.toString());
      setTargetPercentage(settings.targetPercentage.toString());
    }
  }, [settings]);

  // Load and configure theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setTheme(isDark ? "dark" : "light");
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
    } catch (err: any) {
      console.error(err);
      setSaveStatus({
        type: "error",
        message: err.message || "Failed to save settings."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Settings
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
          Customize your tracking rules and application preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Core Config Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-850 dark:text-zinc-100 mb-5">
            Attendance Preferences
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-4">
              {/* Target Percentage */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 pl-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>Target Attendance Percentage</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={targetPercentage}
                    onChange={(e) => setTargetPercentage(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 pl-1 leading-relaxed">
                  Used to compute your Safe Bunks and Needed Lectures thresholds.
                </p>
              </div>

              {/* Cycle Start Day */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 pl-1 flex items-center gap-1">
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Cycle Start Day of Month</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={cycleStartDay}
                  onChange={(e) => setCycleStartDay(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all"
                />
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 pl-1 leading-relaxed">
                  Strictly bounded between 1 and 28. Defines boundaries for your monthly cycle aggregations.
                </p>
              </div>
            </div>

            {saveStatus && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                  saveStatus.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/20 text-emerald-750 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-250/20 text-rose-750 dark:text-rose-455"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-55"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </form>
        </div>

        {/* System Options Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-zinc-850 dark:text-zinc-100 mb-2">
            Application Settings
          </h3>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200/30 dark:border-zinc-700/20 rounded-2xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-105">App Theme</span>
              <p className="text-[10px] text-zinc-400">Toggle between Light and Dark mode</p>
            </div>
            <button
              onClick={handleToggleTheme}
              className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-750/40 rounded-xl text-zinc-700 dark:text-zinc-300 shadow-xs hover:bg-zinc-100 transition-all active:scale-[0.96]"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100/60 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border border-rose-150/40 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
