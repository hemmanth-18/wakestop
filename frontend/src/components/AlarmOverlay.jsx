import { formatDistance } from "../utils/geo";
import { CheckIcon, ZapIcon, BellIcon } from "./Icons";

const STAGE_COPY = {
  alarm: { title: "Getting close!", sub: "Start gathering your belongings." },
  critical: { title: "Wake Up Now!", sub: "Your destination is immediately approaching." },
  arrived: { title: "You've Arrived!", sub: "Journey completed safely." },
};

export default function AlarmOverlay({ stage, distance, destinationName, onAcknowledge }) {
  if (stage !== "alarm" && stage !== "critical" && stage !== "arrived") return null;

  const copy = STAGE_COPY[stage];
  const isCritical = stage === "critical";
  const isArrived = stage === "arrived";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center transition-colors duration-500 ${
        isCritical
          ? "bg-alert-600/95 backdrop-blur-xl"
          : isArrived
          ? "bg-neon-emerald/95 text-night-950 backdrop-blur-xl"
          : "bg-neon-gold/95 text-night-950 backdrop-blur-xl"
      }`}
    >
      <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
        {!isArrived && (
          <span className="pulse-ring absolute inset-0 rounded-full border-4 border-white/80" />
        )}
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-night-950 shadow-2xl ${
            isCritical ? "alarm-shake border-2 border-white shadow-[0_0_40px_rgba(255,255,255,0.8)]" : ""
          }`}
        >
          {isArrived ? (
            <CheckIcon size={44} className="text-neon-emerald" />
          ) : isCritical ? (
            <ZapIcon size={44} className="text-alert-500" />
          ) : (
            <BellIcon size={44} className="text-neon-gold" />
          )}
        </div>
      </div>

      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-3 text-lg font-medium opacity-90">{copy.sub}</p>

      <div className="mt-8 rounded-2xl bg-night-950/70 border border-white/20 px-6 py-4 backdrop-blur-md">
        <p className="font-mono text-xs uppercase tracking-widest text-white/60">
          Target Destination
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-white">{destinationName}</p>
        {distance !== null && !isArrived && (
          <p className="mt-2 font-mono text-3xl font-extrabold text-neon-cyan neon-text-cyan">
            {formatDistance(distance)} away
          </p>
        )}
      </div>

      {!isArrived && (
        <button
          onClick={onAcknowledge}
          className="mt-10 rounded-2xl bg-night-950 px-10 py-5 font-display text-xl font-bold text-white shadow-[0_0_30px_rgba(0,0,0,0.6)] active:scale-95 transition-all hover:scale-105"
        >
          I've Woken Up
        </button>
      )}
      {isArrived && (
        <p className="mt-8 text-sm opacity-80">You can now exit this screen.</p>
      )}
    </div>
  );
}
