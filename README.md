# WakeStop 🚌

> Never miss your bus stop again. Smart GPS wake alarms for long-distance commuters & group travelers.

🌐 **Live Web App**: [https://wakestop.vercel.app](https://wakestop.vercel.app)  
📱 **Android APK Download**: [Download Latest Android APK](https://github.com/hemmanth-18/wakestop/actions)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=flat-square)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor&logoColor=white&style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white&style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white&style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white&style=flat-square)

## 📲 How to Install `app-debug.apk` on Android Mobile

1. **Download the APK File**:
   - Download **`app-debug.apk`** from [GitHub Actions Builds](https://github.com/hemmanth-18/wakestop/actions) or transfer `app-debug.apk` to your phone via WhatsApp / Google Drive / USB.
2. **Open the File on Your Phone**:
   - Open your phone's **Downloads** or **Files** app and tap **`app-debug.apk`**.
3. **Allow Installation**:
   - If Android prompts *"For your security, your phone is not allowed to install unknown apps from this source"*:
     - Tap **Settings**.
     - Toggle **Allow from this source** to **ON**.
4. **Complete Setup**:
   - Tap **Install** and open **WakeStop**!
   - Tap **Allow** when prompted for Location & Notification permissions.

> 🚨 **Emergency Alarm Channel**: The native `.apk` includes `STREAM_ALARM` + `USAGE_ALARM` hardware override — alarms ring at 100% max volume out of the built-in speaker even if your phone's media volume is muted!

## Project Structure

- **backend/** — Node.js + Express REST API, JWT auth, Supabase (PostgreSQL) storage
- **frontend/** — React + Vite + TailwindCSS v4 + Leaflet/OpenStreetMap

## What's implemented

- Register / login (JWT, bcrypt-hashed passwords)
- Search & select a destination stop (seeded with a Coimbatore → Chennai corridor)
- Live GPS tracking with a Leaflet map showing your position, the stop, and the route line
- **Smart wake alarm**: 2 km → notification, 1 km → alarm + vibration, 500 m → continuous
  alarm every 30s until you tap "I've woken up", auto-stops on arrival
- Browser Notifications API + Vibration API + Web Audio API tone (no audio files needed)
- Trip history (active/completed trips per user)
- Dark, night-travel-friendly UI throughout

## What's intentionally out of scope for this MVP (see project doc for full roadmap)

- Real TNSTC/SETC live bus-fleet data (there's no public API for this — the MVP tracks the
  *rider's own device* GPS against the chosen stop, which fully solves the "I fell asleep"
  problem without needing operator data)
- Offline map tiles
- Native mobile app (Expo) — the web app works fine on mobile browsers in the meantime
- Voice assistant, SOS, live trip sharing — listed as future features in the project doc

## Running it locally

### 1. Backend

```bash
cd backend
npm install
npm start          # http://localhost:4000
```

No database setup needed — it seeds a `data/*.json` file store on first run.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # points at http://localhost:4000/api by default
npm run dev                # http://localhost:5173
```

Open the printed URL on your **phone's browser** (same Wi-Fi network, use your computer's LAN
IP instead of localhost) to test real GPS movement — desktop geolocation is far less accurate.

### 3. Try it

1. Register an account.
2. Pick a stop (try "Salem" or "Chennai" — seeded demo stops along a real TNSTC corridor).
3. Allow location + notification permissions when prompted.
4. Watch the distance counter — or spoof your location in DevTools (Sensors panel) to trigger
   the alarm stages without actually traveling.

## Moving from MVP to production

- Swap `backend/data/db.js` for Mongoose models against MongoDB Atlas — every route already
  calls through this one file, so it's a contained change.
- Replace the haversine straight-line distance in `frontend/src/utils/geo.ts` and
  `backend/routes/stops.js` with OSRM route-distance for accuracy on winding roads.
- Add a `Foreground Service` (Android) via Capacitor/Expo for background tracking; iOS will
  need "Always" location permission and can't override silent mode — see the note in the
  original project doc.
- Build out a real TNSTC/SETC stop + route database (the seed data here is illustrative only).
