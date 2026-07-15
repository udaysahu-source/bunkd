"use client";
// File: src/components/Dashboard.tsx (Refined)
import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  AlertTriangle,
  Award,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";

// Empty State Component
function EmptyState({ onLogFirst }: { onLogFirst: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-16 px-6 text-center"
    >
      <div className="flex justify-center mb-8">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-3xl flex items-center justify-center"
        >
          <BookOpen className="w-12 h-12 text-purple-600 dark:text-purple-400" />
        </motion.div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Welcome to Bunkd
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
        Track your attendance daily and instantly know how many lectures you can safely miss while staying above your target.
      </p>
      
      <motion.button
        onClick={onLogFirst}
        whileTap={{ scale: 0.95 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all"
      >
        <Plus className="w-4 h-4" />
        Log Your First Class
      </motion.button>
    </motion.div>
  );
}

// Counter Animation Component
function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const duration = 1000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayValue(Math.floor(value * progress));
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <>{displayValue}</>;
}

export default function Dashboard() {
  const {
    records,
    settings,
    overallMetrics,
    cycleMetrics,
    logAttendance,
    deleteRecord
  } = useStore();

  const [activeSegment, setActiveSegment] = useState<"overall" | "cycle">("overall");
  const [showLogModal, setShowLogModal] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const metrics = activeSegment === "overall" ? overallMetrics : cycleMetrics;
  const target = settings?.targetPercentage ?? 75;
  const hasRecords = records.length > 0;

  const handleOpenModal = () => {
    setLogDate(new Date().toISOString().split("T")[0]);
    setAttended("1");
    setTotal("1");
    setIsHoliday(false);
    setValidationError(null);
    setShowLogModal(true);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const attVal = isHoliday ? 0 : parseInt(attended);
    const totVal = isHoliday ? 0 : parseInt(total);

    if (!isHoliday) {
      if (isNaN(attVal) || isNaN(totVal)) {
        setValidationError("Please enter valid numbers");
        return;
      }
      if (attVal < 0 || totVal < 0) {
        setValidationError("Lectures cannot be negative");
        return;
      }
      if (attVal > totVal) {
        setValidationError("Attended lectures cannot exceed total lectures");
        return;
      }
    }

    try {
      await logAttendance(new Date(logDate), attVal, totVal, isHoliday);
      setShowLogModal(false);
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to log attendance");
    }
  };

  const formatDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (!hasRecords) {
    return (
      <div className="space-y-8 pb-24">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Start tracking to see your metrics
          </p>
        </div>
        
        <EmptyState onLogFirst={handleOpenModal} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header & Segment Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Here is your attendance breakdown
          </p>
        </div>

        <motion.div className="inline-flex p-1 bg-gray-100 dark:bg-bunkd-card-dark backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-bunkd-border-dark self-start sm:self-auto">
          <button
            onClick={() => setActiveSegment("overall")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeSegment === "overall"
                ? "bg-white dark:bg-bunkd-bg-dark text-purple-600 dark:text-purple-400 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Overall
          </button>
          <button
            onClick={() => setActiveSegment("cycle")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeSegment === "cycle"
                ? "bg-white dark:bg-bunkd-bg-dark text-purple-600 dark:text-purple-400 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Current Cycle
          </button>
        </motion.div>
      </div>

      {/* Main Attendance Display */}
      <motion.div
        layout
        className="relative overflow-hidden w-full bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg"
      >
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/5 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/5 blur-3xl rounded-full" />

        <motion.div
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3 inline-block">
            {activeSegment === "overall" ? "Overall Attendance" : "Current Cycle"}
          </span>
        </motion.div>

        <motion.h1
          key={`${activeSegment}-${metrics.percentage}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-7xl sm:text-8xl font-bold tracking-tighter text-gray-900 dark:text-white mt-2 select-none"
        >
          <AnimatedCounter value={metrics.percentage} />%
        </motion.h1>

        <div className="flex items-center gap-2 mt-6 text-xs font-medium px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-500/30">
          <Award className="w-3.5 h-3.5" />
          <span>Target is {target}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm mt-8 space-y-3">
          <div className="flex justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Attended</span>
            <span>Total Lectures</span>
          </div>
          <div className="relative w-full h-2 bg-gray-200 dark:bg-bunkd-bg-dark rounded-full overflow-hidden border border-gray-200/50 dark:border-bunkd-border-dark">
            <motion.div
              key={`progress-${activeSegment}-${metrics.percentage}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.percentage)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                metrics.percentage >= target
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400"
                  : "bg-gradient-to-r from-red-500 to-rose-500 dark:from-red-400 dark:to-rose-400"
              }`}
            />
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-800 dark:text-gray-200 mt-2">
            <span>{metrics.attended} classes</span>
            <span>{metrics.total} classes</span>
          </div>
        </div>
      </motion.div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Safe Bunks Card */}
        <motion.div
          layout
          className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
            metrics.percentage >= target
              ? "bg-green-50/60 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/30 text-green-900 dark:text-green-300"
              : "bg-gray-50 dark:bg-bunkd-bg-dark border-gray-200/50 dark:border-bunkd-border-dark text-gray-400 dark:text-gray-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Safe Bunks
              </span>
              <CheckCircle2 className={`w-5 h-5 ${metrics.percentage >= target ? "text-green-600 dark:text-green-400" : "text-gray-300"}`} />
            </div>
            <div className="mt-4">
              <motion.h3
                key={`safe-bunks-${metrics.safeBunks}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`text-4xl font-bold tracking-tight ${metrics.percentage >= target ? "text-green-700 dark:text-green-400" : "text-gray-900 dark:text-white"}`}
              >
                {metrics.safeBunks}
              </motion.h3>
              <p className="text-xs mt-2 font-medium leading-relaxed max-w-[240px]">
                {metrics.percentage >= target && metrics.safeBunks > 0
                  ? `You can safely skip the next ${metrics.safeBunks} lectures.`
                  : "No safe bunks available yet."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Lectures Needed Card */}
        <motion.div
          layout
          className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
            metrics.percentage < target
              ? "bg-red-50/60 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/30 text-red-900 dark:text-red-300"
              : "bg-gray-50 dark:bg-bunkd-bg-dark border-gray-200/50 dark:border-bunkd-border-dark text-gray-400 dark:text-gray-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Lectures Needed
              </span>
              <AlertTriangle className={`w-5 h-5 ${metrics.percentage < target ? "text-red-600 dark:text-red-400" : "text-gray-300"}`} />
            </div>
            <div className="mt-4">
              <motion.h3
                key={`needed-${metrics.neededLectures}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`text-4xl font-bold tracking-tight ${metrics.percentage < target ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"}`}
              >
                {metrics.neededLectures === -1 ? "N/A" : metrics.neededLectures}
              </motion.h3>
              <p className="text-xs mt-2 font-medium leading-relaxed max-w-[240px]">
                {metrics.neededLectures === -1 ? (
                  "Recovering is mathematically impossible."
                ) : metrics.neededLectures > 0 ? (
                  metrics.neededLectures >= 1 && metrics.neededLectures <= 3 ? (
                    <span className="font-semibold">
                      Only {metrics.neededLectures} classes to reach target!
                    </span>
                  ) : (
                    `Attend the next ${metrics.neededLectures} consecutive lectures.`
                  )
                ) : (
                  "You're meeting your target!"
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Attendance Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Attendance Log
          </h3>
          <motion.button
            onClick={handleOpenModal}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold text-xs rounded-lg shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Day</span>
          </motion.button>
        </div>

        <div className="bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-2xl overflow-hidden divide-y divide-gray-100/50 dark:divide-bunkd-border-dark shadow-sm">
          {records
            .slice()
            .reverse()
            .map((record) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-bunkd-bg-dark transition-all group"
              >
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDateString(record.dateTimestamp)}
                  </p>
                  <div className="flex items-center gap-2">
                    {record.isHoliday ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg bg-amber-100/50 dark:bg-amber-500/15 border border-amber-200/50 dark:border-amber-500/30">
                        Holiday
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          <strong className="text-gray-900 dark:text-white">{record.attendedLectures}/{record.totalLectures}</strong> classes
                        </span>
                        <span className="text-[8px] text-gray-300">•</span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                          record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                            ? "bg-green-100/50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-500/30"
                            : "bg-red-100/50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-500/30"
                        }`}>
                          {record.totalLectures > 0
                            ? `${Math.round((record.attendedLectures / record.totalLectures) * 100)}%`
                            : "0%"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <motion.button
                  onClick={() => record.id && deleteRecord(record.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete Log"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark shadow-2xl rounded-2xl p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                    Log Attendance
                  </h4>
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleLogSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none text-gray-900 dark:text-white text-sm transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-lg">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">Mark as Holiday</span>
                      <p className="text-[10px] text-gray-500">Exclude from metrics</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHoliday}
                        onChange={(e) => setIsHoliday(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 dark:peer-checked:bg-purple-600" />
                    </label>
                  </div>

                  {!isHoliday && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                          Attended
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={attended}
                          onChange={(e) => setAttended(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                          Total
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={total}
                          onChange={(e) => setTotal(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white text-sm transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {validationError && (
                    <div className="text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Attendance</span>
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
