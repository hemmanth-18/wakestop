import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BusIcon, NavigationIcon, HistoryIcon } from "./Icons";

export default function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  if (location.pathname === "/login" || location.pathname === "/register") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-neon-cyan/20 bg-night-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <BusIcon size={20} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-white neon-text-cyan">
            WakeStop
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-2 text-xs font-semibold">
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
              onClick={() => {
                logout();
                nav("/login");
              }}
              className="ml-2 flex items-center gap-1.5 rounded-xl border border-night-700 bg-night-900/60 px-3 py-2 text-night-500 hover:border-alert-500 hover:text-alert-500 transition-all"
            >
              Sign out
            </button>
          </nav>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold">
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
      </div>
    </header>
  );
}
