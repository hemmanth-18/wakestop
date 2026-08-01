import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BusIcon, NavigationIcon, HistoryIcon } from "./Icons";

function MenuIcon({ open }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (location.pathname === "/login" || location.pathname === "/register") return null;

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neon-cyan/20 bg-night-950/90 backdrop-blur-xl">
      {/* ── Main bar ── */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" onClick={closeMobile} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <BusIcon size={20} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-white neon-text-cyan">
            WakeStop
          </span>
        </Link>

        {/* Desktop nav */}
        {user ? (
          <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold">
            <Link
              to="/select-destination"
              className="flex items-center gap-1.5 rounded-xl border border-neon-gold/30 bg-neon-gold/10 px-3.5 py-2 text-neon-gold hover:bg-neon-gold/20 transition-all shadow-[0_0_10px_rgba(255,184,0,0.15)]"
            >
              <NavigationIcon size={14} />
              New Trip
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-1.5 rounded-xl border border-night-700 bg-night-900/60 px-3.5 py-2 text-night-500 hover:border-neon-cyan hover:text-white transition-all"
            >
              <HistoryIcon size={14} />
              History
            </Link>
            <button
              onClick={() => { logout(); nav("/login"); }}
              className="ml-1 flex items-center gap-1.5 rounded-xl border border-night-700 bg-night-900/60 px-3 py-2 text-night-500 hover:border-alert-500 hover:text-alert-500 transition-all"
            >
              Sign out
            </button>
          </nav>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
            <Link
              to="/login"
              className="rounded-xl border border-night-700 px-3.5 py-2 text-night-500 hover:text-white transition-all"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-neon-cyan px-4 py-2 font-bold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110 transition-all"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex items-center justify-center rounded-xl border border-night-700 bg-night-900/60 p-2 text-night-500 hover:border-neon-cyan hover:text-white transition-all"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <MenuIcon open={mobileOpen} />
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-neon-cyan/10 bg-night-950/95 backdrop-blur-xl px-4 pb-4 pt-3 space-y-2">
          {user ? (
            <>
              <Link
                to="/select-destination"
                onClick={closeMobile}
                className="flex items-center gap-2 rounded-xl border border-neon-gold/30 bg-neon-gold/10 px-4 py-3 text-sm font-semibold text-neon-gold w-full"
              >
                <NavigationIcon size={16} /> New Trip
              </Link>
              <Link
                to="/history"
                onClick={closeMobile}
                className="flex items-center gap-2 rounded-xl border border-night-700 bg-night-900/60 px-4 py-3 text-sm font-semibold text-night-400 w-full"
              >
                <HistoryIcon size={16} /> History
              </Link>
              <button
                onClick={() => { logout(); nav("/login"); closeMobile(); }}
                className="flex items-center gap-2 rounded-xl border border-night-700 bg-night-900/60 px-4 py-3 text-sm font-semibold text-night-500 w-full hover:border-alert-500 hover:text-alert-500 transition-all"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMobile}
                className="flex items-center justify-center rounded-xl border border-night-700 px-4 py-3 text-sm font-semibold text-night-400 w-full"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="flex items-center justify-center rounded-xl bg-neon-cyan px-4 py-3 text-sm font-bold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.3)] w-full"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
