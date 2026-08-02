import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { EyeIcon, EyeOffIcon, CheckIcon, AlertIcon, KeyIcon } from "../components/Icons";

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

export default function ForgotPassword() {
  const nav = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1); // 1: Request Code, 2: Verify Code, 3: Reset Password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [demoCode, setDemoCode] = useState(null);

  // Resend timer countdown (60s)
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const strength = getPasswordStrength(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Step 1: Request Verification Code
  async function handleRequestCode(e) {
    e.preventDefault();
    setError(null);
    if (!email) return;

    setBusy(true);
    try {
      const res = await api.forgotPassword(email);
      if (res.demoCode) {
        setDemoCode(res.demoCode);
      }
      showToast("6-digit verification code sent to your email!", "success");
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
      showToast(err instanceof Error ? err.message : "Failed to send code", "error");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify Code
  async function handleVerifyCode(e) {
    e.preventDefault();
    setError(null);
    if (!code || code.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setBusy(true);
    try {
      await api.verifyCode(email, code);
      showToast("Code verified successfully!", "success");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      showToast(err instanceof Error ? err.message : "Invalid code", "error");
    } finally {
      setBusy(false);
    }
  }

  // Step 3: Reset Password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setBusy(true);
    try {
      await api.resetPassword(email, code, newPassword);
      showToast("Password updated successfully! Redirecting to login...", "success");
      setTimeout(() => nav("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
      showToast(err instanceof Error ? err.message : "Failed to reset password", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <ThunderNeonCanvas />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-purple/20 text-neon-purple border border-neon-purple/40 shadow-[0_0_20px_rgba(176,38,255,0.3)]">
              <KeyIcon size={26} />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white">Password Recovery</h1>
            <p className="mt-1 text-xs text-night-500">
              {step === 1 && "Enter your registered email to receive a 6-digit code."}
              {step === 2 && `Enter the 6-digit code sent to ${email}.`}
              {step === 3 && "Create a strong new password for your account."}
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-8 bg-neon-purple shadow-[0_0_10px_#B026FF]"
                    : s < step
                    ? "w-8 bg-neon-cyan opacity-80"
                    : "w-4 bg-night-800"
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-alert-500/50 bg-alert-600/20 px-3.5 py-2.5 text-xs font-semibold text-alert-500 flex items-center gap-2">
              <AlertIcon size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Demonstration Notice Banner if Code Generated */}
          {demoCode && step >= 2 && (
            <div className="mb-4 rounded-xl border border-neon-gold/50 bg-neon-gold/10 p-3 text-xs text-neon-gold font-mono flex items-center justify-between">
              <span>Demo Verification Code:</span>
              <span className="font-bold text-sm bg-night-950 px-2 py-0.5 rounded border border-neon-gold">{demoCode}</span>
            </div>
          )}

          {/* STEP 1: Enter Registered Email */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-purple">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-night-700 bg-night-900/90 px-3.5 py-3 text-sm text-white outline-none focus:border-neon-purple focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-neon-purple py-3.5 font-display font-bold text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Sending Code…" : "Send 6-Digit Code"}
              </button>
            </form>
          )}

          {/* STEP 2: Enter Verification Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-purple">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold rounded-xl border border-night-700 bg-night-900/90 py-3 text-white outline-none focus:border-neon-purple focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                  placeholder="123456"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-night-500">Code expires in 10 mins</span>
                <button
                  type="button"
                  disabled={countdown > 0 || busy}
                  onClick={handleRequestCode}
                  className="font-semibold text-neon-purple hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {countdown > 0 ? `Resend Code (${countdown}s)` : "Resend Code"}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-neon-purple py-3.5 font-display font-bold text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Verifying…" : "Verify Code"}
              </button>
            </form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-purple">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-night-700 bg-night-900/90 pl-3.5 pr-11 py-3 text-sm text-white outline-none focus:border-neon-purple focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-night-400 hover:text-neon-purple transition-colors"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>

                {newPassword.length > 0 && (
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

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neon-purple">
                  Confirm New Password
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
                        : "border-night-700 focus:border-neon-purple"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-night-400 hover:text-neon-purple transition-colors"
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-neon-purple py-3.5 font-display font-bold text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Updating Password…" : "Update Password & Sign In"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-night-500">
            Remembered your password?{" "}
            <Link to="/login" className="font-bold text-neon-cyan hover:underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
