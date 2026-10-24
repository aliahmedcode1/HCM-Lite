"use client";

import { Loader2, X } from "lucide-react";

/* ---------- Button ---------- */

const variants = {
  primary:
    "bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 shadow-lg shadow-emerald-500/20",
  secondary:
    "glass-card text-zinc-200 hover:bg-white/10",
  ghost: "text-zinc-400 hover:text-white hover:bg-white/5",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
};

const sizes = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`glass-card rounded-2xl transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* ---------- Badge ---------- */

const badgeStyles = {
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  red: "bg-red-500/10 text-red-300 border-red-500/20",
  zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
};

export function Badge({ children, color = "zinc", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyles[color]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- StatCard ---------- */

export function StatCard({ icon: Icon, label, value, color = "emerald" }) {
  const iconColors = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    indigo: "text-indigo-400 bg-indigo-500/10",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 ${iconColors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl animate-scale-in">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Input ---------- */

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-zinc-400">
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-zinc-400">
          {label}
        </span>
      )}
      <select
        className={`w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-colors focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 [&>option]:bg-zinc-900 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 ${className}`}
    />
  );
}
