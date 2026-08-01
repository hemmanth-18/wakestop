/**
 * WakeStop Service Worker
 *
 * KEY BEHAVIOUR:
 * The app sends TRIGGER_ALARM_NOTIFICATION every 3 seconds while an alarm is active.
 * Each call invokes showNotification() which plays the system notification sound
 * through the NOTIFICATION VOLUME channel — NOT the media/music channel.
 * This means the alarm rings even when media volume is 0 (phone volume buttons down).
 *
 * `tag: "wakestop-alarm"` + `renotify: true` ensures:
 *   - Only ONE notification is visible at a time (no spam in tray)
 *   - But the sound + vibration fires again on every update
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Message handler (from main app thread) ──────────────────────────────────

self.addEventListener("message", (event) => {
  if (!event.data) return;

  const { type, title, body, stage } = event.data;

  // ── TRIGGER_ALARM_NOTIFICATION ──────────────────────────────────────────────
  // Called by the app every 3 seconds while alarm is active.
  // showNotification() routes audio through the NOTIFICATION VOLUME channel.
  if (type === "TRIGGER_ALARM_NOTIFICATION") {
    const isCritical = stage === "critical";

    // Aggressive vibration pattern for critical stage
    const vibratePattern = isCritical
      ? [600, 100, 600, 100, 600, 100, 900]
      : [400, 150, 400, 150, 400];

    event.waitUntil(
      self.registration.showNotification(title || "⏰ WakeStop Alarm!", {
        body: body || "Your stop is approaching! Wake up now.",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        /*
         * CRITICAL settings for alarm-like behaviour:
         *
         * tag: same tag every time so only one notification shows
         * renotify: true → re-plays the notification sound on EVERY update
         *                   even when tag is the same. This is what makes
         *                   it keep ringing every 3 seconds.
         * requireInteraction: true → notification stays visible until user
         *                            taps it (doesn't auto-dismiss)
         * silent: false → explicitly enable sound (don't suppress)
         */
        tag: "wakestop-alarm",
        renotify: true,
        requireInteraction: true,
        silent: false,
        vibrate: vibratePattern,
        actions: [
          { action: "acknowledge", title: "✅ I'm Awake" },
          { action: "snooze",      title: "⏳ 2 Min Snooze" },
        ],
        data: { stage, timestamp: Date.now() },
      })
    );
  }

  // ── DISMISS_ALARM_NOTIFICATION ──────────────────────────────────────────────
  // Called by the app when the user acknowledges or the alarm stops.
  if (type === "DISMISS_ALARM_NOTIFICATION") {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: "wakestop-alarm" })
        .then((list) => list.forEach((n) => n.close()))
    );
  }
});

// ─── Notification action clicks ───────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { action } = event;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Tell the app to handle the action
        for (const client of clients) {
          if (action === "acknowledge") {
            client.postMessage({ type: "ALARM_ACKNOWLEDGED" });
          } else if (action === "snooze") {
            client.postMessage({ type: "ALARM_SNOOZED", snoozeMs: 120000 });
          } else {
            // Tapped notification body → bring app to foreground
            if ("focus" in client) client.focus();
          }
        }

        // App is closed → open it
        if (clients.length === 0) {
          return self.clients.openWindow("/");
        }
      })
  );
});
