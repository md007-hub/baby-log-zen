import { Capacitor } from "@capacitor/core";

const REMINDER_ID = 2401;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * On each app launch: ask for notification permission if needed, cancel any pending
 * inactivity reminder and schedule a fresh one 24h out. Native only; no-op on web.
 */
export async function rescheduleInactivityReminder(): Promise<void> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_ID,
          title: "We miss you!",
          body: "You haven't logged your data recently. Take a moment to update your logs.",
          schedule: { at: new Date(Date.now() + DAY_MS), allowWhileIdle: true },
        },
      ],
    });
  } catch (e) {
    console.warn("Inactivity reminder failed", e);
  }
}
