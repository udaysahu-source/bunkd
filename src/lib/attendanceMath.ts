// File: src/lib/attendanceMath.ts

export interface AttendanceRecord {
  id?: string;
  dateTimestamp: number; // Unix millisecond timestamp at midnight of the logged date
  totalLectures: number;
  attendedLectures: number;
  isHoliday: boolean;
  type?: "baseline" | "daily";
  semester?: number;
}

export interface AttendanceMetrics {
  attended: number;
  total: number;
  percentage: number;
  safeBunks: number;
  neededLectures: number;
}

/**
 * Calculates current attendance percentage.
 * If total lectures is 0, returns 0.0.
 */
export function calculatePercentage(attended: number, total: number): number {
  if (total === 0) {
    return 0.0;
  }
  const percentage = (attended / total) * 100;
  return Math.round(percentage * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculates the number of lectures that can be safely bunked.
 * S = floor((100 * A - P * T) / P)
 */
export function calculateSafeBunks(attended: number, total: number, targetPercentage: number): number {
  if (total === 0) {
    return 0;
  }
  const safeBunks = Math.floor((100 * attended - targetPercentage * total) / targetPercentage);
  return safeBunks < 0 ? 0 : safeBunks;
}

/**
 * Calculates the number of consecutive lectures needed to reach target percentage.
 * If target is 100% and current attended < total, returns -1 (impossible state).
 * N = ceil((P * T - 100 * A) / (100 - P))
 */
export function calculateNeededLectures(attended: number, total: number, targetPercentage: number): number {
  if (targetPercentage === 100) {
    return attended < total ? -1 : 0;
  }
  const numerator = targetPercentage * total - 100 * attended;
  const denominator = 100 - targetPercentage;
  const needed = Math.ceil(numerator / denominator);
  return needed < 0 ? 0 : needed;
}

/**
 * Calculates boundaries for the current cycle.
 * If current day of month is >= cycleStartDay:
 *   Start: cycleStartDay of current month
 *   End: cycleStartDay - 1 of next month
 * If current day of month is < cycleStartDay:
 *   Start: cycleStartDay of previous month
 *   End: cycleStartDay - 1 of current month
 */
export function getCycleBoundaries(cycleStartDay: number, referenceDate: Date = new Date()): { startTimestamp: number; endTimestamp: number } {
  // Normalize cycleStartDay between 1 and 28
  const startDay = Math.min(Math.max(1, Math.round(cycleStartDay)), 28);
  
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const date = referenceDate.getDate();

  let startYear = year;
  let startMonth = month;
  let endYear = year;
  let endMonth = month;

  if (date >= startDay) {
    // Current cycle started in the current month
    endMonth = month + 1;
    if (endMonth > 11) {
      endMonth = 0;
      endYear = year + 1;
    }
  } else {
    // Current cycle started in the previous month
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  // start date is cycleStartDay of start month, at 00:00:00.000
  const startDate = new Date(startYear, startMonth, startDay, 0, 0, 0, 0);
  
  // end date is cycleStartDay - 1 of end month, at 23:59:59.999
  const endDate = new Date(endYear, endMonth, startDay - 1, 23, 59, 59, 999);

  return {
    startTimestamp: startDate.getTime(),
    endTimestamp: endDate.getTime(),
  };
}

/**
 * Aggregates attendance records and computes metrics.
 * Strictly ignores records with isHoliday === true.
 */
export function calculateMetrics(records: AttendanceRecord[], targetPercentage: number): AttendanceMetrics {
  const activeRecords = records.filter(r => !r.isHoliday);
  
  let attended = 0;
  let total = 0;

  for (const record of activeRecords) {
    attended += record.attendedLectures;
    total += record.totalLectures;
  }

  return {
    attended,
    total,
    percentage: calculatePercentage(attended, total),
    safeBunks: calculateSafeBunks(attended, total, targetPercentage),
    neededLectures: calculateNeededLectures(attended, total, targetPercentage),
  };
}

/**
 * Calculates the user's historical average total lectures for a specific day of the week.
 * Looks back at the past 21 days first, falling back to all history or defaults.
 */
export function getHistoricalAverageLectures(records: AttendanceRecord[], date: Date): number {
  const dayOfWeek = date.getDay();
  const threeWeeksAgo = Date.now() - 21 * 24 * 60 * 60 * 1000;
  
  // 1. Filter non-holiday logged entries for the same day of the week in the past 21 days
  const matchingRecords = records.filter(r => {
    if (r.isHoliday || r.totalLectures === 0) return false;
    const rDate = new Date(r.dateTimestamp);
    return rDate.getDay() === dayOfWeek && r.dateTimestamp >= threeWeeksAgo;
  });
  
  if (matchingRecords.length > 0) {
    const sum = matchingRecords.reduce((acc, r) => acc + r.totalLectures, 0);
    return Math.round(sum / matchingRecords.length);
  }
  
  // 2. Fallback: search all records for that day of the week regardless of 21 days limit
  const allMatching = records.filter(r => {
    if (r.isHoliday || r.totalLectures === 0) return false;
    return new Date(r.dateTimestamp).getDay() === dayOfWeek;
  });
  
  if (allMatching.length > 0) {
    const sum = allMatching.reduce((acc, r) => acc + r.totalLectures, 0);
    return Math.round(sum / allMatching.length);
  }
  
  // 3. Fallback: overall average total lectures for any non-holiday logged day
  const activeRecords = records.filter(r => !r.isHoliday && r.totalLectures > 0);
  if (activeRecords.length > 0) {
    const sum = activeRecords.reduce((acc, r) => acc + r.totalLectures, 0);
    return Math.round(sum / activeRecords.length);
  }
  
  return 4; // Absolute default
}

/**
 * Computes the user's average number of lectures per daily schedule.
 * Based on non-holiday historical records, falling back to 4.
 */
export function getAverageDailyLectures(records: AttendanceRecord[]): number {
  const activeDays = records.filter(r => !r.isHoliday && r.totalLectures > 0);
  if (activeDays.length === 0) return 4; // fallback default
  const sum = activeDays.reduce((acc, r) => acc + r.totalLectures, 0);
  return Math.max(1, Math.round(sum / activeDays.length));
}

