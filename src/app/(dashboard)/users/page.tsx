/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

const ROLES = [
  { value: "plant_director",  label: "Plant Director",  color: "bg-indigo-100 text-indigo-700", desc: "Highest level — oversight, view only" },
  { value: "plant_manager",   label: "Plant Manager",   color: "bg-purple-100 text-purple-700", desc: "Approves transfers & maintenance completion" },
  { value: "plant_engineer",  label: "Plant Engineer",  color: "bg-blue-100 text-blue-700",     desc: "Technical approvals, completes maintenance jobs" },
  { value: "plant_admin",     label: "Plant Admin",     color: "bg-amber-100 text-amber-700",   desc: "Full access — users, reports, rental list, everything" },
  { value: "site_supervisor", label: "Site Supervisor", color: "bg-teal-100 text-teal-700",     desc: "View site equipment, daily logs, initiate & confirm transfers" },
  { value: "plant_clerk",     label: "Plant Clerk",     color: "bg-slate-100 text-slate-600",   desc: "Daily logs, initiate transfers, confirm incoming transfers" },
];

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

function getRoleStyle(role: string) {
  return ROLES.find(r => r.value === role)?.color || "bg-slate-100 text-slate-500";
}
function getRoleLabel(role: string) {
  return ROLES.find(r => r.value === role)?.label || role;
}

// ─────────────────────────────────────────────────────────────
// ADD USER MODAL
// ─────────────────────────────────────────────────────────────
function AddUserModal({ sites, onClose, onSave }: {
  sites: any[]; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "", email: "", staff_no: "", phone: "",
    role: "plant_clerk", assigned_sites: [] as string[],
  });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [siteSearch, setSiteSearch] = useState("");

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  function toggleSite(siteName: string) {
    setForm(p => ({
      ...p,
      assigned_sites: p.assigned_sites.includes(siteName)
        ? p.assigned_sites.filter(s => s !== siteName)
        : [...p.assigned_sites, siteName],
    }));
  }

  const isAdmin = ["plant_director","plant_manager","plant_engineer","plant_admin"].includes(form.role);

  const filteredSites = sites.filter((s: any) =>
    !siteSearch ||
    s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(siteSearch.toLowerCase())
  );

  async function handleInvite() {
    if (!form.full_name || !form.email || !form.role) {
      setError("Full name, email and role are required."); return;
    }
    setSaving(true); setError("");

    try {
      // Call server-side API route — uses service role key safely
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:          form.email,
          full_name:      form.full_name,
          staff_no:       form.staff_no,
          phone:          form.phone,
          role:           form.role,
          assigned_sites: isAdmin ? [] : form.assigned_sites,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setError(result.error || "Failed to send invite.");
        setSaving(false);
        return;
      }

      setSaving(false);
      setSuccess(true);
      setTimeout(() => { onSave(); onClose(); }, 2500);

    } catch (e: any) {
      setError(e.message || "Network error. Please try again.");
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-slate-800">Invite Sent!</h3>
          <p className="text-slate-500 text-sm mt-2">
            An email has been sent to <strong>{form.email}</strong> with a link to set their password and access BuildFleet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">New Staff</p>
            <h2 className="text-lg font-bold text-white">Add User & Send Invite</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-7 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input className={iCls} value={form.full_name}
                onChange={e => set("full_name", e.target.value)} placeholder="e.g. John Adeyemi"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input className={iCls} type="email" value={form.email}
                onChange={e => set("email", e.target.value)} placeholder="e.g. john@hartlandng.com"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Staff No.</label>
                <input className={iCls} value={form.staff_no}
                  onChange={e => set("staff_no", e.target.value)} placeholder="e.g. STF-042"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Phone</label>
                <input className={iCls} value={form.phone}
                  onChange={e => set("phone", e.target.value)} placeholder="e.g. 08012345678"/>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.role === r.value ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                  <input type="radio" name="role" value={r.value}
                    checked={form.role === r.value}
                    onChange={() => set("role", r.value)}
                    className="accent-amber-500"/>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${r.color}`}>{r.label}</span>
                  <span className="text-xs text-slate-500">{r.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {!isAdmin && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Assigned Site(s) <span className="text-slate-400 font-normal ml-2 normal-case">— clerk/supervisor only</span>
              </label>
              <input placeholder="Search sites..." value={siteSearch}
                onChange={e => setSiteSearch(e.target.value)} className={iCls + " mb-3"}/>
              {form.assigned_sites.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.assigned_sites.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                      {s}<button onClick={() => toggleSite(s)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                {filteredSites.slice(0,50).map((s: any) => (
                  <label key={s.code}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                      form.assigned_sites.includes(s.name) ? "bg-amber-50" : "hover:bg-slate-50"
                    }`}>
                    <input type="checkbox" checked={form.assigned_sites.includes(s.name)}
                      onChange={() => toggleSite(s.name)} className="accent-amber-500"/>
                    <span className="font-mono text-xs text-slate-400 w-10 shrink-0">{s.code}</span>
                    <span className="text-sm text-slate-700 truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              ℹ️ This role has access to <strong>all sites</strong> — no site assignment needed.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">⚠️ {error}</div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleInvite} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Sending invite..." : "✉️ Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT USER MODAL (unchanged)
