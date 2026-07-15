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
  AlertTriangle
} from "lucide-react";

export default function Calendar() {
  const { records, logAttendance, toggleHoliday, deleteRecord, showToast } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Log form state
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

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

  const handleDirectToggleHoliday = async (date: Date, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    try {
      await toggleHoliday(date);
      const docId = dateToDocId(date);
      const isNowHoliday = !records.find(r => r.id === docId)?.isHoliday;
      showToast(isNowHoliday ? "Marked as Holiday ☀️" : "Removed Holiday status 📅", "info");
    } catch (err) {
      console.error("Failed to toggle holiday", err);
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
        <h2 className="text-3xl font-extrabold tracking-tight text-white leading-none">
          Calendar
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          Tap a date to update your status
        </p>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-bunkd-card-dark border border-bunkd-border-dark rounded-3xl p-6 shadow-lg">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={prevMonth}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-bunkd-bg-secondary-dark text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer border border-transparent hover:border-bunkd-border-dark"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={nextMonth}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-bunkd-bg-secondary-dark text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer border border-transparent hover:border-bunkd-border-dark"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-3 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <span
              key={dayName}
              className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-550"
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
            className="grid grid-cols-7 gap-2"
          >
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const docId = dateToDocId(date);
              const record = records.find(r => r.id === docId);
              const isToday = new Date().toDateString() === date.toDateString();

              let bgClass = "bg-bunkd-bg-dark/40 dark:bg-bunkd-bg-dark/40 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/35";
              let textClass = "text-zinc-300";
              let borderClass = "border border-bunkd-border-dark";

              if (record) {
                if (record.isHoliday) {
                  bgClass = "bg-amber-500/10 dark:bg-amber-500/10 hover:bg-amber-500/15";
                  textClass = "text-amber-400 font-bold";
                  borderClass = "border border-amber-500/25";
                } else {
                  const ratio = record.totalLectures > 0 ? record.attendedLectures / record.totalLectures : 0;
                  if (ratio >= 0.75) {
                    bgClass = "bg-green-500/10 dark:bg-green-500/10 hover:bg-green-500/15";
                    textClass = "text-green-400 font-bold";
                    borderClass = "border border-green-500/25";
                  } else if (record.totalLectures > 0) {
                    bgClass = "bg-red-500/10 dark:bg-red-500/10 hover:bg-red-500/15";
                    textClass = "text-red-400 font-bold";
                    borderClass = "border border-red-500/25";
                  }
                }
              }

              if (isToday) {
                borderClass = "border-2 border-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.2)]";
              }

              return (
                <motion.button
                  key={docId}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDayClick(date)}
                  className={`aspect-square rounded-xl ${bgClass} ${borderClass} p-1.5 flex flex-col justify-between items-center relative cursor-pointer group transition-all`}
                >
                  {/* Day number */}
                  <span className={`text-xs font-bold ${textClass}`}>
                    {date.getDate()}
                  </span>

                  {/* Status Indicator */}
                  <div className="w-full flex items-center justify-center min-h-[14px]">
                    {record ? (
                      record.isHoliday ? (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <span className="text-[9px] font-extrabold tracking-tighter">
                          {record.attendedLectures}/{record.totalLectures}
                        </span>
                      )
                    ) : (
                      <button
                        onClick={(e) => handleDirectToggleHoliday(date, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-purple-500/20 transition-all cursor-pointer"
                        title="Quick Mark Holiday"
                      >
                        <Sun className="w-3 h-3 text-zinc-500 hover:text-amber-400" />
                      </button>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="w-full max-w-sm bg-bunkd-card-dark border border-bunkd-border-dark shadow-2xl rounded-2xl p-6 space-y-5 z-10"
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
                  <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider mt-0.5">Update status for this date</p>
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
                <div className="flex items-center justify-between p-3.5 bg-bunkd-bg-secondary-dark border border-bunkd-border-dark rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Mark as Holiday
                    </span>
                    <p className="text-[10px] text-zinc-500">Exclude from metrics</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHoliday}
                      onChange={(e) => setIsHoliday(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650 peer-checked:after:bg-white" />
                  </label>
                </div>

                {!isHoliday && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Attended
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={attended}
                        onChange={(e) => setAttended(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-bunkd-bg-dark/50 border border-bunkd-border-dark focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none text-white text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Total
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-bunkd-bg-dark/50 border border-bunkd-border-dark focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none text-white text-sm transition-all"
                      />
                    </div>
                  </div>
                )}

                {validationError && (
                  <div className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
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
                              className="py-3 px-4 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => setShowConfirmDelete(false)}
                              whileTap={{ scale: 0.95 }}
                              className="py-3 px-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl text-xs transition-all cursor-pointer border border-bunkd-border-dark"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            type="button"
                            onClick={() => setShowConfirmDelete(true)}
                            whileTap={{ scale: 0.95 }}
                            className="py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all text-sm flex items-center gap-1 cursor-pointer"
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
                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
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
    </div>
  );
}
