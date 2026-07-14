"use client";
// File: src/components/Dashboard.tsx
import React, { useState } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Smile,
  AlertTriangle,
  Award,
  ChevronRight,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  XCircle
} from "lucide-react";

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
    } catch (err: any) {
      setValidationError(err.message || "Failed to log attendance");
    }
  };

  // Format date to human readable string
  const formatDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Segment Selector & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Welcome back
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
            Here is your attendance breakdown.
          </p>
        </div>

        <div className="inline-flex p-1 bg-zinc-200/50 dark:bg-zinc-800/40 backdrop-blur-md rounded-2xl border border-zinc-200/20 dark:border-zinc-700/20 self-start sm:self-auto">
          <button
            onClick={() => setActiveSegment("overall")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeSegment === "overall"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Overall
          </button>
          <button
            onClick={() => setActiveSegment("cycle")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeSegment === "cycle"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Current Cycle
          </button>
        </div>
      </div>

      {/* Massive Attendance Display (Miller's Law / Von Restorff Effect) */}
      <motion.div
        layout
        className="relative overflow-hidden w-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg"
      >
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-zinc-400/10 dark:bg-zinc-700/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-zinc-400/10 dark:bg-zinc-700/10 blur-3xl rounded-full" />

        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
          {activeSegment === "overall" ? "Overall Attendance" : "Cycle Attendance"}
        </span>

        <h1 className="text-7xl sm:text-8xl font-black tracking-tighter text-zinc-950 dark:text-white mt-1 select-none">
          {metrics.percentage}%
        </h1>

        <div className="flex items-center gap-2 mt-4 text-xs font-medium px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border border-zinc-200/20 dark:border-zinc-750/20">
          <Award className="w-3.5 h-3.5" />
          <span>Target is {target}%</span>
        </div>

        <div className="w-full max-w-sm mt-8 space-y-2">
          <div className="flex justify-between text-xs text-zinc-400 font-semibold uppercase">
            <span>Attended</span>
            <span>Total lectures</span>
          </div>
          <div className="relative w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200/20 dark:border-zinc-700/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.percentage)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                metrics.percentage >= target
                  ? "bg-emerald-500 dark:bg-emerald-600"
                  : "bg-rose-500 dark:bg-rose-600"
              }`}
            />
          </div>
          <div className="flex justify-between text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">
            <span>{metrics.attended} classes</span>
            <span>{metrics.total} classes</span>
          </div>
        </div>
      </motion.div>

      {/* Secondary Cards (Safe Bunks / Needed Lectures) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Safe Bunks Card - Greenish surplus state */}
        <div
          className={`rounded-3xl p-6 border transition-all flex flex-col justify-between ${
            metrics.percentage >= target
              ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300"
              : "bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Safe Bunks
              </span>
              <Smile className={`w-5 h-5 ${metrics.percentage >= target ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`} />
            </div>
            <div className="mt-4">
              <h3 className={`text-4xl font-extrabold tracking-tight ${metrics.percentage >= target ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-white"}`}>
                {metrics.safeBunks}
              </h3>
              <p className="text-xs mt-1.5 font-medium leading-relaxed max-w-[240px]">
                {metrics.percentage >= target && metrics.safeBunks > 0
                  ? `You can safely skip the next ${metrics.safeBunks} lectures and stay above target.`
                  : "You do not have any safe bunks left."}
              </p>
            </div>
          </div>
        </div>

        {/* Needed Lectures Card - Reddish deficit state */}
        <div
          className={`rounded-3xl p-6 border transition-all flex flex-col justify-between ${
            metrics.percentage < target
              ? "bg-rose-55/40 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/30 text-rose-900 dark:text-rose-300"
              : "bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Lectures Needed
              </span>
              <AlertTriangle className={`w-5 h-5 ${metrics.percentage < target ? "text-rose-600 dark:text-rose-400" : "text-zinc-400"}`} />
            </div>
            <div className="mt-4">
              <h3 className={`text-4xl font-extrabold tracking-tight ${metrics.percentage < target ? "text-rose-700 dark:text-rose-450" : "text-zinc-900 dark:text-white"}`}>
                {metrics.neededLectures === -1 ? "N/A" : metrics.neededLectures}
              </h3>
              <p className="text-xs mt-1.5 font-medium leading-relaxed max-w-[240px]">
                {metrics.neededLectures === -1 ? (
                  "At 100% target, recovering from missed lectures is mathematically impossible."
                ) : metrics.neededLectures > 0 ? (
                  metrics.neededLectures >= 1 && metrics.neededLectures <= 3 ? (
                    <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Only {metrics.neededLectures} classes left to reach your target!
                    </span>
                  ) : (
                    `Attend the next ${metrics.neededLectures} consecutive lectures to reach your target.`
                  )
                ) : (
                  "You are currently meeting your target."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logging & List Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            Attendance Log
          </h3>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-150 text-white dark:text-zinc-900 font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Day</span>
          </button>
        </div>

        {/* List of records */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60 shadow-sm">
          {records.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarCheck className="w-8 h-8 text-zinc-350 mx-auto mb-2.5" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No attendance logged yet</p>
              <button
                onClick={handleOpenModal}
                className="mt-2.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-white"
              >
                Log your first class
              </button>
            </div>
          ) : (
            records.slice().reverse().map((record) => (
              <div
                key={record.id}
                className="p-5 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-all group"
              >
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-zinc-850 dark:text-zinc-100">
                    {formatDateString(record.dateTimestamp)}
                  </p>
                  <div className="flex items-center gap-2">
                    {record.isHoliday ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200/20 dark:border-amber-900/20">
                        Holiday
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">
                          Lectures: <strong className="text-zinc-900 dark:text-white">{record.attendedLectures}/{record.totalLectures}</strong>
                        </span>
                        <span className="text-[10px] text-zinc-405">•</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/10"
                            : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-200/10"
                        }`}>
                          {record.totalLectures > 0
                            ? `${Math.round((record.attendedLectures / record.totalLectures) * 100)}%`
                            : "0%"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => record.id && deleteRecord(record.id)}
                  className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete Log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Log Attendance Drawer/Modal Dialog */}
      <AnimatePresence>
        {showLogModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl rounded-3xl p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Log Attendance
                  </h4>
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleLogSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/30 dark:border-zinc-750/30 rounded-2xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-zinc-850 dark:text-zinc-250">Mark as Holiday</span>
                      <p className="text-[10px] text-zinc-400">Excludes this day from all aggregates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHoliday}
                        onChange={(e) => setIsHoliday(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-650 peer-checked:bg-zinc-900 dark:peer-checked:bg-white peer-checked:after:bg-white dark:peer-checked:after:bg-zinc-900" />
                    </label>
                  </div>

                  {!isHoliday && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                          Attended
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={attended}
                          onChange={(e) => setAttended(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                          Total
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={total}
                          onChange={(e) => setTotal(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/30 dark:border-zinc-700/30 focus:border-zinc-900 dark:focus:border-white focus:outline-none text-zinc-900 dark:text-white text-sm transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {validationError && (
                    <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-250/20 rounded-xl p-2.5 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Log Attendance</span>
                  </button>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
