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
  HelpCircle,
  Trash2,
  AlertTriangle,
  Bell,
  User,
  GraduationCap,
  BookOpen,
  School,
  RefreshCw,
  Minus,
  Plus
} from "lucide-react";
import { requestNotificationPermission, sendAttendancePushNotification } from "../lib/pwaNotifications";

export default function Settings() {
  const { 
    settings, 
    updateSettings, 
    clearAllAttendance, 
    showToast,
    profile,
    saveProfile,
    updateProfileSemester
  } = useStore();

  const [cycleStartDay, setCycleStartDay] = useState("1");
  const [targetPercentage, setTargetPercentage] = useState("75");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState("");
  const [profileSemester, setProfileSemester] = useState<number>(1);
  const [profileDepartment, setProfileDepartment] = useState("");
  const [profileCollegeName, setProfileCollegeName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Semester Reset Confirmation Modal
  const [showSemResetModal, setShowSemResetModal] = useState(false);
  const [pendingSemester, setPendingSemester] = useState<number | null>(null);

  // Load current settings values
  useEffect(() => {
    if (settings) {
      setTimeout(() => {
        setCycleStartDay(settings.cycleStartDay.toString());
        setTargetPercentage(settings.targetPercentage.toString());
      }, 0);
    }
  }, [settings]);

  // Load current profile values
  useEffect(() => {
    if (profile) {
      setProfileName(profile.name);
      setProfileSemester(profile.semester);
      setProfileDepartment(profile.department || "");
      setProfileCollegeName(profile.college_name || "");
    }
  }, [profile]);

  // Load and configure theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setTimeout(() => {
      setTheme(isDark ? "dark" : "light");
    }, 0);
  }, []);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast("Please enter your name.", "error");
      return;
    }
    if (!profileDepartment.trim()) {
      showToast("Please enter your department/major.", "error");
      return;
    }

    const semesterChanged = profile && profile.semester !== profileSemester;
    if (semesterChanged) {
      setPendingSemester(profileSemester);
      setShowSemResetModal(true);
      return;
    }

    setProfileLoading(true);
    setProfileSaveStatus(null);
    try {
      await saveProfile(
        profileName.trim(),
        profileSemester,
        profileDepartment.trim(),
        profileCollegeName.trim() || null
      );
      setProfileSaveStatus({ type: "success", message: "Profile updated successfully!" });
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      console.error(err);
      setProfileSaveStatus({ type: "error", message: "Failed to update profile." });
      showToast("Failed to update profile.", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSemResetChoice = async (resetBaseline: boolean) => {
    if (pendingSemester === null) return;
    setProfileLoading(true);
    setProfileSaveStatus(null);
    setShowSemResetModal(false);
    try {
      await updateProfileSemester(pendingSemester, resetBaseline);
      await saveProfile(
        profileName.trim(),
        pendingSemester,
        profileDepartment.trim(),
        profileCollegeName.trim() || null
      );
      setProfileSaveStatus({ type: "success", message: "Profile and semester updated!" });
      showToast("Semester and profile updated successfully!", "success");
      setPendingSemester(null);
    } catch (err) {
      console.error(err);
      setProfileSaveStatus({ type: "error", message: "Failed to update semester preferences." });
      showToast("Failed to update semester preferences.", "error");
    } finally {
      setProfileLoading(false);
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

  const handleConfirmClearAll = async () => {
    try {
      setClearing(true);
      await clearAllAttendance();
      setShowClearModal(false);
      showToast("All attendance records cleared! 🧹", "success");
    } catch (err) {
      console.error("Failed to clear attendance:", err);
      showToast("Failed to clear attendance records.", "error");
    } finally {
      setClearing(false);
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
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
          Settings
        </h2>
        <p className="text-zinc-550 dark:text-zinc-500 text-sm mt-1">
          Customize your tracking preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Profile Settings Card */}
        <motion.div className="glass-card rounded-3xl p-6 glass-shimmer">
          <h3 className="text-base font-bold text-zinc-800 dark:text-white mb-5">
            Profile Settings
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={profileLoading}
                  value={profileName}
                  onFocus={handleInputFocus}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-800 dark:text-white text-sm font-semibold focus:outline-none"
                  placeholder="Your Name"
                />
              </div>

              {/* Semester Tap Grid */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Semester</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      disabled={profileLoading}
                      onClick={() => setProfileSemester(sem)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        profileSemester === sem
                          ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/10"
                          : "bg-gray-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-800/80"
                      }`}
                    >
                      Sem {sem}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department / Major */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Department / Major</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={profileLoading}
                  value={profileDepartment}
                  onFocus={handleInputFocus}
                  onChange={(e) => setProfileDepartment(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-800 dark:text-white text-sm font-semibold focus:outline-none uppercase"
                  placeholder="e.g. CSE, Mechanical"
                />
              </div>

              {/* College / University */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-purple-400" />
                  <span>College / University</span>
                </label>
                <input
                  type="text"
                  disabled={profileLoading}
                  value={profileCollegeName}
                  onFocus={handleInputFocus}
                  onChange={(e) => setProfileCollegeName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-800 dark:text-white text-sm font-semibold focus:outline-none"
                  placeholder="e.g. IIT Delhi"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {profileSaveStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2"
                  style={{
                    background: profileSaveStatus.type === "success"
                      ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    border: profileSaveStatus.type === "success"
                      ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.15)",
                    color: profileSaveStatus.type === "success" ? "#34D399" : "#F87171"
                  }}
                >
                  {profileSaveStatus.type === "success" ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{profileSaveStatus.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sticky bottom-0 bg-white/80 dark:bg-[#121218]/80 backdrop-blur-md pt-3.5 pb-1 z-10 border-t border-black/5 dark:border-white/5 mt-4">
              <motion.button
                type="submit"
                disabled={profileLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 glass-button-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-md"
              >
                {profileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile</span>
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Core Config Card */}
        <motion.div className="glass-card rounded-3xl p-6 glass-shimmer">
          <h3 className="text-base font-bold text-zinc-800 dark:text-white mb-5">
            Attendance Preferences
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-4">
              {/* Target Percentage */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  <span>Target Attendance %</span>
                </label>
                
                {/* Segmented Quick Pickers */}
                <div className="grid grid-cols-4 gap-2 mb-2.5">
                  {["75", "80", "85", "90"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTargetPercentage(val)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        targetPercentage === val
                          ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                          : "bg-white/[0.03] text-zinc-400 border-white/5 hover:text-white"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={targetPercentage}
                    onFocus={handleInputFocus}
                    onChange={(e) => setTargetPercentage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-800 dark:text-white text-sm font-semibold focus:outline-none"
                    placeholder="Custom Target"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">%</span>
                </div>
                <p className="text-xs text-zinc-550 dark:text-zinc-500 mt-2 pl-1 leading-relaxed">
                  Most Indian colleges enforce 75% or 80% minimum attendance.
                </p>
              </div>

              {/* Cycle Start Day */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cycle Start Day</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={profileLoading}
                    onClick={() => setCycleStartDay(prev => Math.max(1, parseInt(prev || "1") - 1).toString())}
                    className="w-11 h-11 rounded-xl glass-inner flex items-center justify-center text-zinc-700 dark:text-white font-bold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border border-transparent"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-extrabold text-zinc-800 dark:text-white w-10 text-center">
                    {cycleStartDay}
                  </span>
                  <button
                    type="button"
                    disabled={profileLoading}
                    onClick={() => setCycleStartDay(prev => Math.min(28, parseInt(prev || "1") + 1).toString())}
                    className="w-11 h-11 rounded-xl glass-inner flex items-center justify-center text-zinc-700 dark:text-white font-bold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border border-transparent"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-550 dark:text-zinc-500 mt-2 pl-1 leading-relaxed">
                  Monthly cycle start day (1–28) for reset tracking.
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

            <div className="sticky bottom-0 bg-white/80 dark:bg-[#121218]/80 backdrop-blur-md pt-3.5 pb-1 z-10 border-t border-black/5 dark:border-white/5 mt-4">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 glass-button-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Danger Zone / Data Management Card */}
        <motion.div className="glass-card rounded-3xl p-6 space-y-4 glass-shimmer">
          <h3 className="text-base font-bold text-zinc-800 dark:text-white mb-2">
            Data Management
          </h3>

          <div className="p-4 glass-inner rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl text-red-400 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-850 dark:text-white block">Clear All Attendance</span>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mt-0.5">
                  Reset and delete all logged attendance records. Your target settings will remain saved.
                </p>
              </div>
            </div>

            <motion.button
              onClick={() => setShowClearModal(true)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.18)"
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Attendance Records</span>
            </motion.button>
          </div>
        </motion.div>

        {/* System Options Card */}
        <motion.div className="glass-card rounded-3xl p-6 space-y-4 glass-shimmer">
          <h3 className="text-base font-bold text-zinc-800 dark:text-white mb-4">
            Application
          </h3>

          {/* Push Notifications */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-4 glass-inner rounded-2xl cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-all mb-3.5"
            onClick={async () => {
              const perm = await requestNotificationPermission();
              if (perm === "granted") {
                showToast("Notifications enabled! 🔔", "success");
                sendAttendancePushNotification({
                  percentage: parseInt(targetPercentage) || 75,
                  target: parseInt(targetPercentage) || 75,
                  safeBunks: 2,
                  neededLectures: 0
                });
              } else {
                showToast("Permission denied.", "error");
              }
            }}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-850 dark:text-white block">Push Notifications</span>
              <p className="text-xs text-zinc-550 dark:text-zinc-500">Alert me when buffer changes</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 glass-button-brand rounded-xl text-white"
            >
              <Bell className="w-4 h-4" />
            </motion.div>
          </motion.div>

          {/* Theme Toggle */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-4 glass-inner rounded-2xl cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-all"
            onClick={handleToggleTheme}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-850 dark:text-white block">Theme</span>
              <p className="text-xs text-zinc-550 dark:text-zinc-500">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
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
            background: theme === "dark" ? "rgba(139, 92, 246, 0.04)" : "rgba(139, 92, 246, 0.07)",
            border: theme === "dark" ? "1px solid rgba(139, 92, 246, 0.1)" : "1px solid rgba(139, 92, 246, 0.18)"
          }}>
          <div className="flex gap-3">
            <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-750 dark:text-purple-300 mb-1">About Bunkd</p>
              <p className="text-xs text-zinc-650 dark:text-purple-300/70 leading-relaxed">
                Track Smart. Bunk Safe. Your premium attendance tracker for college students.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clear All Attendance */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm glass-card-elevated rounded-2xl p-6 space-y-4 z-10 glass-shimmer"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">Clear All Attendance?</h4>
                  <p className="text-xs text-zinc-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete all attendance logs? Your target percentage and cycle settings will not be changed.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  disabled={clearing}
                  className="flex-1 py-3 glass-inner text-zinc-300 font-bold rounded-xl text-xs hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={handleConfirmClearAll}
                  disabled={clearing}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearing ? "Clearing..." : "Yes, Clear All"}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Semester Reset Confirmation Modal */}
      <AnimatePresence>
        {showSemResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setShowSemResetModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark shadow-2xl rounded-3xl p-6 flex flex-col z-10 text-center"
            >
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Start a New Semester?
              </h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mb-6 font-medium">
                You are changing your semester to <strong>Semester {pendingSemester}</strong>. Would you like to start a new baseline for this semester?
                <br /><br />
                Selecting <strong>Yes</strong> allows a clean slate for calculations in the new semester, while keeping all your past logs securely in the database history.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSemResetChoice(true)}
                  className="py-3 rounded-xl bg-purple-650 hover:bg-purple-750 text-white font-bold text-xs cursor-pointer shadow-md shadow-purple-500/10 transition-all"
                >
                  Yes, Start New Baseline
                </button>
                <button
                  onClick={() => handleSemResetChoice(false)}
                  className="py-3 rounded-xl bg-gray-150/40 hover:bg-gray-150/80 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 font-bold text-xs cursor-pointer transition-all"
                >
                  No, Just Change Semester
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
