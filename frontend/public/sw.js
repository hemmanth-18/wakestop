/**
 * WakeStop Service Worker
 * Handles background alarm notifications that bypass media volume
 * and ring through the system ringtone/alarm channel.
 */

const CACHE_NAME = "wakestop-sw-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Listen for alarm trigger messages from the main app thread.
 * When triggered, we fire a Notification which uses the
 * SYSTEM RINGTONE CHANNEL — bypassing media/music volume.
 */
self.addEventListener("message", (event) => {
  if (!event.data) return;

  const { type, title, body, stage } = event.data;

  if (type === "TRIGGER_ALARM_NOTIFICATION") {
    const isCritical = stage === "critical";

    // Vibration pattern: aggressive for critical, steady for alarm
    const vibratePattern = isCritical
      ? [500, 100, 500, 100, 500, 100, 800]
      : [400, 200, 400, 200, 400];

    event.waitUntil(
      self.registration.showNotification(title || "⏰ WakeStop Alarm!", {
        body: body || "Your stop is approaching! Wake up now.",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: "wakestop-alarm",          // replaces previous notification (no spam)
        renotify: true,                  // re-rings even if same tag
        requireInteraction: true,        // stays until user taps (critical for alarms)
        silent: false,                   // ensures system sound plays
        vibrate: vibratePattern,
        actions: [
          { action: "acknowledge", title: "✅ I'm Awake" },
          { action: "snooze", title: "⏳ 2 Min Snooze" },
        ],
        data: { stage, timestamp: Date.now() },
      })
    );
  }

  if (type === "DISMISS_ALARM_NOTIFICATION") {
    event.waitUntil(
      self.registration.getNotifications({ tag: "wakestop-alarm" }).then((notifications) => {
        notifications.forEach((n) => n.close());
      })
    );
  }
});

/**
 * Handle notification action button clicks (Acknowledge / Snooze)
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Tell the app to acknowledge or snooze
      for (const client of clientList) {
        if (action === "acknowledge") {
          client.postMessage({ type: "ALARM_ACKNOWLEDGED" });
        } else if (action === "snooze") {
          client.postMessage({ type: "ALARM_SNOOZED", snoozeMs: 120000 });
        } else {
          // Tapped the notification body — focus the app
          client.focus();
        }
      }

      // If app is not open, open it
      if (clientList.length === 0) {
        return self.clients.openWindow("/");
      }
    })
  );
});
