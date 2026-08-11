"use client";
// File: src/store/useStore.ts
import { create } from "zustand";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, collection, onSnapshot, setDoc, writeBatch, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import {
  calculateMetrics,
  getCycleBoundaries
} from "../lib/attendanceMath";
import type {
  AttendanceRecord,
  AttendanceMetrics
} from "../lib/attendanceMath";

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  college_name?: string | null;
  department?: string | null;
  semester: number;
  created_at: number;
}

interface AppState {
  isInitialized: boolean;
  isFirebaseConfigured: boolean;
  user: User | null;
  authLoading: boolean;
  settingsLoading: boolean;
  recordsLoading: boolean;
  profileLoading: boolean;
  settings: {
    cycleStartDay: number;
    targetPercentage: number;
  } | null;
  records: AttendanceRecord[];
  profile: UserProfile | null;
  
  // Computed Metrics
  overallMetrics: AttendanceMetrics;
  cycleMetrics: AttendanceMetrics;
  
  // Toast Notification State
  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  hideToast: () => void;
  
  // Actions
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  saveProfile: (name: string, semester: number, department: string | null, college_name?: string | null) => Promise<void>;
  updateProfileSemester: (semester: number, resetBaseline: boolean) => Promise<void>;
  updateSettings: (cycleStartDay: number, targetPercentage: number) => Promise<void>;
  logAttendance: (date: Date, attended: number, total: number, isHoliday: boolean) => Promise<void>;
  logBaseline: (attended: number, total: number) => Promise<void>;
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
  let unsubscribeProfile: (() => void) | null = null;

  function calculateAndSetMetrics(records: AttendanceRecord[], cycleStartDay: number, targetPercentage: number, currentSemester: number) {
    const semesterRecords = records.filter(
      r => (r.semester ?? currentSemester) === currentSemester
    );
    const overall = calculateMetrics(semesterRecords, targetPercentage);
    
    const { startTimestamp, endTimestamp } = getCycleBoundaries(cycleStartDay);
    const cycleRecords = semesterRecords.filter(
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
    profileLoading: true,
    settings: null,
    records: [],
    profile: null,
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
            if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }

            set({ settingsLoading: true, recordsLoading: true, profileLoading: true });
            // Load settings, attendance, and profile from localStorage for guest
            try {
              const localSettingsStr = localStorage.getItem("bunkd_guest_settings");
              const defaultSettings = { cycleStartDay: 1, targetPercentage: 75 };
              const settings = localSettingsStr ? JSON.parse(localSettingsStr) : defaultSettings;

              const localRecordsStr = localStorage.getItem("bunkd_guest_attendance");
              const records = localRecordsStr ? JSON.parse(localRecordsStr) : [];

              const localProfileStr = localStorage.getItem("bunkd_guest_profile");
              const profile: UserProfile | null = localProfileStr ? JSON.parse(localProfileStr) : null;

              set({ settings, records, profile, settingsLoading: false, recordsLoading: false, profileLoading: false });
              calculateAndSetMetrics(records, settings.cycleStartDay, settings.targetPercentage, profile?.semester ?? 1);
            } catch (err) {
              console.error("Failed to load guest data from localStorage", err);
              set({ settings: { cycleStartDay: 1, targetPercentage: 75 }, records: [], profile: null, settingsLoading: false, recordsLoading: false, profileLoading: false });
            }
            return;
          }

          // If we already have listeners active for this user, do not recreate them
          if (prevUser && prevUser.uid === user.uid && (unsubscribeSettings || unsubscribeAttendance || unsubscribeProfile)) {
            return;
          }

