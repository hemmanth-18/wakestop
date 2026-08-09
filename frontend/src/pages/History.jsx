import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { HistoryIcon, NavigationIcon, MapPinIcon, CheckIcon, ZapIcon } from "../components/Icons";

const IconUsers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconUser = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function History() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "solo" | "group"

  // Resume stop-picker modal state
  const [selectedTripForResume, setSelectedTripForResume] = useState(null);
  const [chosenStopId, setChosenStopId] = useState(null);

  useEffect(() => {
    if (!token) return;
    api
      .tripHistory(token)
      .then(setTrips)
      .finally(() => setLoading(false));
  }, [token]);

  const handleResumeClick = (trip) => {
    const isGroup = Boolean(trip.groupCode || (Array.isArray(trip.destinations) && trip.destinations.length > 1));
    const destList = Array.isArray(trip.destinations) && trip.destinations.length > 0
      ? trip.destinations
      : (trip.destination ? [trip.destination] : []);

    if (isGroup || destList.length > 1) {
      setSelectedTripForResume(trip);
      setChosenStopId(destList[0]?.id || "dest-1");
    } else {
      nav(`/tracking/${trip.id}`, { state: { trip } });
    }
  };

  const handleConfirmResume = () => {
    if (!selectedTripForResume) return;
    const destList = Array.isArray(selectedTripForResume.destinations) && selectedTripForResume.destinations.length > 0
      ? selectedTripForResume.destinations
      : [selectedTripForResume.destination];

    const targetDest = destList.find((d) => d.id === chosenStopId) || destList[0] || selectedTripForResume.destination;

    nav(`/tracking/${selectedTripForResume.id}`, {
      state: {
        trip: { ...selectedTripForResume, destination: targetDest },
        groupCode: selectedTripForResume.groupCode,
      },
    });
    setSelectedTripForResume(null);
  };

  const soloTrips = trips.filter((t) => !t.groupCode && (!Array.isArray(t.destinations) || t.destinations.length <= 1));
  const groupTrips = trips.filter((t) => Boolean(t.groupCode || (Array.isArray(t.destinations) && t.destinations.length > 1)));

  const filteredTrips = filterTab === "solo"
    ? soloTrips
    : filterTab === "group"
    ? groupTrips
    : trips;

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-3 sm:px-4 py-6 sm:py-8">
      <ThunderNeonCanvas />

      {/* Stop Selection Modal on Resume */}
      {selectedTripForResume && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(5,8,17,0.88)", backdropFilter: "blur(10px)" }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-neon-cyan/40 bg-night-950 p-5 shadow-[0_0_50px_rgba(0,240,255,0.2)] space-y-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-white">Select Drop-off Stop</h3>
              <p className="text-xs text-night-400 mt-0.5">
                Which of the host's 3 drop-off stops are you tracking towards?
              </p>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(selectedTripForResume.destinations || [selectedTripForResume.destination]).map((d, i) => (
                <button
                  key={d.id || i}
                  type="button"
                  onClick={() => setChosenStopId(d.id || `dest-${i + 1}`)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    chosenStopId === (d.id || `dest-${i + 1}`)
                      ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                      : "border-night-700 bg-night-900 text-night-400 hover:border-night-600"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon-cyan/20 text-[9px] text-neon-cyan font-extrabold">
                      #{i + 1}
                    </span>
                    <span className="truncate">{d.name}</span>
                  </span>
                  {chosenStopId === (d.id || `dest-${i + 1}`) && <span className="text-neon-cyan text-xs">✓</span>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSelectedTripForResume(null)}
                className="rounded-xl border border-night-700 bg-night-900 py-2.5 text-xs font-semibold text-night-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResume}
                className="rounded-xl bg-neon-cyan py-2.5 text-xs font-extrabold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95"
              >
                Resume Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-xl md:max-w-4xl lg:max-w-5xl">
        <div className="glass-panel-gold rounded-3xl p-5 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-night-700 pb-4 sm:pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-neon-gold/20 text-neon-gold shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                <HistoryIcon size={22} />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">Trip History</h1>
                <p className="mt-0.5 text-xs text-night-500">Every journey WakeStop has watched over.</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center rounded-xl border border-night-700 bg-night-900/90 p-1 gap-1">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === "all"
                    ? "bg-neon-gold text-night-950 shadow-[0_0_10px_rgba(255,184,0,0.3)]"
                    : "text-night-400 hover:text-white"
                }`}
              >
                All ({trips.length})
              </button>
              <button
                onClick={() => setFilterTab("solo")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === "solo"
                    ? "bg-neon-cyan text-night-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                    : "text-night-400 hover:text-white"
                }`}
              >
                <IconUser /> Solo ({soloTrips.length})
              </button>
              <button
                onClick={() => setFilterTab("group")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === "group"
                    ? "bg-neon-purple text-white shadow-[0_0_10px_rgba(176,38,255,0.3)]"
                    : "text-night-400 hover:text-white"
                }`}
              >
                <IconUsers /> Group ({groupTrips.length})
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <p className="mt-8 text-center text-xs text-neon-cyan font-mono animate-pulse">
              Loading trip history…
            </p>
          )}

          {/* Empty state */}
          {!loading && filteredTrips.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-night-700 p-8 text-center bg-night-950/60">
              <HistoryIcon size={32} className="mx-auto mb-3 text-night-600" />
              <p className="text-sm text-night-500">
                {filterTab === "solo"
                  ? "No solo trips recorded yet."
                  : filterTab === "group"
                  ? "No group trips recorded yet."
                  : "No journeys recorded yet."}
              </p>
              <Link
                to="/select-destination"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-neon-gold px-5 py-3 font-display text-xs font-bold text-night-950 shadow-[0_0_15px_rgba(255,184,0,0.3)]"
              >
                <NavigationIcon size={14} /> Start Your First Trip
              </Link>
            </div>
          )}

          {/* Trip list — responsive 2-column grid on desktop */}
          <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTrips.map((trip) => {
              const isGroup = Boolean(trip.groupCode || (Array.isArray(trip.destinations) && trip.destinations.length > 1));
              return (
                <li
                  key={trip.id}
                  className="rounded-2xl border border-night-700 bg-night-900/80 p-4 transition-all hover:border-neon-cyan/40 flex flex-col justify-between"
                >
                  <div>
                    {/* Top row: name + status badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPinIcon size={16} className="shrink-0 text-neon-cyan" />
                        <p className="font-display font-bold text-white text-sm sm:text-base truncate">
                          {trip.destination.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isGroup ? (
                          <span className="flex items-center gap-1 rounded-full bg-neon-purple/20 border border-neon-purple/40 px-2 py-0.5 text-[10px] text-neon-purple font-mono font-bold">
                            <IconUsers />
                            Group Trip
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-neon-cyan/20 border border-neon-cyan/40 px-2 py-0.5 text-[10px] text-neon-cyan font-mono font-bold">
                            <IconUser />
                            Solo Trip
                          </span>
                        )}
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
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
                  </div>

                  {/* Resume / Re-track Button */}
                  <div className="mt-4 pt-3 border-t border-night-800">
                    <button
                      type="button"
                      onClick={() => handleResumeClick(trip)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neon-gold/10 border border-neon-gold/30 px-3 py-2 font-display text-xs font-bold text-neon-gold hover:bg-neon-gold/20 transition-all cursor-pointer"
                    >
                      {trip.status === "completed" ? "Re-track Trip →" : "Resume Tracking →"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
