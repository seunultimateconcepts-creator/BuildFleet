/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { useSites } from "@/hooks/use-sites";

const STATUSES = [
  "Working","Under Repair","Idle","Scrapped","Break Down","Stand By",
];

const STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Idle":         "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Stand By":     "bg-blue-100    text-blue-700",
};

const HISTORY_ICONS: Record<string, string> = {
  "Commissioned":          "🏗️",
  "Transferred":           "🔄",
  "Status Changed":        "🔧",
  "Maintenance Started":   "⚠️",
  "Maintenance Completed": "✅",
  "Log Submitted":         "📋",
  "Moved to Scrap":        "🗑️",
  "Deleted":               "❌",
};

function suggestSiteTypes(status: string): string[] {
  if (status === "Break Down")   return ["Yard (Repair)", "Workshop (Field)", "Workshop (Central)"];
  if (status === "Under Repair") return ["Workshop (Central)", "Workshop (Field)", "Yard (Repair)"];
  if (status === "Idle")         return ["Yard (Storage)", "Yard (Repair)"];
  if (status === "Stand By")     return ["Yard (Storage)", "Project", "Overhead"];
  if (status === "Scrapped")     return ["Yard (Scrap)"];
  if (status === "Working")      return ["Project", "Asphalt Plant", "Haulage Yard", "Overhead"];
  return [];
}

