import React from "react";
import { Link } from "react-router-dom";
import { NavigationIcon } from "./Icons";

export function LiquidButton({
  to,
  children,
  onClick,
  className = "",
  variant = "gold",
}) {
  const isGold = variant === "gold";

  const Content = (
    <>
      {/* SVG Gooey Liquid Filter */}
      <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
        <defs>
          <filter id="liquid-goo-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Outer Glow Container */}
      <span
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl p-[2px] transition-all duration-300 group hover:scale-[1.03] active:scale-95 ${
          isGold
            ? "shadow-[0_0_25px_rgba(255,184,0,0.5)] hover:shadow-[0_0_40px_rgba(255,184,0,0.8)]"
            : "shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:shadow-[0_0_40px_rgba(0,240,255,0.8)]"
        }`}
      >
        {/* Animated Fluid Liquid Blob Background */}
        <span className="absolute inset-0 bg-gradient-to-r from-neon-gold via-lamp-400 to-neon-cyan opacity-90 transition-all duration-500 group-hover:opacity-100 group-hover:rotate-12 group-hover:scale-125" />

        {/* Liquid Surface Ripple Pill */}
        <span
          className={`relative flex items-center justify-center gap-2.5 rounded-[14px] px-8 py-4 font-display text-base font-extrabold transition-all duration-300 ${
            isGold
              ? "bg-neon-gold text-night-950 group-hover:bg-gradient-to-r group-hover:from-neon-gold group-hover:to-lamp-400"
              : "bg-neon-cyan text-night-950 group-hover:bg-gradient-to-r group-hover:from-neon-cyan group-hover:to-signal-400"
          } ${className}`}
        >
          <NavigationIcon size={20} className="transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" />
          <span>{children}</span>
        </span>
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block" onClick={onClick}>
        {Content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="inline-block cursor-pointer">
      {Content}
    </button>
  );
}
