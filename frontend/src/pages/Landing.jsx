import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { ZapIcon, NavigationIcon, BellIcon, ShieldIcon } from "../components/Icons";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 sm:py-16 text-center">
      <ThunderNeonCanvas />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Logo icon */}
        <div className="mx-auto mb-6 flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.4)] border border-neon-cyan/40">
          <img src="/logo.png" alt="WakeStop" className="h-full w-full object-contain" />
        </div>

        {/* Headline */}
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Sleep On Long Rides.
          <br />
          <span className="text-neon-gold neon-text-gold">Never Miss Your Stop.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-night-500 leading-relaxed px-2">
          WakeStop tracks your live GPS position on bus journeys and wakes you with an
          escalating alarm ringtone &amp; vibration as your destination approaches.
        </p>

        {/* CTA Buttons — stacked on mobile, side-by-side on sm+ */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {user ? (
            <Link
              to="/select-destination"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-neon-gold px-8 py-4 font-display font-bold text-night-950 shadow-[0_0_25px_rgba(255,184,0,0.4)] hover:brightness-110 active:scale-95 transition-all text-base"
            >
              <NavigationIcon size={20} />
              Start New Journey
            </Link>
          ) : (
            <>
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
            </>
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
