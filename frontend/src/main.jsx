import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";
import { registerAlarmServiceWorker } from "./utils/audio";

// Register the Service Worker for background alarm notifications.
// SW notifications use the system ringtone channel — rings even when
// media/music volume is turned all the way down.
registerAlarmServiceWorker();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
