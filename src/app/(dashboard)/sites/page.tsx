/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const TYPE_STYLE: Record<string, { header: string; row: string; badge: string; icon: string }> = {
  "Central Workshop":  { header: "bg-red-600 text-white",      row: "bg-red-50    hover:bg-red-100",    badge: "bg-red-100    text-red-700",    icon: "🏭" },
  "Regional Workshop": { header: "bg-orange-500 text-white",   row: "bg-orange-50 hover:bg-orange-100", badge: "bg-orange-100 text-orange-700", icon: "🔧" },
  "Field Workshop":    { header: "bg-amber-500 text-white",    row: "bg-amber-50  hover:bg-amber-100",  badge: "bg-amber-100  text-amber-700",  icon: "⚙️" },
  "Repair Yard":       { header: "bg-blue-600 text-white",     row: "bg-blue-50   hover:bg-blue-100",   badge: "bg-blue-100   text-blue-700",   icon: "🔩" },
  "Storage Yard":      { header: "bg-slate-600 text-white",    row: "bg-slate-50  hover:bg-slate-100",  badge: "bg-slate-100  text-slate-600",  icon: "📦" },
  "Project":           { header: "bg-emerald-600 text-white",  row: "bg-emerald-50 hover:bg-emerald-100",badge: "bg-emerald-100 text-emerald-700",icon: "🏗️" },
  "Office":            { header: "bg-purple-600 text-white",   row: "bg-purple-50 hover:bg-purple-100", badge: "bg-purple-100 text-purple-700", icon: "🏢" },
};

const SUFFIX: Record<string, string> = {
  "Central Workshop": "W", "Regional Workshop": "W", "Field Workshop": "W",
  "Repair Yard": "R", "Storage Yard": "S", "Project": "P", "Office": "",
};

