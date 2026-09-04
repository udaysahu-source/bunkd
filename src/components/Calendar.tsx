"use client";
// File: src/components/Calendar.tsx
import React, { useState, useMemo } from "react";
import { useStore, dateToDocId, getMidnightTimestamp } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Upload,
  Trash2,
  Edit2,
  FileSpreadsheet,
  AlertTriangle,
  X
} from "lucide-react";
import { calculatePercentage, type AttendanceRecord } from "../lib/attendanceMath";

export default function Calendar() {
  const {
    records,
    logAttendance,
    deleteRecord,
    showToast,
    settings,
    profile,
    timetable,
    exportAttendanceCSV,
    importAttendanceRecords
  } = useStore();

  const target = settings?.targetPercentage ?? 75;
  const currentSemester = profile?.semester ?? 1;

  // View mode: "calendar" or "table"
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form State for Log Modal
  const [attended, setAttended] = useState("1");
  const [total, setTotal] = useState("1");
  const [isHoliday, setIsHoliday] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Table filter & search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "full" | "partial" | "missed" | "holiday">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Delete confirmation dialog
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Filter semester records
  const semesterRecords = useMemo(() => {
    return records.filter(r => (r.semester ?? currentSemester) === currentSemester);
  }, [records, currentSemester]);

  // Open Log modal with sensible defaults from timetable if not logged yet
  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    const docId = dateToDocId(date);
    const existing = records.find(r => r.id === docId);

    if (existing) {
      setAttended(existing.attendedLectures.toString());
      setTotal(existing.totalLectures.toString());
      setIsHoliday(existing.isHoliday);
    } else {
      const dayOfWeek = date.getDay();
      const plannedSlots = timetable[dayOfWeek] ?? 4;
      setAttended(plannedSlots > 0 ? plannedSlots.toString() : "0");
      setTotal(plannedSlots > 0 ? plannedSlots.toString() : "4");
      setIsHoliday(plannedSlots === 0 && (dayOfWeek === 0 || dayOfWeek === 6));
    }
    setValidationError(null);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setValidationError(null);

    const attVal = isHoliday ? 0 : parseInt(attended);
    const totVal = isHoliday ? 0 : parseInt(total);

    if (!isHoliday) {
      if (isNaN(attVal) || isNaN(totVal)) {
        setValidationError("Please enter valid positive numbers");
        return;
      }
      if (attVal < 0 || totVal < 0) {
        setValidationError("Lecture counts cannot be negative");
        return;
      }
      if (attVal > totVal) {
        setValidationError("Attended lectures cannot exceed total planned lectures");
        return;
      }
    }

    try {
      await logAttendance(selectedDate, attVal, totVal, isHoliday);
      setSelectedDate(null);
      showToast("Attendance logged successfully", "success");
    } catch (err) {
      const error = err as Error;
      setValidationError(error.message || "Failed to save attendance");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteDate) return;
    try {
      await deleteRecord(confirmDeleteDate);
      setConfirmDeleteDate(null);
      if (selectedDate && dateToDocId(selectedDate) === confirmDeleteDate) {
        setSelectedDate(null);
      }
      showToast("Record deleted", "info");
    } catch {
      showToast("Failed to delete record", "error");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = exportAttendanceCSV();
    if (!csvContent) {
      showToast("No records available to export", "info");
      return;
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bunkd_attendance_sem${currentSemester}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Attendance data exported to CSV", "success");
  };

  // Import CSV text parser
  const handleImportCSVSubmit = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.trim().split("\n");
      const parsedRecords: AttendanceRecord[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().includes("date"))) continue; // skip header

        const [dateStr, attStr, totStr, holidayStr, typeStr, semStr] = line.split(",").map(s => s.trim());
        if (!dateStr) continue;

        let midnightTs = Date.now();
        let docId = dateStr;

        if (dateStr.toLowerCase() === "baseline") {
          docId = "baseline";
        } else {
          const parsedD = new Date(dateStr);
          if (isNaN(parsedD.getTime())) continue;
          midnightTs = getMidnightTimestamp(parsedD);
          docId = dateToDocId(parsedD);
        }

        parsedRecords.push({
          id: docId,
          dateTimestamp: midnightTs,
          attendedLectures: parseInt(attStr) || 0,
          totalLectures: parseInt(totStr) || 0,
          isHoliday: holidayStr?.toLowerCase() === "yes" || holidayStr?.toLowerCase() === "true",
          type: docId === "baseline" ? "baseline" : (typeStr as "daily" | "baseline") || "daily",
          semester: parseInt(semStr) || currentSemester
        });
      }

      const count = await importAttendanceRecords(parsedRecords);
      setShowImportModal(false);
      setImportText("");
      showToast(`Imported ${count} attendance records successfully`, "success");
    } catch {
      showToast("Failed to parse CSV records. Ensure valid formatting.", "error");
    } finally {
      setImporting(false);
    }
  };

  // Filtered & Sorted Table Records
  const filteredTableRecords = useMemo(() => {
    let list = [...semesterRecords];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        const dStr = r.id === "baseline" ? "baseline" : new Date(r.dateTimestamp).toISOString().split("T")[0];
        return dStr.includes(q);
      });
    }

    if (statusFilter === "holiday") {
      list = list.filter(r => r.isHoliday);
    } else if (statusFilter === "full") {
      list = list.filter(r => !r.isHoliday && r.totalLectures > 0 && r.attendedLectures === r.totalLectures);
    } else if (statusFilter === "partial") {
      list = list.filter(r => !r.isHoliday && r.totalLectures > 0 && r.attendedLectures > 0 && r.attendedLectures < r.totalLectures);
    } else if (statusFilter === "missed") {
      list = list.filter(r => !r.isHoliday && r.totalLectures > 0 && r.attendedLectures === 0);
    }

    list.sort((a, b) => {
      return sortOrder === "desc"
        ? b.dateTimestamp - a.dateTimestamp
        : a.dateTimestamp - b.dateTimestamp;
    });

    return list;
  }, [semesterRecords, searchQuery, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTableRecords.length / pageSize));
  const paginatedRecords = filteredTableRecords.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 pb-20">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Attendance Calendar & Logs</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Review calendar attendance, manage daily overrides, or audit logs in table view.
          </p>
        </div>

        {/* View Toggle & CSV Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-[#1a162b] text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-[#1a162b] text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="btn-secondary text-xs px-2.5 py-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            title="Import CSV"
            className="btn-secondary text-xs px-2.5 py-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>

      {/* ──── CALENDAR VIEW ──── */}
      {viewMode === "calendar" && (
        <div className="app-card p-4 sm:p-6 space-y-5">
          {/* Calendar Month Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                className="text-xs font-semibold px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                aria-label="Previous Month"
                className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-600 dark:text-zinc-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                aria-label="Next Month"
                className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-600 dark:text-zinc-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(dayName => (
              <span key={dayName} className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {dayName}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl bg-transparent" />;
              }

              const docId = dateToDocId(date);
              const record = records.find(r => r.id === docId);
              const todayStr = dateToDocId(new Date());
              const isToday = docId === todayStr;

              let dayBadge = null;
              let cardBg = "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800/80";

              if (record) {
                if (record.isHoliday) {
                  cardBg = "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40";
                  dayBadge = <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">Holiday</span>;
                } else if (record.totalLectures > 0) {
                  const pct = calculatePercentage(record.attendedLectures, record.totalLectures);
                  const isGood = pct >= target;
                  if (isGood) {
                    cardBg = "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40";
                  } else {
                    cardBg = "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/40";
                  }
                  dayBadge = (
                    <span className={`text-[11px] font-extrabold ${isGood ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                      {record.attendedLectures}/{record.totalLectures}
                    </span>
                  );
                }
              }

              return (
                <button
                  key={docId}
                  type="button"
                  onClick={() => handleSelectDay(date)}
                  className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between items-start text-left transition-all hover:border-purple-500 cursor-pointer ${cardBg} ${
                    isToday ? "ring-2 ring-purple-500 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs sm:text-sm font-semibold ${isToday ? "text-purple-600 dark:text-purple-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {date.getDate()}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                    )}
                  </div>
                  <div className="w-full truncate">{dayBadge}</div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" />
              <span>On Target ({target}%+)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500" />
              <span>Below Target</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500" />
              <span>Holiday / Off</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full ring-2 ring-purple-500" />
              <span>Today</span>
            </span>
          </div>
        </div>
      )}

      {/* ──── DATA TABLE VIEW ──── */}
      {viewMode === "table" && (
        <div className="app-card p-4 sm:p-6 space-y-4">
          {/* Table Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search date (YYYY-MM-DD)..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="form-input pl-9 text-xs"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(["all", "full", "partial", "missed", "holiday"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer border ${
                    statusFilter === f
                      ? "bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                      : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                <tr>
                  <th
                    className="p-3 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200"
                    onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  >
                    Date {sortOrder === "desc" ? "↓" : "↑"}
                  </th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Attended</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No attendance records found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map(record => {
                    const isBase = record.id === "baseline";
                    const dStr = isBase ? "Baseline Sync" : record.id || "";
                    const pct = record.isHoliday || record.totalLectures === 0
                      ? 0
                      : calculatePercentage(record.attendedLectures, record.totalLectures);

                    return (
                      <tr key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {dStr}
                        </td>
                        <td className="p-3 text-zinc-500 capitalize">
                          {record.type || "daily"}
                        </td>
                        <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {record.isHoliday ? "-" : record.attendedLectures}
                        </td>
                        <td className="p-3 text-zinc-500">
                          {record.isHoliday ? "-" : record.totalLectures}
                        </td>
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                          {record.isHoliday ? "-" : `${pct}%`}
                        </td>
                        <td className="p-3">
                          {record.isHoliday ? (
                            <span className="badge-warning">Holiday</span>
                          ) : pct >= target ? (
                            <span className="badge-success">On Track</span>
                          ) : (
                            <span className="badge-danger">Below Target</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isBase && record.id && (
                              <button
                                onClick={() => {
                                  const parts = record.id!.split("-");
                                  if (parts.length === 3) {
                                    handleSelectDay(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                                  }
                                }}
                                title="Edit Record"
                                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteDate(record.id || null)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
            <span>
              Showing {filteredTableRecords.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, filteredTableRecords.length)} of {filteredTableRecords.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs px-2.5 py-1 disabled:opacity-30"
              >
                Prev
              </button>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-xs px-2.5 py-1 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── LOG / EDIT ATTENDANCE MODAL ──── */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md app-card p-6 bg-white dark:bg-[#1a162b] shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedDate(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Update class attendance or declare an official holiday.
                </p>
              </div>

              {validationError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={handleSaveAttendance} className="space-y-4">
                {/* Holiday Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Declare as Holiday / Off Day
                    </span>
                    <span className="text-xs text-zinc-500">Excludes this day from percentage calculation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isHoliday}
                    onChange={e => setIsHoliday(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                </div>

                {!isHoliday && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Attended Classes
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        required
                        value={attended}
                        onChange={e => setAttended(e.target.value)}
                        className="form-input font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Total Planned
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={total}
                        onChange={e => setTotal(e.target.value)}
                        className="form-input font-bold"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  {records.some(r => r.id === dateToDocId(selectedDate)) ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteDate(dateToDocId(selectedDate))}
                      className="btn-destructive text-xs py-2 px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Log</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(null)}
                      className="btn-secondary text-xs py-2 px-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs py-2 px-4"
                    >
                      Save Attendance
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──── DELETE CONFIRMATION MODAL ──── */}
      <AnimatePresence>
        {confirmDeleteDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm app-card p-6 bg-white dark:bg-[#1a162b] shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Confirm Record Deletion
                </h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Are you sure you want to permanently delete the attendance record for{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">{confirmDeleteDate}</strong>? This will immediately recalculate your safe bunks buffer.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteDate(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="btn-destructive text-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──── CSV IMPORT MODAL ──── */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg app-card p-6 bg-white dark:bg-[#1a162b] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  <span>Import Attendance CSV</span>
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Paste raw CSV text below. Format: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">Date,Attended,Total,IsHoliday,Type,Semester</code>
              </p>

              <textarea
                rows={6}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="2026-09-01,4,5,No,daily,1&#10;2026-09-02,5,5,No,daily,1"
                className="form-input font-mono text-xs"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCSVSubmit}
                  disabled={importing || !importText.trim()}
                  className="btn-primary text-xs"
                >
                  {importing ? "Importing..." : "Parse & Import Records"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
