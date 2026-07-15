"use client";
// File: src/components/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { useStore, dateToDocId } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  AlertTriangle,
  Award,
  CheckCircle2,
  XCircle,
  BookOpen,
  Zap,
  TrendingUp,
  Flame,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { calculatePercentage, calculateSafeBunks, calculateNeededLectures } from "../lib/attendanceMath";

// Empty State Component
function EmptyState({ onLogFirst }: { onLogFirst: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-16 px-6 text-center bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-3xl shadow-lg relative overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="flex justify-center mb-6 relative z-10">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-inner"
        >
          <BookOpen className="w-10 h-10 text-purple-650 dark:text-purple-400" />
        </motion.div>
      </div>
      
      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight relative z-10">
        Welcome to Bunkd
      </h2>
      <p className="text-gray-550 dark:text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto mb-6 relative z-10">
        Track your attendance daily and instantly know how many lectures you can safely skip while staying above your target.
      </p>
      
      <motion.button
        onClick={onLogFirst}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all cursor-pointer relative z-10"
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
    const duration = 800;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function out-cubic
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * easeOutCubic));
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <>{displayValue}</>;
}

// Animated SVG Progress Ring Component
function ProgressRing({ percentage, target }: { percentage: number; target: number }) {
  const radius = 90;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;
  const isOnTrack = percentage >= target;

  return (
    <div className="relative flex items-center justify-center select-none">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        {/* Background Circle */}
        <circle
          stroke="#2A2A33"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="opacity-45"
        />
        {/* Glowing track under progress */}
        <motion.circle
          stroke={isOnTrack ? "#10B981" : "#EF4444"}
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
          className="opacity-25 blur-[4px]"
        />
        {/* Foreground Circle */}
        <motion.circle
          stroke={isOnTrack ? "#10B981" : "#EF4444"}
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
      {/* Center Text */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-extrabold tracking-tighter text-white">
          <AnimatedCounter value={percentage} />%
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full ${
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

// Student-first greetings array
const greetingsList = [
  "Ready for today's classes? 🔥",
  "Stay above your attendance target. 📚",
  "Let's keep your streak alive! 🚀",
  "One lecture closer to freedom. ☕",
  "Don't lose your safe bunks. 🎯",
  "Bunk smart. Track safe. 😎",
  "Your personal skip assistant is active. 🧠"
];

interface DashboardProps {
  setActiveTab?: (tab: "dashboard" | "calendar" | "settings") => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const {
    records,
    settings,
    overallMetrics,
    cycleMetrics,
    logAttendance,
    deleteRecord,
    showToast
  } = useStore();

  const [activeSegment, setActiveSegment] = useState<"overall" | "cycle">("overall");
  const [showLogModal, setShowLogModal] = useState(false);
  const [logDate, setLogDate] = useState("");
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  
  // Smart Feature Simulator States
  const [simLectures, setSimLectures] = useState(5);

  const metrics = activeSegment === "overall" ? overallMetrics : cycleMetrics;
  const target = settings?.targetPercentage ?? 75;
  const hasRecords = records.length > 0;

  // Initialize randomized greeting per load
  useEffect(() => {
    const todayNum = new Date().getDate();
    setGreeting(greetingsList[todayNum % greetingsList.length]);
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
      showToast("Attendance logged successfully!", "success");
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to log attendance");
    }
  };

  // Quick action: log 1 attended lecture for today instantly
  const handleQuickAddAttended = async () => {
    const today = new Date();
    const docId = dateToDocId(today);
    const existing = records.find(r => r.id === docId);
    
    let attVal = 1;
    let totVal = 1;
    
    if (existing) {
      if (existing.isHoliday) {
        showToast("Today is logged as a holiday. Change it in Calendar first.", "error");
        return;
      }
      attVal = existing.attendedLectures + 1;
      totVal = existing.totalLectures + 1;
    }
    
    try {
      await logAttendance(today, attVal, totVal, false);
      showToast("Logged +1 Attended class for today! ⚡", "success");
    } catch (err) {
      showToast("Failed to quick log class.", "error");
    }
  };

  const formatDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  const getGreetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning 👋";
    if (hr < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  };

  // Streak calculation
  const calculateStreaks = () => {
    const activeTimestamps = Array.from(new Set(
      records
        .filter(r => !r.isHoliday && r.totalLectures > 0)
        .map(r => {
          const d = new Date(r.dateTimestamp);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
    )).sort((a, b) => a - b);
    
    if (activeTimestamps.length === 0) return { current: 0, longest: 0 };
    
    let longest = 0;
    let tempStreak = 0;
    let prevTimestamp = null;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < activeTimestamps.length; i++) {
      const curr = activeTimestamps[i];
      if (prevTimestamp === null) {
        tempStreak = 1;
      } else {
        const diff = curr - prevTimestamp;
        if (diff <= ONE_DAY_MS + 2 * 60 * 60 * 1000) { 
          tempStreak++;
        } else {
          if (tempStreak > longest) longest = tempStreak;
          tempStreak = 1;
        }
      }
      prevTimestamp = curr;
    }
    if (tempStreak > longest) longest = tempStreak;
    
    const lastActive = activeTimestamps[activeTimestamps.length - 1];
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const diffFromToday = todayMidnight.getTime() - lastActive;
    
    const current = diffFromToday <= ONE_DAY_MS * 1.5 ? tempStreak : 0;
    
    return { current, longest };
  };

  const streaks = calculateStreaks();

  // SVG Line Chart coordinates calculation
  const renderSVGChart = () => {
    const filteredRecords = records.filter(r => !r.isHoliday);
    if (filteredRecords.length < 2) {
      return (
        <div className="h-28 flex items-center justify-center bg-bunkd-bg-secondary-dark rounded-2xl border border-bunkd-border-dark text-xs text-zinc-500 font-semibold">
          Log at least 2 active days to visualize trends.
        </div>
      );
    }

    let runningAtt = 0;
    let runningTot = 0;
    const points = filteredRecords.map((r) => {
      runningAtt += r.attendedLectures;
      runningTot += r.totalLectures;
      return calculatePercentage(runningAtt, runningTot);
    });

    const width = 500;
    const height = 110;
    const paddingX = 15;
    const paddingY = 15;

    const minVal = Math.max(0, Math.min(...points, target) - 10);
    const maxVal = Math.min(100, Math.max(...points, 100));
    const range = maxVal - minVal || 1;

    const pointsCoordinates = points.map((val, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((val - minVal) / range) * (height - paddingY * 2);
      return { x, y, val };
    });

    const dPath = `M ${pointsCoordinates.map(p => `${p.x},${p.y}`).join(" L ")}`;
    
    // Gradient fill path
    const fillPath = `${dPath} L ${pointsCoordinates[pointsCoordinates.length - 1].x},${height - paddingY} L ${pointsCoordinates[0].x},${height - paddingY} Z`;

    // Target Line Y Coordinate
    const targetY = height - paddingY - ((target - minVal) / range) * (height - paddingY * 2);

    return (
      <div className="space-y-2">
        <div className="relative w-full aspect-[500/110] bg-bunkd-bg-secondary-dark rounded-2xl border border-bunkd-border-dark p-1 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Target Line */}
            {targetY >= paddingY && targetY <= height - paddingY && (
              <line
                x1={paddingX}
                y1={targetY}
                x2={width - paddingX}
                y2={targetY}
                stroke="#8B5CF6"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-45"
              />
            )}

            {/* Area Fill */}
            <path d={fillPath} fill="url(#chart-area-grad)" />

            {/* Attendance Line */}
            <path
              d={dPath}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* End Point Dot */}
            {pointsCoordinates.length > 0 && (
              <circle
                cx={pointsCoordinates[pointsCoordinates.length - 1].x}
                cy={pointsCoordinates[pointsCoordinates.length - 1].y}
                r="4"
                fill="#8B5CF6"
                className="shadow-lg"
              />
            )}
          </svg>
        </div>
        <div className="flex justify-between text-[9px] text-zinc-500 font-bold px-1 uppercase tracking-wider">
          <span>First Log</span>
          <span className="text-purple-400">Target Line ({target}%)</span>
          <span>Latest ({metrics.percentage}%)</span>
        </div>
      </div>
    );
  };

  if (!hasRecords) {
    return (
      <div className="space-y-8 pb-24">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            {getGreetingTime()}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Let's start tracking your attendance.
          </p>
        </div>
        
        <EmptyState onLogFirst={handleOpenModal} />
      </div>
    );
  }

  // Pre-calculate Smart Simulator variables
  const percentageAfterSkip = calculatePercentage(overallMetrics.attended, overallMetrics.total + 1);
  const safeBunksAfterSkip = calculateSafeBunks(overallMetrics.attended, overallMetrics.total + 1, target);
  
  const simAttended = overallMetrics.attended + simLectures;
  const simTotal = overallMetrics.total + simLectures;
  const simPercentage = calculatePercentage(simAttended, simTotal);

  return (
    <div className="space-y-8 pb-24">
      {/* Header Greeting & Theme Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-none">
            {getGreetingTime()}
          </h2>
          <p className="text-sm font-semibold text-purple-400 mt-2">
            {greeting}
          </p>
        </div>

        {/* Tab-styled overall vs cycle selector */}
        <div className="inline-flex p-1 bg-bunkd-bg-secondary-dark rounded-xl border border-bunkd-border-dark self-start sm:self-auto">
          <button
            onClick={() => setActiveSegment("overall")}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeSegment === "overall"
                ? "bg-bunkd-card-elevated-dark text-purple-400 shadow-md border border-purple-500/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Overall
          </button>
          <button
            onClick={() => setActiveSegment("cycle")}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeSegment === "cycle"
                ? "bg-bunkd-card-elevated-dark text-purple-400 shadow-md border border-purple-500/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Cycle
          </button>
        </div>
      </div>

      {/* Hero Circular Stats Container */}
      <motion.div
        layout
        className="relative overflow-hidden w-full bg-bunkd-card-dark border border-bunkd-border-dark rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl"
      >
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />

        <ProgressRing percentage={metrics.percentage} target={target} />

        <div className="flex items-center gap-2 mt-6 text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-500/5 text-purple-400 border border-purple-500/20">
          <Award className="w-3.5 h-3.5" />
          <span>Goal: {target}%</span>
        </div>

        {/* Classes attended counter */}
        <div className="w-full max-w-sm mt-6 pt-4 border-t border-bunkd-border-dark/60 flex justify-between text-xs text-zinc-450 font-bold uppercase tracking-wider">
          <div className="text-left">
            <span className="text-zinc-500 block">Attended</span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">{metrics.attended} Classes</span>
          </div>
          <div className="text-right">
            <span className="text-zinc-500 block">Total Booked</span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">{metrics.total} Classes</span>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-4 gap-2.5 w-full mt-6 pt-4 border-t border-bunkd-border-dark/60">
          <motion.button
            onClick={handleOpenModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bunkd-bg-dark border border-bunkd-border-dark hover:bg-bunkd-card-elevated-dark hover:border-purple-500/30 transition-all text-center cursor-pointer group"
          >
            <span className="text-xl">🔥</span>
            <span className="text-[9px] font-bold text-zinc-400 mt-2 group-hover:text-purple-400 transition-colors uppercase tracking-wider">Log Today</span>
          </motion.button>
          
          <motion.button
            onClick={() => setActiveTab?.("calendar")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bunkd-bg-dark border border-bunkd-border-dark hover:bg-bunkd-card-elevated-dark hover:border-purple-500/30 transition-all text-center cursor-pointer group"
          >
            <span className="text-xl">📅</span>
            <span className="text-[9px] font-bold text-zinc-400 mt-2 group-hover:text-purple-400 transition-colors uppercase tracking-wider">Calendar</span>
          </motion.button>

          <motion.button
            onClick={() => {
              const el = document.getElementById("insights-simulator");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bunkd-bg-dark border border-bunkd-border-dark hover:bg-bunkd-card-elevated-dark hover:border-purple-500/30 transition-all text-center cursor-pointer group"
          >
            <span className="text-xl">📈</span>
            <span className="text-[9px] font-bold text-zinc-400 mt-2 group-hover:text-purple-400 transition-colors uppercase tracking-wider">Predictor</span>
          </motion.button>

          <motion.button
            onClick={handleQuickAddAttended}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bunkd-bg-dark border border-bunkd-border-dark hover:bg-bunkd-card-elevated-dark hover:border-purple-500/30 transition-all text-center cursor-pointer group"
          >
            <span className="text-xl">⚡</span>
            <span className="text-[9px] font-bold text-zinc-400 mt-2 group-hover:text-purple-400 transition-colors uppercase tracking-wider">Quick +1</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Secondary Cards (Safe Bunks / Needed status) */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } }
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {/* Safe Bunks Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 }
          }}
          className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
            metrics.percentage >= target
              ? "bg-green-500/5 dark:bg-green-500/5 border-green-500/20 text-green-300"
              : "bg-bunkd-card-dark border-bunkd-border-dark text-zinc-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Safe Bunks
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                metrics.percentage >= target && metrics.safeBunks > 0 
                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                  : "bg-zinc-800 text-zinc-400"
              }`}>
                {metrics.percentage >= target ? "🟢 Safe" : "⚪ None"}
              </span>
            </div>
            <div className="mt-4">
              <h3 className={`text-4xl font-extrabold tracking-tight ${metrics.percentage >= target ? "text-green-400" : "text-white opacity-40"}`}>
                {metrics.safeBunks} Lectures
              </h3>
              <p className="text-xs mt-2 font-medium leading-relaxed max-w-[240px] text-zinc-400">
                {metrics.percentage >= target && metrics.safeBunks > 0
                  ? `You can safely bunk the next ${metrics.safeBunks} classes.`
                  : "No free skips. You must attend class to raise percentages."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Lectures Needed Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 }
          }}
          className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
            metrics.percentage < target
              ? "bg-red-500/5 dark:bg-red-500/5 border-red-500/25 text-red-300"
              : "bg-bunkd-card-dark border-bunkd-border-dark text-zinc-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Lectures Needed
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                metrics.percentage < target 
                  ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                  : "bg-zinc-800 text-zinc-400"
              }`}>
                {metrics.percentage < target ? "🔴 Target Miss" : "🟢 Achieved"}
              </span>
            </div>
            <div className="mt-4">
              <h3 className={`text-4xl font-extrabold tracking-tight ${metrics.percentage < target ? "text-red-400" : "text-white opacity-40"}`}>
                {metrics.neededLectures === -1 ? "N/A" : `${metrics.neededLectures} Lectures`}
              </h3>
              <p className="text-xs mt-2 font-medium leading-relaxed max-w-[240px] text-zinc-400">
                {metrics.neededLectures === -1 ? (
                  "Recovering is mathematically impossible."
                ) : metrics.neededLectures > 0 ? (
                  `Attend the next ${metrics.neededLectures} consecutive lectures to hit target.`
                ) : (
                  "You are meeting your goal! Bunk safely."
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Smart Features, Analytics & Simulator */}
      <motion.div
        id="insights-simulator"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bunkd-card-dark border border-bunkd-border-dark rounded-3xl p-6 space-y-6 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-extrabold text-white tracking-tight">
            Insights & Simulator
          </h3>
        </div>

        {/* SVG Attendance Line Chart */}
        <div className="space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 pl-1">
            Attendance Trajectory
          </span>
          {renderSVGChart()}
        </div>

        {/* Analytics Streaks Container */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-bunkd-bg-secondary-dark rounded-2xl border border-bunkd-border-dark flex items-center gap-3.5">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 block">Current Streak</span>
              <span className="text-base font-extrabold text-white block">{streaks.current} Days</span>
            </div>
          </div>
          <div className="p-4 bg-bunkd-bg-secondary-dark rounded-2xl border border-bunkd-border-dark flex items-center gap-3.5">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 block">Longest Streak</span>
              <span className="text-base font-extrabold text-white block">{streaks.longest} Days</span>
            </div>
          </div>
        </div>

        {/* Smart Predictions & Simulators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-bunkd-border-dark/60">
          {/* Predictive Can I Skip Tomorrow card */}
          <div className="space-y-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Skip Predictor (Skip Tomorrow)
            </span>
            <div className="p-4 bg-bunkd-bg-secondary-dark rounded-2xl border border-bunkd-border-dark space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-400">If you Skip 1 class:</span>
                <span className="font-extrabold text-white">{percentageAfterSkip}%</span>
              </div>
              <div className="relative w-full h-1.5 bg-bunkd-bg-dark rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${percentageAfterSkip >= target ? "bg-green-400" : "bg-red-400"}`}
                  style={{ width: `${percentageAfterSkip}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                {percentageAfterSkip >= target ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-400">Safe. Remaining skips: {safeBunksAfterSkip}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-red-400">Warning: Drops below {target}% target!</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Semester Slider Simulator */}
          <div className="space-y-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Semester Class Simulator
            </span>
            <div className="p-4 bg-bunkd-bg-secondary-dark rounded-2xl border border-bunkd-border-dark space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-400">Attend next <strong className="text-purple-400">{simLectures}</strong> classes:</span>
                <span className="font-extrabold text-white">{simPercentage}%</span>
              </div>
              
              <input
                type="range"
                min="1"
                max="30"
                value={simLectures}
                onChange={(e) => setSimLectures(parseInt(e.target.value))}
                className="w-full accent-purple-500 bg-bunkd-bg-dark h-1 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase">
                <span>Attend +1</span>
                <span>Attend +30</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Attendance Log List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold tracking-tight text-white">
            Attendance Log
          </h3>
          <motion.button
            onClick={handleOpenModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Day</span>
          </motion.button>
        </div>

        <div className="bg-bunkd-card-dark border border-bunkd-border-dark rounded-2xl overflow-hidden divide-y divide-bunkd-border-dark/65 shadow-lg">
          <AnimatePresence initial={false}>
            {records
              .slice()
              .reverse()
              .map((record) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 flex items-center justify-between hover:bg-bunkd-bg-secondary-dark/40 transition-all group overflow-hidden"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                      {formatDateString(record.dateTimestamp)}
                    </p>
                    <div className="flex items-center gap-2">
                      {record.isHoliday ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          Holiday
                        </span>
                      ) : (
                        <>
                          <span className="text-xs text-zinc-400 font-medium">
                            <strong className="text-white">{record.attendedLectures}/{record.totalLectures}</strong> classes
                          </span>
                          <span className="text-[8px] text-zinc-700">•</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            record.totalLectures > 0 && (record.attendedLectures / record.totalLectures) * 100 >= target
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
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
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title="Delete Log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
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
                <h4 className="text-lg font-extrabold tracking-tight text-white">
                  Log Attendance
                </h4>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-xs font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-bunkd-bg-dark/50 border border-bunkd-border-dark focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none text-white text-sm transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-bunkd-bg-secondary-dark rounded-xl border border-bunkd-border-dark">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">Mark as Holiday</span>
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

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
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
