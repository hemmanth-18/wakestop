import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupApi } from "../services/groupApi";
import { api } from "../services/api";

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z"/>
  </svg>
);
const IconLock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);
const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function GroupModal({ isOpen, onClose, destination, destinations = [] }) {
  const { token, user } = useAuth();
  const nav = useNavigate();

  const destList = destinations.length > 0 ? destinations : (destination ? [destination] : []);

  const [tab, setTab] = useState(destination ? "create" : "join");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdGroup, setCreatedGroup] = useState(null);
  const [copied, setCopied] = useState(false);
  const [hostSelectedStopId, setHostSelectedStopId] = useState(null);

  const [joinCode, setJoinCode] = useState("");
  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [joinDestinations, setJoinDestinations] = useState([]);
  const [joinSelectedStopId, setJoinSelectedStopId] = useState(null);

  const pinRefs = useRef([]);

  if (!isOpen) return null;

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

  const handlePinPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setPinDigits(pasted.split(""));
      pinRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const pin = pinDigits.join("");

  const handleCreate = async () => {
    if (destList.length === 0) { setCreateError("Please select a destination first."); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await groupApi.create(token, destList, user?.name || "Host");
      const trip = await api.startTrip(token, {
        destinationName: res.destination.name,
        destinationLat: res.destination.lat,
        destinationLng: res.destination.lng,
      });
      const shareLink = `${window.location.origin}/join/${res.code}`;
      setCreatedGroup({ code: res.code, pin: res.pin, link: shareLink, tripId: trip.id, destinations: res.destinations });
      if (Array.isArray(res.destinations) && res.destinations.length > 0) {
        setHostSelectedStopId(res.destinations[0].id);
      }
    } catch (err) {
      setCreateError(err.message || "Could not create group");
    } finally {
      setCreating(false);
    }
  };

  const handleShare = () => {
    if (!createdGroup) return;
    const text = `Join my WakeStop group trip!\n\nGroup Code: ${createdGroup.code}\nPIN: ${createdGroup.pin}\n\nOr tap this link:\n${createdGroup.link}`;
    if (navigator.share) {
      navigator.share({ title: "WakeStop Group Trip", text }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    if (!createdGroup) return;
    const text = `${createdGroup.link}\nCode: ${createdGroup.code} | PIN: ${createdGroup.pin}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartTrip = async () => {
    if (!createdGroup) return;
    const groupDests = createdGroup.destinations || destList;
    const targetDest = groupDests.find((d) => d.id === hostSelectedStopId) || groupDests[0] || destination;

    try {
      await groupApi.startGroupTrip(token, createdGroup.code);
    } catch {
      // proceed even if offline
    }

    nav(`/tracking/${createdGroup.tripId}`, {
      state: {
        trip: { id: createdGroup.tripId, destination: targetDest },
        groupCode: createdGroup.code,
      },
    });
    onClose();
  };

  const handleVerifyJoin = async () => {
    if (!joinCode.trim()) { setJoinError("Please enter the group code."); return; }
    if (pin.length !== 6) { setJoinError("Please enter the full 6-digit PIN."); return; }
    setJoining(true);
    setJoinError(null);
    try {
      const res = await groupApi.join(token, joinCode.trim().toUpperCase(), pin, user?.name || "Member");
      const dests = Array.isArray(res.destinations) && res.destinations.length > 0
        ? res.destinations
        : [res.destination];

      setJoinDestinations(dests);
      setJoinSelectedStopId(dests[0]?.id || "dest-1");
    } catch (err) {
      setJoinError(err.message || "Could not join group");
    } finally {
      setJoining(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!joinCode.trim() || pin.length !== 6) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await groupApi.join(token, joinCode.trim().toUpperCase(), pin, user?.name || "Member", joinSelectedStopId);
      const chosenDest = (res.destinations || joinDestinations).find((d) => d.id === joinSelectedStopId) || res.destination;
      const trip = await api.startTrip(token, {
        destinationName: chosenDest.name,
        destinationLat: chosenDest.lat,
        destinationLng: chosenDest.lng,
      });
      nav(`/tracking/${trip.id}`, {
        state: { trip: { id: trip.id, destination: chosenDest }, groupCode: res.code },
      });
      onClose();
    } catch (err) {
      setJoinError(err.message || "Could not confirm join");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(5,8,17,0.88)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-neon-cyan/30 shadow-[0_0_60px_rgba(0,240,255,0.15)] overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0a0f1f 60%,#0e1830 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan">
              <IconUsers />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold text-white leading-tight">Group Travel</h2>
              <p className="text-[10px] text-night-500">Travel together, alarm together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-night-700 text-night-500 hover:text-white hover:border-neon-cyan/50 transition-all"
          >
            <IconX />
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-5 mb-4 flex rounded-xl border border-night-700 bg-night-900 p-1 gap-1">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "create"
                ? "bg-neon-cyan text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                : "text-night-400 hover:text-white"
            }`}
          >
            <IconSparkle />
            Create Group
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "join"
                ? "bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.4)]"
                : "text-night-400 hover:text-white"
            }`}
          >
            <IconLink />
            Join Group
          </button>
        </div>

        {/* ── CREATE TAB ──────────────────────────────────────────────────── */}
        {tab === "create" && (
          <div className="px-5 pb-5 space-y-4">
            {!createdGroup ? (
              <>
                {destList.length > 0 ? (
                  <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 space-y-1.5">
                    <p className="text-[10px] text-neon-cyan font-semibold uppercase tracking-wider">
                      Group Drop-off Stops ({destList.length})
                    </p>
                    {destList.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-bold text-white truncate">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neon-cyan/30 text-[9px] text-neon-cyan">
                          #{i + 1}
                        </span>
                        <span className="truncate">{d.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-alert-500/30 bg-alert-500/10 px-4 py-3 text-xs text-alert-500">
                    Please select a destination on the map first, then create the group.
                  </div>
                )}

                <div className="space-y-2 text-xs text-night-400">
                  {[
                    "You get a Group Code + 6-digit PIN",
                    "Share with friends — they enter the PIN to join",
                    "All phones alarm simultaneously as you approach the stop",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neon-cyan/20 text-[9px] font-bold text-neon-cyan mt-0.5">
                        {i + 1}
                      </span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                {createError && (
                  <p className="rounded-xl border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
                    {createError}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating || !destination}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neon-cyan py-3.5 text-sm font-extrabold text-night-950 shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <IconSparkle />
                  {creating ? "Creating Group…" : "Create Group & Get PIN"}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-neon-gold/40 bg-neon-gold/10 px-4 py-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neon-gold mb-2">Group Code</p>
                  <p className="font-mono text-3xl font-extrabold text-white tracking-widest">{createdGroup.code}</p>
                </div>

                <div className="rounded-2xl border border-neon-purple/40 bg-neon-purple/10 px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <span className="text-neon-purple"><IconLock /></span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neon-purple">PIN — share only with members</p>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {createdGroup.pin.split("").map((d, i) => (
                      <div
                        key={i}
                        className="flex h-10 items-center justify-center rounded-xl border border-neon-purple/60 bg-night-900 font-mono text-xl font-extrabold text-neon-purple"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-[10px] text-night-500">
                  Group expires in 4 hours.<br />
                  <span className="text-neon-cyan font-mono break-all">{createdGroup.link}</span>
                </p>

                {/* Host Stop Selector if multiple stops */}
                {createdGroup.destinations && createdGroup.destinations.length > 1 && (
                  <div className="space-y-1.5 rounded-xl border border-neon-cyan/30 bg-night-900/90 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">
                      Select YOUR drop-off stop (as Host):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {createdGroup.destinations.map((d, i) => (
                        <button
                          key={d.id || i}
                          type="button"
                          onClick={() => setHostSelectedStopId(d.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                            hostSelectedStopId === d.id
                              ? "border-neon-cyan bg-neon-cyan/20 text-white"
                              : "border-night-700 bg-night-950 text-night-400 hover:border-night-600"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon-cyan/20 text-[9px] text-neon-cyan font-extrabold">
                              #{i + 1}
                            </span>
                            <span className="truncate">{d.name}</span>
                          </span>
                          {hostSelectedStopId === d.id && <span className="text-neon-cyan text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyLink}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                        copied
                          ? "border-neon-cyan bg-neon-cyan/20 text-neon-cyan"
                          : "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                      }`}
                    >
                      {copied ? <IconCheck /> : <IconCopy />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 py-3 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all"
                    >
                      <IconShare />
                      Share Link
                    </button>
                  </div>
                  <button
                    onClick={handleStartTrip}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-neon-cyan py-3.5 text-sm font-extrabold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] transition-all active:scale-95"
                  >
                    <IconPlay />
                    Start Trip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── JOIN TAB ─────────────────────────────────────────────────────── */}
        {tab === "join" && (
          <div className="px-5 pb-5 space-y-4">
            {joinDestinations.length === 0 ? (
              <>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-neon-cyan mb-1.5">
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

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-neon-purple"><IconLock /></span>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neon-purple">
                      6-digit PIN
                    </label>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5" onPaste={handlePinPaste}>
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
                        className="h-11 w-full rounded-xl border border-night-700 bg-night-900 text-center font-mono text-lg font-extrabold text-neon-purple focus:border-neon-purple focus:outline-none transition-all caret-transparent"
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
                  onClick={handleVerifyJoin}
                  disabled={joining || !joinCode.trim() || pin.length !== 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neon-purple py-3.5 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:shadow-[0_0_30px_rgba(176,38,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <IconLink />
                  {joining ? "Verifying PIN…" : "Verify PIN & Choose Stop"}
                </button>
              </>
            ) : (
              /* Step 2: Stop Picker UI after PIN verification */
              <div className="space-y-3">
                <div className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 p-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">
                    Select YOUR Drop-off Stop ({joinDestinations.length} available)
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {joinDestinations.map((d, i) => (
                      <button
                        key={d.id || i}
                        type="button"
                        onClick={() => setJoinSelectedStopId(d.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          joinSelectedStopId === d.id
                            ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                            : "border-night-700 bg-night-900 text-night-300 hover:border-night-600"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon-cyan/20 text-[9px] text-neon-cyan font-extrabold">
                            #{i + 1}
                          </span>
                          <span className="truncate">{d.name}</span>
                        </span>
                        {joinSelectedStopId === d.id && <span className="text-neon-cyan text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {joinError && (
                  <p className="rounded-xl border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
                    {joinError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setJoinDestinations([])}
                    className="rounded-xl border border-night-700 bg-night-900 py-3 text-xs font-semibold text-night-400 hover:text-white"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirmJoin}
                    disabled={joining}
                    className="flex items-center justify-center gap-2 rounded-xl bg-neon-purple py-3 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(176,38,255,0.4)] hover:shadow-[0_0_25px_rgba(176,38,255,0.6)] transition-all active:scale-95"
                  >
                    <IconPlay />
                    Join &amp; Track
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
