import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useGeoTracking } from "../hooks/useGeoTracking";
import AlarmOverlay from "../components/AlarmOverlay";
import AlarmSettingsModal from "../components/AlarmSettingsModal";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { formatDistance, estimateEtaMinutes } from "../utils/geo";
import { fetchOsrmRoute } from "../services/routing";
import { api, type Trip } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { SlidersIcon, NavigationIcon, ZapIcon, Volume2Icon, ClockIcon } from "../components/Icons";
import { getSavedSoundPreset, getVibrationEnabled, SOUND_OPTIONS } from "../utils/audio";

// Neon Leaflet SVG Marker Icons (No Emojis)
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

function Recenter({ lat, lng }: { lat: number; lng: number }) {
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
  const [trip, setTrip] = useState<Trip | null>((location.state as any)?.trip ?? null);
  const [ended, setEnded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // OSRM Road Route Geometry
  const [roadPolyline, setRoadPolyline] = useState<[number, number][]>([]);

  const destination = useMemo(
    () => (trip ? { lat: trip.destination.lat, lng: trip.destination.lng } : null),
    [trip]
  );

  const { position, distance, stage, error, acknowledge } = useGeoTracking(destination);

  useEffect(() => {
    if (!trip && token && id) {
      api
        .tripHistory(token)
        .then((trips) => setTrip(trips.find((t) => t.id === id) || null))
        .catch(() => { });
    }
  }, [trip, token, id]);

  useEffect(() => {
    if (stage === "arrived" && trip && token && !ended) {
      setEnded(true);
      api.endTrip(token, trip.id).catch(() => { });
    }
  }, [stage, trip, token, ended]);

  // Fetch real OSRM road geometry when GPS position updates
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
          // Fallback straight line
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
      <div className="relative min-h-screen flex items-center justify-center">
        <ThunderNeonCanvas />
        <div className="glass-panel rounded-2xl p-6 text-center text-neon-cyan font-display">
          Loading active trip geometry…
        </div>
      </div>
    );
  }

  const stageBadge: Record<string, { label: string; classes: string }> = {
    idle: { label: "Tracking Live", classes: "border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" },
    notify: { label: "2 km — Approaching", classes: "border-neon-purple/40 bg-neon-purple/20 text-neon-purple shadow-[0_0_15px_rgba(176,38,255,0.3)]" },
    alarm: { label: "1 km — Wake Up", classes: "border-neon-gold bg-neon-gold text-night-950 font-bold shadow-[0_0_20px_rgba(255,184,0,0.5)]" },
    critical: { label: "500 m — CRITICAL", classes: "border-alert-500 bg-alert-500 text-white font-black alarm-shake shadow-[0_0_25px_rgba(255,46,85,0.6)]" },
    arrived: { label: "Arrived", classes: "border-neon-emerald bg-neon-emerald text-night-950 font-bold" },
    stopped: { label: "Snoozed", classes: "border-night-700 bg-night-800 text-night-500" },
  };
  const badge = stageBadge[stage] || stageBadge.idle;

  const currentSoundObj = SOUND_OPTIONS.find((s) => s.id === getSavedSoundPreset());
  const vibrateActive = getVibrationEnabled();

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-6">
      <ThunderNeonCanvas isCritical={stage === "critical"} />

      <AlarmOverlay
        stage={stage}
        distance={distance}
        destinationName={trip.destination.name}
        onAcknowledge={acknowledge}
      />

      <AlarmSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="relative z-10 mx-auto max-w-4xl space-y-4">
        {/* Header Bar */}
        <div className="glass-panel-gold flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neon-cyan">
              Live Destination Target
            </p>
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              {trip.destination.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-2 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all"
            >
              <SlidersIcon size={16} />
              Alarm Sound & Vibrate
            </button>
            <span
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${badge.classes}`}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-alert-500/50 bg-alert-600/20 px-4 py-3 text-xs text-alert-500 font-semibold shadow-[0_0_15px_rgba(255,46,85,0.2)]">
            {error}. Location permission is required for live GPS tracking.
          </div>
        )}

        {/* Meters Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-panel rounded-2xl p-4 border-neon-cyan/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-night-500 flex items-center gap-1.5">
              <NavigationIcon size={14} className="text-neon-cyan" /> Distance Remaining
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-neon-cyan neon-text-cyan">
              {distance !== null ? formatDistance(distance) : "Acquiring GPS…"}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-4 border-neon-gold/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-night-500 flex items-center gap-1.5">
              <ClockIcon size={14} className="text-neon-gold" /> Estimated Time
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-neon-gold neon-text-gold">
              {distance !== null ? `${estimateEtaMinutes(distance)} min` : "—"}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-4 border-neon-purple/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-night-500 flex items-center gap-1.5">
              <Volume2Icon size={14} className="text-neon-purple" /> Active Ringtone & Vibrate
            </p>
            <p className="mt-2 font-display text-sm font-bold text-white flex items-center gap-2">
              <span>{currentSoundObj?.name || "Cyber Siren"}</span>
              {vibrateActive ? (
                <span className="flex items-center gap-1 rounded-md bg-neon-cyan/20 px-2 py-0.5 text-xs text-neon-cyan">
                  <ZapIcon size={12} /> Vibrate ON
                </span>
              ) : (
                <span className="rounded-md bg-night-800 px-2 py-0.5 text-xs text-night-500">
                  Vibrate OFF
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-[420px] overflow-hidden rounded-3xl border border-neon-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
          <MapContainer
            center={[trip.destination.lat, trip.destination.lng]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <Marker position={[trip.destination.lat, trip.destination.lng]} icon={stopSvgIcon}>
              <Popup>{trip.destination.name}</Popup>
            </Marker>

            {position && (
              <>
                <Marker position={[position.latitude, position.longitude]} icon={busSvgIcon}>
                  <Popup>Your Live GPS Position</Popup>
                </Marker>

                {/* OSRM Real Road Polyline */}
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

        <p className="text-center text-xs text-night-500">
          Screen Wake Lock enabled. Keep this screen visible — audio ringtones & vibrations will trigger as you approach your destination.
        </p>

        <button
          onClick={() => nav("/select-destination")}
          className="w-full rounded-2xl border border-night-700 bg-night-900/60 py-3.5 font-display text-sm font-semibold text-night-500 hover:border-neon-cyan hover:text-white transition-all"
        >
          Change Destination or Start New Trip
        </button>
      </div>
    </div>
  );
}