// ─────────────────────────────────────────────────────────────
function EditUserModal({ user, sites, onClose, onSave }: {
  user: any; sites: any[]; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    full_name:      user.full_name || "",
    phone:          user.phone || "",
    staff_no:       user.staff_no || "",
    role:           (user.roles||[])[0] || "plant_clerk",
    assigned_sites: user.assigned_sites || [],
  });
  const [saving,     setSaving]     = useState(false);
  const [siteSearch, setSiteSearch] = useState("");

  function toggleSite(siteName: string) {
    setForm(p => ({
      ...p,
      assigned_sites: p.assigned_sites.includes(siteName)
        ? p.assigned_sites.filter((s: string) => s !== siteName)
        : [...p.assigned_sites, siteName],
    }));
  }

  const isAdmin = ["plant_director","plant_manager","plant_engineer","plant_admin"].includes(form.role);
  const filteredSites = sites.filter((s: any) =>
    !siteSearch ||
    s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(siteSearch.toLowerCase())
  );

  async function handleSave() {
    setSaving(true);
    await dbu.from("profiles").update({
      full_name:      form.full_name,
      phone:          form.phone,
      staff_no:       form.staff_no,
      roles:          [form.role],
      assigned_sites: isAdmin ? [] : form.assigned_sites,
    }).eq("id", user.id);
    setSaving(false);
    onSave(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Edit User</p>
            <h2 className="text-lg font-bold text-white">{user.full_name || user.email}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-7 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input className={iCls} value={form.full_name}
                onChange={e => setForm(p => ({...p, full_name: e.target.value}))}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Staff No.</label>
                <input className={iCls} value={form.staff_no}
                  onChange={e => setForm(p => ({...p, staff_no: e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Phone</label>
                <input className={iCls} value={form.phone}
                  onChange={e => setForm(p => ({...p, phone: e.target.value}))}/>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Role</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.role === r.value ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                  <input type="radio" name="edit_role" value={r.value}
                    checked={form.role === r.value}
                    onChange={() => setForm(p => ({...p, role: r.value}))}
                    className="accent-amber-500"/>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${r.color}`}>{r.label}</span>
                  <span className="text-xs text-slate-500">{r.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {!isAdmin ? (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Assigned Sites</label>
              <input placeholder="Search sites..." value={siteSearch}
                onChange={e => setSiteSearch(e.target.value)} className={iCls + " mb-3"}/>
              {form.assigned_sites.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.assigned_sites.map((s: string) => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                      {s}<button onClick={() => toggleSite(s)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                {filteredSites.slice(0,50).map((s: any) => (
                  <label key={s.code}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-slate-50 last:border-0 ${
                      form.assigned_sites.includes(s.name) ? "bg-amber-50" : "hover:bg-slate-50"
                    }`}>
                    <input type="checkbox" checked={form.assigned_sites.includes(s.name)}
                      onChange={() => toggleSite(s.name)} className="accent-amber-500"/>
                    <span className="font-mono text-xs text-slate-400 w-10 shrink-0">{s.code}</span>
                    <span className="text-sm text-slate-700 truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              ℹ️ This role has access to all sites automatically.
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,      setUsers]      = useState<any[]>([]);
  const [sites,      setSites]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editUser,   setEditUser]   = useState<any>(null);
  const [addModal,   setAddModal]   = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [profile,    setProfile]    = useState<any>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: { user } } = await dbu.auth.getUser();
    if (user) {
      const { data: prof } = await dbu.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof);
    }
    const [usersRes, sitesRes] = await Promise.all([
      dbu.from("profiles").select("*").order("full_name"),
      dbu.from("sites").select("code,name,cost_code,type,region").order("code"),
    ]);
    setUsers(usersRes.data || []);
    setSites(sitesRes.data || []);
    setLoading(false);
  }

  async function handleDelete(user: any) {
    if (!confirm(`Delete ${user.full_name || user.email}? This cannot be undone.`)) return;

    try {
      // Delete via API route (needs service role key)
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Failed to delete user.");
        return;
      }
      // Remove from local state immediately
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: any) {
      alert(e.message || "Failed to delete user.");
    }
  }

  const roles: string[] = profile?.roles || [];
  const canManage = roles.some(r =>
    ["plant_manager","plant_director","plant_admin","super_admin"].includes(r)
  );

  const filtered = users.filter((u: any) => {
    if ((u.roles||[]).includes("super_admin") && !roles.includes("super_admin")) return false;
    const q = search.toLowerCase();
    const matchQ = !q ||
      (u.full_name||"").toLowerCase().includes(q) ||
      (u.email||"").toLowerCase().includes(q) ||
      (u.staff_no||"").toLowerCase().includes(q);
    return matchQ && (!filterRole || (u.roles||[]).includes(filterRole));
  });

  const stats = {
    total:       users.length,
    admins:      users.filter(u => (u.roles||[]).some((r:string) => ["plant_admin","plant_manager","plant_director"].includes(r))).length,
    engineers:   users.filter(u => (u.roles||[]).includes("plant_engineer")).length,
    supervisors: users.filter(u => (u.roles||[]).includes("site_supervisor")).length,
    clerks:      users.filter(u => (u.roles||[]).includes("plant_clerk")).length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage staff accounts, roles and site assignments.</p>
        </div>
        {canManage && (
          <button onClick={() => setAddModal(true)}
            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
            + Add User
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label:"Total Users",        value:stats.total,       bg:"bg-slate-900 text-white" },
          { label:"Admin / Management", value:stats.admins,      bg:"bg-amber-100 text-amber-700" },
          { label:"Engineers",          value:stats.engineers,   bg:"bg-blue-100 text-blue-700" },
          { label:"Supervisors",        value:stats.supervisors, bg:"bg-teal-100 text-teal-700" },
          { label:"Clerks",             value:stats.clerks,      bg:"bg-slate-100 text-slate-700" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{loading ? "..." : k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <input placeholder="Search name, email, staff no..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"}/>
          <select className={iCls} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Staff Directory</h2>
          <p className="text-slate-400 text-sm">{filtered.length} users</p>
        </div>
        <div className="overflow-auto max-h-[55vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Name","Email","Staff No.","Phone","Role","Assigned Sites","Actions"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">No users found.</td></tr>
              ) : filtered.map((u: any) => (
                <tr key={u.id} className="hover:bg-amber-50/30 group transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {(u.full_name||u.email||"?")[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{u.full_name||"—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs font-mono">{u.staff_no||"—"}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{u.phone||"—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles||[]).filter((r:string)=>r!=="super_admin").map((r: string) => (
                        <span key={r} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleStyle(r)}`}>
                          {getRoleLabel(r)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {(u.assigned_sites||[]).length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-50">
                        {(u.assigned_sites||[]).slice(0,2).map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs truncate max-w-22">{s}</span>
                        ))}
                        {(u.assigned_sites||[]).length > 2 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">
                            +{(u.assigned_sites||[]).length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {(u.roles||[]).some((r:string) =>
                          ["plant_director","plant_manager","plant_engineer","plant_admin"].includes(r))
                          ? "All sites" : "None assigned"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {canManage && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditUser(u)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 whitespace-nowrap">
                          Edit
                        </button>
                        {/* Don't allow deleting yourself or super_admin */}
                        {!(u.roles||[]).includes("super_admin") && (
                          <button onClick={() => handleDelete(u)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 whitespace-nowrap">
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Role Access Levels</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map(({ value, label, color, desc }) => (
            <div key={value} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${color}`}>{label}</span>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {addModal && <AddUserModal sites={sites} onClose={() => setAddModal(false)} onSave={loadAll}/>}
      {editUser && <EditUserModal user={editUser} sites={sites} onClose={() => setEditUser(null)} onSave={loadAll}/>}
    </div>
  );
}