// ─────────────────────────────────────────────────────────────
// STATUS + LOCATION MODAL
// ─────────────────────────────────────────────────────────────
function StatusLocationModal({ equip, sites, onClose, onSave }: {
  equip: any; sites: any[];
  onClose: () => void;
  onSave: (status: string, newSite: string | null) => Promise<void>;
}) {
  const [step,       setStep]       = useState<1|2>(1);
  const [status,     setStatus]     = useState<string>(equip.operational_status || "Working");
  const [moveToSite, setMoveToSite] = useState<string>("");
  const [siteSearch, setSiteSearch] = useState("");
  const [saving,     setSaving]     = useState(false);

  const suggestedTypes = suggestSiteTypes(status);
  const filteredSites  = sites.filter(s => {
    const matchType   = suggestedTypes.length === 0 || suggestedTypes.includes(s.type);
    const matchSearch = !siteSearch ||
      s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.region.toLowerCase().includes(siteSearch.toLowerCase());
    return matchType && matchSearch;
  });
  const regionSites = filteredSites.filter(s => s.region === equip.region);
  const otherSites  = filteredSites.filter(s => s.region !== equip.region);
  const sortedSites = [...regionSites, ...otherSites];

  async function handleSave() {
    setSaving(true);
    await onSave(status, moveToSite || null);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">
              {step === 1 ? "Step 1 of 2 — Status" : "Step 2 of 2 — Location"}
            </p>
            <h3 className="font-bold text-white text-lg">Update Equipment Status</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-3 mb-5 text-sm">
            <p className="font-bold text-slate-800">{equip.fleet_number} — {equip.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">📍 Currently at: {equip.site}</p>
          </div>
          {step === 1 && (
            <div className="space-y-2">
              {STATUSES.map(s => (
                <label key={s} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  status === s ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <input type="radio" name="status" value={s}
                    checked={status === s} onChange={() => setStatus(s)}
                    className="accent-amber-500" />
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>
                  {s === "Break Down"   && <span className="text-xs text-slate-400 ml-auto">→ move to repair yard</span>}
                  {s === "Idle"         && <span className="text-xs text-slate-400 ml-auto">→ move to storage</span>}
                  {s === "Scrapped"     && <span className="text-xs text-slate-400 ml-auto">→ move to scrap yard</span>}
                  {s === "Working"      && <span className="text-xs text-slate-400 ml-auto">→ assign to site</span>}
                </label>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Moving to: <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[status]}`}>{status}</span>
                </p>
                {suggestedTypes.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Suggested: {suggestedTypes.join(", ")}
                    {equip.region ? ` · ${equip.region} sites shown first` : ""}
                  </p>
                )}
              </div>
              <input placeholder="Search site name, code or region..."
                value={siteSearch} onChange={e => setSiteSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <div className="space-y-1.5">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  moveToSite === "" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <input type="radio" name="site" value=""
                    checked={moveToSite === ""} onChange={() => setMoveToSite("")}
                    className="accent-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Stay at current site</p>
                    <p className="text-xs text-slate-400">{equip.site}</p>
                  </div>
                </label>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {sortedSites.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No sites match.</p>
                  ) : sortedSites.map(s => (
                    <label key={s.id || s.code} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      moveToSite === s.name ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                      <input type="radio" name="site" value={s.name}
                        checked={moveToSite === s.name} onChange={() => setMoveToSite(s.name)}
                        className="accent-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {s.code} · {s.type} · {s.region}
                          {s.region === equip.region && <span className="ml-1.5 text-amber-500 font-semibold">Same region</span>}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {step === 2 && (
              <button onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
                ← Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
              Cancel
            </button>
            {step === 1 ? (
              <button onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900">
                Next — Select Location →
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Updating..." : "Save Changes ✓"}
              </button>
            )}
          </div>
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

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function EquipmentDetailPage() {
  const params      = useParams();
  const code        = params?.code as string;
  const router      = useRouter();
  const { profile } = useAuth();
  const { sites }   = useSites();

  const [equip,       setEquip]       = useState<any>(null);
  const [history,     setHistory]     = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [logs,        setLogs]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"overview"|"history"|"maintenance"|"logs">("overview");
  const [statusModal, setStatusModal] = useState(false);

  useEffect(() => {
    if (!code) return;
    const fleetCode = decodeURIComponent(code);
    async function load() {
      setLoading(true);
      const { data: equipData } = await dbu
        .from("equipment").select("*").eq("code", fleetCode).single();
      if (!equipData) { router.push("/equipment"); return; }
      setEquip(equipData);
      const [histRes, maintRes, logRes] = await Promise.all([
        dbu.from("equipment_history").select("*").eq("equipment_id", equipData.id).order("created_at", { ascending: false }),
        dbu.from("maintenance").select("*").eq("equipment_id", equipData.id).order("created_at", { ascending: false }),
        dbu.from("daily_logs").select("*").eq("fleet_no", fleetCode).order("log_date", { ascending: false }).limit(30),
      ]);
      setHistory(histRes.data || []);
      setMaintenance(maintRes.data || []);
      setLogs(logRes.data || []);
      setLoading(false);
    }
    load();
  }, [code]); // eslint-disable-line

  async function handleStatusSave(newStatus: string, newSite: string | null) {
    if (!equip) return;
    const updates: any = { operational_status: newStatus };
    if (newSite && newSite !== equip.site) updates.site = newSite;
    await dbu.from("equipment").update(updates).eq("id", equip.id);
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id, fleet_number: equip.fleet_number,
      action_type:  newSite && newSite !== equip.site ? "Transferred" : "Status Changed",
      from_status:  equip.operational_status, to_status: newStatus,
      from_site:    equip.site, to_site: newSite || equip.site,
      performed_by: profile?.full_name || "User",
      remarks: newSite && newSite !== equip.site
        ? `Status changed to ${newStatus}. Moved from ${equip.site} to ${newSite}`
        : `Status changed to ${newStatus}`,
    }]);
    const { data: newHist } = await dbu.from("equipment_history").select("*")
      .eq("equipment_id", equip.id).order("created_at", { ascending: false });
    setEquip({ ...equip, operational_status: newStatus, site: newSite || equip.site });
    setHistory(newHist || []);
  }

  async function handleMoveToScrap() {
    if (!equip) return;
    if (!confirm(`Move ${equip.fleet_number} to scrap yard? This will set status to Scrapped.`)) return;
    await dbu.from("equipment").update({
      operational_status: "Scrapped",
      assessment: "Scrapped",
    }).eq("id", equip.id);
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id, fleet_number: equip.fleet_number,
      action_type: "Moved to Scrap",
      from_status: equip.operational_status, to_status: "Scrapped",
      performed_by: profile?.full_name || "User",
      remarks: "Equipment moved to scrap",
    }]);
    setEquip({ ...equip, operational_status: "Scrapped", assessment: "Scrapped" });
  }

  async function handleDelete() {
    if (!equip) return;
    if (!confirm(`Permanently delete ${equip.fleet_number}? This cannot be undone.`)) return;
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id, fleet_number: equip.fleet_number,
      action_type: "Deleted", performed_by: profile?.full_name || "User",
      remarks: "Equipment permanently deleted",
    }]);
    await dbu.from("equipment").delete().eq("id", equip.id);
    router.push("/equipment");
  }

  const roles: string[] = profile?.roles || [];
  const canEdit = roles.some(r =>
    ["plant_manager","plant_director","plant_admin"].includes(r)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading equipment details...</p>
        </div>
      </div>
    );
  }

  if (!equip) return null;

  const tabs = [
    { key: "overview",    label: "Overview" },
    { key: "history",     label: "History",    count: history.length },
    { key: "maintenance", label: "Maintenance", count: maintenance.length },
    { key: "logs",        label: "Daily Logs",  count: logs.length },
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
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl shrink-0">
              🚜
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-bold text-amber-600 text-lg">{equip.fleet_number}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  STATUS_STYLE[equip.operational_status] || "bg-slate-100 text-slate-600"
                }`}>
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
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex gap-4">
              <div className="bg-slate-50 rounded-2xl px-5 py-4 text-center min-w-25">
                <p className="text-2xl font-bold text-slate-800">
                  {(equip.current_hour_meter || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">Hour Meter</p>
              </div>
              <div className="bg-slate-50 rounded-2xl px-5 py-4 text-center min-w-25">
                <p className="text-2xl font-bold text-slate-800">
                  {(equip.current_kilometer || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">Kilometers</p>
              </div>
            </div>
            {/* Action buttons — only for admin/manager */}
            {canEdit && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setStatusModal(true)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">
                  Update Status
                </button>
                {equip.operational_status !== "Scrapped" && (
                  <button onClick={handleMoveToScrap}
                    className="px-4 py-2.5 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200 transition-colors">
                    🗑 Scrap
                  </button>
                )}
                <button onClick={handleDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors">
                  ✕ Delete
                </button>
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
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
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
              <InfoRow label="Depreciation"  value={equip.depreciation} />
              <InfoRow label="Life Expect."  value={equip.life_expectancy} />
              <InfoRow label="Insurance"     value={equip.insurance_policy} />
              <InfoRow label="Ins. Expiry"   value={equip.insurance_expiry ? new Date(equip.insurance_expiry).toLocaleDateString("en-GB") : undefined} />
            </Section>
          </div>
          <div className="space-y-5">
            <Section title="Current Status">
              <InfoRow label="Operational"  value={equip.operational_status} />
              <InfoRow label="Condition"    value={equip.assessment} />
              <InfoRow label="Fleet Status" value={equip.fleet_status} />
              {canEdit && (
                <button onClick={() => setStatusModal(true)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">
                  Update Status / Location
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

      {/* ── HISTORY ── */}
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
                        {new Date(h.created_at).toLocaleDateString("en-GB", {
                          day:"2-digit", month:"short", year:"numeric",
                          hour:"2-digit", minute:"2-digit",
                        })}
                      </p>
                    </div>
                    {h.from_site && h.to_site && h.from_site !== h.to_site && (
                      <p className="text-xs text-slate-500 mt-0.5">{h.from_site} → {h.to_site}</p>
                    )}
                    {h.from_status && h.to_status && (
                      <p className="text-xs text-slate-500 mt-0.5">{h.from_status} → {h.to_status}</p>
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

      {/* ── MAINTENANCE ── */}
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
                  <tr>{["Type","Issue","Status","Reported","Completed","Cost"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {maintenance.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3"><span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">{m.maintenance_type}</span></td>
                      <td className="px-5 py-3 text-slate-700 max-w-50 truncate">{m.issue}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        m.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                        m.status === "In Progress" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"}`}>{m.status}</span></td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(m.reported_date).toLocaleDateString("en-GB")}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{m.completion_date ? new Date(m.completion_date).toLocaleDateString("en-GB") : "—"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{m.cost ? `₦${Number(m.cost).toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DAILY LOGS ── */}
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
                  <tr>{["Date","Site","I Hrs","A Hrs","N Hrs","Fuel (L)","Chargeable","Remarks"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((l: any) => (
                    <tr key={l.id} className={`hover:bg-slate-50 ${l.is_chargeable ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-5 py-3 text-slate-700 font-medium text-xs whitespace-nowrap">
                        {new Date(l.log_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-35 truncate">{l.site}</td>
                      <td className="px-5 py-3 text-amber-600 font-medium text-xs">{l.idle_hours||"—"}</td>
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
        <StatusLocationModal
          equip={equip} sites={sites}
          onClose={() => setStatusModal(false)}
          onSave={handleStatusSave}
        />
      )}
    </div>
  );
}