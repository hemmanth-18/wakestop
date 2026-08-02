import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NavigationIcon, HistoryIcon, UserIcon, LogOutIcon, ChevronDownIcon } from "./Icons";
import Shuffle from "./Shuffle";

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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  if (location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/forgot-password") return null;

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neon-cyan/20 bg-night-950/90 backdrop-blur-xl">
      {/* ── Main bar ── */}
      <div className="flex w-full items-center justify-between px-4 sm:px-8 py-2.5">
        {/* Logo */}
        <Link to="/" onClick={closeMobile} className="flex items-center gap-3">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.5)] border-2 border-neon-cyan shrink-0 bg-night-950">
            <img src="/logo.png" alt="WakeStop" className="h-full w-full rounded-full object-cover scale-[1.38]" />
          </div>
          <Shuffle
            text="WakeStop"
            tag="span"
            className="font-pixel text-base sm:text-lg font-bold tracking-wider text-white neon-text-cyan cursor-pointer"
            shuffleDirection="right"
            duration={0.35}
            stagger={0.03}
            shuffleTimes={2}
            triggerOnHover={true}
          />
        </Link>

        {/* Desktop nav */}
        {user ? (
          <nav className="hidden sm:flex items-center gap-3 text-xs font-bold relative">
            <Link
              to="/select-destination"
              className="flex items-center gap-1.5 rounded-xl border border-neon-gold/30 bg-neon-gold/10 px-4 py-2.5 text-neon-gold hover:bg-neon-gold/20 transition-all shadow-[0_0_10px_rgba(255,184,0,0.15)]"
            >
              <NavigationIcon size={14} />
              New Trip
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-1.5 rounded-xl border border-night-700 bg-night-900/60 px-4 py-2.5 text-night-400 hover:border-neon-cyan hover:text-white transition-all"
            >
              <HistoryIcon size={14} />
              History
            </Link>

            {/* Profile Avatar & Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-neon-cyan/40 bg-night-900/90 pl-1.5 pr-3 py-1.5 text-white hover:border-neon-cyan transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)]"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover border border-neon-cyan shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-cyan/20 border border-neon-cyan text-neon-cyan font-extrabold text-sm shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="truncate max-w-[100px] font-semibold text-xs text-white">
                  {user.name}
                </span>
                <ChevronDownIcon size={14} className="text-night-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-neon-cyan/30 bg-night-950/95 p-2 shadow-[0_15px_35px_rgba(0,0,0,0.9)] backdrop-blur-2xl divide-y divide-night-800 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-night-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:bg-neon-cyan/15 hover:text-neon-cyan transition-colors"
                    >
                      <UserIcon size={15} className="text-neon-cyan" />
                      My Profile
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-night-300 hover:bg-night-800 hover:text-white transition-colors"
                    >
                      <HistoryIcon size={15} className="text-neon-gold" />
                      Trip History
                    </Link>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        nav("/login");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-alert-500 hover:bg-alert-500/10 transition-colors"
                    >
                      <LogOutIcon size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>
        ) : (
          <div className="hidden sm:flex items-center gap-3 text-xs font-bold">
            <Link
              to="/login"
              className="flex items-center justify-center rounded-xl border border-night-700 bg-night-900/60 px-4 py-2.5 text-night-400 hover:border-neon-cyan hover:text-white transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="flex items-center justify-center rounded-xl bg-neon-cyan px-4.5 py-2.5 font-bold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110 active:scale-95 transition-all"
            >
              Get Started Free
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
              {/* User Info Header Badge */}
              <Link
                to="/profile"
                onClick={closeMobile}
                className="flex items-center gap-3 rounded-2xl border border-neon-cyan/40 bg-night-900/90 p-3 text-white"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="h-10 w-10 rounded-full object-cover border border-neon-cyan shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-cyan/20 border border-neon-cyan text-neon-cyan font-bold text-base shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  <p className="text-xs text-neon-cyan font-semibold">View Profile →</p>
                </div>
              </Link>

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
                <LogOutIcon size={16} /> Sign out
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
