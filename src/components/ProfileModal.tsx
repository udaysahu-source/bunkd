"use client";
// File: src/components/ProfileModal.tsx
import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, School, User, Save } from "lucide-react";

export default function ProfileModal() {
  const { user, saveProfile, showToast } = useStore();
  
  const [name, setName] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [department, setDepartment] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loading, setLoading] = useState(false);

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
      showToast("Academic profile setup completed! Welcome to Bunkd.", "success");
    } catch {
      showToast("Failed to save profile. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const defaultName = user?.displayName || "Student";
      await saveProfile(
        defaultName,
        1,
        "General",
        null
      );
      showToast("Profile initialized with defaults. Modify anytime in Settings!", "info");
    } catch {
      showToast("Failed to initialize profile defaults.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto app-card bg-white dark:bg-[#1a162b] p-6 sm:p-7 flex flex-col z-10 shadow-2xl relative"
      >
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-200 dark:border-purple-900">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Academic Profile Setup
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Complete your profile to customize Bunkd for your curriculum.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-500" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              <span>Current Semester</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSemester(sem)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    semester === sem
                      ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-500" />
              <span>Department / Major</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
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
              disabled={loading}
              value={collegeName}
              onChange={e => setCollegeName(e.target.value)}
              placeholder="e.g. Stanford University"
              className="form-input"
            />
          </div>

          <div className="pt-3 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Saving..." : "Save Academic Profile"}</span>
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 py-1 cursor-pointer"
            >
              Skip for now (use defaults)
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
