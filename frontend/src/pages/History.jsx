import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { HistoryIcon, NavigationIcon, MapPinIcon, CheckIcon, ZapIcon } from "../components/Icons";

export default function History() {
  const { token } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .tripHistory(token)
      .then(setTrips)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-3 sm:px-4 py-6 sm:py-8">
      <ThunderNeonCanvas />

      <div className="relative z-10 mx-auto max-w-xl">
        <div className="glass-panel-gold rounded-3xl p-5 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-night-700 pb-4 sm:pb-5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-neon-gold/20 text-neon-gold shadow-[0_0_15px_rgba(255,184,0,0.3)]">
              <HistoryIcon size={22} />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">Trip History</h1>
              <p className="mt-0.5 text-xs text-night-500">Every journey WakeStop has watched over.</p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <p className="mt-8 text-center text-xs text-neon-cyan font-mono animate-pulse">
              Loading trip history…
            </p>
          )}

          {/* Empty state */}
          {!loading && trips.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-night-700 p-8 text-center bg-night-950/60">
              <HistoryIcon size={32} className="mx-auto mb-3 text-night-600" />
              <p className="text-sm text-night-500">No journeys recorded yet.</p>
              <Link
                to="/select-destination"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-neon-gold px-5 py-3 font-display text-xs font-bold text-night-950 shadow-[0_0_15px_rgba(255,184,0,0.3)]"
              >
                <NavigationIcon size={14} /> Start Your First Trip
              </Link>
            </div>
          )}

          {/* Trip list */}
          <ul className="mt-5 space-y-3">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="rounded-2xl border border-night-700 bg-night-900/80 p-4 transition-all hover:border-neon-cyan/40"
              >
                {/* Top row: name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPinIcon size={16} className="shrink-0 text-neon-cyan" />
                    <p className="font-display font-bold text-white text-sm sm:text-base truncate">
                      {trip.destination.name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      trip.status === "completed"
                        ? "bg-neon-emerald/20 text-neon-emerald border border-neon-emerald/30"
                        : "bg-neon-gold/20 text-neon-gold border border-neon-gold/30"
                    }`}
                  >
                    {trip.status === "completed" ? (
                      <><CheckIcon size={11} /> Done</>
                    ) : (
                      <><ZapIcon size={11} /> Active</>
                    )}
                  </span>
                </div>

                {/* Timestamp */}
                <p className="mt-2 font-mono text-xs text-night-500 leading-relaxed">
                  {new Date(trip.startTime).toLocaleString()}
                  {trip.endTime && (
                    <span className="block sm:inline">
                      {" "}· Ended {new Date(trip.endTime).toLocaleString()}
                    </span>
                  )}
                </p>

                {/* Resume link */}
                {trip.status === "active" && (
                  <Link
                    to={`/tracking/${trip.id}`}
                    state={{ trip }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neon-gold/10 border border-neon-gold/30 px-3 py-2 font-display text-xs font-bold text-neon-gold hover:bg-neon-gold/20 transition-all"
                  >
                    Resume Tracking →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
