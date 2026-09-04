"use client";
// File: src/components/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Zap,
  Calendar,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  GraduationCap
} from "lucide-react";
import {
  calculatePercentage,
  calculateSafeBunks,
  getAverageDailyLectures
} from "../lib/attendanceMath";
import OnboardingWizard from "./OnboardingWizard";

// ──── Clean Progress Arc / Donut ────
function AttendanceProgressRing({ percentage, target }: { percentage: number; target: number }) {
  const radius = 58;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;
  const isOnTrack = percentage >= target;

  const strokeColor = isOnTrack ? "#059669" : "#dc2626";

  return (
    <div className="relative flex items-center justify-center select-none shrink-0">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-zinc-200 dark:text-zinc-800"
        />
        <circle
          stroke={strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-in-out" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          {percentage}%
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
          isOnTrack
            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
            : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"
        }`}>
          {isOnTrack ? "On Track" : "Below"}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    records,
    settings,
    timetable,
    overallMetrics,
    cycleMetrics,
    logAttendance,
    showToast,
    profile
  } = useStore();

  const [bunkSimCount, setBunkSimCount] = useState(1);
  const target = settings?.targetPercentage ?? 75;
  const currentSemester = profile?.semester ?? 1;
  const hasRecords = records.length > 0;

  // Semester records
  const semesterRecords = records.filter(r => (r.semester ?? currentSemester) === currentSemester);

  // Today calculations
  const today = new Date();
  const todayDocId = dateToDocId(today);
  const todayRecord = records.find(r => r.id === todayDocId);

  // Default planned slots from weekly timetable
  const dayOfWeek = today.getDay();
  const defaultTimetableSlots = timetable[dayOfWeek] ?? 5;

  const currentTotal = todayRecord ? todayRecord.totalLectures : Math.max(1, defaultTimetableSlots);
  const currentAttended = todayRecord ? todayRecord.attendedLectures : 0;
  const isTodayHoliday = todayRecord?.isHoliday ?? false;

  const metrics = overallMetrics;
  const isSafeState = metrics.percentage >= target && metrics.safeBunks > 0;
  const isNearLimitState = metrics.percentage >= target && metrics.safeBunks === 0;

  const avgDaily = getAverageDailyLectures(semesterRecords);
  const fullDaysOff = metrics.safeBunks > 0 ? Math.floor(metrics.safeBunks / avgDaily) : 0;
  const extraSkips = metrics.safeBunks > 0 ? metrics.safeBunks % avgDaily : 0;

  // Next class projections
  const nextAttPercent = calculatePercentage(metrics.attended + 1, metrics.total + 1);
  const nextBunkPercent = calculatePercentage(metrics.attended, metrics.total + 1);

  // Simulation
  const percentageAfterBunk = calculatePercentage(metrics.attended, metrics.total + bunkSimCount);
  const isSimulationSafe = percentageAfterBunk >= target;

  const getGreetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleQuickLog = async (attendedSlots: number) => {
    try {
      await logAttendance(today, attendedSlots, currentTotal, false);
      showToast(`Today's attendance saved (${attendedSlots}/${currentTotal} attended)`, "success");
    } catch {
      showToast("Failed to save attendance", "error");
    }
  };

  const handleAdjustSlots = async (delta: number) => {
    const nextTotal = Math.max(1, Math.min(15, currentTotal + delta));
    const nextAtt = Math.min(currentAttended, nextTotal);
    try {
      await logAttendance(today, nextAtt, nextTotal, false);
      showToast(`Today's class count adjusted to ${nextTotal}`, "success");
    } catch {
      showToast("Failed to adjust class slots", "error");
    }
  };

  const handleToggleTodayHoliday = async () => {
    try {
      await logAttendance(today, 0, 0, !isTodayHoliday);
      showToast(!isTodayHoliday ? "Today marked as Holiday / Day Off" : "Holiday removed for today", "info");
    } catch {
      showToast("Failed to update holiday status", "error");
    }
  };

  // If no records exist, show onboarding
  if (!hasRecords) {
    return (
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {getGreetingTime()}, {profile?.name || "Student"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Complete the 3-minute onboarding below to initialize your semester metrics.
          </p>
        </div>
        <OnboardingWizard onComplete={() => showToast("Setup completed successfully!", "success")} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ──── TOP BAR / CONTEXT HEADER ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {getGreetingTime()}, {profile?.name || "Student"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            Semester {currentSemester}
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
            Target: {target}%
          </span>
        </div>
      </div>

      {/* ──── UNIFIED ATTENDANCE HEALTH CARD ──── */}
      <div className="app-card p-5 sm:p-6 space-y-6">
        {/* Status Indicator Banner */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isSafeState
                ? "badge-success"
                : isNearLimitState
                ? "badge-warning"
                : "badge-danger"
            }`}>
              {isSafeState && <CheckCircle2 className="w-3.5 h-3.5" />}
              {isNearLimitState && <AlertTriangle className="w-3.5 h-3.5" />}
              {!isSafeState && !isNearLimitState && <XCircle className="w-3.5 h-3.5" />}
              <span>
                {isSafeState
                  ? `Safe to bunk ${metrics.safeBunks} class${metrics.safeBunks > 1 ? "es" : ""}`
                  : isNearLimitState
                  ? "At safety threshold · Zero buffer remaining"
                  : metrics.neededLectures > 0
                  ? `Attend next ${metrics.neededLectures} consecutive classes`
                  : "Below target limit"}
              </span>
            </span>
          </div>

          <span className="text-xs text-zinc-400">
            Total Logged: {metrics.attended} / {metrics.total} classes
          </span>
        </div>

        {/* Ring & Buffer Metric Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <AttendanceProgressRing percentage={metrics.percentage} target={target} />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Current Standing
              </span>
              <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                {metrics.percentage}%
              </span>
              <span className="text-xs text-zinc-500 block">
                Target: {target}%
              </span>
            </div>
          </div>

          <div className="app-card-inset p-4 md:col-span-2 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Bunk Buffer & Recovery Analysis
            </span>

            {metrics.safeBunks > 0 ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {fullDaysOff} Full Day{fullDaysOff !== 1 ? "s" : ""} Off
                  </span>
                  {extraSkips > 0 && (
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      + {extraSkips} extra class{extraSkips > 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  You can safely skip up to {metrics.safeBunks} total lectures before dropping below your {target}% target.
                </p>
              </div>
            ) : isNearLimitState ? (
              <div>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
                  0 Days Buffer
                </span>
                <p className="text-xs text-zinc-500 mt-1">
                  You are exactly at the {target}% threshold. Missing the next class will put your attendance into recovery status.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    Need {metrics.neededLectures} Classes
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Attend {metrics.neededLectures} consecutive scheduled lectures to bring your overall attendance back up to {target}%.
                </p>
              </div>
            )}

            {/* Next Class Projections */}
            <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">
                If you attend next: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{nextAttPercent}%</strong>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                If you bunk next: <strong className="text-rose-600 dark:text-rose-400 font-bold">{nextBunkPercent}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──── 1-TAP TODAY ATTENDANCE LOGGER ──── */}
      <div className="app-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Today&apos;s Class Attendance</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select how many classes you attended today to instantly update your standing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleTodayHoliday}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isTodayHoliday
                ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {isTodayHoliday ? "Holiday Declared" : "Mark Holiday"}
          </button>
        </div>

        {isTodayHoliday ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            Today is marked as an official holiday or day off. It is excluded from total lecture calculations.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Slot Count Header Controls */}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Schedule: <strong>{currentTotal} classes planned</strong></span>
              <div className="flex items-center gap-1.5">
                <span>Adjust schedule:</span>
                <button
                  type="button"
                  onClick={() => handleAdjustSlots(-1)}
                  disabled={currentTotal <= 1}
                  className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustSlots(1)}
                  className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* 1-Tap Slot Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {Array.from({ length: currentTotal + 1 }).map((_, idx) => {
                const isSelected = todayRecord && todayRecord.attendedLectures === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickLog(idx)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <span className="text-sm font-black">{idx}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {idx === 0 ? "Bunked all" : idx === currentTotal ? "Full day" : `${idx}/${currentTotal}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ──── WHAT-IF BUNK SIMULATOR WIDGET ──── */}
      <div className="app-card p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Fast Bunk Simulator</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Test hypothetical class skips without affecting your actual records.
          </p>
        </div>

        <div className="app-card-inset p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBunkSimCount(Math.max(1, bunkSimCount - 1))}
                disabled={bunkSimCount === 1}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <span className="w-8 text-center text-base font-bold text-zinc-900 dark:text-zinc-100">
                {bunkSimCount}
              </span>
              <button
                type="button"
                onClick={() => setBunkSimCount(bunkSimCount + 1)}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                +
              </button>
            </div>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              classes bunked in a row
            </span>
          </div>

          <div className="flex items-center gap-4 text-right w-full sm:w-auto justify-end">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                Projected Percentage
              </span>
              <span className={`text-base font-bold ${isSimulationSafe ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {metrics.percentage}% → {percentageAfterBunk}%
              </span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isSimulationSafe ? "badge-success" : "badge-danger"
            }`}>
              {isSimulationSafe ? "Still Safe" : "Drops Below Target"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
