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

export default function JoinGroup() {
  const { code } = useParams();
  const nav = useNavigate();
  const { token, user } = useAuth();

  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const pinRefs = useRef([]);

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

  const handleJoin = async () => {
    if (pin.length !== 6) { setError("Please enter the full 6-digit PIN."); return; }
    setJoining(true);
    setError(null);
    try {
      const res = await groupApi.join(token, code.toUpperCase(), pin, user?.name || "Member");
      const trip = await api.startTrip(token, {
        destinationName: res.destination.name,
        destinationLat: res.destination.lat,
        destinationLng: res.destination.lng,
      });
      nav(`/tracking/${trip.id}`, {
        state: { trip: { id: trip.id, destination: res.destination }, groupCode: res.code },
      });
    } catch (err) {
      setError(err.message || "Could not join group. Check the PIN and try again.");
    } finally {
      setJoining(false);
    }
  };

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
          <h1 className="font-display text-xl font-extrabold text-white">Join Group Trip</h1>
          <p className="mt-1 text-xs text-night-500">
            You've been invited to travel together on WakeStop
          </p>
        </div>

        {/* Group code badge */}
        <div className="mx-6 mb-5 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">Group Code</p>
          <p className="font-mono text-2xl font-extrabold tracking-widest text-white mt-0.5">
            {(code || "").toUpperCase()}
          </p>
        </div>

        {/* PIN entry */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-neon-purple"><IconLock /></span>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-neon-purple">
              Enter 6-digit PIN from host
            </label>
          </div>
          {/* grid layout ensures all 6 boxes fit without overflow */}
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

        {error && (
          <div className="mx-6 mt-3 rounded-xl border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
            {error}
          </div>
        )}

        <div className="px-6 pt-4 pb-8">
          <button
            onClick={handleJoin}
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
      </div>
    </div>
  );
}
