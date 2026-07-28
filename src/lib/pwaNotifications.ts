// File: src/lib/pwaNotifications.ts

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export interface AttendanceNotificationContext {
  percentage: number;
  target: number;
  safeBunks: number;
  neededLectures: number;
}

export async function sendAttendancePushNotification(ctx: AttendanceNotificationContext) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  let title = "Bunkd Attendance Alert";
  let body = "";
  let tag = "attendance-alert";

  if (ctx.percentage >= ctx.target && ctx.safeBunks > 0) {
    title = "🟢 Safe to Bunk Today";
    body = `You have ${ctx.safeBunks} safe skip${ctx.safeBunks > 1 ? "s" : ""} remaining at ${ctx.percentage}%.`;
    tag = "safe-bunk";
  } else if (ctx.percentage >= ctx.target && ctx.safeBunks === 0) {
    title = "⚠️ Buffer Threshold Warning";
    body = `You're at ${ctx.percentage}%. One more bunk will drop you below your ${ctx.target}% target!`;
    tag = "warning-bunk";
  } else if (ctx.percentage < ctx.target && ctx.neededLectures > 0) {
    title = "📉 Below Attendance Target";
    body = `You're currently at ${ctx.percentage}%. Attend the next ${ctx.neededLectures} classes to recover to ${ctx.target}%.`;
    tag = "below-target";
  } else {
    title = "📅 Attendance Digest";
    body = `Your attendance is ${ctx.percentage}%. Don't forget to log today's classes!`;
    tag = "daily-digest";
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      await registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag,
        data: { url: "/" }
      });
    } else {
      new Notification(title, { body, icon: "/favicon.ico", tag });
    }
  } catch (err) {
    console.error("Failed to display notification:", err);
  }
}
