"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { dbu } from "@/lib/db";

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Background images — plant & fleet related (Unsplash, no auth)
// ─────────────────────────────────────────────────────────────
const BG_IMAGES = [
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1400&q=80", // construction site equipment
  "https://images.unsplash.com/photo-1652396669401-db1bc4c4457d?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // heavy excavator
  "https://images.unsplash.com/photo-1647735282077-c12699af40be?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // bulldozer construction
  "https://images.unsplash.com/photo-1629807473015-41699c4471b5?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // fleet trucks road
];

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export default function LoginPage() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [bgIndex,      setBgIndex]      = useState(0);
  const [bgFade,       setBgFade]       = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-slide background every 5 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      setBgFade(false);
      setTimeout(() => {
        setBgIndex(i => (i + 1) % BG_IMAGES.length);
        setBgFade(true);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Sign out on page load (close & reopen = logout) ──
  useEffect(() => {
    dbu.auth.signOut(); // always clear session on login page load
  }, []);

  // ── Idle timeout — sign out after 1hr of inactivity ──
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(async () => {
      await dbu.auth.signOut();
      window.location.reload();
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events = ["mousemove","keydown","click","touchstart","scroll"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer(); // start timer on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await dbu.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT — Auto-sliding background ── */}
      <div className="hidden lg:flex lg:w-[62%] relative overflow-hidden">

        {/* Sliding background images */}
        {BG_IMAGES.map((img, i) => (
          <div key={img}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === bgIndex ? (bgFade ? 1 : 0) : 0,
              backgroundImage: `url('${img}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}

        {/* Dark overlay — keeps text readable regardless of image */}
        <div className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(10,12,20,0.88) 0%, rgba(15,20,35,0.80) 50%, rgba(10,12,20,0.92) 100%)"
          }}
        />

        {/* Circuit dot pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(126,211,33,0.4) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Image indicator dots */}
        <div className="absolute bottom-8 left-12 flex gap-2 z-20">
          {BG_IMAGES.map((_, i) => (
            <button key={i} onClick={() => { setBgFade(false); setTimeout(() => { setBgIndex(i); setBgFade(true); }, 300); }}
              className={`w-2 h-2 rounded-full transition-all ${i === bgIndex ? "bg-amber-400 w-6" : "bg-white/30"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">

          {/* Logo */}
          <div>
            <svg width="420" height="100" viewBox="0 0 420 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7ED321"/>
                  <stop offset="40%" stopColor="#00C9A7"/>
                  <stop offset="100%" stopColor="#1A6FC4"/>
                </linearGradient>
              </defs>
              <g transform="translate(42,50)">
                <path d="M-36,0 A36,36 0 1,1 20,32" fill="none" stroke="url(#g)" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="-18" y1="27" x2="14" y2="-30" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="-8" y1="32" x2="24" y2="-23" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="33" x2="33" y2="-18" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="32" x2="38" y2="-7" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="-18" cy="27" r="3.5" fill="#7ED321"/>
                <circle cx="14" cy="-30" r="3.5" fill="#7ED321"/>
                <circle cx="-8" cy="32" r="3.5" fill="#00C9A7"/>
                <circle cx="24" cy="-23" r="3.5" fill="#00C9A7"/>
                <circle cx="2" cy="33" r="3.5" fill="#00B8D4"/>
                <circle cx="33" cy="-18" r="3.5" fill="#00B8D4"/>
                <circle cx="12" cy="32" r="3.5" fill="#1A6FC4"/>
                <circle cx="38" cy="-7" r="3.5" fill="#1A6FC4"/>
              </g>
              <text x="92" y="46" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="800" fontSize="42" fill="#FFFFFF" letterSpacing="-1">
                Build<tspan fill="url(#g)">Fleet</tspan>
              </text>
              <text x="94" y="68" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="600" fontSize="13" fill="#8A9AC0" letterSpacing="2">
                ENTERPRISE FLEET MANAGEMENT
              </text>
              <line x1="94" y1="78" x2="410" y2="78" stroke="#1E2235" strokeWidth="0.8"/>
              <text x="94" y="92" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="10" fill="#3A4060">
                A product of <tspan fontWeight="700" fill="url(#g)">Ultimate Tech Lab</tspan>
              </text>
            </svg>
          </div>

          {/* Center content — always visible over any image */}
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Fleet intelligence<br/>
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #7ED321, #00C9A7, #1A6FC4)" }}>
                built for Nigeria.
              </span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
              Manage 1,400+ equipment across 117 sites with real-time transfers,
              maintenance tracking, daily logs and rental reports — all in one platform.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { value: "1,438", label: "Equipment" },
                { value: "117",   label: "Active Sites" },
                { value: "100%",  label: "Digital" },
              ].map(s => (
                <div key={s.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Ultimate Tech Lab · BuildFleet v1.0
          </p>
        </div>
      </div>

      {/* ── RIGHT — Login form (smaller card, 38% width) ── */}
      <div className="w-full lg:w-[38%] flex items-center justify-center bg-[#F7F8FC] dark:bg-[#0A0C14] p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-6 flex justify-center">
            <svg width="160" height="48" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gm" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7ED321"/>
                  <stop offset="40%" stopColor="#00C9A7"/>
                  <stop offset="100%" stopColor="#1A6FC4"/>
                </linearGradient>
              </defs>
              <g transform="translate(34,40)">
                <path d="M-28,0 A28,28 0 1,1 16,25" fill="none" stroke="url(#gm)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="-14" cy="21" r="2.8" fill="#7ED321"/>
                <circle cx="11" cy="-23" r="2.8" fill="#00C9A7"/>
                <circle cx="9" cy="25" r="2.8" fill="#1A6FC4"/>
              </g>
              <text x="72" y="35" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="700" fontSize="28" fill="#0F1117">
                Build<tspan fill="url(#gm)">Fleet</tspan>
              </text>
              <text x="73" y="52" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="8" fill="#8A90AA" letterSpacing="1.8">
                ENTERPRISE FLEET MANAGEMENT
              </text>
            </svg>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Sign in to your BuildFleet account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email field with icon */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                {/* User icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full border border-slate-200 dark:border-[#1E2235] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-[#0F1117] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Password field with icon */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <a href="/forgot-password"
                  className="text-xs text-amber-500 hover:text-amber-600 font-medium transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                {/* Lock icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-slate-200 dark:border-[#1E2235] rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-[#0F1117] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
                />
                {/* Show/hide toggle */}
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm shadow-sm shadow-amber-200 mt-2">
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-[#1E2235]"/>
            <span className="text-xs text-slate-400">BuildFleet v1.0</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-[#1E2235]"/>
          </div>

          {/* Need access */}
          <div className="bg-slate-100 dark:bg-[#0F1117] border border-slate-200 dark:border-[#1E2235] rounded-xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
              Need access?
            </p>
            <p className="text-xs text-slate-400">
              Contact your administrator to get an invitation.
            </p>
          </div>

          <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-5">
            © {new Date().getFullYear()} Ultimate Tech Lab
          </p>
        </div>
      </div>
    </div>
  );
}