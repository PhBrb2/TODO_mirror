import { REMINDER_HOUR } from "./game-constants.js";
import { ICONS } from "./game-icons.js";

const REMINDER_NOTIFICATION_ID = 1;

function capacitor() {
  return typeof window !== "undefined" ? window.Capacitor : undefined;
}

function isNative() {
  const cap = capacitor();
  try {
    return Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
  } catch {
    return false;
  }
}

async function loadHaptics() {
  if (!isNative()) return null;
  try {
    return (await import("@capacitor/haptics")).Haptics;
  } catch {
    return null;
  }
}

async function loadNotifications() {
  if (!isNative()) return null;
  try {
    return (await import("@capacitor/local-notifications")).LocalNotifications;
  } catch {
    return null;
  }
}

async function hapticImpact(style = "Medium") {
  const haptics = await loadHaptics();
  if (!haptics) return;
  try {
    await haptics.impact({ style });
  } catch {}
}

async function hapticNotification(type = "Success") {
  const haptics = await loadHaptics();
  if (!haptics) return;
  try {
    await haptics.notification({ type });
  } catch {}
}

function nextOccurrence(hour) {
  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return at;
}

async function syncDailyReminder({ streak = 0, dailyCompleted = 0, dailyGoal = 0 } = {}) {
  const notifications = await loadNotifications();
  if (!notifications) return;
  try {
    const current = await notifications.checkPermissions();
    if (current?.display !== "granted") {
      const requested = await notifications.requestPermissions();
      if (requested?.display !== "granted") return;
    }
    await notifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });
    const goalText = dailyGoal > 0
      ? `Today: ${Math.min(dailyCompleted, dailyGoal)}/${dailyGoal} tasks done`
      : "Keep the momentum going";
    const title = streak > 0
      ? `${ICONS.fire} ${streak}-day streak ${ICONS.emDash} don't break it!`
      : "Time to plan your tasks";
    await notifications.schedule({
      notifications: [
        {
          id: REMINDER_NOTIFICATION_ID,
          title,
          body: goalText,
          schedule: { at: nextOccurrence(REMINDER_HOUR), repeats: true, every: "day" },
        },
      ],
    });
  } catch {}
}

// Writes a backup file via the native plugin (Downloads folder on Android).
// Returns the file path, or null when not on native / plugin missing.
async function exportBackupFile(json, filename) {
  if (!isNative()) return null;
  try {
    const plugin = window.Capacitor?.Plugins?.TodoAssistant;
    if (!plugin || typeof plugin.exportBackup !== "function") return null;
    const res = await plugin.exportBackup({ json, filename });
    return res?.path || null;
  } catch {
    return null;
  }
}

export { exportBackupFile, hapticImpact, hapticNotification, isNative, syncDailyReminder };