          // Cleanup previous listeners just in case
          if (unsubscribeSettings) { unsubscribeSettings(); unsubscribeSettings = null; }
          if (unsubscribeAttendance) { unsubscribeAttendance(); unsubscribeAttendance = null; }
          if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }

          set({ settingsLoading: true, recordsLoading: true, profileLoading: true });

          // 1. Listen to Profile Document
          const profileRef = doc(currentDb, "users", user.uid);
          unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const profile: UserProfile = {
                user_id: user.uid,
                name: data.name ?? "",
                email: data.email ?? "",
                college_name: data.college_name ?? null,
                department: data.department ?? null,
                semester: data.semester ?? 1,
                created_at: data.created_at ?? Date.now()
              };
              set({ profile, profileLoading: false });

              // Recalculate metrics with current profile semester
              const currentRecords = get().records;
              const currentSettings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
              calculateAndSetMetrics(currentRecords, currentSettings.cycleStartDay, currentSettings.targetPercentage, profile.semester);
            } else {
              set({ profile: null, profileLoading: false });
            }
          }, (error) => {
            console.error("Error fetching profile:", error);
            set({ profileLoading: false });
          });

          // 2. Listen to Settings Config
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
              const currentProfile = get().profile;
              calculateAndSetMetrics(currentRecords, settings.cycleStartDay, settings.targetPercentage, currentProfile?.semester ?? 1);
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

          // 3. Listen to Attendance Records
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
                isHoliday: !!data.isHoliday,
                type: data.type || "daily",
                semester: data.semester
              });
            });

            // Sort records chronologically (oldest first) for visual mapping
            records.sort((a, b) => a.dateTimestamp - b.dateTimestamp);

            set({ records, recordsLoading: false });

            // Recalculate metrics
            const currentSettings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
            const currentProfile = get().profile;
            calculateAndSetMetrics(records, currentSettings.cycleStartDay, currentSettings.targetPercentage, currentProfile?.semester ?? 1);
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
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }
          set({
            settings: null,
            records: [],
            profile: null,
            overallMetrics: DEFAULT_METRICS,
            cycleMetrics: DEFAULT_METRICS,
            settingsLoading: false,
            recordsLoading: false,
            profileLoading: false
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
        const currentSem = get().profile?.semester ?? 1;
        calculateAndSetMetrics(get().records, boundedDay, boundedPercentage, currentSem);
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
      const currentSem = get().profile?.semester ?? 1;

      if (user.isAnonymous) {
        const records = [...get().records];
        const index = records.findIndex(r => r.id === docId);
        const record = {
          id: docId,
          dateTimestamp: midnightTimestamp,
          totalLectures: isHoliday ? 0 : total,
          attendedLectures: isHoliday ? 0 : attended,
          isHoliday,
          type: "daily" as const,
          semester: currentSem
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
        calculateAndSetMetrics(records, settings.cycleStartDay, settings.targetPercentage, currentSem);
        return;
      }

      if (!db) throw new Error("Database not initialized");
      
      const recordRef = doc(db, "users", user.uid, "attendance", docId);
      await setDoc(recordRef, {
        dateTimestamp: midnightTimestamp,
        totalLectures: isHoliday ? 0 : total,
        attendedLectures: isHoliday ? 0 : attended,
        isHoliday,
        type: "daily",
        semester: currentSem
      }, { merge: true });
    },

    logBaseline: async (attended, total) => {
      const { user } = get();
      if (!user) throw new Error("No authenticated user");

      // Validations
      if (attended > total) {
        throw new Error("Attended lectures cannot exceed total lectures");
      }
      if (attended < 0 || total < 0) {
        throw new Error("Lectures cannot be negative");
      }

      const docId = "baseline";
      const midnightTimestamp = getMidnightTimestamp(new Date());
      const currentSem = get().profile?.semester ?? 1;

      if (user.isAnonymous) {
        const records = [...get().records];
        const index = records.findIndex(r => r.id === docId);
        const record = {
          id: docId,
          dateTimestamp: midnightTimestamp,
          totalLectures: total,
          attendedLectures: attended,
          isHoliday: false,
          type: "baseline" as const,
          semester: currentSem
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
        calculateAndSetMetrics(records, settings.cycleStartDay, settings.targetPercentage, currentSem);
        return;
      }

      if (!db) throw new Error("Database not initialized");

      const recordRef = doc(db, "users", user.uid, "attendance", docId);
      await setDoc(recordRef, {
        dateTimestamp: midnightTimestamp,
        totalLectures: total,
        attendedLectures: attended,
        isHoliday: false,
        type: "baseline",
        semester: currentSem
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
        const currentSem = get().profile?.semester ?? 1;
        calculateAndSetMetrics(updatedRecords, settings.cycleStartDay, settings.targetPercentage, currentSem);
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
        const currentSem = get().profile?.semester ?? 1;
        calculateAndSetMetrics(updatedRecords, settings.cycleStartDay, settings.targetPercentage, currentSem);
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
        const currentSem = get().profile?.semester ?? 1;
        calculateAndSetMetrics([], settings.cycleStartDay, settings.targetPercentage, currentSem);
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
      calculateAndSetMetrics([], settings.cycleStartDay, settings.targetPercentage, 1);
    },

    signInWithGoogle: async () => {
      if (!auth) throw new Error("Auth is not configured");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    },

    saveProfile: async (name, semester, department, college_name) => {
      const { user } = get();
      if (!user) throw new Error("No authenticated user");

      const profileData = {
        name,
        email: user.email || "",
        semester,
        department: department || null,
        college_name: college_name || null,
        created_at: Date.now()
      };

      if (user.isAnonymous) {
        const profile = { user_id: user.uid, ...profileData };
        localStorage.setItem("bunkd_guest_profile", JSON.stringify(profile));
        set({ profile });
        const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
        calculateAndSetMetrics(get().records, settings.cycleStartDay, settings.targetPercentage, semester);
        return;
      }

      if (!db) throw new Error("Database not initialized");
      const profileRef = doc(db, "users", user.uid);
      await setDoc(profileRef, profileData, { merge: true });
    },

    updateProfileSemester: async (semester, resetBaseline) => {
      const { user, records } = get();
      if (!user) throw new Error("No authenticated user");

      const oldSemester = get().profile?.semester ?? 1;

      if (user.isAnonymous) {
        const updated = records.map(r => r.semester === undefined ? { ...r, semester: oldSemester } : r);
        localStorage.setItem("bunkd_guest_attendance", JSON.stringify(updated));
        
        const currentProfile = get().profile;
        const newProfile = currentProfile 
          ? { ...currentProfile, semester } 
          : { user_id: user.uid, name: "Guest", email: "", semester, created_at: Date.now() };

        localStorage.setItem("bunkd_guest_profile", JSON.stringify(newProfile));
        set({ profile: newProfile });

        if (resetBaseline) {
          const filtered = updated.filter(r => !(r.type === "baseline" && r.semester === semester));
          localStorage.setItem("bunkd_guest_attendance", JSON.stringify(filtered));
          set({ records: filtered });
          const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
          calculateAndSetMetrics(filtered, settings.cycleStartDay, settings.targetPercentage, semester);
        } else {
          set({ records: updated });
          const settings = get().settings ?? { cycleStartDay: 1, targetPercentage: 75 };
          calculateAndSetMetrics(updated, settings.cycleStartDay, settings.targetPercentage, semester);
        }
        return;
      }

      if (!db) throw new Error("Database not initialized");

      const batch = writeBatch(db);
      const ref = collection(db, "users", user.uid, "attendance");
      const colSnap = await getDocs(ref);

      colSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.semester === undefined) {
          batch.update(docSnap.ref, { semester: oldSemester });
        }
        if (resetBaseline && data.type === "baseline" && data.semester === semester) {
          batch.delete(docSnap.ref);
        }
      });

      const profileRef = doc(db, "users", user.uid);
      batch.update(profileRef, { semester });
      await batch.commit();
    }
  };
});
