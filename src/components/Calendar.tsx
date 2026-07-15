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
  CheckCircle2
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
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to log attendance");
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
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Calendar
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          Tap a date to update your status
        </p>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-3xl p-6 shadow-sm">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={prevMonth}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-bunkd-bg-dark text-gray-600 dark:text-gray-400 rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={nextMonth}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-bunkd-bg-dark text-gray-600 dark:text-gray-400 rounded-lg transition-all"
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
              className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500"
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

            let bgClass = "bg-gray-50/50 dark:bg-bunkd-bg-dark hover:bg-gray-100/50 dark:hover:bg-bunkd-bg-secondary-dark";
            let textClass = "text-gray-700 dark:text-gray-300";
            let borderClass = "border border-gray-200/50 dark:border-bunkd-border-dark";

            if (record) {
              if (record.isHoliday) {
                bgClass = "bg-amber-50/70 dark:bg-amber-500/10";
                textClass = "text-amber-700 dark:text-amber-300";
                borderClass = "border border-amber-200/50 dark:border-amber-500/30";
              } else {
                const ratio = record.totalLectures > 0 ? record.attendedLectures / record.totalLectures : 0;
                if (ratio >= 0.75) {
                  bgClass = "bg-green-50/70 dark:bg-green-500/10";
                  textClass = "text-green-700 dark:text-green-300";
                  borderClass = "border border-green-200/50 dark:border-green-500/30";
                } else if (record.totalLectures > 0) {
                  bgClass = "bg-red-50/70 dark:bg-red-500/10";
                  textClass = "text-red-700 dark:text-red-300";
                  borderClass = "border border-red-200/50 dark:border-red-500/30";
                }
              }
            }

            if (isToday) {
              borderClass = "border-2 border-purple-500 dark:border-purple-400";
            }

            return (
              <motion.button
                key={docId}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(date)}
                className={`aspect-square rounded-lg ${bgClass} ${borderClass} p-1.5 flex flex-col justify-between items-center relative cursor-pointer group transition-all`}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold ${textClass}`}>
                  {date.getDate()}
                </span>

                {/* Status Indicator */}
                <div className="w-full flex items-center justify-center min-h-[14px]">
                  {record ? (
                    record.isHoliday ? (
                      <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    ) : (
                      <span className="text-[9px] font-bold tracking-tighter">
                        {record.attendedLectures}/{record.totalLectures}
                      </span>
                    )
                  ) : (
                    <button
                      onClick={(e) => handleDirectToggleHoliday(date, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      title="Quick Mark Holiday"
                    >
                      <Sun className="w-3 h-3 text-gray-400 hover:text-amber-600 dark:hover:text-amber-300" />
                    </button>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Date Logging Modal */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
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
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "long"
                      })}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Update status for this date</p>
                  </div>
                  <motion.button
                    onClick={() => setSelectedDate(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-lg font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </motion.button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Holiday Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-bunkd-bg-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-lg">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        Mark as Holiday
                      </span>
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

                  <div className="flex items-center gap-3 pt-2">
                    {records.some(r => r.id === dateToDocId(selectedDate)) && (
                      <motion.button
                        type="button"
                        onClick={handleDelete}
                        whileTap={{ scale: 0.95 }}
                        className="py-3 px-4 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/30 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-100/50 transition-all text-sm shrink-0"
                      >
                        Delete
                      </motion.button>
                    )}
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save</span>
                    </motion.button>
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
