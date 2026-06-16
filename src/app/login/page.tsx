"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { dbu } from "@/lib/db";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);

    const { error: err } = await dbu.auth.signInWithPassword({ email, password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Use window.location for reliable redirect after auth
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT — Background image panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: `
            linear-gradient(
              135deg,
              rgba(15,17,23,0.92) 0%,
              rgba(26,29,46,0.85) 40%,
              rgba(15,17,23,0.95) 100%
            ),
            url('https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* UTL circuit overlay pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(126,211,33,0.4) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

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
              {/* Circuit globe — bigger */}
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
                <circle cx="-4" cy="-2" r="2.5" fill="#7ED321"/>
                <circle cx="8" cy="4" r="2.5" fill="#00C9A7"/>
                <circle cx="18" cy="9" r="2.5" fill="#00B8D4"/>
                <circle cx="27" cy="14" r="2.5" fill="#1A6FC4"/>
              </g>
              {/* BuildFleet — big bold wordmark */}
              <text x="92" y="46" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="800" fontSize="42" fill="#FFFFFF" letterSpacing="-1">
                Build<tspan fill="url(#g)">Fleet</tspan>
              </text>
              {/* Tagline — clear and readable */}
              <text x="94" y="68" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="600" fontSize="13" fill="#8A9AC0" letterSpacing="2">
                ENTERPRISE FLEET MANAGEMENT
              </text>
              <line x1="94" y1="78" x2="410" y2="78" stroke="#1E2235" strokeWidth="0.8"/>
              <text x="94" y="92" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="10" fill="#3A4060">
                A product of <tspan fontWeight="700" fill="url(#g)">Ultimate Tech Lab</tspan>
              </text>
            </svg>
          </div>

          {/* Center content */}
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Fleet intelligence<br/>
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #7ED321, #00C9A7, #1A6FC4)" }}>
                built for Nigeria.
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Manage 1,400+ equipment across 117 sites with real-time transfers,
              maintenance tracking, daily logs and rental reports — all in one platform.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { value: "1,438", label: "Equipment" },
                { value: "117",   label: "Active Sites" },
                { value: "100%",  label: "Digital" },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Ultimate Tech Lab · BuildFleet v1.0
          </p>
        </div>
      </div>

      {/* ── RIGHT — Login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#F7F8FC] dark:bg-[#0A0C14] p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <svg width="180" height="52" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gm" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7ED321"/>
                  <stop offset="40%" stopColor="#00C9A7"/>
                  <stop offset="100%" stopColor="#1A6FC4"/>
                </linearGradient>
              </defs>
              <g transform="translate(34,40)">
                <path d="M-28,0 A28,28 0 1,1 16,25" fill="none" stroke="url(#gm)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="-14" y1="21" x2="11" y2="-23" stroke="url(#gm)" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="-6" y1="25" x2="19" y2="-18" stroke="url(#gm)" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="-14" cy="21" r="2.8" fill="#7ED321"/>
                <circle cx="11" cy="-23" r="2.8" fill="#7ED321"/>
                <circle cx="-6" cy="25" r="2.8" fill="#00C9A7"/>
                <circle cx="19" cy="-18" r="2.8" fill="#00C9A7"/>
                <circle cx="9" cy="25" r="2.8" fill="#1A6FC4"/>
                <circle cx="30" cy="-6" r="2.8" fill="#1A6FC4"/>
              </g>
              <text x="72" y="35" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="700" fontSize="28" fill="#0F1117">
                Build<tspan fill="url(#gm)">Fleet</tspan>
              </text>
              <text x="73" y="52" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="8" fill="#8A90AA" letterSpacing="1.8">
                ENTERPRISE FLEET MANAGEMENT
              </text>
            </svg>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Sign in to your BuildFleet account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full border border-slate-200 dark:border-[#1E2235] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-[#0F1117] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-200 dark:border-[#1E2235] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-[#0F1117] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm shadow-amber-200"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-[#1E2235]"/>
            <span className="text-xs text-slate-400">BuildFleet v1.0</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-[#1E2235]"/>
          </div>

          <p className="text-center text-xs text-slate-400">
            Access is by invitation only. Contact your Plant Admin to get access.
          </p>

          <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-6">
            © {new Date().getFullYear()} Ultimate Tech Lab
          </p>
        </div>
      </div>
    </div>
  );
}
