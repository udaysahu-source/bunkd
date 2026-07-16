"use client";
// File: src/components/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
  Zap,
  Flame,
  ChevronDown,
  BarChart3
} from "lucide-react";
import { calculatePercentage, calculateSafeBunks } from "../lib/attendanceMath";

// ──── Empty State ────
function EmptyState({ onLogFirst }: { onLogFirst: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-16 px-6 text-center glass-card rounded-3xl relative overflow-hidden glass-shimmer"
    >
      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/[0.08] blur-[80px] rounded-full pointer-events-none" />
      
      <div className="flex justify-center mb-6 relative z-10">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 glass-inner rounded-2xl flex items-center justify-center glow-purple"
        >
          <BookOpen className="w-10 h-10 text-purple-400" />
        </motion.div>
      </div>
      
      <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight relative z-10">
        Welcome to Bunkd
      </h2>
      <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto mb-8 relative z-10">
        Log your daily classes and instantly see how many you can safely skip.
      </p>
      
      <motion.button
        onClick={onLogFirst}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 px-8 py-3.5 glass-button-brand text-white font-bold rounded-xl cursor-pointer relative z-10 text-base"
      >
        <Plus className="w-5 h-5" />
        Log Your First Class
      </motion.button>
    </motion.div>
  );
}

