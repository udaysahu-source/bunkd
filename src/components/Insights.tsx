"use client";
// File: src/components/Insights.tsx
import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { calculatePercentage } from "../lib/attendanceMath";
import { motion } from "framer-motion";
import { Flame, Zap, BarChart3, TrendingUp, HelpCircle } from "lucide-react";

export default function Insights() {
  const { records, settings, overallMetrics } = useStore();
  const [simLectures, setSimLectures] = useState(5);
  
  const target = settings?.targetPercentage ?? 75;
  const metrics = overallMetrics;

  const calculateStreaks = () => {
    // Exclude baseline from the daily attendance streak
    const activeTimestamps = Array.from(new Set(
      records.filter(r => !r.isHoliday && r.totalLectures > 0 && r.type !== "baseline")
        .map(r => { const d = new Date(r.dateTimestamp); d.setHours(0,0,0,0); return d.getTime(); })
    )).sort((a, b) => a - b);

    if (activeTimestamps.length === 0) return { current: 0, longest: 0 };
    
    let longest = 0, tempStreak = 0, prevTimestamp: number | null = null;
    const ONE_DAY_MS = 86400000;
    
    for (let i = 0; i < activeTimestamps.length; i++) {
      const curr = activeTimestamps[i];
      if (prevTimestamp === null) {
        tempStreak = 1;
      } else if (curr - prevTimestamp <= ONE_DAY_MS + 7200000) {
        tempStreak++;
      } else {
        if (tempStreak > longest) longest = tempStreak;
        tempStreak = 1;
      }
      prevTimestamp = curr;
    }
    if (tempStreak > longest) longest = tempStreak;
    
    const lastActive = activeTimestamps[activeTimestamps.length - 1];
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const current = todayMidnight.getTime() - lastActive <= ONE_DAY_MS * 1.5 ? tempStreak : 0;
    
    return { current, longest };
  };

  const streaks = calculateStreaks();

  // SVG Chart
  const renderSVGChart = () => {
    // Include all active records, baseline represents start of tracking
    const filteredRecords = records.filter(r => !r.isHoliday);
    if (filteredRecords.length < 2) {
      return (
        <div className="h-32 flex flex-col items-center justify-center glass-inner rounded-2xl text-xs text-zinc-550 font-semibold p-4 text-center">
          <TrendingUp className="w-8 h-8 text-zinc-600 mb-2 opacity-50" />
          <span>Log at least 2 active days to view trend analytics.</span>
        </div>
      );
    }
    
    let runningAtt = 0, runningTot = 0;
    const points = filteredRecords.map(r => {
      runningAtt += r.attendedLectures;
      runningTot += r.totalLectures;
      return calculatePercentage(runningAtt, runningTot);
    });

    const width = 500, height = 140, px = 15, py = 15;
    const minVal = Math.max(0, Math.min(...points, target) - 10);
    const maxVal = Math.min(100, Math.max(...points, 100));
    const range = maxVal - minVal || 1;
    
    const coords = points.map((val, idx) => ({
      x: px + (idx / (points.length - 1)) * (width - px * 2),
      y: height - py - ((val - minVal) / range) * (height - py * 2),
      val
    }));
    
    const dPath = `M ${coords.map(p => `${p.x},${p.y}`).join(" L ")}`;
    const fillPath = `${dPath} L ${coords[coords.length - 1].x},${height - py} L ${coords[0].x},${height - py} Z`;
    const targetY = height - py - ((target - minVal) / range) * (height - py * 2);

    return (
      <div className="space-y-2">
        <div className="relative w-full aspect-[500/140] glass-inner rounded-2xl p-2 overflow-visible">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Target Line */}
            {targetY >= py && targetY <= height - py && (
              <line 
                x1={px} 
                y1={targetY} 
                x2={width - px} 
                y2={targetY}
                stroke="#8B5CF6" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
                className="opacity-50" 
              />
            )}
            {/* Area Fill */}
            <path d={fillPath} fill="url(#chart-area-grad)" />
            {/* Main Path */}
            <path d={dPath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Data Endpoints */}
            {coords.length > 0 && (
              <>
                <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="6" fill="#8B5CF6" className="opacity-25 animate-pulse" />
                <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill="#8B5CF6" />
              </>
            )}
          </svg>
        </div>
        <div className="flex justify-between text-xs text-zinc-550 dark:text-zinc-500 font-bold px-1.5 uppercase tracking-wider">
          <span>First Entry</span>
          <span>Target ({target}%)</span>
          <span className="text-purple-500 dark:text-purple-400">Now ({metrics.percentage}%)</span>
        </div>
      </div>
    );
  };

  // Simulator stats
  const simAttended = overallMetrics.attended + simLectures;
  const simTotal = overallMetrics.total + simLectures;
  const simPercentage = calculatePercentage(simAttended, simTotal);
  const isSimOnTrack = simPercentage >= target;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
          Insights
        </h2>
        <p className="text-zinc-550 dark:text-zinc-500 text-sm mt-1">
          Detailed metrics, simulator and performance trends
        </p>
      </div>

      {/* SVG Chart Card */}
      <div className="glass-card rounded-3xl p-5 glass-shimmer">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
            Attendance Trend
          </span>
        </div>
        {renderSVGChart()}
      </div>

      {/* Streaks Card */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 glass-card rounded-2xl flex items-center gap-3.5 glass-shimmer">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}
          >
            <Flame className="w-5 h-5 text-amber-550 dark:text-amber-500" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-500 block">
              Current Streak
            </span>
            <span className="text-base font-extrabold text-zinc-800 dark:text-white block">
              {streaks.current} {streaks.current === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
        
        <div className="p-4 glass-card rounded-2xl flex items-center gap-3.5 glass-shimmer">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)" }}
          >
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-500 block">
              Best Streak
            </span>
            <span className="text-base font-extrabold text-zinc-800 dark:text-white block">
              {streaks.longest} {streaks.longest === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="glass-card rounded-3xl p-5 glass-shimmer">
        <h3 className="text-sm font-extrabold text-zinc-850 dark:text-white uppercase tracking-wider mb-3">
          Detailed Scenario testing
        </h3>
        <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-4 leading-relaxed">
          Simulate attendance progression by adding hypothetical upcoming classes.
        </p>

        <div className="p-4 glass-inner rounded-2xl space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-650 dark:text-zinc-300">
              What if I attend the next <strong className="text-purple-500">{simLectures}</strong> classes?
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
              isSimOnTrack 
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-450 border-rose-500/20"
            }`}>
              {simPercentage}% ({isSimOnTrack ? "On Track" : "Below Target"})
            </span>
          </div>
          
          <input
            type="range" 
            min="1" 
            max="30" 
            value={simLectures}
            onChange={(e) => setSimLectures(parseInt(e.target.value))}
            className="w-full accent-purple-500 bg-white/10 dark:bg-white/5 h-1.5 rounded-lg cursor-pointer"
          />
          
          <div className="flex items-center justify-between text-xs text-zinc-550 dark:text-zinc-650 font-bold">
            <span>+1 class</span>
            <span>+30 classes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
