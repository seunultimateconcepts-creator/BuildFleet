"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { dbu } from "@/lib/db";

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
    sessionStorage.setItem("bf_tab_auth", "1");
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
            {/* BuildFleet Logo — icon left, wordmark right */}
            <div className="flex items-center gap-4">
              {/* Hexagon icon */}
              <svg width="72" height="72" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <polygon points="40,4 74,22 74,58 40,76 6,58 6,22"
                  fill="none" stroke="#F5A623" strokeWidth="3.5" strokeLinejoin="round"/>
                <polygon points="40,13 66,28 66,52 40,67 14,52 14,28"
                  fill="rgba(13,21,37,0.95)"/>
                <line x1="18" y1="33" x2="62" y2="33" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" opacity="0.25"/>
                <line x1="16" y1="40" x2="64" y2="40" stroke="#F5A623" strokeWidth="2.8" strokeLinecap="round"/>
                <line x1="18" y1="47" x2="62" y2="47" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" opacity="0.25"/>
                <circle cx="64" cy="40" r="5.5" fill="#F5A623"/>
                <circle cx="64" cy="40" r="10" fill="none" stroke="#F5A623" strokeWidth="1.5" opacity="0.4"/>
                <circle cx="64" cy="40" r="16" fill="none" stroke="#F5A623" strokeWidth="1" opacity="0.15"/>
                <line x1="74" y1="36" x2="88" y2="36" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
                <line x1="74" y1="40" x2="94" y2="40" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="74" y1="44" x2="90" y2="44" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
                <circle cx="94" cy="40" r="4" fill="#F5A623"/>
                <circle cx="40" cy="40" r="13" fill="#1A2744"/>
                <circle cx="40" cy="40" r="6" fill="#F5A623"/>
                <circle cx="40" cy="40" r="2.5" fill="rgba(8,13,26,0.9)"/>
              </svg>
              {/* Wordmark */}
              <div>
                <p className="font-black text-white leading-none" style={{ fontSize: "42px", letterSpacing: "-1px" }}>
                  Build<span style={{ color: "#F5A623" }}>Fleet</span>
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: "#8A9AC0", letterSpacing: "3px" }}>
                  Enterprise Fleet Management
                </p>
                <p className="text-xs mt-1" style={{ color: "#2A4060" }}>
                  A product of{" "}
                  <span className="font-bold" style={{ color: "#F5A623" }}>Ultimate Tech Lab</span>
                </p>
              </div>
            </div>
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
            <svg width="180" height="52" viewBox="0 0 260 60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5A623"/>
                  <stop offset="100%" stopColor="#E8820A"/>
                </linearGradient>
              </defs>
              <polygon points="28,4 52,17 52,43 28,56 4,43 4,17"
                fill="none" stroke="#F5A623" strokeWidth="2.2" strokeLinejoin="round"/>
              <polygon points="28,10 46,20 46,40 28,50 10,40 10,20"
                fill="#0D1525"/>
              <line x1="13" y1="27" x2="43" y2="27" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
              <line x1="12" y1="30" x2="44" y2="30" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="33" x2="43" y2="33" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
              <circle cx="44" cy="30" r="3.5" fill="#F5A623"/>
              <circle cx="44" cy="30" r="6" fill="none" stroke="#F5A623" strokeWidth="1" opacity="0.4"/>
              <circle cx="28" cy="30" r="7" fill="#1A2744"/>
              <circle cx="28" cy="30" r="3" fill="#F5A623"/>
              <text x="62" y="24" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="20" fill="white" letterSpacing="-0.5">Build</text>
              <text x="62" y="48" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="20" fill="#F5A623" letterSpacing="-0.5">Fleet</text>
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