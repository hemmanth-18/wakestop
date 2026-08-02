import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { EyeIcon, EyeOffIcon, CheckIcon, AlertIcon } from "../components/Icons";

function getPasswordStrength(pass) {
  if (!pass) return { score: 0, label: "", color: "bg-night-800" };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score: 33, label: "Weak", color: "bg-alert-500", text: "text-alert-500" };
  if (score <= 4) return { score: 66, label: "Fair", color: "bg-neon-gold", text: "text-neon-gold" };
  return { score: 100, label: "Strong", color: "bg-neon-emerald", text: "text-neon-emerald" };
}

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = getPasswordStrength(password);
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsDuplicate(false);

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setBusy(true);
    try {
      const userObj = await register(cleanName, cleanEmail, password);
      showToast(`Welcome to WakeStop, ${userObj?.name || cleanName}! Your account has been created successfully. 🎉`, "success");
      nav("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      if (msg.toLowerCase().includes("already exists")) {
        setIsDuplicate(true);
      }
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
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full overflow-hidden shadow-[0_0_30px_rgba(255,184,0,0.7)] border-2 border-neon-gold shrink-0 bg-night-950">
                <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white tracking-tight leading-tight">
                Join WakeStop Today.
              </h2>
              <p className="mt-3 text-xs text-night-400 leading-relaxed">
                Create a free account to unlock learned commute AI suggestions, save custom destination pins, and access your full trip history.
              </p>
              <div className="mt-6 space-y-2.5 font-mono text-xs text-neon-gold">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-gold animate-pulse" />
                  <span>Personalized Travel Patterns</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-cyan" />
                  <span>Escalating Ringtone &amp; Haptic Rumble</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-purple" />
                  <span>Battery-aware Intelligent Tracking</span>
                </div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-6">
              <div className="mb-6 text-center lg:text-left">
                <div className="lg:hidden mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,184,0,0.6)] border-2 border-neon-gold shrink-0 bg-night-950">
                  <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
                </div>
                <h1 className="font-display text-2xl font-extrabold text-white">Create Account</h1>
                <p className="mt-1 text-xs text-night-500">Set live GPS wake alarms for any stop.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-alert-500/50 bg-alert-600/20 px-3.5 py-3 text-xs font-semibold text-alert-500 space-y-2">
                    <p>{error}</p>
                    {isDuplicate && (
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan/20 border border-neon-cyan px-3 py-1.5 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/30 transition-all"
                      >
                        Go to Sign In →
                      </Link>
                    )}
                  </div>
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

                {/* Password Input with Eye Toggle */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-gold">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-night-700 bg-night-900/90 pl-3.5 pr-11 py-3 text-sm text-white outline-none focus:border-neon-gold focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] transition-all"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-night-400 hover:text-neon-gold transition-colors"
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-night-400">Strength:</span>
                        <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-night-950 overflow-hidden border border-night-800">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-gold">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-xl border bg-night-900/90 pl-3.5 pr-11 py-3 text-sm text-white outline-none transition-all ${
                        confirmPassword.length > 0
                          ? isMatch
                            ? "border-neon-emerald/60 focus:border-neon-emerald"
                            : "border-alert-500/60 focus:border-alert-500"
                          : "border-night-700 focus:border-neon-gold"
                      }`}
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-night-400 hover:text-neon-gold transition-colors"
                    >
                      {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>

                  {/* Match Indicator */}
                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${
                        isMatch ? "text-neon-emerald" : "text-alert-500"
                      }`}
                    >
                      {isMatch ? (
                        <>
                          <CheckIcon size={12} /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertIcon size={12} /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-xl bg-neon-gold py-3.5 font-display font-bold text-night-950 shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {busy ? "Creating Account…" : "Create Account"}
                </button>
              </form>

              <p className="mt-6 text-center lg:text-left text-xs text-night-500">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-neon-cyan hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
