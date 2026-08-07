/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const CATEGORY_RATES = [
  { category: "Light Vehicles (CPU/SN)",          default_rate: 7000 },
  { category: "Buses / Minibus (MB)",              default_rate: 10000 },
  { category: "Tipper Trucks (CTR/TR)",            default_rate: 25000 },
  { category: "Excavators (EL)",                   default_rate: 80000 },
  { category: "Bulldozers (BD)",                   default_rate: 85000 },
  { category: "Motor Graders (MG)",                default_rate: 70000 },
  { category: "Rollers (VPF/VR/ARR/ASR)",         default_rate: 45000 },
  { category: "Asphalt Pavers (AP)",               default_rate: 80000 },
  { category: "Generators (EG)",                   default_rate: 12000 },
  { category: "Air Compressors (AC)",              default_rate: 6500  },
  { category: "Water Tankers (CWT)",               default_rate: 18000 },
  { category: "Cranes & Lifting Equipment",        default_rate: 95000 },
  { category: "Concrete Equipment",               default_rate: 35000 },
  { category: "Asphalt & Road Maintenance",       default_rate: 55000 },
  { category: "Pneumatic Equipment",              default_rate: 6500  },
];

// Settings holds destructive/sensitive actions (hire rates, system info,
// eventually user management shortcuts) — gated behind re-entering the
// user's own login password, not a separate password to manage. Unlock
// is remembered in sessionStorage for a short window so navigating
// between Settings tabs doesn't re-prompt on every click; it clears on
// tab close, same convention as the app's existing idle-timeout logic.
const SETTINGS_UNLOCK_KEY = "bf_settings_unlocked_at";
const SETTINGS_UNLOCK_TTL_MS = 15 * 60 * 1000; // 15 minutes

