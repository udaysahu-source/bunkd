"use client";
// File: src/components/Calendar.tsx
import React, { useState } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Coffee,
  Check,
  AlertCircle,
  XCircle,
  Sparkles
} from "lucide-react";

export default function Calendar() {
  const { records, logAttendance, toggleHoliday, deleteRecord } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Log form state
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    } catch (err: any) {
      setValidationError(err.message || "Failed to log attendance");
    }
  };

  const handleDirectToggleHoliday = async (date: Date, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    try {
      await toggleHoliday(date);
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
    } catch (err) {
      console.error("Failed to delete record", err);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Calendar
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
          Tap a date to update your status, or tap the coffee icon to toggle holiday.
        </p>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-850 dark:text-zinc-100">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-xl transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <span
              key={dayName}
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
            >
              {dayName}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const docId = dateToDocId(date);
            const record = records.find(r => r.id === docId);
            const isToday = new Date().toDateString() === date.toDateString();

            let bgClass = "bg-zinc-50/50 dark:bg-zinc-850/20 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50";
            let textClass = "text-zinc-800 dark:text-zinc-200";
            let borderClass = "border border-zinc-200/25 dark:border-zinc-800/20";

            if (record) {
              if (record.isHoliday) {
                bgClass = "bg-amber-50/70 dark:bg-amber-950/20";
                textClass = "text-amber-700 dark:text-amber-400";
                borderClass = "border border-amber-250/20 dark:border-amber-900/20";
              } else {
                const ratio = record.totalLectures > 0 ? record.attendedLectures / record.totalLectures : 0;
                if (ratio >= 0.75) {
                  bgClass = "bg-emerald-50/60 dark:bg-emerald-950/10";
                  textClass = "text-emerald-700 dark:text-emerald-400";
                  borderClass = "border border-emerald-250/20 dark:border-emerald-900/20";
                } else if (record.totalLectures > 0) {
                  bgClass = "bg-rose-50/60 dark:bg-rose-950/10";
                  textClass = "text-rose-700 dark:text-rose-450";
                  borderClass = "border border-rose-250/20 dark:border-rose-900/20";
                }
              }
            }

            if (isToday) {
              borderClass = "border-2 border-zinc-900 dark:border-white";
            }

            return (
              <motion.div
                key={docId}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(date)}
                className={`aspect-square rounded-2xl ${bgClass} ${borderClass} p-1.5 flex flex-col justify-between items-center relative cursor-pointer group transition-all`}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold ${textClass}`}>
                  {date.getDate()}
                </span>

                {/* Status Indicator */}
                <div className="w-full flex items-center justify-center min-h-[14px]">
                  {record ? (
                    record.isHoliday ? (
                      <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                    ) : (
                      <span className="text-[9px] font-bold tracking-tighter">
                        {record.attendedLectures}/{record.totalLectures}
                      </span>
                    )
                  ) : (
                    // Coffee icon appears on hover for easy holiday toggling
                    <button
                      onClick={(e) => handleDirectToggleHoliday(date, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                      title="Quick Mark Holiday"
                    >
                      <Coffee className="w-3 h-3 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Date Logging Modal Sheet */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
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
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </h4>
                    <p className="text-[10px] text-zinc-400">Update status for this date</p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Holiday Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/30 dark:border-zinc-750/30 rounded-2xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-zinc-850 dark:text-zinc-250 flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        Mark as Holiday
                      </span>
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
                          Attended Lectures
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
                          Total Lectures
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
                    <div className="text-[11px] font-medium text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20 border border-rose-250/20 rounded-xl p-2.5 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    {records.some(r => r.id === dateToDocId(selectedDate)) && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="py-3 px-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/25 dark:border-rose-900/25 text-rose-600 dark:text-rose-400 font-semibold rounded-2xl hover:bg-rose-100/55 transition-all text-sm shrink-0"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Status</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
