import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { BusIcon, ZapIcon, NavigationIcon, BellIcon, ShieldIcon } from "../components/Icons";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-16 text-center">
      <ThunderNeonCanvas />

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-neon-cyan/20 text-neon-cyan shadow-[0_0_30px_rgba(0,240,255,0.4)] border border-neon-cyan/40">
          <BusIcon size={40} />
        </div>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          Sleep On Long Rides.
          <br />
          <span className="text-neon-gold neon-text-gold">Never Miss Your Stop.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-night-500 sm:text-lg">
          WakeStop tracks your live GPS position on bus journeys and wakes you with an escalating
          synthesized alarm ringtone & vibration as your destination approaches.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          {user ? (
            <Link
              to="/select-destination"
              className="flex items-center gap-2 rounded-2xl bg-neon-gold px-8 py-4 font-display font-bold text-night-950 shadow-[0_0_25px_rgba(255,184,0,0.4)] hover:brightness-110 active:scale-98 transition-all"
            >
              <NavigationIcon size={20} />
              Start New Journey
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="flex items-center gap-2 rounded-2xl bg-neon-cyan px-8 py-4 font-display font-bold text-night-950 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-98 transition-all"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border border-night-700 bg-night-900/60 px-8 py-4 font-display font-bold text-night-500 hover:border-neon-cyan hover:text-white transition-all"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
          {[
            {
              icon: <BellIcon size={22} className="text-neon-cyan" />,
              label: "2 km out",
              desc: "Quiet notification & subtle chime alerts you that your stop is coming.",
              borderColor: "border-neon-cyan/30",
            },
            {
              icon: <ZapIcon size={22} className="text-neon-purple" />,
              label: "1 km out",
              desc: "Escalating ringtone sound and hardware vibration pattern trigger.",
              borderColor: "border-neon-purple/30",
            },
            {
              icon: <ShieldIcon size={22} className="text-neon-gold" />,
              label: "500 m out",
              desc: "Continuous critical thunder alarm repeats until you confirm you're awake.",
              borderColor: "border-neon-gold/30",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`glass-panel rounded-2xl p-5 ${s.borderColor} hover:scale-[1.02] transition-transform`}
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