// ─────────────────────────────────────────────────────────────────
// ADD SITE MODAL
// ─────────────────────────────────────────────────────────────────
function AddSiteModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [cluster,   setCluster]   = useState("");
  const [siteType,  setSiteType]  = useState("Project");
  const [location,  setLocation]  = useState(""); // e.g. "Iyahmo - Edo"
  const [region,    setRegion]    = useState("");
  const [legacy,    setLegacy]    = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const isProject = siteType === "Project";
  const suffix     = SUFFIX[siteType] || "";
  const code       = cluster ? `${cluster}${suffix}` : "";

  // Preview rows for project auto-cluster
  const previewRows = isProject && cluster && location ? [
    { code: `${cluster}P`, name: `Project - ${location}`,           type: "Project",      legacy: legacy || "NEW" },
    { code: `${cluster}W`, name: `Workshop (Field) - ${location}`,  type: "Field Workshop", legacy: "GENERATED" },
    { code: `${cluster}R`, name: `Yard (Repair) - ${location}`,     type: "Repair Yard",  legacy: "GENERATED" },
    { code: `${cluster}S`, name: `Yard (Storage) - ${location}`,    type: "Storage Yard", legacy: "GENERATED" },
  ] : null;

  // Validation
  const codeLen   = code.length;
  const isSR      = code.endsWith("SR");
  const codeValid = isSR ? codeLen === 5 : codeLen <= 4;

  async function handleSave() {
    if (!cluster || !location || !region) {
      setError("Cluster number, location name and region are required."); return;
    }
    if (!codeValid) {
      setError("Code must be max 4 characters (only 100SR allowed as 5)."); return;
    }

    setSaving(true); setError("");

    if (isProject && previewRows) {
      // Insert all 4 cluster rows at once
      const rows = previewRows.map(r => ({
        code: r.code, name: r.name, site_type: r.type,
        region, legacy_code: r.legacy, is_active: true,
      }));
      const { error: err } = await dbu.from("sites").insert(rows);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      // Single site insert
      const { error: err } = await dbu.from("sites").insert([{
        code, name: `${siteType === "Office" ? "" : TYPE_STYLE[siteType]?.icon + " "}${location}`.trim(),
        site_type: siteType, region, legacy_code: legacy || "NEW", is_active: true,
      }]);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false); onSave(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">New Site</p>
            <h2 className="text-lg font-bold text-white">
              {isProject ? "Add Project Cluster (P + W + R + S)" : "Add Site"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* Site type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Site Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_STYLE).map(([type, style]) => (
                <button key={type} type="button"
                  onClick={() => setSiteType(type)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    siteType === type
                      ? "border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-300"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}>
                  <span className="text-base">{style.icon}</span>
                  <span className="leading-tight text-center">{type.replace(" Workshop","WS").replace("Central WS","Central").replace("Regional WS","Regional").replace("Field WS","Field")}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cluster number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Cluster Number <span className="text-red-400">*</span>
              </label>
              <input className={iCls} placeholder="e.g. 200, 151, 032"
                value={cluster} onChange={e => setCluster(e.target.value.toUpperCase())} />
              {cluster && suffix && (
                <p className="text-xs text-amber-600 font-semibold mt-1">
                  Code will be: <span className="font-mono bg-amber-50 px-1.5 py-0.5 rounded">{code}</span>
                  {!codeValid && <span className="text-red-500 ml-1">— too long!</span>}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Region <span className="text-red-400">*</span>
              </label>
              <select className={iCls} value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">Select region...</option>
                {["Edo","South East","North","Delta","Abuja, FCT","South South"].map(r => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location name */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Location / Name <span className="text-red-400">*</span>
            </label>
            <input className={iCls}
              placeholder={isProject ? "e.g. New Road - Edo (used for all 4 entries)" : "e.g. Workshop (Field) - Ohafia - Abia"}
              value={location} onChange={e => setLocation(e.target.value)} />
            {isProject && (
              <p className="text-xs text-slate-400 mt-1">
                This location is used to auto-generate names for all 4 cluster sites.
              </p>
            )}
          </div>

          {/* Old cost code */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Old Hartland Code <span className="text-slate-300 font-normal">(optional)</span>
            </label>
            <input className={iCls} placeholder="e.g. 202, RY07 — for the main P entry"
              value={legacy} onChange={e => setLegacy(e.target.value)} />
          </div>

          {/* Project auto-cluster preview */}
          {previewRows && (
            <div className="border border-emerald-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2.5 flex items-center gap-2">
                <span className="text-emerald-600 text-sm font-bold">✓</span>
                <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  4 sites will be created automatically
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {previewRows.map(r => (
                  <div key={r.code} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="font-mono font-bold text-sm text-slate-800 w-14 shrink-0">{r.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${TYPE_STYLE[r.type]?.badge}`}>
                      {TYPE_STYLE[r.type]?.icon} {r.type}
                    </span>
                    <span className="text-xs text-slate-500 truncate">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving
              ? "Creating..."
              : isProject && previewRows
                ? `Create ${previewRows.length} Sites`
                : "Add Site"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EDIT SITE MODAL
// ─────────────────────────────────────────────────────────────────
function EditSiteModal({ site, onClose, onSave }: {
  site: any; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    name:       site.name       || "",
    site_type:  site.site_type  || "Project",
    region:     site.region     || "",
    legacy_code:site.legacy_code|| "",
    is_active:  site.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.name || !form.region) {
      setError("Name and region are required."); return;
    }
    setSaving(true);
    const { error: err } = await dbu.from("sites")
      .update({
        name:        form.name,
        site_type:   form.site_type,
        region:      form.region,
        legacy_code: form.legacy_code || site.legacy_code,
        is_active:   form.is_active,
      })
      .eq("id", site.id);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); onSave(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Edit Site</p>
            <h2 className="text-lg font-bold text-white font-mono">{site.code}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Code — read only */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Code</span>
            <span className="font-mono font-bold text-slate-800">{site.code}</span>
            <span className="text-xs text-slate-400 ml-auto">Read-only</span>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Site Name <span className="text-red-400">*</span>
            </label>
            <input className={iCls} value={form.name}
              onChange={e => set("name", e.target.value)} />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Site Type
            </label>
            <select className={iCls} value={form.site_type} onChange={e => set("site_type", e.target.value)}>
              {Object.keys(TYPE_STYLE).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Region */}
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

          {/* Old code */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Old Hartland Code
            </label>
            <input className={iCls} value={form.legacy_code}
              onChange={e => set("legacy_code", e.target.value)} />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={form.is_active}
                onChange={e => set("is_active", e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition-colors ${form.is_active ? "bg-emerald-500" : "bg-slate-200"}`}/>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-1"}`}/>
            </div>
            <span className="text-sm font-medium text-slate-700">
              {form.is_active ? "Active" : "Inactive"}
            </span>
          </label>

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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CLUSTER LEGEND
// ─────────────────────────────────────────────────────────────────
function ClusterLegend() {
  return (
    <div className="bg-slate-900 rounded-2xl p-5 text-white">
      <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-3">Code System</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {[
          { code: "100W",  label: "Central Workshop",  color: "text-red-400" },
          { code: "101W",  label: "Regional Workshop", color: "text-orange-400" },
          { code: "103W",  label: "Field Workshop",    color: "text-amber-400" },
          { code: "103P",  label: "Project",           color: "text-emerald-400" },
          { code: "100R",  label: "Repair Yard",       color: "text-blue-400" },
          { code: "100S",  label: "Storage Yard",      color: "text-slate-400" },
          { code: "100SR", label: "Scrap Yard (only 1)", color: "text-red-300" },
          { code: "010",   label: "Standalone (Office/Camp)", color: "text-purple-400" },
        ].map(r => (
          <div key={r.code} className="flex items-center gap-2">
            <span className={`font-mono font-bold ${r.color}`}>{r.code}</span>
            <span className="text-slate-400 text-[11px]">{r.label}</span>
          </div>
        ))}
      </div>
      <p className="text-slate-500 text-xs mt-3">
        Selecting <strong className="text-emerald-400">Project</strong> auto-creates all 4 cluster sites (P + W + R + S) in one click.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function SitesPage() {
  const { profile } = useAuth();
  const [sites,        setSites]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [addModal,     setAddModal]     = useState(false);
  const [editSite,     setEditSite]     = useState<any | null>(null);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [view,         setView]         = useState<"grouped"|"table">("grouped");
  const [showLegend,   setShowLegend]   = useState(false);

  const roles: string[] = profile?.roles || [];
  const canManage = roles.some(r => ["super_admin","plant_admin","plant_manager"].includes(r));

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
      (!filterRegion || s.region    === filterRegion);
  });

  const grouped = filtered.reduce((acc: any, s: any) => {
    const t = s.site_type || "Project";
    if (!acc[t]) acc[t] = [];
    acc[t].push(s);
    return acc;
  }, {});

  const typeOrder = [
    "Central Workshop","Regional Workshop","Field Workshop",
    "Repair Yard","Storage Yard","Project","Office",
  ];

  const regions = [...new Set(sites.map(s => s.region).filter(Boolean))].sort();

  const stats = {
    total:     sites.length,
    workshops: sites.filter(s => s.site_type?.includes("Workshop")).length,
    repair:    sites.filter(s => s.site_type === "Repair Yard").length,
    storage:   sites.filter(s => s.site_type === "Storage Yard").length,
    projects:  sites.filter(s => s.site_type === "Project").length,
    offices:   sites.filter(s => s.site_type === "Office").length,
  };

  // ── Shared action buttons for each row ──
  function RowActions({ s }: { s: any }) {
    return (
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {canManage && (<>
          <button
            onClick={() => setEditSite(s)}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 whitespace-nowrap">
            Edit
          </button>
          <button
            onClick={() => handleDelete(s)}
            disabled={deleting === s.id}
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 whitespace-nowrap">
            {deleting === s.id ? "..." : "Delete"}
          </button>
        </>)}
      </div>
    );
  }

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
        <div className="flex flex-wrap gap-3 shrink-0">
          <button onClick={() => setShowLegend(l => !l)}
            className="border border-slate-200 bg-white px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
            {showLegend ? "Hide" : "?"} Code Guide
          </button>
          {canManage && (
            <button onClick={() => setAddModal(true)}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm">
              + Add Site
            </button>
          )}
        </div>
      </div>

      {showLegend && <ClusterLegend />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Sites",    value: stats.total,     bg: "bg-slate-900 text-white" },
          { label: "Workshops",      value: stats.workshops,  bg: "bg-red-100 text-red-700" },
          { label: "Repair Yards",   value: stats.repair,    bg: "bg-blue-100 text-blue-700" },
          { label: "Storage Yards",  value: stats.storage,   bg: "bg-slate-100 text-slate-700" },
          { label: "Projects",       value: stats.projects,  bg: "bg-emerald-100 text-emerald-700" },
          { label: "Offices / Misc", value: stats.offices,   bg: "bg-purple-100 text-purple-700" },
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
                <div className={`px-6 py-4 flex items-center gap-3 ${style.header}`}>
                  <span className="text-xl">{style.icon}</span>
                  <div>
                    <h3 className="font-bold">{type}</h3>
                    <p className="text-xs opacity-75">{typeSites.length} site{typeSites.length > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["Code","Old Code","Site Name","Region","Status","Actions"].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {typeSites.map((s: any) => (
                        <tr key={s.id} className={`group transition-colors ${style.row}`}>
                          <td className="px-5 py-3">
                            <span className="font-bold text-slate-800 font-mono">{s.code}</span>
                          </td>
                          <td className="px-5 py-3">
                            {s.legacy_code && !["NEW","GENERATED"].includes(s.legacy_code) ? (
                              <span className="font-mono text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                {s.legacy_code}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 italic">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-700 max-w-72">{s.name}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{s.region}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                            }`}>
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3"><RowActions s={s}/></td>
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
                  {["Code","Old Code","Site Name","Type","Region","Status","Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">Loading sites...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">No sites match your filters.</td></tr>
                ) : filtered.map((s: any) => {
                  const style = TYPE_STYLE[s.site_type] || TYPE_STYLE["Project"];
                  return (
                    <tr key={s.id} className="hover:bg-amber-50/20 group transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-800 font-mono">{s.code}</span>
                      </td>
                      <td className="px-5 py-3">
                        {s.legacy_code && !["NEW","GENERATED"].includes(s.legacy_code) ? (
                          <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{s.legacy_code}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700 max-w-64 truncate">{s.name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                          {style.icon} {s.site_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{s.region}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                        }`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3"><RowActions s={s}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {addModal && (
        <AddSiteModal onClose={() => setAddModal(false)} onSave={fetchSites}/>
      )}
      {editSite && (
        <EditSiteModal site={editSite} onClose={() => setEditSite(null)} onSave={fetchSites}/>
      )}
    </div>
  );
}