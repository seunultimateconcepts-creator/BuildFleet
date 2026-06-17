"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dbu } from "@/lib/db";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [ready,     setReady]     = useState(false);
  const [userName,  setUserName]  = useState("");

  useEffect(() => {
    // Supabase puts the token in the URL hash after redirect
    // We need to exchange it for a session
    async function handleInviteToken() {
      const { data: { session }, error } = await dbu.auth.getSession();
      
      if (session) {
        setUserName(session.user.user_metadata?.full_name || session.user.email || "");
        setReady(true);
      } else if (error) {
        setError("Invalid or expired invite link. Please contact your Plant Admin.");
      } else {
        // Wait a moment for Supabase to process the hash token
        setTimeout(async () => {
          const { data: { session: s } } = await dbu.auth.getSession();
          if (s) {
            setUserName(s.user.user_metadata?.full_name || s.user.email || "");
            setReady(true);
          } else {
            setError("Invalid or expired invite link. Please contact your Plant Admin.");
          }
        }, 1500);
      }
    }
    handleInviteToken();
  }, []);

  async function handleSetPassword() {
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (password !== confirm) {
      setError("Passwords do not match."); return;
    }
    setLoading(true); setError("");

    const { error: err } = await dbu.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Password set — redirect to dashboard
    router.replace("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <svg width="200" height="52" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
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
              <circle cx="2" cy="26" r="2.8" fill="#00B8D4"/>
              <circle cx="26" cy="-14" r="2.8" fill="#00B8D4"/>
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

          {!ready && !error && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
              <p className="text-slate-500 text-sm">Setting up your account...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-4xl mb-4">❌</p>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Invalid Invite Link</h2>
              <p className="text-slate-500 text-sm mb-6">{error}</p>
              <a href="/login"
                className="inline-block bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600">
                Go to Login
              </a>
            </div>
          )}

          {ready && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Welcome to BuildFleet!</h1>
                {userName && (
                  <p className="text-slate-500 text-sm mt-1">
                    Hello <strong>{userName}</strong> — set your password to get started.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                  />
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          password.length < 8 ? "bg-red-400 w-1/4" :
                          password.length < 12 ? "bg-amber-400 w-2/4" :
                          "bg-emerald-500 w-full"
                        }`}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${
                      password.length < 8 ? "text-red-500" :
                      password.length < 12 ? "text-amber-600" :
                      "text-emerald-600"
                    }`}>
                      {password.length < 8 ? "Too short" :
                       password.length < 12 ? "Good" : "Strong"}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleSetPassword}
                  disabled={loading || !password || !confirm}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2"
                >
                  {loading ? "Setting password..." : "Set Password & Access BuildFleet →"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Ultimate Tech Lab · BuildFleet v1.0
        </p>
      </div>
    </div>
  );
}