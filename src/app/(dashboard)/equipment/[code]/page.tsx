/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { printTransfer } from "@/lib/transfer-print";

// ─────────────────────────────────────────────────────────────
// CONSTANTS — Storage replaces Idle/Stand By
// ─────────────────────────────────────────────────────────────
const ALL_STATUSES    = ["Working","Under Repair","Break Down","Storage","Scrapped"];
const CLERK_STATUSES  = ["Working","Break Down","Storage"];

const STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Storage":      "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
};

const TRANSFER_STATUS_STYLE: Record<string, string> = {
  "Pending Approval": "bg-orange-100 text-orange-700",
  "Pending":          "bg-amber-100  text-amber-700",
  "In Transit":       "bg-blue-100   text-blue-700",
  "Received":         "bg-emerald-100 text-emerald-700",
  "Rejected":         "bg-red-100    text-red-600",
  "Cancelled":        "bg-slate-100  text-slate-500",
};

const HISTORY_ICONS: Record<string, string> = {
  "Commissioned":          "🏗️",
  "Transferred":           "🔄",
  "Status Changed":        "🔧",
  "Maintenance Started":   "⚠️",
  "Maintenance Completed": "✅",
  "Log Submitted":         "📋",
  "Moved to Scrap":        "🗑️",
  "Allocation Changed":    "👤",
  "Deleted":               "❌",
};

const YARD_CONFIG: Partial<Record<string, { label: string; siteTypes: string[] }>> = {
  "Break Down":   { label: "Repair Yard",               siteTypes: ["Repair Yard"] },
  "Under Repair": { label: "Workshop",                  siteTypes: ["Central Workshop","Regional Workshop","Field Workshop"] },
  "Storage":      { label: "Storage Yard",              siteTypes: ["Storage Yard"] },
  "Scrapped":     { label: "Disposal / Scrap Location", siteTypes: [] },
};

const fmt = (d: string) => d
  ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDateTime = (d: string) => d
  ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