export default function SettingsPage() {
  const [profile,    setProfile]    = useState<any>(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [activeTab,  setActiveTab]  = useState<"profile"|"rates"|"system">("profile");

  const [profileForm, setProfileForm] = useState({
    full_name: "", staff_no: "", phone: "", email: "",
  });

  const [rates, setRates] = useState(
    CATEGORY_RATES.map(r => ({ ...r, rate: r.default_rate }))
  );

  const [pwForm, setPwForm] = useState({
    current: "", newPw: "", confirm: "",
  });
  const [pwError,  setPwError]  = useState("");
  const [pwSaved,  setPwSaved]  = useState(false);

  // ── Password gate state ──
  const [locked,        setLocked]        = useState(true);
  const [checkingLock,  setCheckingLock]  = useState(true);
  const [unlockPw,      setUnlockPw]      = useState("");
  const [unlockError,   setUnlockError]   = useState("");
  const [unlocking,     setUnlocking]     = useState(false);

  useEffect(() => {
    const last = sessionStorage.getItem(SETTINGS_UNLOCK_KEY);
    if (last && Date.now() - parseInt(last, 10) < SETTINGS_UNLOCK_TTL_MS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocked(false);
    }
    setCheckingLock(false);
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlockError(""); setUnlocking(true);
    const { data: { user } } = await dbu.auth.getUser();
    const email = user?.email;
    if (!email) {
      setUnlockError("Could not verify your account. Please refresh and try again.");
      setUnlocking(false);
      return;
    }
    const { error } = await dbu.auth.signInWithPassword({ email, password: unlockPw });
    if (error) {
      setUnlockError("Incorrect password.");
      setUnlocking(false);
      return;
    }
    sessionStorage.setItem(SETTINGS_UNLOCK_KEY, String(Date.now()));
    setLocked(false);
    setUnlocking(false);
    setUnlockPw("");
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await dbu.auth.getUser();
      if (!user) return;
      const { data } = await dbu.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setProfileForm({
          full_name: data.full_name || "",
          staff_no:  data.staff_no  || "",
          phone:     data.phone     || "",
          email:     data.email     || "",
        });
      }
    }
    load();
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    await dbu.from("profiles").update({
      full_name: profileForm.full_name,
      staff_no:  profileForm.staff_no,
      phone:     profileForm.phone,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function changePassword() {
    setPwError(""); setPwSaved(false);
    if (!pwForm.newPw || pwForm.newPw.length < 6) {
      setPwError("Password must be at least 6 characters."); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError("Passwords do not match."); return;
    }
    const { error } = await dbu.auth.updateUser({ password: pwForm.newPw });
    if (error) { setPwError(error.message); return; }
    setPwSaved(true);
    setPwForm({ current:"", newPw:"", confirm:"" });
    setTimeout(() => setPwSaved(false), 3000);
  }

  async function applyRatesToEquipment() {
    setSaving(true);
    for (const r of rates) {
      await dbu.from("equipment")
        .update({ hire_rate: r.rate })
        .ilike("category", `%${r.category.split("(")[0].trim()}%`);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const roles: string[] = profile?.roles || [];
  const isAdmin      = roles.some(r => ["plant_manager","plant_director","plant_admin"].includes(r));
  const isSuperAdmin = roles.includes("super_admin");

  // ── Lock screen — checking state avoids a flash of the unlocked
  // form before sessionStorage has been read on mount ──
  if (checkingLock) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <form onSubmit={handleUnlock} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-800">Settings is locked</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            Re-enter your password to continue.
          </p>
          <input
            type="password"
            autoFocus
            className={iCls + " text-center mb-3"}
            placeholder="Your password"
            value={unlockPw}
            onChange={e => setUnlockPw(e.target.value)}
          />
          {unlockError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-3">⚠️ {unlockError}</div>
          )}
          <button type="submit" disabled={unlocking || !unlockPw}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {unlocking ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your profile, security and system defaults.</p>
        </div>
        {saved && (
          <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">
            ✓ Saved successfully
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          ["profile", "👤 My Profile"],
          ["rates",   "₦ Hire Rates"],
          ...(isSuperAdmin ? [["system", "⚙️ System"] as const] : []),
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile info */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Personal Information</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl font-bold text-amber-700">
                  {(profileForm.full_name||"?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{profileForm.full_name||"—"}</p>
                  <p className="text-slate-500 text-sm">{profileForm.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {roles.map(r => (
                      <span key={r} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                        {r.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input className={iCls} value={profileForm.full_name}
                  onChange={e => setProfileForm(p=>({...p,full_name:e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Staff No.</label>
                  <input className={iCls} value={profileForm.staff_no}
                    onChange={e => setProfileForm(p=>({...p,staff_no:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Phone</label>
                  <input className={iCls} value={profileForm.phone}
                    onChange={e => setProfileForm(p=>({...p,phone:e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-500">
                  {profileForm.email}
                </div>
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Change Password</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">New Password</label>
                <input className={iCls} type="password" value={pwForm.newPw}
                  onChange={e => setPwForm(p=>({...p,newPw:e.target.value}))}
                  placeholder="Min. 6 characters" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                <input className={iCls} type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(p=>({...p,confirm:e.target.value}))}
                  placeholder="Repeat new password" />
              </div>
              {pwError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {pwError}</div>
              )}
              {pwSaved && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm">✓ Password changed successfully!</div>
              )}
              <button onClick={changePassword}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900">
                Update Password
              </button>
            </div>

            {/* Account info */}
            <div className="px-6 pb-6 space-y-3">
              <div className="border border-slate-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Member since</span>
                  <span className="font-semibold text-slate-800">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-xs text-slate-500">{profile?.id?.slice(0,8)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HIRE RATES TAB ── */}
      {activeTab === "rates" && (
        <div className="space-y-5">
          {!isSuperAdmin ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="text-center">
                <p className="text-4xl mb-3">🔒</p>
                <p className="font-bold text-slate-800">Admin access required</p>
                <p className="text-slate-500 text-sm mt-1">Only Plant Admin and Manager can manage hire rates.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div className="text-sm text-amber-800">
                  <p className="font-bold">Default Hire Rates by Category</p>
                  <p className="mt-0.5 text-amber-700">
                    These rates are applied to equipment by category. Individual equipment rates can be overridden on the equipment detail page or in the daily log entry. Click &quot;Apply to Equipment&quot; to update all equipment in each category.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Category Default Rates</h3>
                  <button onClick={applyRatesToEquipment} disabled={saving}
                    className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                    {saving ? "Applying..." : "Apply to Equipment"}
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {rates.map((r, idx) => (
                    <div key={r.category} className="px-6 py-4 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-700 flex-1">{r.category}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">₦</span>
                        <input
                          type="number"
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-amber-400"
                          value={r.rate}
                          onChange={e => setRates(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], rate: Number(e.target.value)||0 };
                            return updated;
                          })}
                        />
                        <span className="text-slate-400 text-xs">/day</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SYSTEM TAB ── */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">System Information</h3>
            </div>
            <div className="p-6 space-y-3">
              {[
                ["System Name",    "BuildFleet"],
                ["Organisation",   "Hartland Nigeria Limited"],
                ["Version",        "1.0.0"],
                ["Database",       "Supabase (PostgreSQL)"],
                ["Framework",      "Next.js 16 + React 19"],
                ["Deployment",     "Vercel"],
                ["Builder",         "BuildFleet by Makanjuola David"],
                ["Support",          "makanjuoladavid45@gmail.com"],
              ].map(([l,v]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{l}</span>
                  <span className="text-sm font-semibold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Quick Links</h3>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label:"Supabase Dashboard", url:"https://supabase.com/dashboard", icon:"🗄️" },
                { label:"Vercel Dashboard",   url:"https://vercel.com/dashboard",   icon:"▲" },
                { label:"Documentation",      url:"#",                              icon:"📖" },
              ].map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{link.label}</span>
                  <span className="ml-auto text-slate-400">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}