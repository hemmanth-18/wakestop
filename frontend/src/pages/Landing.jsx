import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { ZapIcon, NavigationIcon, BellIcon, ShieldIcon } from "../components/Icons";
import { LiquidButton } from "../components/LiquidButton";

const HEADLINE_PHRASES = [
  "Never Miss Your Stop.",
  "Wake Up Right On Time.",
  "Arrive Safe & Rested.",
  "Escalating Alarm & Vibrate.",
];

function TypewriterHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = HEADLINE_PHRASES[phraseIndex];
    let timer;

    if (!isDeleting && currentText === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % HEADLINE_PHRASES.length);
    } else {
      const speed = isDeleting ? 35 : 75;
      timer = setTimeout(() => {
        const nextText = isDeleting
          ? fullText.substring(0, currentText.length - 1)
          : fullText.substring(0, currentText.length + 1);
        setCurrentText(nextText);
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex]);

  return (
    <span className="text-neon-gold neon-text-gold inline-flex items-center">
      {currentText}
      <span className="animate-pulse text-neon-cyan font-light ml-0.5">|</span>
    </span>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-10 sm:py-16 text-center">
      <ThunderNeonCanvas />

      <div className="relative z-10 mx-auto max-w-5xl lg:max-w-6xl">
        {/* Personalized User Welcome Banner */}
        {user ? (
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-neon-cyan/40 bg-night-900/90 pl-2 pr-6 py-2 shadow-[0_0_25px_rgba(0,240,255,0.25)] backdrop-blur-xl">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover border-2 border-neon-cyan shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan font-extrabold text-base shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Hello, {user.name} 👋
              </h2>
              <p className="text-[11px] text-neon-cyan font-mono font-semibold">Welcome back to WakeStop</p>
            </div>
          </div>
        ) : null}

        {/* Circular Logo Emblem - Seamless fit without duplicate outer rings */}
        <div className="mx-auto mb-6 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.8)] border-3 border-neon-cyan bg-night-950 shrink-0">
          <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
        </div>

        {/* Headline with Typewriter Effect */}
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight min-h-[110px] sm:min-h-[140px] flex flex-col items-center justify-center">
          <span>Sleep On Long Rides.</span>
          <TypewriterHeadline />
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-night-500 leading-relaxed px-2">
          WakeStop tracks your live GPS position on bus journeys and wakes you with an
          escalating alarm ringtone &amp; vibration as your destination approaches.
        </p>

        {/* CTA & Quick Access Buttons */}
        <div className="mt-8">
          {user ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <LiquidButton to="/select-destination" variant="gold">
                  Start New Journey
                </LiquidButton>
              </div>

              {/* Quick Access Dashboard Cards */}
              <div className="mx-auto max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                <Link
                  to="/select-destination"
                  className="glass-panel p-4 rounded-2xl border border-neon-gold/30 hover:border-neon-gold hover:shadow-[0_0_20px_rgba(255,184,0,0.2)] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <NavigationIcon size={20} className="text-neon-gold group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono text-neon-gold font-bold uppercase tracking-wider">Launch</span>
                  </div>
                  <p className="text-xs font-bold text-white">Start New Trip</p>
                  <p className="text-[11px] text-night-500 mt-1">Set destination &amp; wake alarm</p>
                </Link>

                <Link
                  to="/history"
                  className="glass-panel p-4 rounded-2xl border border-neon-cyan/30 hover:border-neon-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <ZapIcon size={20} className="text-neon-cyan group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono text-neon-cyan font-bold uppercase tracking-wider">History</span>
                  </div>
                  <p className="text-xs font-bold text-white">Trip History</p>
                  <p className="text-[11px] text-night-500 mt-1">Review past journeys</p>
                </Link>

                <Link
                  to="/profile"
                  className="glass-panel p-4 rounded-2xl border border-neon-purple/30 hover:border-neon-purple hover:shadow-[0_0_20px_rgba(176,38,255,0.2)] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <ShieldIcon size={20} className="text-neon-purple group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono text-neon-purple font-bold uppercase tracking-wider">Account</span>
                  </div>
                  <p className="text-xs font-bold text-white">My Profile</p>
                  <p className="text-[11px] text-night-500 mt-1">Avatar &amp; security settings</p>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-neon-cyan px-8 py-4 font-display font-bold text-night-950 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95 transition-all text-base"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="flex w-full sm:w-auto items-center justify-center rounded-2xl border border-night-700 bg-night-900/60 px-8 py-4 font-display font-bold text-night-500 hover:border-neon-cyan hover:text-white transition-all text-base"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Feature Cards Grid — 1 col on mobile, 3 on sm+ */}
        <div className="mt-14 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            {
              icon: <BellIcon size={22} className="text-neon-cyan" />,
              label: "2 km out",
              desc: "Quiet notification & subtle chime alerts you that your stop is coming.",
              borderColor: "border-neon-cyan/30",
              glow: "hover:shadow-[0_0_20px_rgba(0,240,255,0.12)]",
            },
            {
              icon: <ZapIcon size={22} className="text-neon-purple" />,
              label: "1 km out",
              desc: "Escalating ringtone sound and hardware vibration pattern trigger.",
              borderColor: "border-neon-purple/30",
              glow: "hover:shadow-[0_0_20px_rgba(176,38,255,0.12)]",
            },
            {
              icon: <ShieldIcon size={22} className="text-neon-gold" />,
              label: "500 m out",
              desc: "Continuous critical thunder alarm repeats until you confirm you're awake.",
              borderColor: "border-neon-gold/30",
              glow: "hover:shadow-[0_0_20px_rgba(255,184,0,0.12)]",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`glass-panel rounded-2xl p-5 ${s.borderColor} ${s.glow} hover:scale-[1.02] transition-all`}
            >
              <div className="mb-3">{s.icon}</div>
              <p className="font-mono text-sm font-bold text-white">{s.label}</p>
              <p className="mt-1.5 text-xs text-night-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
