"use client";
// File: src/components/Calendar.tsx
import React, { useState } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  XCircle,
  CheckCircle2,
  Trash2,
  Plus,
  AlertTriangle
} from "lucide-react";
import type { AttendanceRecord } from "../lib/attendanceMath";

export default function Calendar() {
  const { records, logAttendance, deleteRecord, showToast, settings } = useStore();
  const target = settings?.targetPercentage ?? 75;
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Log form state
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // Create days array
  const days = [];
  // Padding cells for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowConfirmDelete(false);
    const docId = dateToDocId(date);
    const existing = records.find(r => r.id === docId);

    if (existing) {
      setAttended(existing.attendedLectures.toString());
      setTotal(existing.totalLectures.toString());
      setIsHoliday(existing.isHoliday);
    } else {
      setAttended("1");
      setTotal("1");
      setIsHoliday(false);
    }
    setValidationError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
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
      await logAttendance(selectedDate, attVal, totVal, isHoliday);
      setSelectedDate(null);
      showToast("Attendance saved successfully!", "success");
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to log attendance");
    }
  };

  const handleDelete = async () => {
    if (!selectedDate) return;
    try {
      const docId = dateToDocId(selectedDate);
      await deleteRecord(docId);
      setSelectedDate(null);
      setShowConfirmDelete(false);
      showToast("Record deleted successfully", "info");
    } catch (err) {
      console.error("Failed to delete record", err);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
          Calendar
        </h2>
        <p className="text-zinc-550 dark:text-zinc-500 text-sm mt-1">
          Tap a date to update your status, log classes, or override holidays
        </p>
      </div>

      {/* Calendar Grid Container */}
      <div className="glass-card rounded-3xl p-4 sm:p-6 glass-shimmer">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-white">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={prevMonth}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex items-center justify-center hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-zinc-550 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-black/[0.05] dark:hover:border-white/[0.06]"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={nextMonth}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex items-center justify-center hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-zinc-550 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-black/[0.05] dark:hover:border-white/[0.06]"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <span
              key={dayName}
              className="text-xs sm:text-xs font-extrabold uppercase tracking-wider text-zinc-500"
            >
              {dayName}
            </span>
          ))}
        </div>

        {/* Days Grid - Animated Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-7 gap-1 sm:gap-2"
          >
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const docId = dateToDocId(date);
              const record = records.find(r => r.id === docId);
              const isToday = new Date().toDateString() === date.toDateString();

              let bgClass = "bg-white/[0.02] hover:bg-purple-500/10 hover:text-purple-300";
              let textClass = "text-zinc-300";
              let borderClass = "border border-white/5";

              if (record) {
                if (record.isHoliday) {
                  bgClass = "bg-amber-500/15 hover:bg-amber-500/20";
                  textClass = "text-amber-300 font-bold";
                  borderClass = "border border-amber-500/30";
                } else {
                  const ratio = record.totalLectures > 0 ? record.attendedLectures / record.totalLectures : 0;
                  if (ratio >= 0.75) {
                    bgClass = "bg-emerald-500/15 hover:bg-emerald-500/20";
                    textClass = "text-emerald-400 font-bold";
                    borderClass = "border border-emerald-500/30";
                  } else if (record.totalLectures > 0) {
                    bgClass = "bg-rose-500/15 hover:bg-rose-500/20";
                    textClass = "text-rose-400 font-bold";
                    borderClass = "border border-rose-500/30";
                  }
                }
              }

              if (isToday) {
                borderClass = "border-2 border-purple-500 ring-2 ring-purple-500/20";
              }

              return (
                <motion.button
                  key={docId}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDayClick(date)}
                  className={`aspect-square rounded-xl ${bgClass} ${borderClass} p-1 sm:p-1.5 flex flex-col justify-between items-center relative cursor-pointer group transition-all select-none`}
                >
                  {/* Day number */}
                  <span className={`text-xs sm:text-xs font-bold ${textClass}`}>
                    {date.getDate()}
                  </span>

                  {/* Status Indicator */}
                  <div className="w-full flex items-center justify-center min-h-[14px]">
                    {record ? (
                      record.isHoliday ? (
                        <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                      ) : (
                        <span className="text-xs sm:text-xs font-extrabold tracking-tighter">
                          {record.attendedLectures}/{record.totalLectures}
                        </span>
                      )
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Calendar Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-bold text-zinc-550 dark:text-zinc-400 mt-5 pt-4 border-t border-black/5 dark:border-white/5 select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/15 border border-emerald-500/30" />
            <span>On Track (≥{target}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-500/15 border border-rose-500/30" />
            <span>Below Target (&lt;{target}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Sun className="w-2.5 h-2.5 text-amber-400" />
            </div>
            <span>Holiday / Weekend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-white/[0.02] border border-white/5" />
            <span>No Log</span>
          </div>
        </div>
      </div>

      {/* Recent Log list inside Calendar */}
      {(() => {
        const formatDateString = (timestamp: number) => {
          const date = new Date(timestamp);
          return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
        };
        const dailyRecords = records.filter(r => r.type !== "baseline");
        const recentRecords = showAllLogs ? dailyRecords.slice().reverse() : dailyRecords.slice().reverse().slice(0, 5);

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-zinc-800 dark:text-white">Recent Log</h3>
              <motion.button
                onClick={() => handleDayClick(new Date())}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs font-bold text-purple-650 dark:text-purple-400"
                style={{
                  background: "rgba(139, 92, 246, 0.08)",
                  border: "1px solid rgba(139, 92, 246, 0.15)"
                }}
              >
                <Plus className="w-3.5 h-3.5" /><span>Add Log</span>
              </motion.button>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04] glass-shimmer">
              <AnimatePresence initial={false}>
                {recentRecords.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 font-semibold">
                    No daily logs yet. Tap a date on the calendar above to start logging.
                  </div>
                ) : (
                  recentRecords.map((record) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3.5 flex items-center justify-between hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-all group overflow-hidden"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-zinc-800 dark:text-white">{formatDateString(record.dateTimestamp)}</p>
                        <div className="flex items-center gap-2">
                          {record.isHoliday ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-lg"
                              style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                              Holiday
                            </span>
                          ) : (
                            <>
                              <span className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">
                                <strong className="text-zinc-800 dark:text-white">{record.attendedLectures}/{record.totalLectures}</strong>
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                                record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                                  ? "text-green-600 dark:text-green-400" : "text-red-650 dark:text-red-400"
                              }`}
                                style={{
                                  background: record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                                    ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                                  border: record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                                    ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.15)"
                                }}
                              >
                                {record.totalLectures > 0 ? `${Math.round((record.attendedLectures / record.totalLectures) * 100)}%` : "0%"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <motion.button
                          onClick={() => record.id && handleDayClick(new Date(record.dateTimestamp))}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-2.5 py-1 text-xs font-bold text-purple-650 dark:text-purple-400 hover:bg-purple-500/10 rounded-md transition-all cursor-pointer border border-transparent hover:border-purple-500/20"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          onClick={() => record.id && setRecordToDelete(record)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 text-zinc-455 dark:text-zinc-500 hover:text-red-550 dark:hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 opacity-80 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {dailyRecords.length > 5 && (
              <button
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="w-full text-center text-xs font-bold text-purple-650 dark:text-purple-400 hover:text-purple-500 py-2 cursor-pointer transition-colors"
              >
                {showAllLogs ? "Show Less ↑" : `Show All ${dailyRecords.length} Entries ↓`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Date Logging Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="w-full max-w-sm glass-card-elevated rounded-2xl p-6 space-y-5 z-10 glass-shimmer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-white">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "long"
                    })}
                  </h4>
                  <p className="text-xs text-zinc-550 font-bold uppercase tracking-wider mt-0.5">Update status for this date</p>
                </div>
                <motion.button
                  onClick={() => setSelectedDate(null)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-lg font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </motion.button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Holiday Toggle */}
                <div className="flex items-center justify-between p-3.5 glass-inner rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Mark as Holiday
                    </span>
                    <p className="text-xs text-zinc-500">Exclude from metrics</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHoliday}
                      onChange={(e) => setIsHoliday(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white" />
                  </label>
                </div>

                {!isHoliday && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Attended
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={attended}
                        onChange={(e) => setAttended(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg glass-input text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Total
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg glass-input text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {validationError && (
                  <div className="text-xs font-medium text-red-400 rounded-lg p-3 flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    {records.some(r => r.id === dateToDocId(selectedDate)) && (
                      <div className="shrink-0 flex items-center">
                        {showConfirmDelete ? (
                          <div className="flex items-center gap-1">
                            <motion.button
                              type="button"
                              onClick={handleDelete}
                              whileTap={{ scale: 0.95 }}
                              className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => setShowConfirmDelete(false)}
                              whileTap={{ scale: 0.95 }}
                              className="py-3 px-3 glass-inner text-zinc-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            type="button"
                            onClick={() => setShowConfirmDelete(true)}
                            whileTap={{ scale: 0.95 }}
                            className="py-3 px-4 text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-all text-sm flex items-center gap-1 cursor-pointer" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.12)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </motion.button>
                        )}
                      </div>
                    )}
                    
                    {!showConfirmDelete && (
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 glass-button-brand text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Attendance</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Delete Record */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm glass-card-elevated rounded-3xl p-6 space-y-4 z-10 glass-shimmer"
            >
              <div className="flex items-center gap-3 text-red-450 dark:text-red-450">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-gray-900 dark:text-white">Delete Attendance Log?</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium">
                Are you sure you want to permanently delete the attendance record for{" "}
                <strong>
                  {new Date(recordToDelete.dateTimestamp).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
                ?
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-3 glass-inner text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={async () => {
                    if (recordToDelete.id) {
                      await deleteRecord(recordToDelete.id);
                      showToast("Record deleted successfully", "info");
                    }
                    setRecordToDelete(null);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
