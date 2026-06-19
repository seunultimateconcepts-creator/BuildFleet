/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const TYPE_STYLE: Record<string, { header: string; row: string; badge: string; icon: string }> = {
  "Central Workshop":  { header: "bg-red-600 text-white",     row: "bg-red-50    hover:bg-red-100",    badge: "bg-red-100    text-red-700",    icon: "🏭" },
  "Regional Workshop": { header: "bg-orange-500 text-white",  row: "bg-orange-50 hover:bg-orange-100", badge: "bg-orange-100 text-orange-700", icon: "🔧" },
  "Field Workshop":    { header: "bg-amber-500 text-white",   row: "bg-amber-50  hover:bg-amber-100",  badge: "bg-amber-100  text-amber-700",  icon: "⚙️" },
  "Repair Yard":       { header: "bg-blue-600 text-white",    row: "bg-blue-50   hover:bg-blue-100",   badge: "bg-blue-100   text-blue-700",   icon: "🔩" },
  "Storage Yard":      { header: "bg-slate-600 text-white",   row: "bg-slate-50  hover:bg-slate-100",  badge: "bg-slate-100  text-slate-600",  icon: "📦" },
  "Project":           { header: "bg-emerald-600 text-white", row: "bg-emerald-50 hover:bg-emerald-100",badge: "bg-emerald-100 text-emerald-700",icon: "🏗️" },
  "Office":            { header: "bg-purple-600 text-white",  row: "bg-purple-50 hover:bg-purple-100", badge: "bg-purple-100 text-purple-700", icon: "🏢" },
};

