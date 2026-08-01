import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useGeoTracking } from "../hooks/useGeoTracking";
import AlarmOverlay from "../components/AlarmOverlay";
import AlarmSettingsModal from "../components/AlarmSettingsModal";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { BatteryRiskCard } from "../components/BatteryRiskCard";
import { formatDistance } from "../utils/geo";
import { fetchOsrmRoute } from "../services/routing";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { SlidersIcon, NavigationIcon, ZapIcon, ClockIcon, BellIcon } from "../components/Icons";
import { getSavedSoundPreset, getVibrationEnabled, getAllSoundOptions } from "../utils/audio";

// Neon Leaflet SVG Marker Icons
const busSvgIcon = new L.DivIcon({
  html: `<div style="background:#00F0FF;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px #00F0FF;border:3px solid #050811"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#050811" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M4 12h16"/><rect width="18" height="13" x="3" y="5" rx="3"/><circle cx="6.5" cy="15.5" r="1.5"/><circle cx="17.5" cy="15.5" r="1.5"/></svg></div>`,
  className: "",
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const stopSvgIcon = new L.DivIcon({
  html: `<div style="background:#FFB800;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px #FFB800;border:3px solid #050811"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050811" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function Tracking() {
  const { id } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const { token } = useAuth();
  const [trip, setTrip] = useState(location.state?.trip ?? null);
  const [ended, setEnded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tripHistory, setTripHistory] = useState([]);
  const [roadPolyline, setRoadPolyline] = useState([]);

  const destination = useMemo(
    () => (trip ? { lat: trip.destination.lat, lng: trip.destination.lng } : null),
    [trip]
  );

  useEffect(() => {
    if (token) {
      api.tripHistory(token).then(setTripHistory).catch(() => {});
    }
  }, [token]);

  const {
    position,
    distance,
    stage,
    error,
    acknowledge,
    aiEta,
    adaptiveInfo,
    activeThresholds,
    wakeResponseSec,
    batteryRisk,
    isBatteryCritical,
    triggerEarlyBatteryAlarm,
  } = useGeoTracking(destination, null, tripHistory);

  useEffect(() => {
    if (!trip && token && id) {
      api
        .tripHistory(token)
        .then((trips) => setTrip(trips.find((t) => t.id === id) || null))
        .catch(() => {});
    }
  }, [trip, token, id]);

  useEffect(() => {
    if (stage === "arrived" && trip && token && !ended) {
      setEnded(true);
      api.endTrip(token, trip.id, wakeResponseSec).catch(() => {});
    }
  }, [stage, trip, token, ended, wakeResponseSec]);

  useEffect(() => {
    if (position && destination) {
      fetchOsrmRoute(
        position.latitude,
        position.longitude,
        destination.lat,
        destination.lng
      ).then((res) => {
        if (res && res.coordinates.length > 0) {
          setRoadPolyline(res.coordinates);
        } else {
          setRoadPolyline([
            [position.latitude, position.longitude],
            [destination.lat, destination.lng],
          ]);
        }
      });
    }
  }, [position?.latitude, position?.longitude, destination?.lat, destination?.lng]);

  if (!trip) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <ThunderNeonCanvas />
        <div className="glass-panel rounded-2xl p-6 text-center text-neon-cyan font-display text-sm">
          Loading active trip…
        </div>
      </div>
    );
  }

  const stageBadge = {
    idle:     { label: "Tracking Live",    classes: "border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" },
    notify:   { label: `~${Math.round((activeThresholds?.notifyM || 2000)/1000)} km — Nearing`, classes: "border-neon-purple/40 bg-neon-purple/20 text-neon-purple" },
    alarm:    { label: "Wake Up!", classes: "border-neon-gold bg-neon-gold text-night-950 font-bold shadow-[0_0_20px_rgba(255,184,0,0.5)]" },
    critical: { label: "CRITICAL", classes: "border-alert-500 bg-alert-500 text-white font-black alarm-shake shadow-[0_0_25px_rgba(255,46,85,0.6)]" },
    arrived:  { label: "Arrived ✓", classes: "border-neon-emerald bg-neon-emerald text-night-950 font-bold" },
    stopped:  { label: "Snoozed",   classes: "border-night-700 bg-night-800 text-night-500" },
  };
  const badge = stageBadge[stage] || stageBadge.idle;

  const currentSoundObj = getAllSoundOptions().find((s) => s.id === getSavedSoundPreset());
  const vibrateActive = getVibrationEnabled();

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-3 sm:px-4 py-4 sm:py-6">
      <ThunderNeonCanvas isCritical={stage === "critical"} />

      <AlarmOverlay
        stage={stage}
        distance={distance}
        destinationName={trip.destination.name}
        onAcknowledge={acknowledge}
        isBatteryCritical={isBatteryCritical}
        batteryRecommendation={batteryRisk?.recommendation}
      />

      <AlarmSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="relative z-10 mx-auto max-w-4xl space-y-3 sm:space-y-4">

        {/* ── Header Bar ── */}
        <div className="glass-panel-gold rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Destination name */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                Live Destination
              </p>
              <h1 className="mt-0.5 font-display text-xl sm:text-3xl font-extrabold text-white truncate">
                {trip.destination.name}
              </h1>
            </div>
            {/* Badge — always visible */}
            <span className={`shrink-0 self-center rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${badge.classes}`}>
              {badge.label}
            </span>
          </div>

          {/* Prominent Stop Alarm Button when alarm/chime is active */}
          {(stage === "notify" || stage === "alarm" || stage === "critical" || stage === "arrived") && (
            <button
              onClick={acknowledge}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-alert-500 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-[0_0_25px_rgba(255,46,85,0.6)] alarm-shake active:scale-95 transition-all hover:bg-alert-600 cursor-pointer"
            >
              <BellIcon size={20} />
              <span>🛑 STOP ALARM &amp; MUTE SOUND</span>
            </button>
          )}

          {/* Settings button — full-width on mobile */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="mt-3 flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2.5 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all sm:inline-flex sm:w-auto"
          >
            <SlidersIcon size={15} />
            Alarm Sound &amp; Vibrate
          </button>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="rounded-xl border border-alert-500/50 bg-alert-600/20 px-4 py-3 text-xs text-alert-500 font-semibold">
            {error} — Location permission required for GPS tracking.
          </div>
        )}

        {/* ── AI Adaptive Profile Banner ── */}
        <div className="glass-panel-gold rounded-2xl p-3.5 sm:p-4 border-neon-purple/40 bg-night-900/90 shadow-[0_0_20px_rgba(176,38,255,0.15)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-purple/20 text-neon-purple shadow-[0_0_15px_rgba(176,38,255,0.4)]">
                <ZapIcon size={18} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neon-purple">
                    AI Profile:
                  </span>
                  <span className="rounded-md bg-neon-purple/20 px-2 py-0.5 text-xs font-bold text-white">
                    {adaptiveInfo.profile}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-night-400 leading-snug line-clamp-2 sm:line-clamp-none">
                  {adaptiveInfo.explanation}
                </p>
              </div>
            </div>
            {/* Threshold badges */}
            <div className="flex items-center gap-1.5 text-xs font-mono ml-12 sm:ml-0">
              <span className="rounded-lg bg-night-950 px-2 py-1 border border-neon-gold/50 text-neon-gold">
                {(activeThresholds.alarmM / 1000).toFixed(1)} km
              </span>
              <span className="rounded-lg bg-night-950 px-2 py-1 border border-alert-500/50 text-alert-500">
                {activeThresholds.criticalM} m
              </span>
            </div>
          </div>
        </div>

        {/* ── Battery Risk Card ── */}
        <BatteryRiskCard
          etaMinutes={aiEta?.dynamicEtaMin || 60}
          onSimulateEarlyAlarm={triggerEarlyBatteryAlarm}
        />

        {/* ── Metrics Grid: 1-col on mobile, 3-col on sm+ ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Distance */}
          <div className="glass-panel rounded-2xl p-4 border-neon-cyan/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-night-500 flex items-center gap-1.5">
              <NavigationIcon size={13} className="text-neon-cyan" />
              Distance
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-neon-cyan neon-text-cyan">
              {distance !== null ? formatDistance(distance) : "Acquiring…"}
            </p>
          </div>

          {/* ETA */}
          <div className="glass-panel rounded-2xl p-4 border-neon-gold/30">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-night-500 flex items-center gap-1.5">
                <ClockIcon size={13} className="text-neon-gold" />
                AI ETA
              </p>
              <span className={`text-[10px] font-bold ${aiEta.trafficColor}`}>
                {aiEta.confidence}
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-extrabold text-neon-gold neon-text-gold">
              {distance !== null ? `${aiEta.dynamicEtaMin} min` : "—"}
            </p>
            <p className={`mt-1 text-[11px] font-medium truncate ${aiEta.trafficColor}`}>
              {aiEta.trafficStatus}
            </p>
          </div>

          {/* Speed & Sound */}
          <div className="glass-panel rounded-2xl p-4 border-neon-purple/30">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-night-500 flex items-center gap-1.5">
                <ZapIcon size={13} className="text-neon-purple" />
                Telemetry
              </p>
              <span className="text-[11px] font-mono text-neon-cyan font-bold">
                {aiEta.speedKmh} km/h
              </span>
            </div>
            <p className="mt-2 font-display text-sm font-bold text-white flex flex-wrap items-center gap-2">
              <span className="truncate max-w-[120px]">{currentSoundObj?.name || "Cyber Siren"}</span>
              {vibrateActive ? (
                <span className="flex items-center gap-1 rounded-md bg-neon-cyan/20 px-2 py-0.5 text-xs text-neon-cyan whitespace-nowrap">
                  Vibrate ON
                </span>
              ) : (
                <span className="rounded-md bg-night-800 px-2 py-0.5 text-xs text-night-500 whitespace-nowrap">
                  Vibrate OFF
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Map — taller on mobile, fixed height on desktop ── */}
        <div className="h-[55vw] min-h-[260px] max-h-[420px] sm:h-[420px] overflow-hidden rounded-3xl border border-neon-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
          <MapContainer
            center={[trip.destination.lat, trip.destination.lng]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker position={[trip.destination.lat, trip.destination.lng]} icon={stopSvgIcon}>
              <Popup>{trip.destination.name}</Popup>
            </Marker>

            {position && (
              <>
                <Marker position={[position.latitude, position.longitude]} icon={busSvgIcon}>
                  <Popup>Your Live GPS Position</Popup>
                </Marker>

                {roadPolyline.length > 0 && (
                  <Polyline
                    positions={roadPolyline}
                    pathOptions={{
                      color: "#00F0FF",
                      weight: 5,
                      opacity: 0.9,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                )}

                <Recenter lat={position.latitude} lng={position.longitude} />
              </>
            )}
          </MapContainer>
        </div>

        <p className="text-center text-xs text-night-600 px-2 leading-relaxed">
          Keep this screen visible — audio &amp; vibration trigger as you approach your stop.
        </p>

        <button
          onClick={() => nav("/select-destination")}
          className="w-full rounded-2xl border border-night-700 bg-night-900/60 py-4 font-display text-sm font-semibold text-night-500 hover:border-neon-cyan hover:text-white transition-all"
        >
          Change Destination / New Trip
        </button>
      </div>
    </div>
  );
}
