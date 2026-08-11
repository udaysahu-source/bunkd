"use client";
// File: src/components/ProfileModal.tsx
import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, School, User, Save, RefreshCw } from "lucide-react";

export default function ProfileModal() {
  const { user, saveProfile, showToast } = useStore();
  
  // State variables
  const [name, setName] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [department, setDepartment] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loading, setLoading] = useState(false);

  // Autofill name from auth provider if available
  useEffect(() => {
    if (user?.displayName) {
      setName(user.displayName);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter your name.", "error");
      return;
    }
    if (!department.trim()) {
      showToast("Please enter your department/major.", "error");
      return;
    }

    setLoading(true);
    try {
      await saveProfile(
        name.trim(),
        semester,
        department.trim(),
        collegeName.trim() || null
      );
      showToast("Profile set up successfully! Welcome to Bunkd.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save profile. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-bunkd-card-dark border border-gray-200/40 dark:border-bunkd-border-dark/60 shadow-2xl rounded-3xl p-6 sm:p-7 flex flex-col z-10 relative"
      >
        {/* Decorative glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/5 blur-[50px] rounded-full pointer-events-none" />

        <div className="mb-6 text-center relative z-10">
          <div className="w-12 h-12 bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-purple-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Academic Profile Setup
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
            Complete your profile to customize Bunkd for your curriculum.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-500" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800/60 bg-gray-50 dark:bg-bunkd-bg-dark/50 focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white text-sm font-semibold transition-all"
            />
          </div>

          {/* Semester Tap Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2 pl-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              <span>Current Semester</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSemester(sem)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    semester === sem
                      ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/10"
                      : "bg-gray-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-gray-200/60 dark:border-zinc-800/60 hover:bg-gray-200 dark:hover:bg-zinc-800/80"
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
              <BookOpen className="w-3.5 h-3.5 text-purple-500" />
              <span>Department / Major</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={department}
              onChange={(e) => setDepartment(e.target.value.toUpperCase())}
              placeholder="e.g. CSE, Mechanical, Business"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800/60 bg-gray-50 dark:bg-bunkd-bg-dark/50 focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white text-sm font-semibold transition-all uppercase"
            />
          </div>

          {/* College Name (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 mb-2 pl-1 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-550" />
              <span>College / University <span className="text-xs lowercase font-normal text-zinc-400 dark:text-zinc-500 pl-0.5">(optional)</span></span>
            </label>
            <input
              type="text"
              disabled={loading}
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. IIT Delhi, Harvard"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800/60 bg-gray-50 dark:bg-bunkd-bg-dark/50 focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white text-sm font-semibold transition-all"
            />
          </div>

          <div className="sticky bottom-0 bg-white/90 dark:bg-bunkd-card-dark/95 backdrop-blur-md pt-4 pb-2 z-10 border-t border-black/5 dark:border-white/5 mt-6">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-600 dark:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
