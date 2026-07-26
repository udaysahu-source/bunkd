"use client";
// File: src/store/useStore.ts
import { create } from "zustand";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, collection, onSnapshot, setDoc, writeBatch, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import {
  calculateMetrics,
  getCycleBoundaries
} from "../lib/attendanceMath";
import type {
  AttendanceRecord,
  AttendanceMetrics
} from "../lib/attendanceMath";

interface AppState {
  isInitialized: boolean;
  isFirebaseConfigured: boolean;
  user: User | null;
  authLoading: boolean;
  settingsLoading: boolean;
  recordsLoading: boolean;
  settings: {
    cycleStartDay: number;
    targetPercentage: number;
  } | null;
  records: AttendanceRecord[];
  
  // Computed Metrics
  overallMetrics: AttendanceMetrics;
  cycleMetrics: AttendanceMetrics;
  
  // Toast Notification State
  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  hideToast: () => void;
  
  // Actions
  initialize: () => () => void;
  updateSettings: (cycleStartDay: number, targetPercentage: number) => Promise<void>;
  logAttendance: (date: Date, attended: number, total: number, isHoliday: boolean) => Promise<void>;
  toggleHoliday: (date: Date) => Promise<void>;
  deleteRecord: (dateStr: string) => Promise<void>;
  clearAllAttendance: () => Promise<void>;
}

