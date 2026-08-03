/**
 * Web Worker for background tracking timer.
 * Prevents OS timer throttling when phone screen is locked or tab is hidden.
 */
let timerId = null;

self.onmessage = function (e) {
  const { action, interval } = e.data || {};

  if (action === "START") {
    if (timerId) clearInterval(timerId);
    const ms = interval || 3000;
    timerId = setInterval(() => {
      self.postMessage({ type: "TICK", timestamp: Date.now() });
    }, ms);
  } else if (action === "STOP") {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
