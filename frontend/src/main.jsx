import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";
import { registerAlarmServiceWorker } from "./utils/audio";
import { registerSW } from "virtual:pwa-register";

// Register Service Worker in production for offline PWA caching
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("WakeStop PWA update available.");
    },
    onOfflineReady() {
      console.log("WakeStop PWA is ready for offline operation.");
    },
  });
} else {
  // Register alarm service worker for notification channel triggers
  registerAlarmServiceWorker();
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
