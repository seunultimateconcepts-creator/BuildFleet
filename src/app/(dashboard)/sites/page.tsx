/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

const TYPE_COLORS: Record<string, string> = {
  "Project":            "bg-blue-100 text-blue-700",
  "Yard (Storage)":     "bg-slate-100 text-slate-600",
  "Yard (Repair)":      "bg-amber-100 text-amber-700",
  "Yard (Scrap)":       "bg-red-100 text-red-600",
  "Workshop (Central)": "bg-purple-100 text-purple-700",
  "Workshop (Field)":   "bg-indigo-100 text-indigo-700",
  "Asphalt Plant":      "bg-orange-100 text-orange-700",
  "Overhead":           "bg-gray-100 text-gray-600",
  "Haulage Yard":       "bg-teal-100 text-teal-700",
  "Other":              "bg-slate-100 text-slate-500",
};

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

export default function SitesPage() {
  const [sites,        setSites]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [modal,        setModal]        = useState(false);
  const [newSite,      setNewSite]      = useState({
    code:"", name:"", type:"Project",
    region:"", cost_code:"", project_manager:""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSites(); }, []);

  async function loadSites() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await dbu
        .from("sites")
        .select("id, code, name, type, region, cost_code, project_manager, is_active")
        .order("code", { ascending: true });
      if (err) { setError(err.message); setLoading(false); return; }
      setSites(data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load sites");
    }
    setLoading(false);
  }

  async function handleAddSite() {
    if (!newSite.code || !newSite.name || !newSite.region) return;
    setSaving(true);
    await dbu.from("sites").insert([{
      ...newSite,
      cost_code: newSite.cost_code || newSite.code,
      is_active: true
    }]);
    setSaving(false);
    setModal(false);
    setNewSite({ code:"", name:"", type:"Project", region:"", cost_code:"", project_manager:"" });
    loadSites();
  }

  function exportCSV() {
    const headers = ["Code","Name","Type","Region","Cost Code","Project Manager","Status"];
    const rows = filtered.map((s: any) => [
      s.code, s.name, s.type, s.region,
      s.cost_code||"", s.project_manager||"",
      s.is_active ? "Active" : "Inactive"
    ]);
    const csv = [headers,...rows]
      .map(r => r.map((v:any) => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `Sites_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const filtered = sites.filter((s: any) => {
    const q = search.toLowerCase();
    return (
      (!q || s.code.toLowerCase().includes(q) ||
       s.name.toLowerCase().includes(q) ||
       s.region.toLowerCase().includes(q)) &&
      (!filterType   || s.type   === filterType) &&
      (!filterRegion || s.region === filterRegion)
    );
  });

  const regions   = [...new Set(sites.map((s:any) => s.region))].filter(Boolean).sort() as string[];
  const siteTypes = [...new Set(sites.map((s:any) => s.type))].filter(Boolean).sort()   as string[];

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sites</h1>
          <p className="text-slate-500 mt-1 text-sm">
            All Hartland operational sites, yards, and workshops.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={exportCSV}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">
            ↓ Export
          </button>
          <button onClick={() => setModal(true)}
            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm">
            + Add Site
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{sites.length}</p>
          <p className="text-sm opacity-70 mt-1">Total Sites</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-3xl font-bold text-slate-800">
            {sites.filter((s:any) => s.type === "Project").length}
          </p>
          <p className="text-sm text-slate-500 mt-1">Projects</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-3xl font-bold text-slate-800">
            {sites.filter((s:any) => s.type?.includes("Yard")).length}
          </p>
          <p className="text-sm text-slate-500 mt-1">Yards</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-3xl font-bold text-slate-800">
            {sites.filter((s:any) => s.type?.includes("Workshop")).length}
          </p>
          <p className="text-sm text-slate-500 mt-1">Workshops</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input
            placeholder="Search code, name, region..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {siteTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={iCls} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <p className="text-sm text-slate-500 mt-3">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {sites.length} sites
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500">Loading sites...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-semibold mb-2">⚠️ Error loading sites</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button onClick={loadSites}
              className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold">
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full text-sm min-w-175">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {["Cost Code","Site Name","Type","Region","Project Manager","Status"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                      No sites match your filters.
                    </td>
                  </tr>
                ) : filtered.map((s: any) => (
                  <tr key={s.id || s.code} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-lg">
                        {s.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 max-w-xs">
                      <div className="truncate">{s.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        TYPE_COLORS[s.type] || "bg-slate-100 text-slate-500"
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{s.region}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{s.project_manager || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Site Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add New Site</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Cost Code *
                  </label>
                  <input className={iCls} value={newSite.code}
                    onChange={e => setNewSite(p => ({...p, code: e.target.value}))}
                    placeholder="e.g. 611" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Type *
                  </label>
                  <select className={iCls} value={newSite.type}
                    onChange={e => setNewSite(p => ({...p, type: e.target.value}))}>
                    {["Project","Yard (Storage)","Yard (Repair)","Yard (Scrap)",
                      "Workshop (Central)","Workshop (Field)","Asphalt Plant",
                      "Overhead","Haulage Yard","Other"].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Site Name *
                </label>
                <input className={iCls} value={newSite.name}
                  onChange={e => setNewSite(p => ({...p, name: e.target.value}))}
                  placeholder="e.g. Project - New Site - Edo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Region *
                  </label>
                  <select className={iCls} value={newSite.region}
                    onChange={e => setNewSite(p => ({...p, region: e.target.value}))}>
                    <option value="">Select region...</option>
                    {["Edo","Abia","Delta","Imo","South East","South South",
                      "North","Abuja, FCT","Cross River","Kaduna"].map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Project Manager
                  </label>
                  <input className={iCls} value={newSite.project_manager}
                    onChange={e => setNewSite(p => ({...p, project_manager: e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
                Cancel
              </button>
              <button onClick={handleAddSite} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Saving..." : "Add Site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}