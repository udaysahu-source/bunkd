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
  Trash2,
  AlertTriangle,
  Bell,
  User,
  GraduationCap,
  BookOpen,
  School,
  Download,
  Sliders,
  ShieldAlert
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
    updateProfileSemester,
    exportAttendanceCSV,
    overallMetrics,
    user
  } = useStore();

  const [activeSection, setActiveSection] = useState<"profile" | "policy" | "notifications" | "data" | "appearance">("profile");

  // Settings state
  const [cycleStartDay, setCycleStartDay] = useState("1");
  const [targetPercentage, setTargetPercentage] = useState("75");
  const [isCustomTarget, setIsCustomTarget] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState("");
  const [profileSemester, setProfileSemester] = useState<number>(1);
  const [profileDepartment, setProfileDepartment] = useState("");
  const [profileCollegeName, setProfileCollegeName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Semester Reset Confirmation Modal
  const [showSemResetModal, setShowSemResetModal] = useState(false);
  const [pendingSemester, setPendingSemester] = useState<number | null>(null);

  // Clear all modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Load current settings values
  useEffect(() => {
    if (settings) {
      setCycleStartDay(settings.cycleStartDay.toString());
      const pctStr = settings.targetPercentage.toString();
      setTargetPercentage(pctStr);
      setIsCustomTarget(!["75", "80", "85", "90"].includes(pctStr));
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

  // Theme setup
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
    try {
      await saveProfile(
        profileName.trim(),
        profileSemester,
        profileDepartment.trim(),
        profileCollegeName.trim() || null
      );
      showToast("Academic profile updated successfully", "success");
    } catch {
      showToast("Failed to update profile", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSemResetChoice = async (resetBaseline: boolean) => {
    if (pendingSemester === null) return;
    setProfileLoading(true);
    setShowSemResetModal(false);
    try {
      await updateProfileSemester(pendingSemester, resetBaseline);
      await saveProfile(
        profileName.trim(),
        pendingSemester,
        profileDepartment.trim(),
        profileCollegeName.trim() || null
      );
      showToast("Semester and profile updated successfully", "success");
      setPendingSemester(null);
    } catch {
      showToast("Failed to update semester preferences", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(cycleStartDay, 10);
    const targetVal = parseInt(targetPercentage, 10);

    if (isNaN(day) || day < 1 || day > 28) {
      showToast("Cycle start day must be between 1 and 28.", "error");
      return;
    }
    if (isNaN(targetVal) || targetVal < 0 || targetVal > 100) {
      showToast("Target percentage must be between 0 and 100.", "error");
      return;
    }

    setLoading(true);
    try {
      await updateSettings(day, targetVal);
      showToast("Attendance policy settings updated", "success");
    } catch {
      showToast("Failed to update settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAllAttendance();
      setShowClearModal(false);
      showToast("All attendance records have been cleared", "info");
    } catch {
      showToast("Failed to clear attendance data", "error");
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      showToast("Logged out successfully", "info");
    } catch {
      showToast("Failed to sign out", "error");
    }
  };

  const handleExportCSV = () => {
    const csv = exportAttendanceCSV();
    if (!csv) {
      showToast("No data to export", "info");
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bunkd_backup_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    showToast("Attendance backup downloaded", "success");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span>Application Settings</span>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage academic profile, attendance policy, notification triggers, and data backup.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: "profile", label: "Academic Profile", icon: GraduationCap },
          { id: "policy", label: "Attendance Rules", icon: Target },
          { id: "notifications", label: "Reminders & PWA", icon: Bell },
          { id: "data", label: "Data & Safety", icon: ShieldAlert },
          { id: "appearance", label: "Appearance", icon: Sun },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeSection === id
                ? "bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ──── SECTION 1: ACADEMIC PROFILE ──── */}
      {activeSection === "profile" && (
        <div className="app-card p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Student Academic Profile
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Your curriculum and semester configuration. Changing semester isolates attendance logs.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-500" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                <span>Current Semester</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setProfileSemester(sem)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      profileSemester === sem
                        ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                  <span>Department / Major</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileDepartment}
                  onChange={e => setProfileDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-purple-500" />
                  <span>College / University (Optional)</span>
                </label>
                <input
                  type="text"
                  value={profileCollegeName}
                  onChange={e => setProfileCollegeName(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="submit"
                disabled={profileLoading}
                className="btn-primary text-xs py-2 px-4"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{profileLoading ? "Saving..." : "Save Profile"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ──── SECTION 2: ATTENDANCE RULES & TARGETS ──── */}
      {activeSection === "policy" && (
        <div className="app-card p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Attendance Threshold & Cycle Rules
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set the minimum attendance percentage mandated by your institution.
            </p>
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-6">
            {/* Target Percentage Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-500" />
                <span>Minimum Target Percentage</span>
              </label>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {["75", "80", "85", "90"].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setTargetPercentage(val);
                      setIsCustomTarget(false);
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      targetPercentage === val && !isCustomTarget
                        ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customTargetToggle"
                  checked={isCustomTarget}
                  onChange={e => setIsCustomTarget(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="customTargetToggle" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  Use custom percentage threshold
                </label>
              </div>

              {isCustomTarget && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={targetPercentage}
                    onChange={e => setTargetPercentage(e.target.value)}
                    placeholder="Enter custom percentage (e.g. 70)"
                    className="form-input text-xs font-bold w-40"
                  />
                </div>
              )}
            </div>

            {/* Cycle Start Day */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-purple-500" />
                <span>Monthly Cycle Start Day (1 - 28)</span>
              </label>
              <input
                type="number"
                min="1"
                max="28"
                required
                value={cycleStartDay}
                onChange={e => setCycleStartDay(e.target.value)}
                className="form-input text-xs font-bold w-32"
              />
              <p className="text-xs text-zinc-500 mt-1">
                For colleges that calculate attendance from a specific day of the month (e.g. 1st to 31st, or 15th to 14th).
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs py-2 px-4"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? "Saving..." : "Save Policy"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ──── SECTION 3: NOTIFICATIONS ──── */}
      {activeSection === "notifications" && (
        <div className="app-card p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Daily Attendance Reminders
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enable local push notifications to remind you to log daily class attendance at the end of the day.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                Push Notification Permissions
              </span>
              <span className="text-xs text-zinc-500">
                Requires browser permission. Works offline in PWA mode.
              </span>
            </div>
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission();
                if (granted === "granted") {
                  showToast("Notification permission granted!", "success");
                  sendAttendancePushNotification({
                    percentage: overallMetrics.percentage,
                    target: settings?.targetPercentage ?? 75,
                    safeBunks: overallMetrics.safeBunks,
                    neededLectures: overallMetrics.neededLectures
                  });
                } else {
                  showToast("Notification permission was denied.", "error");
                }
              }}
              className="btn-primary text-xs py-2 px-3"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Push</span>
            </button>
          </div>
        </div>
      )}

      {/* ──── SECTION 4: DATA SAFETY & BACKUP ──── */}
      {activeSection === "data" && (
        <div className="app-card p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Data Management & Safety
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Export data backups, or clear records when beginning a clean slate.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Export Attendance Data
                </span>
                <span className="text-xs text-zinc-500">
                  Download all logged attendance records formatted as a standard CSV spreadsheet.
                </span>
              </div>
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-xs py-2 px-3"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Clear All Attendance */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-rose-900 dark:text-rose-300 block">
                  Clear All Attendance Records
                </span>
                <span className="text-xs text-zinc-500">
                  Permanently deletes all historical and baseline entries. Cannot be undone.
                </span>
              </div>
              <button
                onClick={() => setShowClearModal(true)}
                className="btn-destructive text-xs py-2 px-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>

            {/* Account Sign Out */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Signed in as {user?.email || "Guest Session"}
                </span>
                <span className="text-xs text-zinc-500">
                  {user?.isAnonymous ? "Guest Mode (Local Storage)" : "Authenticated Firebase Account"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-xs py-2 px-3 text-rose-600 hover:text-rose-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── SECTION 5: APPEARANCE ──── */}
      {activeSection === "appearance" && (
        <div className="app-card p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Visual Theme & Display
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customize interface contrast for day and night study sessions.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                Dark Mode
              </span>
              <span className="text-xs text-zinc-500">
                Currently set to {theme === "dark" ? "Dark Theme" : "Light Theme"}
              </span>
            </div>
            <button
              onClick={handleToggleTheme}
              className="btn-secondary text-xs py-2 px-3"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-purple-500" />}
              <span>Switch to {theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ──── SEMESTER SWITCH CONFIRMATION MODAL ──── */}
      <AnimatePresence>
        {showSemResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md app-card p-6 bg-white dark:bg-[#1a162b] shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                <GraduationCap className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Switching to Semester {pendingSemester}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                You are changing your active academic semester from Sem {profile?.semester} to Sem {pendingSemester}. Would you like to carry forward your existing baseline or start fresh?
              </p>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSemResetChoice(true)}
                  className="w-full btn-primary text-xs py-2.5"
                >
                  Start Fresh for Semester {pendingSemester} (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => handleSemResetChoice(false)}
                  className="w-full btn-secondary text-xs py-2.5"
                >
                  Keep Previous Baseline Settings
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSemResetModal(false); setPendingSemester(null); }}
                  className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 py-1"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──── CLEAR ALL MODAL ──── */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm app-card p-6 bg-white dark:bg-[#1a162b] shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Permanent Data Deletion
                </h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                This will permanently delete all logged attendance days, baseline values, and custom configurations. Are you sure you want to proceed?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="btn-destructive text-xs"
                >
                  {clearing ? "Clearing..." : "Yes, Delete Everything"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
