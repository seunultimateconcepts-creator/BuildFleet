"use client";

import { useState } from "react";
import Link from "next/link";
import { useEquipment } from "@/hooks/use-equipment";
import { useAuth } from "@/hooks/use-auth";
import { useSites } from "@/hooks/use-sites";
import type { Equipment, OperationalStatus } from "@/types";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STATUSES: OperationalStatus[] = [
  "Working", "Under Repair", "Idle", "Scrapped", "Break Down", "Stand By",
];

const STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Idle":         "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Stand By":     "bg-blue-100    text-blue-700",
};

const CONDITION_STYLE: Record<string, string> = {
  "Very Good": "bg-emerald-100 text-emerald-700",
  "Good":      "bg-green-100   text-green-700",
  "Fair-Good": "bg-lime-100    text-lime-700",
  "Fair":      "bg-yellow-100  text-yellow-700",
  "Poor-Fair": "bg-orange-100  text-orange-700",
  "Poor":      "bg-red-100     text-red-600",
  "Scrapped":  "bg-slate-100   text-slate-500",
};

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

// ─────────────────────────────────────────────────────────────
// YARD CONFIG — per status, what label + placeholder to show
// ─────────────────────────────────────────────────────────────
const YARD_CONFIG: Partial<Record<OperationalStatus, { label: string; placeholder: string }>> = {
  "Break Down":   { label: "Breakdown / Repair Yard",   placeholder: "e.g. Central Workshop, Site Yard B" },
  "Under Repair": { label: "Repair Workshop / Location", placeholder: "e.g. Main Workshop, Contractor Yard" },
  "Idle":         { label: "Storage Yard / Parking Bay", placeholder: "e.g. Equipment Yard, North Holding Area" },
  "Stand By":     { label: "Standby Location / Yard",   placeholder: "e.g. Site Office Yard, Reserve Bay" },
  "Scrapped":     { label: "Disposal / Scrap Location",  placeholder: "e.g. Scrap Yard, Disposal Site" },
};

