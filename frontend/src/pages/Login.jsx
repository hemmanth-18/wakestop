import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      nav("/select-destination");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <ThunderNeonCanvas />

      <div className="relative z-10 w-full max-w-sm lg:max-w-4xl">
        <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Desktop Left Branding Showcase Panel */}
            <div className="hidden lg:flex lg:col-span-6 flex-col justify-center pr-6 border-r border-night-700/60 text-left">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.7)] border-2 border-neon-cyan shrink-0 bg-night-950">
                <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white tracking-tight leading-tight">
                Never Miss Your Stop Again.
              </h2>
              <p className="mt-3 text-xs text-night-400 leading-relaxed">
                WakeStop combines real-time GPS tracking with escalating ringtones and vibration telemetry to ensure you wake up right on time during long journeys.
              </p>
              <div className="mt-6 space-y-2.5 font-mono text-xs text-neon-cyan">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-cyan animate-ping" />
                  <span>Interactive Map &amp; Lat/Lng Pinning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-purple" />
                  <span>AI Commute Pattern Suggestions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-gold" />
                  <span>Multi-tiered Escalating Alarms</span>
                </div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-6">
              <div className="mb-6 text-center lg:text-left">
                <div className="lg:hidden mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.6)] border-2 border-neon-cyan shrink-0 bg-night-950">
                  <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
                </div>
                <h1 className="font-display text-2xl font-extrabold text-white">Welcome Back</h1>
                <p className="mt-1 text-xs text-night-500">Sign in to resume tracking & alarms.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <p className="rounded-xl border border-alert-500/50 bg-alert-600/20 px-3 py-2 text-xs font-semibold text-alert-500">
                    {error}
                  </p>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-night-700 bg-night-900/90 px-3.5 py-3 text-sm text-white outline-none focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-neon-gold hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-night-700 bg-night-900/90 pl-3.5 pr-11 py-3 text-sm text-white outline-none focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-night-400 hover:text-neon-cyan transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-xl bg-neon-cyan py-3.5 font-display font-bold text-night-950 shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60"
                >
                  {busy ? "Signing in…" : "Sign In"}
                </button>
              </form>

              <p className="mt-6 text-center lg:text-left text-xs text-night-500">
                Don't have an account?{" "}
                <Link to="/register" className="font-bold text-neon-gold hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