// ─────────────────────────────────────────────────────────────
// STATUS MODAL
// ─────────────────────────────────────────────────────────────
function StatusModal({ equip, isClerk, onClose, onSave }: {
  equip: any; isClerk: boolean;
  onClose: () => void;
  onSave: (status: string, yard: string) => Promise<void>;
}) {
  const [allSites,      setAllSites]      = useState<any[]>([]);
  const [filteredYards, setFilteredYards] = useState<any[]>([]);
  const [status,        setStatus]        = useState<string>(equip.operational_status || "Working");
  const [yard,          setYard]          = useState<string>(equip.current_yard || "");
  const [search,        setSearch]        = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const availableStatuses = isClerk ? CLERK_STATUSES : ALL_STATUSES;
  const yardConfig = YARD_CONFIG[status];
  const needsYard  = !!yardConfig;

  useEffect(() => {
    dbu.from("sites")
      .select("id,name,code,region,site_type")
      .order("code", { ascending: true })
      .then(({ data }: { data: any[] | null }) => setAllSites(data || []));
  }, []);

  useEffect(() => {
    const config = YARD_CONFIG[status];
    if (!config) { setFilteredYards([]); return; }
    const base = config.siteTypes.length === 0
      ? allSites
      : allSites.filter(s => config.siteTypes.includes(s.site_type));
    setFilteredYards(base);
    setYard("");
    setSearch("");
  }, [status, allSites]);

  const filteredSites = allSites.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    (s.region||"").toLowerCase().includes(search.toLowerCase())
  );

  const sameRegion = filteredSites.filter(s => s.region === equip.region);
  const otherSites = filteredSites.filter(s => s.region !== equip.region);
  const sortedSites = [...sameRegion, ...otherSites];

  async function handleSave() {
    if (needsYard && !yard.trim()) {
      setError(`Please select the ${yardConfig!.label.toLowerCase()}.`);
      return;
    }
    setSaving(true); setError("");
    await onSave(status, yard.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Update Status</p>
            <h3 className="font-bold text-white text-lg">{equip.fleet_number}</h3>
            <p className="text-slate-400 text-xs mt-0.5 truncate max-w-60">{equip.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {isClerk && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
              ℹ️ As Plant Clerk you can update to: Working, Break Down or Storage only.
            </div>
          )}

          {equip.current_yard && (
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 text-xs text-slate-500">
              Current location: <span className="font-semibold text-slate-700">{equip.current_yard}</span>
            </div>
          )}

          <div className="space-y-2">
            {availableStatuses.map(s => (
              <label key={s}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  status === s ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                <input type="radio" name="status" value={s}
                  checked={status === s}
                  onChange={() => { setStatus(s); setYard(""); setError(""); }}
                  className="accent-amber-500" />
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s] || "bg-slate-100 text-slate-600"}`}>
                  {s}
                </span>
                {s === "Break Down" && <span className="text-xs text-slate-400 ml-auto">→ repair yard</span>}
                {s === "Storage"    && <span className="text-xs text-slate-400 ml-auto">→ storage yard</span>}
                {s === "Scrapped"   && <span className="text-xs text-slate-400 ml-auto">→ scrap yard</span>}
                {s === "Working"    && <span className="text-xs text-slate-400 ml-auto">→ project site</span>}
              </label>
            ))}
          </div>

          {needsYard && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {yardConfig!.label} <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-slate-400">
                  {filteredYards.length} {yardConfig!.label.toLowerCase()}s available
                  {equip.region ? ` · ${equip.region} shown first` : ""}
                </p>
              </div>
              <input
                placeholder={`Search ${yardConfig!.label.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {(() => {
                  const searched = filteredYards.filter(s =>
                    !search ||
                    s.name.toLowerCase().includes(search.toLowerCase()) ||
                    s.code.toLowerCase().includes(search.toLowerCase())
                  );
                  const sameRegion = searched.filter(s => s.region === equip.region);
                  const others     = searched.filter(s => s.region !== equip.region);
                  const sorted     = [...sameRegion, ...others];
                  return sorted.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No {yardConfig!.label.toLowerCase()}s found.</p>
                  ) : sorted.map(s => (
                    <label key={s.id || s.code}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        yard === s.name ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                      }`}>
                      <input type="radio" name="yard" value={s.name}
                        checked={yard === s.name} onChange={() => setYard(s.name)}
                        className="accent-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {s.code}
                          {s.region && ` · ${s.region}`}
                          {s.region === equip.region && <span className="ml-1.5 text-amber-500 font-semibold">★ Same region</span>}
                        </p>
                      </div>
                    </label>
                  ));
                })()}
              </div>
            </div>
          )}

          {status === "Working" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700">
              Equipment will be marked as operational at its current site.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Update Status ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// InfoRow + Section helpers
// ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: any }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-700 text-right ml-4 max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

// Small labeled fact used inside the transfer cards below
function Fact({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <p className="text-slate-400 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-slate-800 mt-0.5">{value || "—"}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TRANSFERS TAB — the comprehensive dispatched/approved/received
// trail per equipment, sourced straight from the `transfers` table
// (no new table — this data already exists, just wasn't surfaced
// per-equipment before).
// ─────────────────────────────────────────────────────────────
function TransfersTab({ transfers }: { transfers: any[] }) {
  if (transfers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-16 text-center text-slate-400 text-sm">
        This equipment has never been transferred between sites.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Transfer History</h3>
        <p className="text-slate-400 text-sm">Every site-to-site movement — who dispatched, who approved, who received</p>
      </div>
      <div className="divide-y divide-slate-100">
        {transfers.map((t: any) => {
          const isPendingApproval = t.approval_status === "Pending Approval";
          const isRejected        = t.approval_status === "Rejected";
          return (
            <div key={t.id} className="px-6 py-5">
              {/* Header — from/to, type, current status */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{t.from_site}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-bold text-slate-800 text-sm">{t.to_site}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                    t.transfer_type === "Final Release" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}>{t.transfer_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TRANSFER_STATUS_STYLE[t.status] || "bg-slate-100 text-slate-500"}`}>
                    {t.status}
                  </span>
                  <button onClick={() => printTransfer(t)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                    🖨 Print
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Dispatched */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-3">🚚 Dispatched</p>
                  <div className="space-y-2.5 text-xs">
                    <Fact label="Officer" value={t.dispatching_officer} />
                    <Fact label="Plant Engineer" value={t.dispatching_plant_engineer} />
                    <Fact label="Date" value={fmtDateTime(t.transfer_date)} />
                    <Fact label="Condition" value={t.equipment_condition_dispatch} />
                    <Fact label="Transport" value={t.transport_mode} />
                  </div>
                </div>

                {/* Approved */}
                <div className={`rounded-xl p-4 border ${
                  isRejected ? "bg-red-50 border-red-200" :
                  isPendingApproval ? "bg-orange-50 border-orange-200" :
                  "bg-blue-50 border-blue-200"
                }`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${
                    isRejected ? "text-red-600" : isPendingApproval ? "text-orange-600" : "text-blue-600"
                  }`}>
                    {isRejected ? "✗ Rejected" : isPendingApproval ? "⏳ Awaiting Approval" : "✓ Approved"}
                  </p>
                  <div className="space-y-2.5 text-xs">
                    <Fact label="By" value={t.approved_by} />
                    <Fact label="Date" value={t.approved_at ? fmtDateTime(t.approved_at) : "—"} />
                    <Fact label="Initiated By" value={t.initiated_by || t.dispatching_officer} />
                    {t.approval_note && <Fact label="Note" value={t.approval_note} />}
                  </div>
                </div>

                {/* Received */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3">📥 Received</p>
                  <div className="space-y-2.5 text-xs">
                    <Fact label="Officer" value={t.receiving_officer} />
                    <Fact label="Plant Engineer" value={t.receiving_plant_engineer} />
                    <Fact label="Date" value={t.receival_date ? fmtDateTime(t.receival_date) : "—"} />
                    <Fact label="Condition" value={t.equipment_condition_receipt} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function EquipmentDetailPage() {
  const params        = useParams();
  const code          = params?.code as string;
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { profile }   = useAuth();

  const [equip,       setEquip]       = useState<any>(null);
  const [history,     setHistory]     = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [logs,        setLogs]        = useState<any[]>([]);
  const [transfers,   setTransfers]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  // Deep-link support — ?tab=transfers jumps straight to the Transfers
  // tab (used by the quick history icon on the Equipment list).
  const [activeTab,   setActiveTab]   = useState<"overview"|"history"|"transfers"|"maintenance"|"logs">(
    () => (searchParams.get("tab") as any) || "overview"
  );
  const [statusModal, setStatusModal] = useState(false);

  const [allocModal,   setAllocModal]   = useState(false);
  const [allocName,    setAllocName]    = useState("");
  const [allocPos,     setAllocPos]     = useState("");
  const [allocSaving,  setAllocSaving]  = useState(false);

  useEffect(() => {
    if (!code) return;
    const fleetCode = decodeURIComponent(code);
    async function load() {
      setLoading(true);
      const { data: equipData } = await dbu
        .from("equipment").select("*").eq("code", fleetCode).single();
      if (!equipData) { router.push("/equipment"); return; }
      setEquip(equipData);
      const [histRes, maintRes, logRes, transferRes] = await Promise.all([
        dbu.from("equipment_history").select("*").eq("equipment_id", equipData.id).order("created_at", { ascending: false }),
        dbu.from("maintenance").select("*").eq("equipment_id", equipData.id).order("created_at", { ascending: false }),
        dbu.from("daily_logs").select("*").eq("fleet_no", fleetCode).order("log_date", { ascending: false }).limit(30),
        dbu.from("transfers").select("*").eq("equipment_id", equipData.id).order("transfer_date", { ascending: false }),
      ]);
      setHistory(histRes.data || []);
      setMaintenance(maintRes.data || []);
      setLogs(logRes.data || []);
      setTransfers(transferRes.data || []);
      setLoading(false);
    }
    load();
  }, [code]); // eslint-disable-line

  async function handleStatusSave(newStatus: string, yard: string) {
    if (!equip) return;
    const updates: any = {
      operational_status: newStatus,
      current_yard: yard || null,
    };
    await dbu.from("equipment").update(updates).eq("id", equip.id);
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id,
      fleet_number: equip.fleet_number,
      action_type:  "Status Changed",
      from_status:  equip.operational_status,
      to_status:    newStatus,
      yard:         yard || null,
      performed_by: profile?.full_name || "User",
      remarks:      yard
        ? `Status → ${newStatus}. Location: ${yard}`
        : `Status → ${newStatus}`,
    }]);
    const { data: newHist } = await dbu.from("equipment_history").select("*")
      .eq("equipment_id", equip.id).order("created_at", { ascending: false });
    setEquip({ ...equip, operational_status: newStatus, current_yard: yard || null });
    setHistory(newHist || []);
  }

  async function handleMoveToScrap() {
    if (!equip) return;
    if (!confirm(`Move ${equip.fleet_number} to scrap? This will set status to Scrapped.`)) return;
    await dbu.from("equipment").update({ operational_status: "Scrapped", assessment: "Scrapped" }).eq("id", equip.id);
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id, fleet_number: equip.fleet_number,
      action_type: "Moved to Scrap",
      from_status: equip.operational_status, to_status: "Scrapped",
      performed_by: profile?.full_name || "User",
      remarks: "Equipment moved to scrap",
    }]);
    setEquip({ ...equip, operational_status: "Scrapped", assessment: "Scrapped" });
  }

  async function handleAllocationSave() {
    if (!equip) return;
    setAllocSaving(true);
    const prev = equip.allocated_to || "Unallocated";
    await dbu.from("equipment").update({
      allocated_to:       allocName || null,
      allocated_position: allocPos  || null,
    }).eq("id", equip.id);

    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id,
      fleet_number: equip.fleet_number,
      action_type:  "Allocation Changed",
      performed_by: profile?.full_name || "User",
      remarks: allocName
        ? `Allocated to: ${allocName} (${allocPos || "No position"}) — previously: ${prev}`
        : `Allocation removed — previously: ${prev}`,
    }]);

    const { data: newHist } = await dbu.from("equipment_history").select("*")
      .eq("equipment_id", equip.id).order("created_at", { ascending: false });
    setEquip({ ...equip, allocated_to: allocName || null, allocated_position: allocPos || null });
    setHistory(newHist || []);
    setAllocSaving(false);
    setAllocModal(false);
  }

  async function handleDeleteEquipment() {
    if (!equip) return;
    if (!confirm(`Permanently delete ${equip.fleet_number}? This cannot be undone.`)) return;
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id,
      fleet_number: equip.fleet_number,
      action_type: "Deleted",
      performed_by: profile?.full_name || "User",
      remarks: "Equipment permanently deleted",
    }]);
    await dbu.from("equipment").delete().eq("id", equip.id);
    router.push("/equipment");
  }

  const roles: string[] = profile?.roles || [];
  const isClerk       = roles.includes("plant_clerk");
  const isSupervisor  = roles.includes("site_supervisor");
  const canSeeStatus  = roles.some(r =>
    ["plant_clerk","site_supervisor","plant_engineer","plant_admin",
     "plant_manager","plant_director","super_admin"].includes(r));
  const canDelete = roles.some(r =>
    ["plant_admin","plant_manager","super_admin"].includes(r));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-slate-500 text-sm">Loading equipment details...</p>
        </div>
      </div>
    );
  }

  if (!equip) return null;

  const tabs = [
    { key: "overview",    label: "Overview" },
    { key: "history",     label: "History",     count: history.length },
    { key: "transfers",   label: "Transfers",    count: transfers.length },
    { key: "maintenance", label: "Maintenance",  count: maintenance.length },
    { key: "logs",        label: "Daily Logs",   count: logs.length },
  ] as const;

  return (
    <div className="space-y-6 pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/equipment" className="hover:text-amber-500 transition-colors">Equipment</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{equip.fleet_number}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl shrink-0">🚜</div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-bold text-amber-600 text-lg">{equip.fleet_number}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[equip.operational_status] || "bg-slate-100 text-slate-600"}`}>
                  {equip.operational_status}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  {equip.fleet_status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{equip.name}</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {equip.make} {equip.model}
                {equip.year ? ` · ${equip.year}` : ""}
                {equip.reg_no ? ` · ${equip.reg_no}` : ""}
              </p>
              <p className="text-slate-400 text-xs mt-1">📍 {equip.site} · {equip.region}</p>
              {equip.current_yard && (
                <p className="text-xs text-amber-600 mt-0.5">🏗 Currently at: {equip.current_yard}</p>
              )}
              {equip.allocated_to && (
                <p className="text-xs text-blue-600 mt-0.5">
                  👤 Allocated to: <strong>{equip.allocated_to}</strong>
                  {equip.allocated_position && ` — ${equip.allocated_position}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex gap-4">
              <div className="bg-slate-50 rounded-2xl px-5 py-4 text-center min-w-25">
                <p className="text-2xl font-bold text-slate-800">{(equip.current_hour_meter||0).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Hour Meter</p>
              </div>
              <div className="bg-slate-50 rounded-2xl px-5 py-4 text-center min-w-25">
                <p className="text-2xl font-bold text-slate-800">{(equip.current_kilometer||0).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Km Reading</p>
              </div>
            </div>

            {canSeeStatus && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setStatusModal(true)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">
                  Update Status
                </button>
                {canDelete && equip.operational_status !== "Scrapped" && (
                  <button onClick={handleMoveToScrap}
                    className="px-4 py-2.5 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200">
                    🗑 Scrap
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDeleteEquipment}
                    className="px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200">
                    ✕ Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {tab.label}
            {"count" in tab && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <Section title="Equipment Details">
              <InfoRow label="Fleet Number"  value={equip.fleet_number} />
              <InfoRow label="Category"      value={equip.category} />
              <InfoRow label="Type Code"     value={equip.type_code} />
              <InfoRow label="Make"          value={equip.make} />
              <InfoRow label="Model"         value={equip.model} />
              <InfoRow label="Year"          value={equip.year_of_manufacturing || equip.year} />
              <InfoRow label="Serial No."    value={equip.serial_no} />
              <InfoRow label="Chassis No."   value={equip.chassis_no} />
              <InfoRow label="Reg. No."      value={equip.reg_no} />
              <InfoRow label="Engine Power"  value={equip.engine_power} />
              <InfoRow label="Size/Capacity" value={equip.size_capacity} />
              <InfoRow label="Tank Capacity" value={equip.tank_capacity} />
              <InfoRow label="Meter Device"  value={equip.meter_device} />
            </Section>
            <Section title="Financial">
              <InfoRow label="Purchase Cost" value={equip.purchase_cost ? `₦${Number(equip.purchase_cost).toLocaleString("en-NG")}` : undefined} />
              <InfoRow label="Landed Cost"   value={equip.landed_cost   ? `₦${Number(equip.landed_cost).toLocaleString("en-NG")}`   : undefined} />
              <InfoRow label="Life Expect."  value={equip.life_expectancy} />
              <InfoRow label="Insurance"     value={equip.insurance_policy} />
              <InfoRow label="Ins. Expiry"   value={equip.insurance_expiry ? new Date(equip.insurance_expiry).toLocaleDateString("en-GB") : undefined} />
            </Section>
          </div>
          <div className="space-y-5">
            <Section title="Current Status">
              <InfoRow label="Operational"   value={equip.operational_status} />
              <InfoRow label="Condition"     value={equip.assessment} />
              <InfoRow label="Fleet Status"  value={equip.fleet_status} />
              <InfoRow label="Yard/Location" value={equip.current_yard} />
              {canSeeStatus && (
                <button onClick={() => setStatusModal(true)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">
                  Update Status / Location
                </button>
              )}
            </Section>

            <Section title="Equipment Allocation">
              <InfoRow label="Allocated To" value={equip.allocated_to} />
              <InfoRow label="Position"     value={equip.allocated_position} />
              {canSeeStatus && (
                <button
                  onClick={() => {
                    setAllocName(equip.allocated_to || "");
                    setAllocPos(equip.allocated_position || "");
                    setAllocModal(true);
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600">
                  {equip.allocated_to ? "Update Allocation" : "Allocate Equipment"}
                </button>
              )}
            </Section>
            <Section title="Location">
              <InfoRow label="Current Site" value={equip.site} />
              <InfoRow label="Region"       value={equip.region} />
            </Section>
            <Section title="Dates">
              <InfoRow label="Date Received"
                value={equip.date_received ? new Date(equip.date_received).toLocaleDateString("en-GB") : undefined} />
              <InfoRow label="Commissioned"
                value={equip.commission_date ? new Date(equip.commission_date).toLocaleDateString("en-GB") : undefined} />
            </Section>
            <Section title="Supplier">
              <InfoRow label="Supplier"      value={equip.supplier} />
              <InfoRow label="Supplier Code" value={equip.supplier_code} />
              <InfoRow label="Order No."     value={equip.order_no} />
              <InfoRow label="Invoice No."   value={equip.invoice_no} />
            </Section>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Equipment Life History</h3>
            <p className="text-slate-400 text-sm">Every event recorded against this equipment</p>
          </div>
          {history.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">No history records yet.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {history.map((h: any) => (
                <div key={h.id} className="px-6 py-4 flex items-start gap-4">
                  <span className="text-2xl shrink-0">{HISTORY_ICONS[h.action_type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{h.action_type}</p>
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(h.created_at).toLocaleDateString("en-GB",{
                          day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",
                        })}
                      </p>
                    </div>
                    {h.from_status && h.to_status && (
                      <p className="text-xs text-slate-500 mt-0.5">{h.from_status} → {h.to_status}</p>
                    )}
                    {h.yard && <p className="text-xs text-amber-600 mt-0.5">📍 {h.yard}</p>}
                    {h.from_site && h.to_site && h.from_site !== h.to_site && (
                      <p className="text-xs text-slate-500 mt-0.5">{h.from_site} → {h.to_site}</p>
                    )}
                    {h.remarks && <p className="text-xs text-slate-400 mt-1 italic">{h.remarks}</p>}
                    <p className="text-xs text-slate-400 mt-1">By: {h.performed_by}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRANSFERS — new comprehensive dispatched/approved/received tab */}
      {activeTab === "transfers" && <TransfersTab transfers={transfers} />}

      {/* MAINTENANCE */}
      {activeTab === "maintenance" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Maintenance Records</h3>
          </div>
          {maintenance.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">No maintenance records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Type","Issue","Status","Reported","Completed","Cost"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {maintenance.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">{m.maintenance_type}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-700 max-w-50 truncate">{m.issue}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          m.status==="Completed"  ? "bg-emerald-100 text-emerald-700" :
                          m.status==="In Progress"? "bg-amber-100 text-amber-700" :
                                                     "bg-slate-100 text-slate-600"
                        }`}>{m.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(m.reported_date||m.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {m.completion_date ? new Date(m.completion_date).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {m.cost ? `₦${Number(m.cost).toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DAILY LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Daily Log History</h3>
          </div>
          {logs.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">No daily logs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Date","Site","S Hrs","A Hrs","N Hrs","Fuel (L)","Chargeable","Remarks"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((l: any) => (
                    <tr key={l.id} className={`hover:bg-slate-50 ${l.is_chargeable ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-5 py-3 text-slate-700 font-medium text-xs whitespace-nowrap">
                        {new Date(l.log_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-35 truncate">{l.site}</td>
                      <td className="px-5 py-3 text-slate-500 font-medium text-xs">{l.idle_hours||"—"}</td>
                      <td className="px-5 py-3 text-emerald-600 font-bold text-xs">{l.working_hours||"—"}</td>
                      <td className="px-5 py-3 text-red-500 font-medium text-xs">{l.breakdown_hours||"—"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{l.fuel_quantity||"—"}</td>
                      <td className="px-5 py-3">
                        {l.is_chargeable
                          ? <span className="text-emerald-600 font-bold text-xs">✓ Yes</span>
                          : <span className="text-red-400 text-xs">✗ No</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{l.remarks||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {statusModal && equip && (
        <StatusModal
          equip={equip}
          isClerk={isClerk || isSupervisor}
          onClose={() => setStatusModal(false)}
          onSave={handleStatusSave}
        />
      )}

      {allocModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Equipment Allocation</h3>
            <p className="text-slate-500 text-xs mb-5">
              {equip.fleet_number} — {equip.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Allocated To (Name)
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. John Adeyemi"
                  value={allocName}
                  onChange={e => setAllocName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Position / Role
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. Operator, Driver, Supervisor"
                  value={allocPos}
                  onChange={e => setAllocPos(e.target.value)}
                />
              </div>

              {equip.allocated_to && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                  Currently allocated to: <strong>{equip.allocated_to}</strong>
                  {equip.allocated_position && ` — ${equip.allocated_position}`}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setAllocModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
              {equip.allocated_to && (
                <button
                  onClick={() => { setAllocName(""); setAllocPos(""); }}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">
                  Clear
                </button>
              )}
              <button onClick={handleAllocationSave} disabled={allocSaving}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-50">
                {allocSaving ? "Saving..." : "Save Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}