import { useState, useEffect } from "react";
import ThunderNeonCanvas from "./ThunderNeonCanvas";
import { ZapIcon, NavigationIcon, BellIcon, ShieldIcon, CheckIcon } from "./Icons";

export default function AnimatedIntro({ onComplete, forceShow = false }) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const STATUS_MESSAGES = [
    { text: "Connecting High-Accuracy GPS Telemetry…", icon: <NavigationIcon size={16} className="text-neon-cyan animate-pulse" /> },
    { text: "Calibrating 3-Stage Alarm Engine (1km ➔ 500m ➔ 100m)…", icon: <BellIcon size={16} className="text-neon-purple animate-bounce" /> },
    { text: "Syncing AI Traffic & Battery Risk Protection…", icon: <ZapIcon size={16} className="text-neon-gold animate-pulse" /> },
    { text: "System Online & Synced. Entering WakeStop…", icon: <CheckIcon size={16} className="text-neon-emerald" /> },
  ];

  useEffect(() => {
    // Check if intro has already been played in this browser session
    if (!forceShow && sessionStorage.getItem("wakestop_intro_completed") === "true") {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + 2;
        if (next < 35) setStatusIndex(0);
        else if (next < 70) setStatusIndex(1);
        else if (next < 98) setStatusIndex(2);
        else setStatusIndex(3);
        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [forceShow, onComplete]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          sessionStorage.setItem("wakestop_intro_completed", "true");
          onComplete?.();
        }, 600); // fade out duration
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      sessionStorage.setItem("wakestop_intro_completed", "true");
      onComplete?.();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-night-950 px-6 text-center transition-all duration-700 select-none overflow-hidden ${
        isFadingOut ? "opacity-0 scale-105 filter blur-sm pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Background Neon Thunder Grid */}
      <ThunderNeonCanvas />

      {/* Cyber Scanning Laser Line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent intro-scanline pointer-events-none" />

      {/* Skip Button (Top Right) */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-neon-cyan/40 bg-night-900/80 px-4 py-2 text-xs font-mono font-extrabold text-neon-cyan backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:bg-neon-cyan hover:text-night-950 active:scale-95 transition-all cursor-pointer"
      >
        <span>SKIP INTRO</span>
        <span>➔</span>
      </button>

      {/* Main Center Beaming Logo Emblem */}
      <div className="relative mb-8 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center">
        {/* Pulsing Aura Rings */}
        <span className="pulse-ring absolute inset-0 rounded-full border-2 border-neon-cyan/60" />
        <span className="pulse-ring absolute -inset-4 rounded-full border-2 border-neon-gold/40 animation-delay-500" />

        <div className="logo-beam-pulse flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full overflow-hidden border-3 border-neon-cyan bg-night-950 shadow-[0_0_50px_rgba(0,240,255,0.9)] shrink-0">
          <img
            src="/logo.png"
            alt="WakeStop Logo"
            className="h-full w-full rounded-full object-cover scale-[1.38]"
          />
        </div>
      </div>

      {/* Title & Cyber Neon Tagline */}
      <div className="space-y-2 max-w-md">
        <h1 className="font-display text-4xl sm:text-6xl font-black tracking-widest text-white neon-text-cyan uppercase">
          WAKESTOP
        </h1>
        <p className="font-mono text-xs sm:text-sm font-extrabold tracking-widest text-neon-gold neon-text-gold">
          GPS ALARM &amp; ESCALATING TELEMETRY
        </p>
      </div>

      {/* High-Tech Loading Progress Bar & Telemetry Status */}
      <div className="mt-10 w-full max-w-md space-y-4 glass-panel p-5 rounded-2xl border-neon-cyan/30 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="flex items-center gap-2 text-neon-cyan font-semibold truncate max-w-[280px] sm:max-w-[320px]">
            {STATUS_MESSAGES[statusIndex]?.icon}
            <span className="truncate">{STATUS_MESSAGES[statusIndex]?.text}</span>
          </span>
          <span className="font-extrabold text-neon-gold text-sm ml-2">{progress}%</span>
        </div>

        {/* Progress Fill Line */}
        <div className="h-2.5 w-full rounded-full bg-night-950 overflow-hidden p-0.5 border border-night-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-gold shadow-[0_0_15px_#00F0FF] transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-night-500 pt-1">
          <span className="flex items-center gap-1">
            <ShieldIcon size={12} className="text-neon-cyan" /> 3-Stage Alarm System
          </span>
          <span>v1.0.0 Cyber AI</span>
        </div>
      </div>
    </div>
  );
}
