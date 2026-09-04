"use client";
// File: src/components/Insights.tsx
import React, { useState, useMemo } from "react";
import { useStore } from "../store/useStore";
import { calculatePercentage, calculateNeededLectures } from "../lib/attendanceMath";
import {
  TrendingUp,
  Flame,
  Zap,
  Target,
  BarChart3,
  CalendarCheck2,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function Insights() {
  const { records, settings, overallMetrics, profile } = useStore();
  const target = settings?.targetPercentage ?? 75;
  const currentSemester = profile?.semester ?? 1;

  // Custom scenario simulator state
  const [simAttendExtra, setSimAttendExtra] = useState(5);
  const [simBunkExtra, setSimBunkExtra] = useState(3);
  const [customTargetGoal, setCustomTargetGoal] = useState(80);

  // Active hover point for SVG chart
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; dateStr: string; att: number; tot: number } | null>(null);

  const semesterRecords = useMemo(() => {
    return records.filter(r => (r.semester ?? currentSemester) === currentSemester && !r.isHoliday);
  }, [records, currentSemester]);

  // Streak calculations
  const calculateStreaks = () => {
    const activeTimestamps = Array.from(new Set(
      records
        .filter(r => !r.isHoliday && r.totalLectures > 0 && r.type !== "baseline" && (r.semester ?? currentSemester) === currentSemester)
        .map(r => {
          const d = new Date(r.dateTimestamp);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
    )).sort((a, b) => a - b);

    if (activeTimestamps.length === 0) return { current: 0, longest: 0 };

    let longest = 0;
    let tempStreak = 0;
    let prevTimestamp: number | null = null;
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

  // Trajectory Chart
  const chartData = useMemo(() => {
    if (semesterRecords.length < 2) return null;

    let runningAtt = 0;
    let runningTot = 0;

    const points = semesterRecords.map(r => {
      runningAtt += r.attendedLectures;
      runningTot += r.totalLectures;
      const pct = calculatePercentage(runningAtt, runningTot);
      const d = new Date(r.dateTimestamp);
      const dateStr = r.id === "baseline" ? "Baseline" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      return {
        pct,
        dateStr,
        runningAtt,
        runningTot
      };
    });

    const width = 600;
    const height = 180;
    const px = 24;
    const py = 20;

    const minVal = Math.max(0, Math.min(...points.map(p => p.pct), target) - 10);
    const maxVal = Math.min(100, Math.max(...points.map(p => p.pct), target) + 10);
    const range = maxVal - minVal || 1;

    const coords = points.map((p, idx) => ({
      x: px + (idx / (points.length - 1)) * (width - px * 2),
      y: height - py - ((p.pct - minVal) / range) * (height - py * 2),
      val: p.pct,
      dateStr: p.dateStr,
      att: p.runningAtt,
      tot: p.runningTot
    }));

    const dPath = `M ${coords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
    const targetY = height - py - ((target - minVal) / range) * (height - py * 2);

    return { coords, dPath, targetY, width, height, minVal, maxVal };
  }, [semesterRecords, target]);

  // Scenario 1: Attend Extra Classes
  const simAttendedTotal = overallMetrics.attended + simAttendExtra;
  const simAttendedTotalPlanned = overallMetrics.total + simAttendExtra;
  const simPctIfAttend = calculatePercentage(simAttendedTotal, simAttendedTotalPlanned);

  // Scenario 2: Bunk Extra Classes
  const simBunkTotalPlanned = overallMetrics.total + simBunkExtra;
  const simPctIfBunk = calculatePercentage(overallMetrics.attended, simBunkTotalPlanned);

  // Scenario 3: Needed for Custom Goal
  const neededForCustom = calculateNeededLectures(overallMetrics.attended, overallMetrics.total, customTargetGoal);

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span>Analytics & Projections</span>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Visual attendance trajectory, streak consistency, and scenario modeling.
        </p>
      </div>

      {/* Trajectory Chart Card */}
      <div className="app-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span>Attendance Trend (Semester {currentSemester})</span>
          </h2>
          <span className="text-xs font-semibold text-zinc-400">
            Target threshold: {target}%
          </span>
        </div>

        {chartData ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-[600/180] app-card-inset p-2">
              <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} className="w-full h-full overflow-visible">
                {/* Target Baseline Line */}
                <line
                  x1={24}
                  y1={chartData.targetY}
                  x2={chartData.width - 24}
                  y2={chartData.targetY}
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="opacity-40"
                />

                {/* Main Trajectory Line */}
                <path
                  d={chartData.dPath}
                  fill="none"
                  stroke="#6d5ce0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data point circles */}
                {chartData.coords.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.dateStr === pt.dateStr ? 6 : 3.5}
                    fill={pt.val >= target ? "#059669" : "#dc2626"}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute p-2 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{ left: `${(hoveredPoint.x / chartData.width) * 100}%`, top: `${(hoveredPoint.y / chartData.height) * 100}%` }}
                >
                  <p className="font-bold">{hoveredPoint.dateStr}</p>
                  <p className="text-zinc-300">{hoveredPoint.val}% ({hoveredPoint.att}/{hoveredPoint.tot})</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-2">
              <span>Start of semester</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">Target line ({target}%)</span>
              <span>Current standing ({overallMetrics.percentage}%)</span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center app-card-inset text-xs text-zinc-500">
            Log at least 2 active class days to view your attendance trajectory chart.
          </div>
        )}
      </div>

      {/* Streak & Consistency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="app-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Current Streak
              </span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {streaks.current} {streaks.current === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 flex items-center justify-center text-purple-600">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Longest Streak
              </span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {streaks.longest} {streaks.longest === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Total Classes Logged
              </span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {overallMetrics.attended} / {overallMetrics.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Scenario Calculator */}
      <div className="app-card p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Multi-Scenario Decision Simulator</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Model exact attendance outcomes before making decisions on upcoming classes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scenario A: Attend */}
          <div className="app-card-inset p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> Scenario: Attend Next Classes
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimAttendExtra(Math.max(1, simAttendExtra - 1))}
                  className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold">{simAttendExtra}</span>
                <button
                  type="button"
                  onClick={() => setSimAttendExtra(simAttendExtra + 1)}
                  className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              If you attend the next <strong>{simAttendExtra}</strong> lectures without missing any:
            </p>

            <div className="pt-2 flex items-baseline justify-between border-t border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">Projected Attendance:</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {overallMetrics.percentage}% → {simPctIfAttend}%
              </span>
            </div>
          </div>

          {/* Scenario B: Bunk */}
          <div className="app-card-inset p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" /> Scenario: Skip / Bunk Next Classes
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimBunkExtra(Math.max(1, simBunkExtra - 1))}
                  className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold">{simBunkExtra}</span>
                <button
                  type="button"
                  onClick={() => setSimBunkExtra(simBunkExtra + 1)}
                  className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              If you miss the next <strong>{simBunkExtra}</strong> lectures:
            </p>

            <div className="pt-2 flex items-baseline justify-between border-t border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">Projected Attendance:</span>
              <span className={`text-base font-bold ${simPctIfBunk >= target ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {overallMetrics.percentage}% → {simPctIfBunk}%
              </span>
            </div>
          </div>
        </div>

        {/* Custom Target Goal Calculator */}
        <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 block">
              Custom Target Goal Calculator
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Find out how many classes you must attend to achieve a specific target percentage.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Target:</label>
              <select
                value={customTargetGoal}
                onChange={e => setCustomTargetGoal(parseInt(e.target.value))}
                className="form-input text-xs py-1 px-2 font-bold w-20"
              >
                {[65, 70, 75, 80, 85, 90, 95].map(v => (
                  <option key={v} value={v}>{v}%</option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-xs text-zinc-500 block">Lectures Needed:</span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                {neededForCustom === -1 ? "Impossible" : `${neededForCustom} classes`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
