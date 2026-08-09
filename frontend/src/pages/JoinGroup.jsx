import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupApi } from "../services/groupApi";
import { api } from "../services/api";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconUsers = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconLock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export default function JoinGroup() {
  const { code } = useParams();
  const nav = useNavigate();
  const { token, user } = useAuth();

  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  // Multi-stop & Waiting room state
  const [groupDestinations, setGroupDestinations] = useState([]);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(null); // { code, destination, destinations, status }
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);

  const pinRefs = useRef([]);
  const waitingPollRef = useRef(null);

  useEffect(() => {
    if (!token) nav(`/login?redirect=/join/${code}`);
  }, [token, code, nav]);

  const handlePinChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[idx] = digit;
    setPinDigits(next);
    if (digit && idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  const handlePinKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !pinDigits[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setPinDigits(pasted.split(""));
      pinRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const pin = pinDigits.join("");

  const launchTrackingForMember = async (groupCode, destination) => {
    const trip = await api.startTrip(token, {
      destinationName: destination.name,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
    });
    nav(`/tracking/${trip.id}`, {
      state: { trip: { id: trip.id, destination }, groupCode },
    });
  };

  const handleJoin = async (stopId = selectedStopId) => {
    if (pin.length !== 6) { setError("Please enter the full 6-digit PIN."); return; }
    setJoining(true);
    setError(null);
    try {
      const res = await groupApi.join(token, code.toUpperCase(), pin, user?.name || "Member", stopId);
      
      const dests = Array.isArray(res.destinations) && res.destinations.length > 0
        ? res.destinations
        : [res.destination];

      setGroupDestinations(dests);
      const chosenDest = dests.find((d) => d.id === stopId) || res.destination || dests[0];
      setSelectedStopId(chosenDest.id);

      setJoinedGroup({
        code: res.code,
        destination: chosenDest,
        destinations: dests,
        status: res.status,
      });

      if (res.status === "active") {
        await launchTrackingForMember(res.code, chosenDest);
      } else {
        // Host has not clicked Start Trip yet -> Enter Waiting Room
        setIsWaitingForHost(true);
      }
    } catch (err) {
      setError(err.message || "Could not join group. Check the PIN and try again.");
    } finally {
      setJoining(false);
    }
  };

  // Poll group status while in Waiting Room
  useEffect(() => {
    if (!isWaitingForHost || !joinedGroup?.code || !token) return;

    const checkStatus = async () => {
      try {
        const state = await groupApi.getState(token, joinedGroup.code);
        if (state.status === "active") {
          if (waitingPollRef.current) clearInterval(waitingPollRef.current);
          setIsWaitingForHost(false);
          const chosenDest = (state.destinations || groupDestinations).find((d) => d.id === selectedStopId) || joinedGroup.destination;
          await launchTrackingForMember(joinedGroup.code, chosenDest);
        }
      } catch (err) {
        console.warn("Waiting room poll error:", err?.message);
      }
    };

    checkStatus();
    waitingPollRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (waitingPollRef.current) clearInterval(waitingPollRef.current);
    };
  }, [isWaitingForHost, joinedGroup?.code, token, selectedStopId, groupDestinations]);

  if (!token) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <ThunderNeonCanvas />

      <div
        className="relative w-full max-w-sm rounded-3xl border border-neon-purple/40 shadow-[0_0_80px_rgba(176,38,255,0.2)] overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0a0f1f 60%,#0e1830 100%)" }}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-purple/20 border border-neon-purple/40 shadow-[0_0_20px_rgba(176,38,255,0.3)] text-neon-purple">
            <IconUsers />
          </div>
          <h1 className="font-display text-xl font-extrabold text-white">
            {isWaitingForHost ? "Waiting for Host" : "Join Group Trip"}
          </h1>
          <p className="mt-1 text-xs text-night-500">
            {isWaitingForHost ? "Joined successfully! Waiting for host to start." : "You've been invited to travel together on WakeStop"}
          </p>
        </div>

        {/* Group code badge */}
        <div className="mx-6 mb-4 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">Group Code</p>
          <p className="font-mono text-2xl font-extrabold tracking-widest text-white mt-0.5">
            {(code || "").toUpperCase()}
          </p>
        </div>

        {/* ── WAITING ROOM VIEW (Host hasn't clicked Start Trip yet) ── */}
        {isWaitingForHost ? (
          <div className="px-6 pb-8 space-y-4 text-center">
            <div className="rounded-2xl border border-neon-gold/40 bg-neon-gold/10 p-5 space-y-3 shadow-[0_0_30px_rgba(255,184,0,0.15)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neon-gold/20 text-neon-gold animate-bounce">
                <IconClock />
              </div>
              <div>
                <h3 className="font-display text-sm font-extrabold text-white">Host Has Not Started Trip Yet</h3>
                <p className="mt-1 text-xs text-night-400">
                  Your drop-off stop <strong className="text-neon-cyan">{joinedGroup?.destination?.name}</strong> is saved.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-neon-gold">
                <span className="h-2 w-2 rounded-full bg-neon-gold animate-ping" />
                <span>Waiting for host to tap "Start Trip"…</span>
              </div>
            </div>

            <p className="text-[11px] text-night-500">
              You will automatically enter live tracking the moment your host starts the trip!
            </p>
          </div>
        ) : (
          /* ── PIN ENTRY & STOP SELECTION VIEW ── */
          <>
            {/* PIN entry */}
            <div className="px-6 pb-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-neon-purple"><IconLock /></span>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-neon-purple">
                  Enter 6-digit PIN from host
                </label>
              </div>
              <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (pinRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    autoFocus={idx === 0}
                    className="h-12 w-full rounded-xl border border-night-700 bg-night-900 text-center font-mono text-xl font-extrabold text-neon-purple focus:border-neon-purple focus:outline-none focus:ring-2 focus:ring-neon-purple/30 transition-all caret-transparent"
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-night-600">
                Ask the trip host for the PIN
              </p>
            </div>

            {/* Stop Selector (If host set multiple stops) */}
            {groupDestinations.length > 1 && (
              <div className="px-6 mb-3 space-y-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">
                  Select your drop-off stop ({groupDestinations.length} available)
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {groupDestinations.map((d, i) => (
                    <button
                      key={d.id || i}
                      type="button"
                      onClick={() => setSelectedStopId(d.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        selectedStopId === d.id
                          ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                          : "border-night-700 bg-night-900 text-night-300 hover:border-night-600"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon-cyan/20 text-[9px] text-neon-cyan font-bold">
                          #{i + 1}
                        </span>
                        <span className="truncate">{d.name}</span>
                      </span>
                      {selectedStopId === d.id && <span className="text-neon-cyan text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mx-6 mt-3 rounded-xl border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
                {error}
              </div>
            )}

            <div className="px-6 pt-4 pb-8">
              <button
                onClick={() => handleJoin(selectedStopId)}
                disabled={joining || pin.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neon-purple py-4 text-sm font-extrabold text-white shadow-[0_0_25px_rgba(176,38,255,0.5)] hover:shadow-[0_0_40px_rgba(176,38,255,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {joining ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Joining…
                  </>
                ) : (
                  <>
                    <IconPlay />
                    Join & Start Tracking
                  </>
                )}
              </button>

              <button
                onClick={() => nav("/select-destination")}
                className="mt-3 w-full rounded-2xl border border-night-700 bg-transparent py-3 text-xs font-semibold text-night-500 hover:text-white hover:border-night-600 transition-all"
              >
                Or start a solo trip instead
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
