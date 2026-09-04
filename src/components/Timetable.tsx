"use client";
// File: src/components/Timetable.tsx
import React, { useState, useEffect } from "react";
import { useStore, WeekdayTimetable } from "../store/useStore";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Save,
  RotateCcw,
  BookOpen,
  Info
} from "lucide-react";

const WEEKDAYS = [
  { dayIndex: 1, name: "Monday", short: "Mon" },
  { dayIndex: 2, name: "Tuesday", short: "Tue" },
  { dayIndex: 3, name: "Wednesday", short: "Wed" },
  { dayIndex: 4, name: "Thursday", short: "Thu" },
  { dayIndex: 5, name: "Friday", short: "Fri" },
  { dayIndex: 6, name: "Saturday", short: "Sat" },
  { dayIndex: 0, name: "Sunday", short: "Sun" },
];

export default function Timetable() {
  const { timetable, updateTimetable, showToast } = useStore();
  const [schedule, setSchedule] = useState<WeekdayTimetable>(timetable);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSchedule(timetable);
    setIsDirty(false);
  }, [timetable]);

  const handleSlotChange = (dayIndex: number, count: number) => {
    const validCount = Math.max(0, Math.min(12, count));
    const next = { ...schedule, [dayIndex]: validCount };
    setSchedule(next);
    setIsDirty(true);
  };

  const handleApplyPreset = (preset: "5day" | "6day" | "reset") => {
    let next: WeekdayTimetable;
    if (preset === "5day") {
      next = { 0: 0, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 0 };
    } else if (preset === "6day") {
      next = { 0: 0, 1: 6, 2: 6, 3: 6, 4: 6, 5: 6, 6: 4 };
    } else {
      next = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    }
    setSchedule(next);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTimetable(schedule);
      setIsDirty(false);
      showToast("Timetable schedule saved successfully", "success");
    } catch {
      showToast("Failed to save timetable", "error");
    } finally {
      setSaving(false);
    }
  };

  const weeklyTotal = Object.values(schedule).reduce((acc, curr) => acc + (curr || 0), 0);
  const activeDaysCount = Object.values(schedule).filter(v => (v || 0) > 0).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <CalendarClock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Weekly Class Schedule</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure your recurring weekly timetable to automatically suggest daily lecture slots.
          </p>
        </div>

        {isDirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={() => { setSchedule(timetable); setIsDirty(false); }}
              className="btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Discard</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Schedule"}</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Summary Stat & Quick Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="app-card p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Weekly Lectures
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{weeklyTotal}</span>
            <span className="text-xs font-medium text-zinc-500">classes / week</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Across {activeDaysCount} working days
          </p>
        </div>

        <div className="app-card p-5 md:col-span-2 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quick Timetable Presets
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Apply standard university schedule templates with one click:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => handleApplyPreset("5day")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
            >
              5-Day Week (5 slots/day)
            </button>
            <button
              onClick={() => handleApplyPreset("6day")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
            >
              6-Day Engineering (6 slots + Sat 4)
            </button>
            <button
              onClick={() => handleApplyPreset("reset")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Schedule Grid */}
      <div className="app-card p-6">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <span>Daily Class Slot Configuration</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {WEEKDAYS.map(({ dayIndex, name, short }) => {
            const count = schedule[dayIndex] || 0;
            const isWeekend = dayIndex === 0 || dayIndex === 6;

            return (
              <div
                key={dayIndex}
                className={`p-4 rounded-xl border flex flex-col items-center justify-between gap-3 text-center transition-all ${
                  count > 0
                    ? "bg-zinc-50 dark:bg-[#1a162b] border-zinc-200 dark:border-[#2c2547]"
                    : "bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200/60 dark:border-zinc-800/60 opacity-80"
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                    {short}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {name}
                  </span>
                </div>

                {/* Counter Control */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSlotChange(dayIndex, count - 1)}
                    disabled={count <= 0}
                    className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSlotChange(dayIndex, count + 1)}
                    disabled={count >= 12}
                    className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  count > 0
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900"
                    : isWeekend
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                }`}>
                  {count > 0 ? `${count} lectures` : isWeekend ? "Day Off" : "No Classes"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Informational Banner */}
        <div className="mt-6 p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
            <p className="font-semibold text-purple-900 dark:text-purple-300">
              How Timetable Auto-Fill Works
            </p>
            <p>
              When you open the 1-Tap Daily Logger or select a date in the Calendar, Bunkd automatically sets the total planned classes based on this timetable. You can always adjust the slot count on any individual day.
            </p>
          </div>
        </div>

        {/* Save Bar */}
        {isDirty && (
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>●</span> Unsaved timetable changes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSchedule(timetable); setIsDirty(false); }}
                className="btn-secondary text-xs py-2 px-3"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-xs py-2 px-4"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Timetable"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
