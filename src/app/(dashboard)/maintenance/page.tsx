/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import {
  NewJobOrderModal, JobCardModal, printJobOrder,
  STATUS_STYLE, TYPE_STYLE,
} from "@/components/dashboard/job-order-modals";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// Note: this page now only handles Scheduled / Preventive / Third
// Party maintenance — anything Breakdown-related lives on the Repair
// page instead, sourced straight from equipment status rather than
// requiring someone to remember to log it here first. The WSPT/WMC
// service-due forecasting rebuild is a separate follow-up (needs the
// average-usage calculation from Daily Logs before it can work).
// ─────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const { profile } = useAuth();
  const [records,      setRecords]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [jobCard,      setJobCard]      = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [filterSite,   setFilterSite]   = useState("");
  const [search,       setSearch]       = useState("");
  const [tab,          setTab]          = useState<"all"|"scheduled"|"completed">("all");

  useEffect(() => {
    if (profile) fetchRecords();
  }, [profile]); // eslint-disable-line

  async function fetchRecords() {
    setLoading(true);
    const roles: string[] = profile?.roles || [];
    const assignedSites: string[] = profile?.assigned_sites || [];
    const isRestricted = (roles.includes("plant_clerk") || roles.includes("site_supervisor")) &&
      !roles.some((r:string) => ["plant_admin","plant_manager","plant_engineer","plant_director","super_admin"].includes(r));

    // Maintenance page now excludes Breakdown-type jobs — those live on
    // the Repair page. This keeps the two views cleanly separated
    // instead of showing overlapping data two different ways.
    let q = dbu.from("maintenance").select("*")
      .neq("maintenance_type", "Breakdown")
      .order("created_at", { ascending: false });
    if (isRestricted && assignedSites.length > 0) {
      q = q.in("site", assignedSites);
    }
    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  }

  const tabFiltered = records.filter(r => {
    if (tab === "scheduled") return ["Scheduled","Preventive"].includes(r.maintenance_type);
    if (tab === "completed") return r.status === "Completed";
    return true;
  });

  const filtered = tabFiltered.filter((r:any) => {
    const q = search.toLowerCase();
    return (
      (!q || r.equipment_code.toLowerCase().includes(q) || (r.issue||"").toLowerCase().includes(q) || (r.site||"").toLowerCase().includes(q)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterType   || r.maintenance_type === filterType) &&
      (!filterSite   || r.site === filterSite)
    );
  });

  const stats = {
    total:      records.length,
    pending:    records.filter(r => r.status === "Pending").length,
    inProgress: records.filter(r => r.status === "In Progress").length,
    completed:  records.filter(r => r.status === "Completed").length,
    totalCost:  records.filter(r => r.status === "Completed").reduce((s,r) => s + (r.cost||0), 0),
  };

  const allSites = [...new Set(records.map(r => r.site).filter(Boolean))].sort();

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Scheduled services, preventive maintenance and third-party work.
            Breakdowns are tracked on the Repair page.
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0 flex items-center gap-2">
          🔧 New Job Order
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm opacity-70 mt-1">Total Jobs</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.pending}</p>
          <p className="text-sm opacity-70 mt-1">Pending</p>
        </div>
        <div className="bg-blue-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.inProgress}</p>
          <p className="text-sm opacity-70 mt-1">In Progress</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.completed}</p>
          <p className="text-sm opacity-70 mt-1">Completed</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-lg font-bold text-slate-800">₦{stats.totalCost.toLocaleString("en-NG",{notation:"compact"})}</p>
          <p className="text-sm text-slate-500 mt-1">Total Cost</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {([
          ["all",       "📋 All Jobs"],
          ["scheduled", "🔧 Scheduled / Preventive"],
          ["completed", `✅ Completed (${stats.completed})`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search fleet no., issue, site..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {["Pending","Awaiting Parts","In Progress","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {allSites.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Job Register</h2>
            <p className="text-slate-400 text-sm">{filtered.length} records</p>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Job Order","Fleet No.","Type","Site","Issue","Reported","Technician","Status","Cost","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-400">
                  No records found. Click &quot;New Job Order&quot; to log scheduled or preventive work.
                </td></tr>
              ) : filtered.map((r:any) => (
                <tr key={r.id} className="group transition-colors hover:bg-amber-50/30">
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">{r.job_order_no||`JO-${r.id?.slice(0,6).toUpperCase()}`}</td>
                  <td className="px-4 py-4 font-bold text-amber-600 font-mono text-xs">{r.equipment_code}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_STYLE[r.maintenance_type]||"bg-slate-100 text-slate-600"}`}>
                      {r.maintenance_type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs max-w-32 truncate">{r.site||"—"}</td>
                  <td className="px-4 py-4 text-slate-700 text-xs max-w-48 truncate">{r.issue}</td>
                  <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(r.reported_date||r.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-xs">{r.technician||"—"}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status]||""}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-xs whitespace-nowrap">
                    {r.cost ? `₦${Number(r.cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setJobCard(r)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 whitespace-nowrap">
                        Job Card
                      </button>
                      <button onClick={() => printJobOrder(r)}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 whitespace-nowrap">
                        PLT-06
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewJobOrderModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={fetchRecords}
        profile={profile}
        defaultType="Scheduled"
      />
      {jobCard && <JobCardModal record={jobCard} onClose={() => setJobCard(null)} onUpdate={fetchRecords} profile={profile} />}
    </div>
  );
}