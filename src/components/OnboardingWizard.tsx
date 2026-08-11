"use client";
// File: src/components/OnboardingWizard.tsx
import React, { useState } from "react";
import { useStore, getMidnightTimestamp } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  BookOpen,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  XCircle,
  Sun,
  Loader2,
  CalendarDays
} from "lucide-react";

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { logBaseline, logAttendance, showToast } = useStore();
  const [step, setStep] = useState<"choice" | "quick" | "detailed_start" | "detailed_schedule" | "detailed_log" | "loading">("choice");
  
  // Loading state
  const [loadingMsg, setLoadingMsg] = useState("");

  // Quick Start State
  const [quickAttended, setQuickAttended] = useState("0");
  const [quickTotal, setQuickTotal] = useState("0");
  const [quickError, setQuickError] = useState<string | null>(null);

  // Detailed Setup State
  const [startDate, setStartDate] = useState(() => {
    // Default to 1 month ago
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });

  // Schedule representation (0 classes = disabled/no class)
  const [schedule, setSchedule] = useState<{ [key: number]: number }>({
    1: 3, // Monday: 3 classes
    2: 3, // Tuesday: 3 classes
    3: 3, // Wednesday: 3 classes
    4: 3, // Thursday: 3 classes
    5: 3, // Friday: 3 classes
    6: 0, // Saturday: 0
    0: 0, // Sunday: 0
  });

  const daysOfWeek = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
  ];

  // Generated list of dates to log
  interface LogDay {
    date: Date;
    dateStr: string;
    scheduledCount: number;
    attendedCount: number;
    isHoliday: boolean;
  }
  const [logDays, setLogDays] = useState<LogDay[]>([]);

  // 1. Submit Quick Start
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    const attVal = parseInt(quickAttended);
    const totVal = parseInt(quickTotal);

    if (isNaN(attVal) || isNaN(totVal)) {
      setQuickError("Please enter valid numbers");
      return;
    }
    if (attVal < 0 || totVal < 0) {
      setQuickError("Lectures cannot be negative");
      return;
    }
    if (attVal > totVal) {
      setQuickError("Attended lectures cannot exceed total lectures");
      return;
    }

    try {
      setStep("loading");
      setLoadingMsg("Saving your baseline...");
      await logBaseline(attVal, totVal);
      showToast("Baseline tracked successfully! 🚀", "success");
      onComplete?.();
    } catch (err) {
      const errorMsg = (err as Error).message || "Failed to log baseline";
      setQuickError(errorMsg);
      setStep("quick");
    }
  };

  // 2. Generate Days for Log Step
  const handleGenerateLogs = () => {
    const start = new Date(startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (start > today) {
      showToast("Start date cannot be in the future", "error");
      return;
    }

    // Limit to max 90 days to avoid UI overload
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      showToast("Please choose a start date within the last 90 days.", "info");
    }

    const tempDays: LogDay[] = [];
    const current = new Date(start);

    while (current <= today) {
      const dayOfWeek = current.getDay();
      const scheduled = schedule[dayOfWeek] || 0;
      
      tempDays.push({
        date: new Date(current),
        dateStr: current.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
        scheduledCount: scheduled,
        attendedCount: scheduled, // default to attended all scheduled
        isHoliday: scheduled === 0, // default to holiday if 0 classes scheduled
      });

      current.setDate(current.getDate() + 1);
    }

    setLogDays(tempDays);
    setStep("detailed_log");
  };

  // 3. Save Detailed Log
  const handleDetailedSubmit = async () => {
    try {
      setStep("loading");
      setLoadingMsg("Creating calendar logs...");

      // Write each day to database sequentially
      for (const day of logDays) {
        if (day.scheduledCount > 0 || day.isHoliday) {
          await logAttendance(
            day.date,
            day.isHoliday ? 0 : day.attendedCount,
            day.isHoliday ? 0 : day.scheduledCount,
            day.isHoliday
          );
        }
      }

      showToast("Detailed history synced successfully! 🗓️", "success");
      onComplete?.();
    } catch (err) {
      console.error(err);
      showToast("Failed to save some historical logs.", "error");
      setStep("detailed_log");
    }
  };

  return (
    <div className="max-w-md mx-auto py-4">
      <AnimatePresence mode="wait">
        
        {/* Loading Screen */}
        {step === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 glass-card rounded-3xl flex flex-col items-center justify-center text-center space-y-4"
          >
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            <p className="text-sm font-semibold text-zinc-350">{loadingMsg}</p>
          </motion.div>
        )}

        {/* Choice Step */}
        {step === "choice" && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-6 glass-card rounded-3xl space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto glow-purple">
                <BookOpen className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Set up Bunkd</h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                How would you like to initialize your attendance tracking?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-2">
              <button
                onClick={() => setStep("quick")}
                className="p-4 text-left rounded-2xl glass-inner hover:bg-purple-500/5 hover:border-purple-500/30 transition-all border border-white/5 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white group-hover:text-purple-300">Quick Start</span>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter your current total classes attended and conducted. Best if you just want to get up and running instantly.
                </p>
              </button>

              <button
                onClick={() => setStep("detailed_start")}
                className="p-4 text-left rounded-2xl glass-inner hover:bg-purple-500/5 hover:border-purple-500/30 transition-all border border-white/5 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white group-hover:text-purple-300">Detailed Setup</span>
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Recreate your history date-by-date. Best for building full analytics trends and exact calendar history.
                </p>
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Start Flow */}
        {step === "quick" && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 glass-card rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-white">Quick Setup</h3>
              <button
                onClick={() => setStep("choice")}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter your current attendance totals from your college portal. We will use this as a baseline to track daily progress.
            </p>

            <form onSubmit={handleQuickSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 pl-1">
                    Attended
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickAttended}
                    onChange={(e) => setQuickAttended(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 pl-1">
                    Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickTotal}
                    onChange={(e) => setQuickTotal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {quickError && (
                <div className="text-xs font-medium text-red-450 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 bg-red-500/10 border border-red-500/20">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl glass-button-brand text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Start Tracking</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* Detailed Start: Select Date */}
        {step === "detailed_start" && (
          <motion.div
            key="detailed_start"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 glass-card rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-white">Detailed: Semester Start</h3>
              <button
                onClick={() => setStep("choice")}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              When did your semester classes start? We will generate your daily schedule starting from this date.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 pl-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none font-semibold"
                />
              </div>

              <button
                onClick={() => setStep("detailed_schedule")}
                className="w-full py-3.5 rounded-xl glass-button-brand text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Detailed: Weekly Schedule */}
        {step === "detailed_schedule" && (
          <motion.div
            key="detailed_schedule"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 glass-card rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-white">Weekly Schedule</h3>
              <button
                onClick={() => setStep("detailed_start")}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              How many lectures do you normally have scheduled on each day of the week?
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {daysOfWeek.map((day) => {
                const isDayActive = schedule[day.value] > 0;
                return (
                  <div key={day.value} className="flex items-center justify-between p-3 glass-inner rounded-xl">
                    <span className="text-xs font-bold text-white">{day.label}</span>
                    
                    <div className="flex items-center gap-3">
                      {isDayActive ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSchedule({ ...schedule, [day.value]: Math.max(1, schedule[day.value] - 1) })}
                            className="w-7 h-7 rounded-lg glass-inner flex items-center justify-center font-bold hover:bg-white/5 text-white"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">{schedule[day.value]}</span>
                          <button
                            onClick={() => setSchedule({ ...schedule, [day.value]: schedule[day.value] + 1 })}
                            className="w-7 h-7 rounded-lg glass-inner flex items-center justify-center font-bold hover:bg-white/5 text-white"
                          >
                            +
                          </button>
                          <button
                            onClick={() => setSchedule({ ...schedule, [day.value]: 0 })}
                            className="text-xs text-zinc-500 hover:text-red-400 font-bold ml-1.5"
                          >
                            Disable
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSchedule({ ...schedule, [day.value]: 1 })}
                          className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-bold rounded-lg"
                        >
                          Enable Classes
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleGenerateLogs}
              className="w-full py-3.5 rounded-xl glass-button-brand text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Generate Calendar Log</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Detailed: Date-by-date Logs */}
        {step === "detailed_log" && (
          <motion.div
            key="detailed_log"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 glass-card rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-white">Log Past Attendance</h3>
              <button
                onClick={() => setStep("detailed_schedule")}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Review generated dates. Mark if you attended all scheduled classes, bunked, or if there was a holiday.
            </p>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {logDays.map((day, idx) => (
                <div key={idx} className="p-3.5 glass-inner rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{day.dateStr}</span>
                    <span className="text-xs text-zinc-500 font-semibold">
                      {day.isHoliday ? "Holiday" : `${day.attendedCount}/${day.scheduledCount} Attended`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newDays = [...logDays];
                        newDays[idx].isHoliday = false;
                        newDays[idx].attendedCount = day.scheduledCount; // attended all
                        setLogDays(newDays);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg border ${
                        !day.isHoliday && day.attendedCount === day.scheduledCount
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-white/[0.02] text-zinc-400 border-white/5"
                      }`}
                    >
                      Attended All
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newDays = [...logDays];
                        newDays[idx].isHoliday = false;
                        newDays[idx].attendedCount = 0; // bunked all
                        setLogDays(newDays);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg border ${
                        !day.isHoliday && day.attendedCount === 0
                          ? "bg-rose-500/20 text-rose-450 border-rose-500/30"
                          : "bg-white/[0.02] text-zinc-400 border-white/5"
                      }`}
                    >
                      Bunked All
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newDays = [...logDays];
                        newDays[idx].isHoliday = !day.isHoliday;
                        setLogDays(newDays);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg border ${
                        day.isHoliday
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-white/[0.02] text-zinc-400 border-white/5"
                      }`}
                    >
                      Holiday / None
                    </button>
                  </div>

                  {/* Manual count stepper if they want fractional classes */}
                  {!day.isHoliday && day.scheduledCount > 1 && (
                    <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
                      <span className="text-xs font-bold text-zinc-400 uppercase">Adjust Count:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newDays = [...logDays];
                            newDays[idx].attendedCount = Math.max(0, day.attendedCount - 1);
                            setLogDays(newDays);
                          }}
                          className="w-5 h-5 rounded-md glass-inner flex items-center justify-center text-xs text-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-white">{day.attendedCount} / {day.scheduledCount}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newDays = [...logDays];
                            newDays[idx].attendedCount = Math.min(day.scheduledCount, day.attendedCount + 1);
                            setLogDays(newDays);
                          }}
                          className="w-5 h-5 rounded-md glass-inner flex items-center justify-center text-xs text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleDetailedSubmit}
              className="w-full py-3.5 rounded-xl glass-button-brand text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Initialize</span>
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