// ─────────────────────────────────────────────────────────────────
// ADD SITE MODAL
// ─────────────────────────────────────────────────────────────────
function AddSiteModal({ onClose, onSave }: {
  onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    code: "", name: "", site_type: "Project",
    region: "", cost_code: "", parent_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  // Auto-suggest code based on site_type suffix
  function suggestCode() {
    const suffix =
      form.site_type === "Central Workshop"  ? "W" :
      form.site_type === "Regional Workshop" ? "W" :
      form.site_type === "Field Workshop"    ? "W" :
      form.site_type === "Repair Yard"       ? "R" :
      form.site_type === "Storage Yard"      ? "S" :
      form.site_type === "Office"            ? "O" : "P";
    if (form.parent_code) {
      setForm(p => ({ ...p, code: `${form.parent_code}${suffix}` }));
    }
  }

  async function handleSave() {
    if (!form.code || !form.name || !form.region) {
      setError("Code, name and region are required."); return;
    }
    setSaving(true);
    const { error: err } = await dbu.from("sites").insert([{
      ...form,
      legacy_code: "NEW",
      is_active: true,
    }]);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSave(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">New Site</p>
            <h2 className="text-lg font-bold text-white">Add Site / Location</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            💡 New site code format: Parent + Type suffix.
            e.g. parent <strong>100</strong> + Workshop = <strong>100W</strong>,
            + Repair = <strong>100R</strong>, + Storage = <strong>100S</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Parent Code
              </label>
              <input className={iCls} placeholder="e.g. 100, 210, 400"
                value={form.parent_code}
                onChange={e => set("parent_code", e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Site Type <span className="text-red-400">*</span>
              </label>
              <select className={iCls} value={form.site_type}
                onChange={e => { set("site_type", e.target.value); }}>
                {Object.keys(TYPE_STYLE).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Site Code <span className="text-red-400">*</span>
              </label>
              <button type="button" onClick={suggestCode}
                className="text-xs text-amber-500 hover:text-amber-600 font-medium">
                Auto-suggest →
              </button>
            </div>
            <input className={iCls} placeholder="e.g. 100W, 210R, 400S"
              value={form.code}
              onChange={e => set("code", e.target.value.toUpperCase())} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Site Name <span className="text-red-400">*</span>
            </label>
            <input className={iCls} placeholder="e.g. Field Workshop - Ohafia - Abia"
              value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Region <span className="text-red-400">*</span>
              </label>
              <select className={iCls} value={form.region} onChange={e => set("region", e.target.value)}>
                <option value="">Select region...</option>
                {["Edo","South East","North","Delta","Abuja, FCT","South South"].map(r => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Cost Code
              </label>
              <input className={iCls} placeholder="e.g. 100W"
                value={form.cost_code} onChange={e => set("cost_code", e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Adding..." : "Add Site"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function SitesPage() {
  const { profile } = useAuth();
  const [sites,      setSites]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [addModal,   setAddModal]   = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [view,       setView]       = useState<"grouped"|"table">("grouped");

  const roles: string[] = profile?.roles || [];
  const canManage = roles.some(r =>
    ["super_admin","plant_admin","plant_manager"].includes(r));

  useEffect(() => { fetchSites(); }, []);

  async function fetchSites() {
    setLoading(true);
    const { data } = await dbu.from("sites").select("*").order("code");
    setSites(data || []);
    setLoading(false);
  }

  async function handleDelete(site: any) {
    if (!confirm(`Delete "${site.name}" (${site.code})? This cannot be undone.`)) return;
    setDeleting(site.id);
    await dbu.from("sites").delete().eq("id", site.id);
    setSites(prev => prev.filter(s => s.id !== site.id));
    setDeleting(null);
  }

  const filtered = sites.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      (s.name||"").toLowerCase().includes(q) ||
      (s.code||"").toLowerCase().includes(q) ||
      (s.legacy_code||"").toLowerCase().includes(q) ||
      (s.region||"").toLowerCase().includes(q);
    return matchQ &&
      (!filterType   || s.site_type === filterType) &&
      (!filterRegion || s.region === filterRegion);
  });

  // Group by site_type
  const grouped = filtered.reduce((acc: any, s: any) => {
    const t = s.site_type || "Project";
    if (!acc[t]) acc[t] = [];
    acc[t].push(s);
    return acc;
  }, {});

  const typeOrder = [
    "Central Workshop","Regional Workshop","Field Workshop",
    "Repair Yard","Storage Yard","Project","Office"
  ];

  const regions = [...new Set(sites.map(s => s.region).filter(Boolean))].sort();

  const stats = {
    total:    sites.length,
    workshops: sites.filter(s => s.site_type?.includes("Workshop")).length,
    repair:   sites.filter(s => s.site_type === "Repair Yard").length,
    storage:  sites.filter(s => s.site_type === "Storage Yard").length,
    projects: sites.filter(s => s.site_type === "Project").length,
    newSites: sites.filter(s => s.legacy_code === "NEW").length,
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sites</h1>
          <p className="text-slate-500 mt-1 text-sm">
            All Hartland project sites, workshops, repair yards and storage yards.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setAddModal(true)}
            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
            + Add Site
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Sites",  value: stats.total,     bg: "bg-slate-900 text-white" },
          { label: "Workshops",    value: stats.workshops,  bg: "bg-red-100 text-red-700" },
          { label: "Repair Yards", value: stats.repair,    bg: "bg-blue-100 text-blue-700" },
          { label: "Storage Yards",value: stats.storage,   bg: "bg-slate-100 text-slate-700" },
          { label: "Projects",     value: stats.projects,  bg: "bg-emerald-100 text-emerald-700" },
          { label: "🆕 New",       value: stats.newSites,  bg: "bg-amber-100 text-amber-700" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className="text-2xl font-bold">{loading ? "..." : k.value}</p>
            <p className="text-xs opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search code, name, old code, region..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {Object.keys(TYPE_STYLE).map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={iCls} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {sites.length} sites
          </p>
          <div className="flex gap-2">
            {(["grouped","table"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  view === v ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
                {v === "grouped" ? "🗂 Grouped" : "☰ Table"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GROUPED VIEW */}
      {view === "grouped" && (
        <div className="space-y-6">
          {typeOrder.map(type => {
            const typeSites = grouped[type];
            if (!typeSites || typeSites.length === 0) return null;
            const style = TYPE_STYLE[type] || TYPE_STYLE["Project"];
            return (
              <div key={type} className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                {/* Coloured header */}
                <div className={`px-6 py-4 flex items-center gap-3 ${style.header}`}>
                  <span className="text-xl">{style.icon}</span>
                  <div>
                    <h3 className="font-bold">{type}</h3>
                    <p className="text-xs opacity-75">{typeSites.length} sites</p>
                  </div>
                </div>
                {/* White table body — always light, always readable */}
                <div className="bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["New Code","Old Code","Site Name","Region","Cost Code","Status",""].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {typeSites.map((s: any) => (
                        <tr key={s.id} className={`group transition-colors ${style.row}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 font-mono">{s.code}</span>
                              {s.legacy_code === "NEW" && (
                                <span className="px-1.5 py-0.5 bg-amber-400 text-white text-[10px] font-bold rounded">NEW</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {s.legacy_code && s.legacy_code !== "NEW" ? (
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {s.legacy_code}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 italic">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-700 max-w-72 truncate">{s.name}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{s.region}</td>
                          <td className="px-5 py-3 text-slate-400 text-xs font-mono">{s.cost_code || "—"}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                            }`}>
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {canManage && (
                              <button
                                onClick={() => handleDelete(s)}
                                disabled={deleting === s.id}
                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 whitespace-nowrap">
                                {deleting === s.id ? "..." : "Delete"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {["New Code","Old Code","Site Name","Type","Region","Cost Code","Status",""].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400">Loading sites...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400">No sites match your filters.</td></tr>
                ) : filtered.map((s: any) => {
                  const style = TYPE_STYLE[s.site_type] || TYPE_STYLE["Project"];
                  return (
                    <tr key={s.id} className="hover:bg-amber-50/20 group transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 font-mono">{s.code}</span>
                          {s.legacy_code === "NEW" && (
                            <span className="px-1.5 py-0.5 bg-amber-400 text-white text-[10px] font-bold rounded">NEW</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {s.legacy_code && s.legacy_code !== "NEW" ? (
                          <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {s.legacy_code}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700 max-w-64 truncate">{s.name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge || "bg-slate-100 text-slate-600"}`}>
                          {style.icon} {s.site_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{s.region}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs font-mono">{s.cost_code || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                        }`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {canManage && (
                          <button
                            onClick={() => handleDelete(s)}
                            disabled={deleting === s.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 whitespace-nowrap">
                            {deleting === s.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addModal && (
        <AddSiteModal onClose={() => setAddModal(false)} onSave={fetchSites} />
      )}
    </div>
  );
}