// ─────────────────────────────────────────────────────────────
// STATUS UPDATE MODAL
// ─────────────────────────────────────────────────────────────
function StatusModal({ item, onClose, onSave }: {
  item: Equipment;
  onClose: () => void;
  onSave: (status: OperationalStatus, yard: string) => Promise<void>;
}) {
  const { sites } = useSites();
  const [status, setStatus] = useState<OperationalStatus>(item.operational_status);
  const [yard,   setYard]   = useState<string>((item as any).current_yard || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const yardConfig = YARD_CONFIG[status];
  const needsYard  = !!yardConfig;

  async function handleSave() {
    if (needsYard && !yard.trim()) {
      setError(`Please select the ${yardConfig!.label.toLowerCase()}.`);
      return;
    }
    setSaving(true); setError(null);
    await onSave(status, yard.trim());
    setSaving(false);
    onClose();
  }

  function handleStatusChange(s: OperationalStatus) {
    setStatus(s);
    setError(null);
    if (!YARD_CONFIG[s]) setYard("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* Header */}
        <h3 className="font-bold text-slate-800 text-lg mb-0.5">Update Status</h3>
        <p className="text-amber-600 text-sm font-medium mb-1">{item.fleet_number}</p>
        <p className="text-slate-500 text-xs mb-5 line-clamp-1">{item.name}</p>

        {/* Current yard info */}
        {(item as any).current_yard && (
          <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-4 text-xs text-slate-500">
            Current location:{" "}
            <span className="font-semibold text-slate-700">{(item as any).current_yard}</span>
          </div>
        )}

        {/* Status options */}
        <div className="space-y-2 mb-4">
          {STATUSES.map(s => (
            <label key={s}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                status === s
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}>
              <input type="radio" name="status" value={s}
                checked={status === s}
                onChange={() => handleStatusChange(s)}
                className="accent-amber-500" />
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>
                {s}
              </span>
            </label>
          ))}
        </div>

        {/* Conditional site/yard dropdown */}
        {needsYard && (
          <div className="mb-4 border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {yardConfig!.label} <span className="text-red-400">*</span>
            </label>
            <select
              className={iCls}
              value={yard}
              onChange={e => { setYard(e.target.value); setError(null); }}
            >
              <option value="">— Select site / yard —</option>
              {/* Group: actual sites from DB */}
              <optgroup label="Project Sites">
                {sites
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                    <option key={s.id || s.code} value={s.name}>
                      {s.code ? `${s.code} — ` : ""}{s.name}
                    </option>
                  ))}
              </optgroup>
              {/* Group: common yard/workshop options */}
              <optgroup label="Workshops & Yards">
                {[
                  "Central Workshop",
                  "Main Equipment Yard",
                  "North Holding Yard",
                  "South Holding Yard",
                  "Scrap / Disposal Yard",
                  "Contractor Workshop",
                  "Vendor Repair Shop",
                ].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </optgroup>
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Select the site or yard where this equipment is being moved to.
            </p>
          </div>
        )}

        {/* Working status note */}
        {status === "Working" && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700">
            Equipment will be marked as operational at its current site. No yard entry needed.
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT PLANT LIST AS CSV
// ─────────────────────────────────────────────────────────────
function exportPlantList(equipment: Equipment[]) {
  const headers = [
    "Fleet No.", "Description", "Category", "Make", "Model", "Year",
    "Serial No.", "Chassis No.", "Reg. No.", "Engine Power",
    "Size/Capacity", "Tank Capacity", "Meter Device",
    "Site", "Region", "Operational Status", "Current Yard/Location", "Condition",
    "Hour Meter", "Kilometer", "Commission Date",
    "Purchase Cost", "Landed Cost", "Supplier", "Life Expectancy",
  ];

  const rows = equipment.map(e => [
    e.fleet_number, e.name, e.category, e.make, e.model, e.year || "",
    e.serial_no || "", e.chassis_no || "", e.reg_no || "",
    e.engine_power || "", e.size_capacity || "", e.tank_capacity || "",
    e.meter_device || "", e.site, e.region,
    e.operational_status, (e as any).current_yard || "",
    e.assessment,
    e.current_hour_meter || 0, e.current_kilometer || 0,
    e.commission_date || "",
    e.purchase_cost || "", e.landed_cost || "",
    e.supplier || "", e.life_expectancy || "",
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `BuildFleet_Plant_List_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const { equipment, loading, updateStatus } = useEquipment();
  const { profile, canCommission, canTransfer } = useAuth();

  const [search,       setSearch]       = useState("");
  const [filterSt,     setFilterSt]     = useState("");
  const [filterCat,    setFilterCat]    = useState("");
  const [filterSite,   setFilterSite]   = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [statusItem,   setStatusItem]   = useState<Equipment | null>(null);
  const [view,         setView]         = useState<"table" | "grid">("table");

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      e.fleet_number.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.make.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      (e.reg_no || "").toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    return (
      matchQ &&
      (!filterSt     || e.operational_status === filterSt) &&
      (!filterCat    || e.category           === filterCat) &&
      (!filterSite   || e.site               === filterSite) &&
      (!filterRegion || e.region             === filterRegion)
    );
  });

  const categories = [...new Set(equipment.map(e => e.category))].filter(Boolean).sort();
  const sites      = [...new Set(equipment.map(e => e.site))].filter(Boolean).sort();
  const regions    = [...new Set(equipment.map(e => e.region))].filter(Boolean).sort();

  const counts = {
    total:    equipment.length,
    working:  equipment.filter(e => e.operational_status === "Working").length,
    repair:   equipment.filter(e => ["Under Repair","Break Down"].includes(e.operational_status)).length,
    idle:     equipment.filter(e => ["Idle","Stand By"].includes(e.operational_status)).length,
    scrapped: equipment.filter(e => e.operational_status === "Scrapped").length,
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Equipment</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Complete fleet register. Click any equipment to view full details and history.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => exportPlantList(filtered.length > 0 ? filtered : equipment)}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
            📊 Export Plant List
          </button>
          {canTransfer && (
            <Link href="/transfer"
              className="border border-blue-200 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2">
              🔄 Transfer Equipment
            </Link>
          )}
          {canCommission && (
            <Link href="/commissioning"
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-200 flex items-center gap-2">
              + Commission Equipment
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Fleet",     value: counts.total,    bg: "bg-slate-900 text-white" },
          { label: "Working",         value: counts.working,  bg: "bg-emerald-500 text-white" },
          { label: "Under Repair",    value: counts.repair,   bg: "bg-amber-500 text-white" },
          { label: "Idle / Stand By", value: counts.idle,     bg: "bg-white border border-slate-200 text-slate-800" },
          { label: "Scrapped",        value: counts.scrapped, bg: "bg-white border border-slate-200 text-slate-800" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input
            placeholder="Search fleet no., name, make, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterSt} onChange={e => setFilterSt(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select className={iCls + " w-auto"} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
              <option value="">All Regions</option>
              {regions.map(r => <option key={r}>{r}</option>)}
            </select>
            <p className="text-sm text-slate-500 whitespace-nowrap">
              Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {equipment.length}
            </p>
          </div>
          <div className="flex gap-2">
            {(["table","grid"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  view === v
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
                {v === "table" ? "☰ Table" : "⊞ Grid"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {view === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {["Fleet No.","Description","Category","Make / Model","Site","Region",
                    "Status","Yard / Location","Condition","Meter","Actions"].map(h => (
                    <th key={h}
                      className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={11} className="px-5 py-16 text-center text-slate-400">Loading equipment...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="px-5 py-16 text-center text-slate-400">
                    {equipment.length === 0
                      ? "No equipment yet. Commission your first equipment to get started."
                      : "No equipment matches your filters."}
                  </td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <Link href={`/equipment/${item.code}`}
                        className="font-bold text-amber-600 hover:text-amber-700 font-mono text-xs hover:underline">
                        {item.fleet_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      <div className="truncate max-w-45">{item.name}</div>
                      {item.reg_no && <div className="text-xs text-slate-400 mt-0.5">{item.reg_no}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{item.category}</td>
                    <td className="px-5 py-4 text-xs">
                      <div className="font-medium text-slate-700">{item.make}</div>
                      <div className="text-slate-400">{item.model}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      <div className="truncate max-w-32">{item.site}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{item.region}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        STATUS_STYLE[item.operational_status] || "bg-slate-100 text-slate-600"
                      }`}>
                        {item.operational_status}
                      </span>
                    </td>
                    {/* Yard / Location column */}
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-32">
                      {(item as any).current_yard ? (
                        <span className="truncate block" title={(item as any).current_yard}>
                          {(item as any).current_yard}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        CONDITION_STYLE[item.assessment] || "bg-slate-100 text-slate-600"
                      }`}>
                        {item.assessment}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {item.meter_device === "Km"
                        ? `${(item.current_kilometer || 0).toLocaleString()} km`
                        : `${(item.current_hour_meter || 0).toLocaleString()} hrs`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/equipment/${item.code}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium whitespace-nowrap">
                          View →
                        </Link>
                        {profile?.roles && !profile.roles.includes("plant_clerk") && (
                          <button
                            onClick={() => setStatusItem(item)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium whitespace-nowrap">
                            Status
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
      )}

      {/* GRID VIEW */}
      {view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-16 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400">No equipment found.</div>
          ) : filtered.map(item => (
            <div key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-amber-200 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/equipment/${item.code}`}
                    className="font-bold text-amber-600 font-mono text-sm hover:underline">
                    {item.fleet_number}
                  </Link>
                  <p className="text-slate-700 font-semibold text-sm mt-0.5 line-clamp-1">{item.name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[item.operational_status]}`}>
                  {item.operational_status}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {[
                  ["Make / Model", `${item.make} ${item.model}`],
                  ["Category",     item.category],
                  ["Site",         item.site],
                  ["Region",       item.region],
                  ...(((item as any).current_yard)
                    ? [["Yard / Location", (item as any).current_yard]]
                    : []),
                  ["Condition",    item.assessment],
                  [item.meter_device === "Km" ? "Odometer" : "Hour Meter",
                   item.meter_device === "Km"
                     ? `${(item.current_kilometer || 0).toLocaleString()} km`
                     : `${(item.current_hour_meter || 0).toLocaleString()} hrs`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span>{l}</span>
                    <span className="font-medium text-slate-700 text-right truncate ml-2">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Link href={`/equipment/${item.code}`}
                  className="flex-1 text-center text-xs py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                  View Details →
                </Link>
                {profile?.roles && !profile.roles.includes("plant_clerk") && (
                  <button
                    onClick={() => setStatusItem(item)}
                    className="text-xs px-4 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium">
                    Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Modal */}
      {statusItem && (
        <StatusModal
          item={statusItem}
          onClose={() => setStatusItem(null)}
          onSave={async (status, yard) => {
            await updateStatus(statusItem.id, status, profile?.full_name || "User", yard);
            setStatusItem(null);
          }}
        />
      )}
    </div>
  );
}