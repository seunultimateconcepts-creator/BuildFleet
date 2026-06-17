"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dbu } from "@/lib/db";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");

    const { error: err } = await dbu.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }

    router.replace("/");
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Too short", "Good", "Strong"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] p-4">
      <div className="w-full max-w-md">

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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
            <p className="text-slate-500 text-sm mt-1">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthColor[strength]}`}
                      style={{width: `${strength * 33}%`}}/>
                  </div>
                  <p className={`text-xs mt-1 ${strength===1?"text-red-500":strength===2?"text-amber-600":"text-emerald-600"}`}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                />
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirm.length > 0 && password === confirm && (
                <p className="text-xs text-emerald-600 mt-1">✓ Passwords match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading || password !== confirm || password.length < 8}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2">
              {loading ? "Setting password..." : "Set Password & Login →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Ultimate Tech Lab · BuildFleet v1.0
        </p>
      </div>
    </div>
  );
}