// Helpers
export function getMidnightTimestamp(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dateToDocId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_METRICS: AttendanceMetrics = {
  attended: 0,
  total: 0,
  percentage: 0.0,
  safeBunks: 0,
  neededLectures: 0
};

export const useStore = create<AppState>((set, get) => {
  let unsubscribeSettings: (() => void) | null = null;
  let unsubscribeAttendance: (() => void) | null = null;

  function calculateAndSetMetrics(records: AttendanceRecord[], cycleStartDay: number, targetPercentage: number) {
    const overall = calculateMetrics(records, targetPercentage);
    
    const { startTimestamp, endTimestamp } = getCycleBoundaries(cycleStartDay);
    const cycleRecords = records.filter(
      r => r.dateTimestamp >= startTimestamp && r.dateTimestamp <= endTimestamp
    );
    const cycle = calculateMetrics(cycleRecords, targetPercentage);

    set({
      overallMetrics: overall,
      cycleMetrics: cycle
    });
  }

  return {
    isInitialized: false,
    isFirebaseConfigured: !!auth && !!db,
    user: null,
    authLoading: true,
    settingsLoading: false,
    recordsLoading: false,
    settings: null,
    records: [],
    overallMetrics: DEFAULT_METRICS,
    cycleMetrics: DEFAULT_METRICS,
    toast: null,
    showToast: (message, type) => {
      set({ toast: { message, type } });
    },
    hideToast: () => {
      set({ toast: null });
    },

    initialize: () => {
      if (get().isInitialized) {
        return () => {};
      }
      set({ isInitialized: true });

      console.log("useStore.ts: initialize action called (first time setup)", { hasAuth: !!auth, hasDb: !!db });
      const currentAuth = auth;
      const currentDb = db;
      if (!currentAuth || !currentDb) {
        console.log("useStore.ts: Firebase not configured. Setting authLoading to false");
        set({ authLoading: false, isFirebaseConfigured: false });
        return () => {};
      }

      onAuthStateChanged(currentAuth, (user) => {
        console.log("useStore.ts: onAuthStateChanged resolved", { userEmail: user?.email ?? null });
        const prevUser = get().user;
        set({ user, authLoading: false });

        if (user) {
          if (user.isAnonymous) {
            // Cleanup database listeners if switching from a registered user
            if (unsubscribeSettings) { unsubscribeSettings(); unsubscribeSettings = null; }
            if (unsubscribeAttendance) { unsubscribeAttendance(); unsubscribeAttendance = null; }

            set({ settingsLoading: true, recordsLoading: true });
            // Load settings and attendance from localStorage for guest
            try {
              const localSettingsStr = localStorage.getItem("bunkd_guest_settings");
              const defaultSettings = { cycleStartDay: 1, targetPercentage: 75 };
              const settings = localSettingsStr ? JSON.parse(localSettingsStr) : defaultSettings;

              const localRecordsStr = localStorage.getItem("bunkd_guest_attendance");
              const records = localRecordsStr ? JSON.parse(localRecordsStr) : [];

              set({ settings, records, settingsLoading: false, recordsLoading: false });
              calculateAndSetMetrics(records, settings.cycleStartDay, settings.targetPercentage);
            } catch (err) {
              console.error("Failed to load guest data from localStorage", err);
              set({ settings: { cycleStartDay: 1, targetPercentage: 75 }, records: [], settingsLoading: false, recordsLoading: false });
            }
            return;
          }

          // If we already have listeners active for this user, do not recreate them
          if (prevUser && prevUser.uid === user.uid && (unsubscribeSettings || unsubscribeAttendance)) {
            return;
          }

          // Cleanup previous listeners just in case
          if (unsubscribeSettings) { unsubscribeSettings(); unsubscribeSettings = null; }
          if (unsubscribeAttendance) { unsubscribeAttendance(); unsubscribeAttendance = null; }

          set({ settingsLoading: true, recordsLoading: true });

          // 1. Listen to Settings Config
          const settingsRef = doc(currentDb, "users", user.uid, "settings", "config");
          unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const settings = {
                cycleStartDay: data.cycleStartDay ?? 1,
                targetPercentage: data.targetPercentage ?? 75
              };
              set({ settings, settingsLoading: false });
              
              // Recalculate metrics with new settings
              const currentRecords = get().records;
              calculateAndSetMetrics(currentRecords, settings.cycleStartDay, settings.targetPercentage);
            } else {
              // Create default settings if not exists
              const defaultSettings = { cycleStartDay: 1, targetPercentage: 75 };
              setDoc(settingsRef, defaultSettings).catch(console.error);
              set({ settings: defaultSettings, settingsLoading: false });
            }
          }, (error) => {
            console.error("Error fetching settings:", error);
            set({ settingsLoading: false });
          });

          // 2. Listen to Attendance Records
          const attendanceRef = collection(currentDb, "users", user.uid, "attendance");
          unsubscribeAttendance = onSnapshot(attendanceRef, (colSnap) => {
            const records: AttendanceRecord[] = [];
            colSnap.forEach((doc) => {
              const data = doc.data();
              records.push({
                id: doc.id,
                dateTimestamp: data.dateTimestamp,
                totalLectures: data.totalLectures ?? 0,
                attendedLectures: data.attendedLectures ?? 0,
                isHoliday: !!data.isHoliday
              });
            });

            // Sort records chronologically (oldest first) for visual mapping
            records.sort((a, b) => a.dateTimestamp - b.dateTimestamp);

            set({ records, recordsLoading: false });

            // Recalculate metrics
            const currentSettings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
            calculateAndSetMetrics(records, currentSettings.cycleStartDay, currentSettings.targetPercentage);
          }, (error) => {
            console.error("Error fetching attendance:", error);
            set({ recordsLoading: false });
          });

        } else {
          // Cleanup subscriptions if user logs out
          if (unsubscribeSettings) {
            unsubscribeSettings();
            unsubscribeSettings = null;
          }
          if (unsubscribeAttendance) {
            unsubscribeAttendance();
            unsubscribeAttendance = null;
          }
          set({
            settings: null,
            records: [],
            overallMetrics: DEFAULT_METRICS,
            cycleMetrics: DEFAULT_METRICS,
            settingsLoading: false,
            recordsLoading: false
          });
        }
      });

      return () => {};
    },

    updateSettings: async (cycleStartDay, targetPercentage) => {
      const { user } = get();
      if (!user) throw new Error("No authenticated user");

      // Boundary check
      const boundedDay = Math.min(Math.max(1, Math.round(cycleStartDay)), 28);
      const boundedPercentage = Math.min(Math.max(0, Math.round(targetPercentage)), 100);

      if (user.isAnonymous) {
        const settings = { cycleStartDay: boundedDay, targetPercentage: boundedPercentage };
        localStorage.setItem("bunkd_guest_settings", JSON.stringify(settings));
        set({ settings });
        calculateAndSetMetrics(get().records, boundedDay, boundedPercentage);
        return;
      }

      if (!db) throw new Error("Database not initialized");

      const settingsRef = doc(db, "users", user.uid, "settings", "config");
      await setDoc(settingsRef, {
        cycleStartDay: boundedDay,
        targetPercentage: boundedPercentage
      }, { merge: true });
    },

    logAttendance: async (date, attended, total, isHoliday) => {
      const { user } = get();
      if (!user) throw new Error("No authenticated user");

      // Validations
      if (attended > total) {
        throw new Error("Attended lectures cannot exceed total lectures");
      }
      if (attended < 0 || total < 0) {
        throw new Error("Lectures cannot be negative");
      }

      const docId = dateToDocId(date);
      const midnightTimestamp = getMidnightTimestamp(date);

      if (user.isAnonymous) {
        const records = [...get().records];
        const index = records.findIndex(r => r.id === docId);
        const record = {
          id: docId,
          dateTimestamp: midnightTimestamp,
          totalLectures: isHoliday ? 0 : total,
          attendedLectures: isHoliday ? 0 : attended,
          isHoliday
        };

        if (index > -1) {
          records[index] = record;
        } else {
          records.push(record);
        }
        records.sort((a, b) => a.dateTimestamp - b.dateTimestamp);

        localStorage.setItem("bunkd_guest_attendance", JSON.stringify(records));
        set({ records });
        const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
        calculateAndSetMetrics(records, settings.cycleStartDay, settings.targetPercentage);
        return;
      }

      if (!db) throw new Error("Database not initialized");
      
      const recordRef = doc(db, "users", user.uid, "attendance", docId);
      await setDoc(recordRef, {
        dateTimestamp: midnightTimestamp,
        totalLectures: isHoliday ? 0 : total,
        attendedLectures: isHoliday ? 0 : attended,
        isHoliday
      }, { merge: true });
    },

    toggleHoliday: async (date) => {
      const { user, records } = get();
      if (!user) throw new Error("No authenticated user");

      const docId = dateToDocId(date);
      const record = records.find(r => r.id === docId);

      if (user.isAnonymous) {
        const updatedRecords = [...records];
        const index = updatedRecords.findIndex(r => r.id === docId);
        
        let newRecord;
        if (record) {
          const nextIsHoliday = !record.isHoliday;
          newRecord = {
            ...record,
            isHoliday: nextIsHoliday,
            totalLectures: nextIsHoliday ? 0 : record.totalLectures,
            attendedLectures: nextIsHoliday ? 0 : record.attendedLectures
          };
        } else {
          const midnightTimestamp = getMidnightTimestamp(date);
          newRecord = {
            id: docId,
            dateTimestamp: midnightTimestamp,
            totalLectures: 0,
            attendedLectures: 0,
            isHoliday: true
          };
        }

        if (index > -1) {
          updatedRecords[index] = newRecord;
        } else {
          updatedRecords.push(newRecord);
        }
        updatedRecords.sort((a, b) => a.dateTimestamp - b.dateTimestamp);

        localStorage.setItem("bunkd_guest_attendance", JSON.stringify(updatedRecords));
        set({ records: updatedRecords });
        const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
        calculateAndSetMetrics(updatedRecords, settings.cycleStartDay, settings.targetPercentage);
        return;
      }

      if (!db) throw new Error("Database not initialized");

      const recordRef = doc(db, "users", user.uid, "attendance", docId);
      if (record) {
        const nextIsHoliday = !record.isHoliday;
        await setDoc(recordRef, {
          isHoliday: nextIsHoliday,
          totalLectures: nextIsHoliday ? 0 : record.totalLectures,
          attendedLectures: nextIsHoliday ? 0 : record.attendedLectures
        }, { merge: true });
      } else {
        const midnightTimestamp = getMidnightTimestamp(date);
        await setDoc(recordRef, {
          dateTimestamp: midnightTimestamp,
          totalLectures: 0,
          attendedLectures: 0,
          isHoliday: true
        });
      }
    },

    deleteRecord: async (dateStr) => {
      const { user, records } = get();
      if (!user) throw new Error("No authenticated user");

      if (user.isAnonymous) {
        const updatedRecords = records.filter(r => r.id !== dateStr);
        localStorage.setItem("bunkd_guest_attendance", JSON.stringify(updatedRecords));
        set({ records: updatedRecords });
        const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
        calculateAndSetMetrics(updatedRecords, settings.cycleStartDay, settings.targetPercentage);
        return;
      }

      if (!db) throw new Error("Database not initialized");

      const recordRef = doc(db, "users", user.uid, "attendance", dateStr);
      const batch = writeBatch(db);
      batch.delete(recordRef);
      await batch.commit();
    },

    clearAllAttendance: async () => {
      const { user } = get();
      if (!user) throw new Error("No authenticated user");

      if (user.isAnonymous) {
        localStorage.removeItem("bunkd_guest_attendance");
        set({ records: [] });
        const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
        calculateAndSetMetrics([], settings.cycleStartDay, settings.targetPercentage);
        return;
      }

      if (!db) throw new Error("Database not initialized");

      const attendanceRef = collection(db, "users", user.uid, "attendance");
      const colSnap = await getDocs(attendanceRef);
      const batch = writeBatch(db);
      colSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      set({ records: [] });
      const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
      calculateAndSetMetrics([], settings.cycleStartDay, settings.targetPercentage);
    }
  };
});
