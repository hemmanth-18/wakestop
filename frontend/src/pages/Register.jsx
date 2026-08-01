import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(name, email, password);
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

      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,184,0,0.6)] border-2 border-neon-gold shrink-0 bg-night-950">
              <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white">Create Account</h1>
            <p className="mt-1 text-xs text-night-500">Set live GPS wake alarms for any stop.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="rounded-xl border border-alert-500/50 bg-alert-600/20 px-3 py-2 text-xs font-semibold text-alert-500">
                {error}
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-gold">
                Full Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-night-700 bg-night-900/90 px-3.5 py-3 text-sm text-white outline-none focus:border-neon-gold focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] transition-all"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-gold">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-night-700 bg-night-900/90 px-3.5 py-3 text-sm text-white outline-none focus:border-neon-gold focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-gold">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-night-700 bg-night-900/90 px-3.5 py-3 text-sm text-white outline-none focus:border-neon-gold focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] transition-all"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-neon-gold py-3.5 font-display font-bold text-night-950 shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60"
            >
              {busy ? "Creating Account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-night-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-neon-cyan hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
