import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupApi } from "../services/groupApi";
import { api } from "../services/api";

/**
 * GroupModal — Create or Join a group trip.
 *
 * Props:
 *   isOpen        {boolean}
 *   onClose       {() => void}
 *   destination   {{ name, lat, lng }} - set when HOST is creating a group
 */
export default function GroupModal({ isOpen, onClose, destination }) {
  const { token, user } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState(destination ? "create" : "join"); // "create" | "join"

  // Create tab state
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdGroup, setCreatedGroup] = useState(null); // { code, pin, link }

  // Join tab state
  const [joinCode, setJoinCode] = useState("");
  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const pinRefs = useRef([]);

  if (!isOpen) return null;

  // ── PIN input handlers ────────────────────────────────────────────────────
  const handlePinChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[idx] = digit;
    setPinDigits(next);
    if (digit && idx < 5) {
      pinRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !pinDigits[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setPinDigits(pasted.split(""));
      pinRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const pin = pinDigits.join("");

  // ── Create Group ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!destination) {
      setCreateError("Please select a destination first.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await groupApi.create(
        token,
        destination.name,
        destination.lat,
        destination.lng,
        user?.name || "Host"
      );

      // Start the host's own trip
      const trip = await api.startTrip(token, {
        destinationName: destination.name,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
      });

      const shareLink = `${window.location.origin}/join/${res.code}`;
      setCreatedGroup({ code: res.code, pin: res.pin, link: shareLink, tripId: trip.id });
    } catch (err) {
      setCreateError(err.message || "Could not create group");
    } finally {
      setCreating(false);
    }
  };

  const handleShare = () => {
    if (!createdGroup) return;
    const text = `🚌 Join my WakeStop group trip!\n\nGroup Code: ${createdGroup.code}\nPIN: ${createdGroup.pin}\n\nOr tap this link:\n${createdGroup.link}`;
    if (navigator.share) {
      navigator.share({ title: "WakeStop Group Trip", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert("Link copied to clipboard!");
    }
  };

  const handleStartTrip = () => {
    if (!createdGroup) return;
    nav(`/tracking/${createdGroup.tripId}`, {
      state: {
        trip: {
          id: createdGroup.tripId,
          destination: { name: destination.name, lat: destination.lat, lng: destination.lng },
        },
        groupCode: createdGroup.code,
      },
    });
    onClose();
  };

  // ── Join Group ────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setJoinError("Please enter the group code.");
      return;
    }
    if (pin.length !== 6) {
      setJoinError("Please enter the full 6-digit PIN.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const res = await groupApi.join(token, joinCode.trim().toUpperCase(), pin, user?.name || "Member");

      // Start a trip for this member too
      const trip = await api.startTrip(token, {
        destinationName: res.destination.name,
        destinationLat: res.destination.lat,
        destinationLng: res.destination.lng,
      });

      nav(`/tracking/${trip.id}`, {
        state: {
          trip: {
            id: trip.id,
            destination: res.destination,
          },
          groupCode: res.code,
        },
      });
      onClose();
    } catch (err) {
      setJoinError(err.message || "Could not join group");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(5,8,17,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-neon-cyan/30 shadow-[0_0_60px_rgba(0,240,255,0.15)]"
        style={{ background: "linear-gradient(135deg,#0a0f1f 60%,#0e1830 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-display text-lg font-extrabold text-white">👥 Group Travel</h2>
            <p className="text-xs text-night-500 mt-0.5">Travel together, alarm together</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-night-700 text-night-500 hover:text-white hover:border-neon-cyan/50 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-5 mb-4 flex rounded-xl border border-night-700 bg-night-900 p-1 gap-1">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "create"
                ? "bg-neon-cyan text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                : "text-night-400 hover:text-white"
            }`}
          >
            ✨ Create Group
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "join"
                ? "bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.4)]"
                : "text-night-400 hover:text-white"
            }`}
          >
            🔗 Join Group
          </button>
        </div>

        {/* ── CREATE TAB ─────────────────────────────────────────────────── */}
        {tab === "create" && (
          <div className="px-5 pb-5 space-y-4">
            {!createdGroup ? (
              <>
                {/* Destination preview */}
                {destination ? (
                  <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3">
                    <p className="text-xs text-neon-cyan font-semibold uppercase tracking-wider">Destination</p>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">{destination.name}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-alert-500/30 bg-alert-500/10 px-4 py-3 text-xs text-alert-500">
                    Please select a destination on the map first, then create the group.
                  </div>
                )}

                {/* How it works */}
                <div className="space-y-2 text-xs text-night-400">
                  <div className="flex items-start gap-2">
                    <span className="text-neon-cyan mt-0.5">①</span>
                    <span>You get a <strong className="text-white">Group Code</strong> + <strong className="text-white">6-digit PIN</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-neon-cyan mt-0.5">②</span>
                    <span>Share with friends via WhatsApp — they enter the PIN to join</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-neon-cyan mt-0.5">③</span>
                    <span>All phones alarm <strong className="text-white">simultaneously</strong> as you approach the stop</span>
                  </div>
                </div>

                {createError && (
                  <p className="rounded-xl border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
                    {createError}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating || !destination}
                  className="w-full rounded-xl bg-neon-cyan py-3.5 text-sm font-extrabold text-night-950 shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {creating ? "Creating Group…" : "✨ Create Group & Get PIN"}
                </button>
              </>
            ) : (
              /* ── Group Created — show code + pin + share ── */
              <div className="space-y-4">
                <div className="rounded-2xl border border-neon-gold/40 bg-neon-gold/10 px-4 py-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-neon-gold mb-2">Group Code</p>
                  <p className="font-mono text-3xl font-extrabold text-white tracking-widest">{createdGroup.code}</p>
                </div>

                <div className="rounded-2xl border border-neon-purple/40 bg-neon-purple/10 px-4 py-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-neon-purple mb-2">🔐 PIN (share only with group members)</p>
                  <div className="flex justify-center gap-2 mt-1">
                    {createdGroup.pin.split("").map((d, i) => (
                      <div
                        key={i}
                        className="flex h-10 w-9 items-center justify-center rounded-xl border border-neon-purple/60 bg-night-900 font-mono text-xl font-extrabold text-neon-purple"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-xs text-night-500">
                  Group expires in 4 hours. Members join at:<br />
                  <span className="text-neon-cyan font-mono text-[10px] break-all">{createdGroup.link}</span>
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleShare}
                    className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 py-3 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all"
                  >
                    📤 Share Link
                  </button>
                  <button
                    onClick={handleStartTrip}
                    className="rounded-xl bg-neon-cyan py-3 text-xs font-extrabold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] transition-all active:scale-95"
                  >
                    🚀 Start Trip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── JOIN TAB ───────────────────────────────────────────────────── */}
        {tab === "join" && (
          <div className="px-5 pb-5 space-y-4">
            {/* Group Code input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neon-cyan mb-1.5">
                Group Code
              </label>
              <input
                type="text"
                placeholder="e.g. WS4821"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-night-700 bg-night-900 px-4 py-3 font-mono text-center text-xl font-extrabold uppercase tracking-widest text-white placeholder-night-600 focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan/40 transition-all"
              />
            </div>

            {/* PIN input — OTP-style boxes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neon-purple mb-1.5">
                🔐 6-digit PIN
              </label>
              <div className="flex gap-2" onPaste={handlePinPaste}>
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
                    className="flex-1 h-12 rounded-xl border border-night-700 bg-night-900 text-center font-mono text-xl font-extrabold text-neon-purple focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple/40 transition-all caret-transparent"
                  />
                ))}
              </div>
            </div>

            {joinError && (
              <p className="rounded-xl border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
                {joinError}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={joining || joinCode.length < 4 || pin.length !== 6}
              className="w-full rounded-xl bg-neon-purple py-3.5 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:shadow-[0_0_30px_rgba(176,38,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {joining ? "Joining…" : "🔗 Join Group & Start Tracking"}
            </button>

            <p className="text-center text-xs text-night-600">
              Ask the trip host for the code and PIN
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