// ──── Progress Ring ────
function ProgressRing({ percentage, target }: { percentage: number; target: number }) {
  const radius = 80;
  const stroke = 7;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;
  const isOnTrack = percentage >= target;
  
  const trackColor = isOnTrack ? "#10B981" : "#EF4444";

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Glow ring behind */}
      <div 
        className="absolute rounded-full"
        style={{
          width: radius * 2 - 12,
          height: radius * 2 - 12,
          boxShadow: isOnTrack 
            ? "0 0 40px rgba(16, 185, 129, 0.12), 0 0 80px rgba(16, 185, 129, 0.06)"
            : "0 0 40px rgba(239, 68, 68, 0.12), 0 0 80px rgba(239, 68, 68, 0.06)"
        }}
      />
      
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        {/* Background track */}
        <circle
          stroke="rgba(255,255,255,0.05)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Glow layer */}
        <motion.circle
          stroke={trackColor}
          fill="transparent"
          strokeWidth={stroke + 4}
          strokeDasharray={circumference + " " + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
          className="opacity-15 blur-[6px]"
        />
        {/* Main progress */}
        <motion.circle
          stroke={trackColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
        />
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold tracking-tighter text-white">
          {percentage}%
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 px-2.5 py-0.5 rounded-full backdrop-blur-sm ${
          isOnTrack 
            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {isOnTrack ? "On Track" : "Below Target"}
        </span>
      </div>
    </div>
  );
}

interface DashboardProps {
  setActiveTab?: (tab: "dashboard" | "calendar" | "settings") => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const {
    records,
    settings,
    overallMetrics,
    logAttendance,
    deleteRecord,
    showToast
  } = useStore();

  const [showLogModal, setShowLogModal] = useState(false);
  const [logDate, setLogDate] = useState("");
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [showInsights, setShowInsights] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [simLectures, setSimLectures] = useState(5);

  const metrics = overallMetrics;
  const target = settings?.targetPercentage ?? 75;
  const hasRecords = records.length > 0;

  useEffect(() => {
    setLogDate(new Date().toISOString().split("T")[0]);
  }, []);

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
      showToast("Attendance logged! ✅", "success");
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to log attendance");
    }
  };

  const handleQuickAddAttended = async () => {
    const today = new Date();
    const docId = dateToDocId(today);
    const existing = records.find(r => r.id === docId);
    let attVal = 1, totVal = 1;
    if (existing) {
      if (existing.isHoliday) { showToast("Today is marked as holiday.", "error"); return; }
      attVal = existing.attendedLectures + 1;
      totVal = existing.totalLectures + 1;
    }
    try {
      await logAttendance(today, attVal, totVal, false);
      showToast("+1 class logged! ⚡", "success");
    } catch { showToast("Failed to log class.", "error"); }
  };

  const formatDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  };

  const getGreetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const calculateStreaks = () => {
    const activeTimestamps = Array.from(new Set(
      records.filter(r => !r.isHoliday && r.totalLectures > 0)
        .map(r => { const d = new Date(r.dateTimestamp); d.setHours(0,0,0,0); return d.getTime(); })
    )).sort((a, b) => a - b);
    if (activeTimestamps.length === 0) return { current: 0, longest: 0 };
    let longest = 0, tempStreak = 0, prevTimestamp: number | null = null;
    const ONE_DAY_MS = 86400000;
    for (let i = 0; i < activeTimestamps.length; i++) {
      const curr = activeTimestamps[i];
      if (prevTimestamp === null) { tempStreak = 1; }
      else if (curr - prevTimestamp <= ONE_DAY_MS + 7200000) { tempStreak++; }
      else { if (tempStreak > longest) longest = tempStreak; tempStreak = 1; }
      prevTimestamp = curr;
    }
    if (tempStreak > longest) longest = tempStreak;
    const lastActive = activeTimestamps[activeTimestamps.length - 1];
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const current = todayMidnight.getTime() - lastActive <= ONE_DAY_MS * 1.5 ? tempStreak : 0;
    return { current, longest };
  };

  const streaks = calculateStreaks();

  // SVG Chart
  const renderSVGChart = () => {
    const filteredRecords = records.filter(r => !r.isHoliday);
    if (filteredRecords.length < 2) {
      return (
        <div className="h-24 flex items-center justify-center glass-inner rounded-2xl text-xs text-zinc-500 font-semibold">
          Log at least 2 active days to see trends.
        </div>
      );
    }
    let runningAtt = 0, runningTot = 0;
    const points = filteredRecords.map(r => {
      runningAtt += r.attendedLectures; runningTot += r.totalLectures;
      return calculatePercentage(runningAtt, runningTot);
    });
    const width = 500, height = 100, px = 15, py = 15;
    const minVal = Math.max(0, Math.min(...points, target) - 10);
    const maxVal = Math.min(100, Math.max(...points, 100));
    const range = maxVal - minVal || 1;
    const coords = points.map((val, idx) => ({
      x: px + (idx / (points.length - 1)) * (width - px * 2),
      y: height - py - ((val - minVal) / range) * (height - py * 2), val
    }));
    const dPath = `M ${coords.map(p => `${p.x},${p.y}`).join(" L ")}`;
    const fillPath = `${dPath} L ${coords[coords.length - 1].x},${height - py} L ${coords[0].x},${height - py} Z`;
    const targetY = height - py - ((target - minVal) / range) * (height - py * 2);

    return (
      <div className="space-y-2">
        <div className="relative w-full aspect-[500/100] glass-inner rounded-2xl p-1 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {targetY >= py && targetY <= height - py && (
              <line x1={px} y1={targetY} x2={width - px} y2={targetY}
                stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-40" />
            )}
            <path d={fillPath} fill="url(#chart-area-grad)" />
            <path d={dPath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {coords.length > 0 && (
              <>
                <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="6" fill="#8B5CF6" className="opacity-25" />
                <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill="#8B5CF6" />
              </>
            )}
          </svg>
        </div>
        <div className="flex justify-between text-[9px] text-zinc-500 font-bold px-1 uppercase tracking-wider">
          <span>First</span>
          <span className="text-purple-400">Target ({target}%)</span>
          <span>Now ({metrics.percentage}%)</span>
        </div>
      </div>
    );
  };

  // ──── EMPTY STATE ────
  if (!hasRecords) {
    return (
      <div className="space-y-8 pb-24">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {getGreetingTime()} 👋
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Start tracking to see your stats</p>
        </div>
        <EmptyState onLogFirst={handleOpenModal} />
      </div>
    );
  }

  // Pre-calculate
  const percentageAfterSkip = calculatePercentage(overallMetrics.attended, overallMetrics.total + 1);
  const safeBunksAfterSkip = calculateSafeBunks(overallMetrics.attended, overallMetrics.total + 1, target);
  const simAttended = overallMetrics.attended + simLectures;
  const simTotal = overallMetrics.total + simLectures;
  const simPercentage = calculatePercentage(simAttended, simTotal);

  const getStatusMessage = () => {
    if (metrics.percentage >= target && metrics.safeBunks > 0)
      return `You can skip ${metrics.safeBunks} more class${metrics.safeBunks > 1 ? "es" : ""} safely 🎉`;
    if (metrics.percentage >= target)
      return "You're on target — keep attending to build buffer 💪";
    if (metrics.neededLectures > 0 && metrics.neededLectures !== -1)
      return `Attend ${metrics.neededLectures} more to hit ${target}% 📚`;
    return "Keep attending classes to recover your attendance 🔴";
  };

  const recentRecords = showAllLogs ? records.slice().reverse() : records.slice().reverse().slice(0, 5);

  return (
    <div className="space-y-5 pb-24">
      {/* ──── Greeting ──── */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white leading-none">
          {getGreetingTime()} 👋
        </h2>
        <p className="text-sm text-zinc-500 mt-1">Here&apos;s your attendance overview</p>
      </div>

      {/* ──── Hero Glass Card ──── */}
      <motion.div
        layout
        className="relative overflow-hidden w-full glass-card rounded-3xl p-6 flex flex-col items-center text-center glass-shimmer"
      >
        {/* Decorative orb */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/[0.08] blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-violet-500/[0.06] blur-[70px] rounded-full pointer-events-none" />

        <ProgressRing percentage={metrics.percentage} target={target} />

        <p className="mt-4 text-sm font-semibold text-zinc-300 max-w-xs relative z-10">
          {getStatusMessage()}
        </p>

        {/* Stats row */}
        <div className="w-full max-w-xs mt-5 pt-4 border-t border-white/[0.05] grid grid-cols-3 gap-2 text-center relative z-10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Attended</span>
            <span className="text-lg font-extrabold text-white">{metrics.attended}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Total</span>
            <span className="text-lg font-extrabold text-white">{metrics.total}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Target</span>
            <span className="text-lg font-extrabold text-purple-400">{target}%</span>
          </div>
        </div>
      </motion.div>

      {/* ──── Action Buttons ──── */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={handleOpenModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center p-5 rounded-2xl glass-button-brand text-white cursor-pointer"
        >
          <Plus className="w-6 h-6 mb-1.5" />
          <span className="text-sm font-bold">Log Today</span>
          <span className="text-[10px] text-purple-200/60 mt-0.5">Full details</span>
        </motion.button>

        <motion.button
          onClick={handleQuickAddAttended}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center p-5 rounded-2xl glass-card text-white cursor-pointer glass-shimmer"
        >
          <Zap className="w-6 h-6 mb-1.5 text-amber-400" />
          <span className="text-sm font-bold">Quick +1</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Attended a class</span>
        </motion.button>
      </div>

      {/* ──── Status Cards ──── */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl p-4 glass-shimmer ${
          metrics.percentage >= target
            ? "glass-card" : "glass-card"
        }`}
          style={metrics.percentage >= target ? {
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(18, 18, 26, 0.55))",
            border: "1px solid rgba(16, 185, 129, 0.15)"
          } : undefined}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Safe Skips</span>
          <span className={`text-2xl font-extrabold block ${metrics.safeBunks > 0 ? "text-green-400" : "text-zinc-600"}`}>
            {metrics.safeBunks}
          </span>
          <span className="text-[10px] text-zinc-500">
            {metrics.safeBunks > 0 ? "classes you can skip" : "no free skips"}
          </span>
        </div>

        <div className={`rounded-2xl p-4 glass-shimmer ${
          metrics.percentage < target ? "glass-card" : "glass-card"
        }`}
          style={metrics.percentage < target ? {
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(18, 18, 26, 0.55))",
            border: "1px solid rgba(239, 68, 68, 0.15)"
          } : undefined}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Need to Attend</span>
          <span className={`text-2xl font-extrabold block ${metrics.neededLectures > 0 ? "text-red-400" : "text-zinc-600"}`}>
            {metrics.neededLectures === -1 ? "∞" : metrics.neededLectures}
          </span>
          <span className="text-[10px] text-zinc-500">
            {metrics.neededLectures > 0 ? "to reach target" : "you're on track!"}
          </span>
        </div>
      </div>

      {/* ──── Skip Predictor ──── */}
      <div className="glass-card rounded-2xl p-4 glass-shimmer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🤔</span>
            <span className="text-xs font-bold text-white">Can I skip tomorrow?</span>
          </div>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full backdrop-blur-sm ${
            percentageAfterSkip >= target
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {percentageAfterSkip >= target ? "Yes ✓" : "No ✗"}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          {percentageAfterSkip >= target
            ? `Your attendance will be ${percentageAfterSkip}% — still ${safeBunksAfterSkip} skip${safeBunksAfterSkip !== 1 ? "s" : ""} left`
            : `Skipping drops you to ${percentageAfterSkip}% — below your ${target}% target`
          }
        </p>
      </div>

      {/* ──── Expandable Insights ──── */}
      <div className="glass-card rounded-2xl overflow-hidden glass-shimmer">
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white">Insights & Simulator</span>
          </div>
          <motion.div animate={{ rotate: showInsights ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {showInsights && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-5">
                {/* Chart */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Attendance Trend
                  </span>
                  {renderSVGChart()}
                </div>

                {/* Streaks */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 glass-inner rounded-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                      <Flame className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Current</span>
                      <span className="text-sm font-extrabold text-white block">{streaks.current} days</span>
                    </div>
                  </div>
                  <div className="p-3 glass-inner rounded-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.15)" }}>
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Best</span>
                      <span className="text-sm font-extrabold text-white block">{streaks.longest} days</span>
                    </div>
                  </div>
                </div>

                {/* Simulator */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    What if I attend the next...
                  </span>
                  <div className="p-3 glass-inner rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-400">
                        <strong className="text-purple-400">{simLectures}</strong> classes
                      </span>
                      <span className="font-extrabold text-white">{simPercentage}%</span>
                    </div>
                    <input
                      type="range" min="1" max="30" value={simLectures}
                      onChange={(e) => setSimLectures(parseInt(e.target.value))}
                      className="w-full accent-purple-500 bg-white/5 h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[9px] text-zinc-600 font-bold">
                      <span>+1</span><span>+30</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ──── Recent Log ──── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold tracking-tight text-white">Recent Log</h3>
          <motion.button
            onClick={handleOpenModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs font-bold text-purple-400"
            style={{
              background: "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.15)"
            }}
          >
            <Plus className="w-3 h-3" /><span>Add</span>
          </motion.button>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/[0.04] glass-shimmer">
          <AnimatePresence initial={false}>
            {recentRecords.map((record) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-all group overflow-hidden"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">{formatDateString(record.dateTimestamp)}</p>
                  <div className="flex items-center gap-2">
                    {record.isHoliday ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-300 px-2 py-0.5 rounded-lg"
                        style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                        Holiday
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-zinc-400 font-medium">
                          <strong className="text-white">{record.attendedLectures}/{record.totalLectures}</strong>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                            ? "text-green-400" : "text-red-400"
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
                <motion.button
                  onClick={() => record.id && deleteRecord(record.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {records.length > 5 && (
          <button
            onClick={() => setShowAllLogs(!showAllLogs)}
            className="w-full text-center text-xs font-bold text-purple-400 hover:text-purple-300 py-2 cursor-pointer transition-colors"
          >
            {showAllLogs ? "Show Less ↑" : `Show All ${records.length} Entries ↓`}
          </button>
        )}
      </div>

      {/* ──── Glass Log Modal ──── */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="w-full max-w-sm glass-card-elevated rounded-2xl p-6 space-y-5 z-10 glass-shimmer"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-extrabold tracking-tight text-white">Log Attendance</h4>
                <button onClick={() => setShowLogModal(false)}
                  className="text-xs font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Date</label>
                  <input type="date" required value={logDate} onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-white text-sm focus:outline-none" />
                </div>

                <div className="flex items-center justify-between p-3.5 glass-inner rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">Holiday?</span>
                    <p className="text-[10px] text-zinc-500">No classes this day</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isHoliday} onChange={(e) => setIsHoliday(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white" />
                  </label>
                </div>

                {!isHoliday && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Attended</label>
                      <input type="number" min="0" required value={attended} onChange={(e) => setAttended(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg glass-input text-white text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Total</label>
                      <input type="number" min="0" required value={total} onChange={(e) => setTotal(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg glass-input text-white text-sm focus:outline-none" />
                    </div>
                  </div>
                )}

                {validationError && (
                  <div className="text-[11px] font-medium text-red-400 p-3 rounded-lg flex items-center gap-2"
                    style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 glass-button-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Log Attendance</span>
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
