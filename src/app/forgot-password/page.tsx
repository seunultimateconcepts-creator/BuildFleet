"use client";

import { useState } from "react";
import { dbu } from "@/lib/db";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");

    const { error: err } = await dbu.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <svg width="180" height="52" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            <defs>
              <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7ED321"/>
                <stop offset="40%" stopColor="#00C9A7"/>
                <stop offset="100%" stopColor="#1A6FC4"/>
              </linearGradient>
            </defs>
            <g transform="translate(34,40)">
              <path d="M-28,0 A28,28 0 1,1 16,25" fill="none" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="-14" y1="21" x2="11" y2="-23" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="-6" y1="25" x2="19" y2="-18" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="2" y1="26" x2="26" y2="-14" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="9" y1="25" x2="30" y2="-6" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="-14" cy="21" r="2.8" fill="#7ED321"/>
              <circle cx="11" cy="-23" r="2.8" fill="#7ED321"/>
              <circle cx="-6" cy="25" r="2.8" fill="#00C9A7"/>
              <circle cx="19" cy="-18" r="2.8" fill="#00C9A7"/>
              <circle cx="9" cy="25" r="2.8" fill="#1A6FC4"/>
              <circle cx="30" cy="-6" r="2.8" fill="#1A6FC4"/>
            </g>
            <text x="72" y="35" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="700" fontSize="28" fill="#0F1117">
              Build<tspan fill="url(#g)">Fleet</tspan>
            </text>
            <text x="73" y="52" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="8" fill="#8A90AA" letterSpacing="1.8">
              ENTERPRISE FLEET MANAGEMENT
            </text>
          </svg>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                We sent a password reset link to <strong>{email}</strong>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-slate-400 text-xs mt-4">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button onClick={() => setSent(false)} className="text-amber-500 hover:underline">
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                  {loading ? "Sending..." : "Send Reset Link →"}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-slate-500 hover:text-amber-500 transition-colors">
              ← Back to login
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Ultimate Tech Lab · BuildFleet v1.0
        </p>
      </div>
    </div>
  );
}