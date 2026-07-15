/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import {
  NewJobOrderModal, JobCardModal, printJobOrder,
  STATUS_STYLE,
} from "@/components/dashboard/job-order-modals";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function RepairPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [rows,          setRows]          = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [totalSpent,    setTotalSpent]    = useState(0);
  const [modal,         setModal]         = useState(false);
  const [jobCard,       setJobCard]       = useState<any>(null);
  const [search,        setSearch]        = useState(() => searchParams.get("fleet") || "");
  const [filterSite,    setFilterSite]    = useState("");

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]); // eslint-disable-line

  async function fetchData() {
    setLoading(true);
    const roles: string[] = profile?.roles || [];
    const assignedSites: string[] = profile?.assigned_sites || [];
    const isRestricted = (roles.includes("plant_clerk") || roles.includes("site_supervisor")) &&
      !roles.some((r:string) => ["plant_admin","plant_manager","plant_engineer","plant_director","super_admin"].includes(r));

    // 1. Every piece of equipment currently Break Down / Under Repair —
    // this is the source of truth for the page, NOT the maintenance
    // table. Equipment can be here with zero job orders raised yet.
    let eqQuery = dbu.from("equipment")
      .select("id,fleet_number,name,site,operational_status,breakdown_flagged_at")
      .in("operational_status", ["Break Down", "Under Repair"])
      .order("breakdown_flagged_at", { ascending: true });
    if (isRestricted && assignedSites.length > 0) {
      eqQuery = eqQuery.in("site", assignedSites);
    }
    const { data: eqData } = await eqQuery;
    const equipment = eqData || [];

    // 2. Any ACTIVE (non-completed) maintenance record for those equipment
    // ids — this is what we merge in to show real status, job order no,
    // and let us jump into the Job Card.
    const equipmentIds = equipment.map((e:any) => e.id);
    let activeJobs: any[] = [];
    if (equipmentIds.length > 0) {
      const { data } = await dbu.from("maintenance")
        .select("*")
        .in("equipment_id", equipmentIds)
        .neq("status", "Completed")
        .neq("status", "Cancelled")
        .order("created_at", { ascending: false });
      activeJobs = data || [];
    }
    const jobByEquipmentId = new Map<string, any>();
    for (const job of activeJobs) {
      // keep the most recent active job per equipment (query already
      // ordered newest-first, so first-seen wins)
      if (!jobByEquipmentId.has(job.equipment_id)) jobByEquipmentId.set(job.equipment_id, job);
    }

    const merged = equipment.map((eq:any) => ({
      equipment: eq,
      job: jobByEquipmentId.get(eq.id) || null,
    }));
    setRows(merged);

    // 3. Total Amount Spent — lifetime, Completed jobs only. Same
    // calculation as the Maintenance page's Total Cost card, deliberately
    // NOT scoped to only currently-broken-down equipment, since it's a
    // running lifetime total.
    const { data: completedJobs } = await dbu.from("maintenance")
      .select("cost")
      .eq("status", "Completed");
    setTotalSpent((completedJobs || []).reduce((s:number, r:any) => s + (Number(r.cost) || 0), 0));

    setLoading(false);
  }

  const filtered = rows.filter(({ equipment, job }) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      equipment.fleet_number.toLowerCase().includes(q) ||
      (equipment.name||"").toLowerCase().includes(q) ||
      (job?.issue||"").toLowerCase().includes(q);
    const matchSite = !filterSite || equipment.site === filterSite;
    return matchQ && matchSite;
  });

  const stats = {
    pending:        rows.filter(r => (r.job?.status || "Pending") === "Pending").length,
    awaitingParts:  rows.filter(r => r.job?.status === "Awaiting Parts").length,
    inProgress:     rows.filter(r => r.job?.status === "In Progress").length,
  };

  // Equipment that still needs a job order raised — this is what feeds
  // the restricted picker in NewJobOrderModal. Equipment already has
  // breakdown_flagged_at on it (needed for the Date In default).
  const needsJobOrder = rows.filter(r => !r.job).map(r => r.equipment);

  const allSites = [...new Set(rows.map(r => r.equipment.site).filter(Boolean))].sort();

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Repair</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Every piece of equipment currently Break Down or Under Repair — whether or not a job order has been raised yet.
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 shadow-sm shrink-0 flex items-center gap-2">
          ⚠️ New Job Order
        </button>
      </div>

      {/* KPIs — exactly 4 cards, no "Completed" (equipment leaves this
          page entirely once repaired) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.pending}</p>
          <p className="text-sm opacity-70 mt-1">Pending</p>
        </div>
        <div className="bg-orange-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.awaitingParts}</p>
          <p className="text-sm opacity-70 mt-1">Awaiting Parts</p>
        </div>
        <div className="bg-blue-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.inProgress}</p>
          <p className="text-sm opacity-70 mt-1">In Progress</p>
        </div>
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-xl font-bold">₦{totalSpent.toLocaleString("en-NG",{notation:"compact"})}</p>
          <p className="text-sm opacity-70 mt-1">Total Amount Spent (lifetime)</p>
        </div>
      </div>

      {needsJobOrder.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">
              {needsJobOrder.length} equipment awaiting a job order
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {needsJobOrder.map((e:any)=>e.fleet_number).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <input placeholder="Search fleet no., name, issue..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {allSites.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Equipment Under Repair</h2>
          <p className="text-slate-400 text-sm">{filtered.length} of {rows.length}</p>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Fleet No.","Description","Site","Flagged","Job Order","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                  No equipment currently under repair. 🎉
                </td></tr>
              ) : filtered.map(({ equipment, job }) => (
                <tr key={equipment.id} className="hover:bg-red-50/20 transition-colors group">
                  <td className="px-4 py-4 font-bold text-amber-600 font-mono text-xs">{equipment.fleet_number}</td>
                  <td className="px-4 py-4 text-slate-700 text-xs max-w-48 truncate">{equipment.name}</td>
                  <td className="px-4 py-4 text-slate-500 text-xs max-w-32 truncate">{equipment.site || "—"}</td>
                  <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {equipment.breakdown_flagged_at
                      ? new Date(equipment.breakdown_flagged_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})
                      : "—"}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">{job?.job_order_no || "—"}</td>
                  <td className="px-4 py-4">
                    {job ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[job.status]||""}`}>{job.status}</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Awaiting Job Order</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {job ? (
                        <>
                          <button onClick={() => setJobCard(job)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 whitespace-nowrap">
                            Job Card
                          </button>
                          <button onClick={() => printJobOrder(job)}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 whitespace-nowrap">
                            PLT-06
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setModal(true)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 whitespace-nowrap">
                          Raise Job Order
                        </button>
                      )}
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
        onSave={fetchData}
        profile={profile}
        restrictEquipment={needsJobOrder}
        defaultType="Breakdown"
      />
      {jobCard && <JobCardModal record={jobCard} onClose={() => setJobCard(null)} onUpdate={fetchData} profile={profile} />}
    </div>
  );
}