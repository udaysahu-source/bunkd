"use client";
// File: src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Zap,
  ChevronDown,
  Bell,
  AlertTriangle,
  Calendar,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { calculatePercentage, calculateSafeBunks, getHistoricalAverageLectures, getAverageDailyLectures } from "../lib/attendanceMath";
import OnboardingWizard from "./OnboardingWizard";

// ──── Progress Ring ────
function ProgressRing({ percentage, target }: { percentage: number; target: number }) {
  const radius = 64;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;
  const isOnTrack = percentage >= target;
  
  const trackColor = isOnTrack ? "#10B981" : "#EF4444";

  return (
    <div className="relative flex items-center justify-center select-none shrink-0">
      {/* Glow ring behind */}
      <div 
        className="absolute rounded-full"
        style={{
          width: radius * 2 - 12,
          height: radius * 2 - 12,
          boxShadow: isOnTrack 
            ? "0 0 30px rgba(16, 185, 129, 0.08)"
            : "0 0 30px rgba(239, 68, 68, 0.08)"
        }}
      />
      
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle
          stroke="rgba(0,0,0,0.03)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="dark:stroke-white/5"
        />
        <motion.circle
          stroke={trackColor}
          fill="transparent"
          strokeWidth={stroke + 2}
          strokeDasharray={circumference + " " + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
          className="opacity-15 blur-[4px]"
        />
        <motion.circle
          stroke={trackColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
        />
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold tracking-tighter text-zinc-800 dark:text-white">
          {percentage}%
        </span>
        <span className={`text-xs font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-full backdrop-blur-sm scale-90 ${
          isOnTrack 
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" 
            : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
        }`}>
          {isOnTrack ? "Track" : "Below"}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    records,
    settings,
    overallMetrics,
    logAttendance,
    showToast,
    profile
  } = useStore();

  const [showLogModal, setShowLogModal] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Home simulator state (bunk hypothetical future classes)
  const [bunkSimCount, setBunkSimCount] = useState(1);

  // Micro tour guide state
  const [tourStep, setTourStep] = useState<number | null>(null);

  const modalSaveBtnRef = useRef<HTMLDivElement>(null);

  const metrics = overallMetrics;
  const target = settings?.targetPercentage ?? 75;
  const hasRecords = records.length > 0;

  // Check tour completion status on mount/records load
  useEffect(() => {
    if (hasRecords) {
      const tourCompleted = localStorage.getItem("bunkd_tour_completed");
      if (!tourCompleted) {
        setTourStep(1);
      }
    }
  }, [hasRecords]);

  const handleDismissTour = () => {
    localStorage.setItem("bunkd_tour_completed", "true");
    setTourStep(null);
  };

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
      if (isNaN(attVal) || isNaN(totVal)) { setValidationError("Please enter valid numbers"); return; }
      if (attVal < 0 || totVal < 0) { setValidationError("Lectures cannot be negative"); return; }
      if (attVal > totVal) { setValidationError("Attended can't exceed total"); return; }
    }

    try {
      await logAttendance(new Date(logDate), attVal, totVal, isHoliday);
      setShowLogModal(false);
      showToast("Attendance logged successfully!", "success");
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to log attendance");
    }
  };

  // Keyboard scroll assistance for custom modal
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  // Last Updated computation based on daily logs
  const lastUpdatedText = React.useMemo(() => {
    const semesterRecords = records.filter(r => (r.semester ?? profile?.semester) === profile?.semester);
    const dailyRecords = semesterRecords.filter(r => r.type !== "baseline");
    const baselineRecords = semesterRecords.filter(r => r.type === "baseline");
    
    if (dailyRecords.length === 0) {
      if (baselineRecords.length > 0) return "Baseline configured";
      return "No logs yet";
    }
    
    const latestRecord = dailyRecords.reduce((latest, record) => {
      return record.dateTimestamp > latest.dateTimestamp ? record : latest;
    }, dailyRecords[0]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMidnight = today.getTime();
    
    const diffTime = todayMidnight - latestRecord.dateTimestamp;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Last updated: Today";
    if (diffDays === 1) return "Last updated: Yesterday";
    if (diffDays > 1) return `Last updated: ${diffDays} days ago`;
    return "Last updated: Future log";
  }, [records, profile?.semester]);

  // Today calculations
  const todayDocId = dateToDocId(new Date());
  const todayRecord = records.find(r => r.id === todayDocId);

  // Slot selection calculations
  const defaultTotal = getHistoricalAverageLectures(records, new Date());
  const currentTotal = todayRecord ? todayRecord.totalLectures : defaultTotal;
  const currentAttended = todayRecord ? todayRecord.attendedLectures : 0;

  const handleIncreaseSlots = async () => {
    const today = new Date();
    const newTotal = currentTotal + 1;
    try {
      await logAttendance(today, currentAttended, newTotal, false);
      showToast(`Schedule expanded to ${newTotal} slots`, "success");
    } catch {
      showToast("Failed to update slots.", "error");
    }
  };

  const handleDecreaseSlots = async () => {
    if (currentTotal <= 1) return;
    const today = new Date();
    const newTotal = currentTotal - 1;
    const newAtt = Math.min(currentAttended, newTotal);
    try {
      await logAttendance(today, newAtt, newTotal, false);
      showToast(`Schedule shrunk to ${newTotal} slots`, "success");
    } catch {
      showToast("Failed to update slots.", "error");
    }
  };

  const handleSelectAttended = async (slotsAttended: number) => {
    const today = new Date();
    try {
      await logAttendance(today, slotsAttended, currentTotal, false);
      const newSafe = calculateSafeBunks(
        overallMetrics.attended - currentAttended + slotsAttended,
        overallMetrics.total,
        target
      );
      if (newSafe >= 0) {
        showToast(`Attendance saved · ${newSafe} safe skips remaining`, "success");
      } else {
        showToast(`Attendance saved · Below target limit`, "info");
      }
    } catch {
      showToast("Failed to save attendance.", "error");
    }
  };

  const getGreetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Onboarding Wizard Empty State
  if (!hasRecords) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
            {getGreetingTime()} 👋
          </h2>
          <p className="text-zinc-550 dark:text-zinc-500 text-sm mt-1">Start tracking to configure your status</p>
        </div>
        <OnboardingWizard onComplete={() => showToast("Setup completed successfully! ⚡", "success")} />
      </div>
    );
  }

  // Pre-calculations for simulator
  const percentageAfterBunk = calculatePercentage(overallMetrics.attended, overallMetrics.total + bunkSimCount);
  const isSimulationSafe = percentageAfterBunk >= target;

  // Consolidated card metrics
  const nextAttPercent = calculatePercentage(metrics.attended + 1, metrics.total + 1);
  const nextBunkPercent = calculatePercentage(metrics.attended, metrics.total + 1);
  const isSafeState = metrics.percentage >= target && metrics.safeBunks > 0;
  const isNearLimitState = metrics.percentage >= target && metrics.safeBunks === 0;

  const avgDaily = getAverageDailyLectures(records);
  const fullDaysOff = metrics.safeBunks > 0 ? Math.floor(metrics.safeBunks / avgDaily) : 0;
  const extraSkips = metrics.safeBunks > 0 ? metrics.safeBunks % avgDaily : 0;

  const getStatusBannerColor = () => {
    if (isSafeState) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
    if (isNearLimitState) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20";
  };

  const getStatusText = () => {
    if (isSafeState) return `Safe to bunk ${metrics.safeBunks} class${metrics.safeBunks > 1 ? "es" : ""}`;
    if (isNearLimitState) return "On track · No buffer skips available";
    if (metrics.neededLectures > 0 && metrics.neededLectures !== -1) return `Attend next ${metrics.neededLectures} classes to recover`;
    return "Below target limit";
  };

  return (
    <div className="space-y-5 pb-24 relative">
      
      {/* ──── Compact Header ──── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {getGreetingTime()} 👋
          </span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-purple-650 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/15">
          Target: {target}%
        </span>
      </div>

      {/* ──── Unified Attendance Status Card (P2) ──── */}
      <motion.div
        layout
        className={`relative overflow-hidden w-full glass-card-hero rounded-3xl p-5 flex flex-col items-center ${
          tourStep === 1 ? "ring-2 ring-purple-600 shadow-[0_0_30px_rgba(139,92,246,0.3)] z-50" : ""
        }`}
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/[0.04] blur-3xl rounded-full" />
        
        {/* Status Indicator Pill */}
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide ${getStatusBannerColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Ring & Data Side-by-side or Centered */}
        <div className="flex items-center justify-center gap-6 w-full py-2">
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing percentage={metrics.percentage} target={target} />
            <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 select-none">
              {lastUpdatedText}
            </span>
          </div>
          
          <div className="flex flex-col text-left space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-450 dark:text-zinc-500">
              Attendance Buffer
            </span>
            
            {metrics.safeBunks > 0 ? (
              <div>
                <span className="text-xl sm:text-2xl font-black text-emerald-650 dark:text-emerald-400 leading-tight block">
                  {fullDaysOff} Full Day{fullDaysOff !== 1 ? "s" : ""} Off
                </span>
                {extraSkips > 0 && (
                  <span className="text-xs font-bold text-zinc-550 dark:text-zinc-400 block mt-0.5">
                    (+ {extraSkips} extra lecture skip{extraSkips !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            ) : isNearLimitState ? (
              <div>
                <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 leading-tight block">
                  0 Days Off
                </span>
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mt-0.5">
                  On track · No buffer skips
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 leading-tight block">
                  0 Days Off
                </span>
                {metrics.neededLectures > 0 && (
                  <span className="text-xs font-bold text-rose-650 dark:text-rose-450 block mt-0.5">
                    Attend next {metrics.neededLectures} classes
                  </span>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              <span>Current: <strong className="text-zinc-700 dark:text-zinc-200">{metrics.percentage}%</strong></span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span>Target: <strong className="text-zinc-700 dark:text-zinc-200">{target}%</strong></span>
            </div>
          </div>
        </div>

        {/* Next Class Projections Banner */}
        <div className="w-full mt-4 pt-3.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold px-1.5 text-zinc-650 dark:text-zinc-400">
          <span>If you attend next: <strong className="text-emerald-650 dark:text-emerald-400 text-xs font-extrabold">{nextAttPercent}%</strong></span>
          <span>If you bunk next: <strong className="text-rose-650 dark:text-rose-450 text-xs font-extrabold">{nextBunkPercent}%</strong></span>
        </div>

        {/* Tour Overlay Anchor 1 */}
        {tourStep === 1 && (
          <div className="absolute inset-0 bg-transparent pointer-events-none" />
        )}
      </motion.div>

      {/* ──── WHAT IF I BUNK Simulator Card (P14) ──── */}
      <div className="glass-card rounded-3xl p-5 space-y-4 glass-shimmer">
        <span className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider pl-1 block">
          What if I bunk...
        </span>

        <div className="flex items-center justify-between p-3.5 glass-inner rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBunkSimCount(Math.max(1, bunkSimCount - 1))}
                disabled={bunkSimCount === 1}
                className="w-8 h-8 rounded-xl glass-inner flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 text-zinc-700 dark:text-white"
              >
                -
              </button>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-white w-6 text-center">
                {bunkSimCount}
              </span>
              <button
                onClick={() => setBunkSimCount(bunkSimCount + 1)}
                className="w-8 h-8 rounded-xl glass-inner flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-white"
              >
                +
              </button>
            </div>
            <span className="text-xs text-zinc-650 dark:text-zinc-400 font-semibold">
              classes in a row
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-zinc-500 block">Projection</span>
            <span className={`text-sm font-extrabold ${isSimulationSafe ? "text-emerald-650 dark:text-emerald-450" : "text-rose-650 dark:text-rose-400"}`}>
              {metrics.percentage}% → {percentageAfterBunk}%
            </span>
          </div>
        </div>

        {!isSimulationSafe && (
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/15 p-3 rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>⚠️ You would fall below your target.</span>
          </div>
        )}
      </div>

      {/* ──── Today's Lectures Slot Selector Card ──── */}
      <div className={`glass-card rounded-3xl p-5 space-y-4 glass-shimmer ${
        tourStep === 2 ? "ring-2 ring-purple-600 shadow-[0_0_30px_rgba(139,92,246,0.3)] z-50" : ""
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider pl-1">
              Today's Lectures ({new Date().toLocaleDateString('en-US', { weekday: 'long' })})
            </span>
            <span className="text-xs text-zinc-500 mt-0.5 pl-1">
              Tap any slot to log today's attendance
            </span>
          </div>
          
          {/* Total Slots Adjuster */}
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded-xl p-1">
            <button
              onClick={handleDecreaseSlots}
              className="w-8 h-8 rounded-lg glass-inner flex items-center justify-center text-zinc-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-extrabold text-zinc-800 dark:text-white px-2">
              {currentTotal} Slots
            </span>
            <button
              onClick={handleIncreaseSlots}
              className="w-8 h-8 rounded-lg glass-inner flex items-center justify-center text-zinc-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Slot Grid Selection */}
        <div className="space-y-4 pt-1">
          {currentTotal > 0 ? (
            <div className="space-y-3.5">
              {/* Attended Selection Row */}
              <div className="flex flex-col gap-2.5 pl-1">
                <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
                  How many did you attend?
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleSelectAttended(0)}
                    className={`w-11 h-11 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer border ${
                      currentAttended === 0
                        ? "bg-purple-650 border-purple-650 text-white shadow-md shadow-purple-500/20"
                        : "bg-gray-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border-gray-200/50 dark:border-zinc-800 hover:bg-gray-200"
                    }`}
                  >
                    0
                  </button>
                  {Array.from({ length: currentTotal }).map((_, i) => {
                    const slotNum = i + 1;
                    const isExactSelection = currentAttended === slotNum;
                    const isPartiallyFilled = currentAttended > slotNum;
                    
                    return (
                      <button
                        key={slotNum}
                        onClick={() => handleSelectAttended(slotNum)}
                        className={`w-11 h-11 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer border ${
                          isExactSelection
                            ? "bg-purple-650 border-purple-650 text-white shadow-md shadow-purple-500/20"
                            : isPartiallyFilled
                            ? "bg-purple-500/15 border-purple-500/25 text-purple-650 dark:text-purple-400 font-extrabold"
                            : "bg-gray-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border-gray-200/50 dark:border-zinc-800 hover:bg-gray-200"
                        }`}
                      >
                        {slotNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              No slots configured for today. Add slots using the count control.
            </div>
          )}

          {/* Footer stats and manual entry link */}
          <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-550 dark:text-zinc-400 font-bold">
              Total Logged: <strong className="text-zinc-800 dark:text-white font-extrabold">{currentAttended}/{currentTotal} Attended</strong> ({currentTotal - currentAttended} Bunked)
            </span>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1 text-xs font-bold text-purple-650 dark:text-purple-400 hover:text-purple-500 transition-colors cursor-pointer py-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Log Past Date</span>
            </button>
          </div>
        </div>
      </div>


      {/* ──── 2-Card Guided Micro Tour Overlay (P13) ──── */}
      <AnimatePresence>
        {tourStep !== null && (
          <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end p-4 pb-28">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto" onClick={handleDismissTour} />
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md mx-auto glass-card-elevated rounded-3xl p-5 space-y-4 z-50 pointer-events-auto shadow-2xl glass-shimmer border border-purple-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-650 dark:text-purple-400">
                  <Sparkles className="w-4 h-4 animate-bounce" />
                  <span className="text-xs font-bold uppercase tracking-wider">Quick Guided Tour</span>
                </div>
                <span className="text-xs font-extrabold text-zinc-500">{tourStep} of 2</span>
              </div>

              {tourStep === 1 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-extrabold text-zinc-800 dark:text-white">Your Consolidated Metrics</h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed">
                    Your current attendance percentage, skips buffer, target, and projections are merged into this single unified dashboard card. Read your status in under 2 seconds.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-sm font-extrabold text-zinc-800 dark:text-white">Fast 1-Tap Daily Logging</h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed">
                    Log today's attendance in a single tap using "+ Attend" or "+ Bunk". Use the steppers below it to adjust logs instantly without your phone keyboard getting in the way.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={handleDismissTour}
                  className="text-xs font-bold text-zinc-450 hover:text-zinc-650 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Skip Tour
                </button>
                
                {tourStep === 1 ? (
                  <button
                    onClick={() => setTourStep(2)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    onClick={handleDismissTour}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Finish Tour
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──── Custom / Past Date Logging Modal (P5) ──── */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="w-full max-w-sm glass-card-elevated rounded-3xl p-6 space-y-5 z-10 glass-shimmer flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-zinc-800 dark:text-white tracking-tight">Custom Date Entry</h4>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-xs font-bold text-zinc-450 hover:text-zinc-750 dark:hover:text-white transition-colors cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 pl-1">
                      Select Date
                    </label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-850 dark:text-white text-sm focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 glass-inner rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-zinc-800 dark:text-white">Holiday?</span>
                      <p className="text-xs text-zinc-550 dark:text-zinc-500">Exclude this day from statistics</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHoliday}
                        onChange={(e) => setIsHoliday(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 dark:bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650 peer-checked:after:bg-white" />
                    </label>
                  </div>

                  {!isHoliday && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 pl-1">
                          Attended
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={attended}
                          onFocus={handleInputFocus}
                          onChange={(e) => setAttended(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-850 dark:text-white text-sm focus:outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 pl-1">
                          Total
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={total}
                          onFocus={handleInputFocus}
                          onChange={(e) => setTotal(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl glass-input text-zinc-850 dark:text-white text-sm focus:outline-none font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {validationError && (
                    <div className="text-xs font-medium text-red-750 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 bg-red-500/10 border border-red-500/15">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>

                {/* Mobile keyboard safety container */}
                <div ref={modalSaveBtnRef} className="pt-4 border-t border-black/5 dark:border-white/5 sticky bottom-0 bg-transparent">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 glass-button-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>Save Attendance</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
