/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEquipment } from "@/hooks/use-equipment";
import { useAuth } from "@/hooks/use-auth";
import { dbu } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Equipment, OperationalStatus } from "@/types";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const ALL_STATUSES = [
  "Working", "Under Repair", "Break Down", "Storage", "Scrapped",
] as const;

type EquipmentStatus = (typeof ALL_STATUSES)[number];

const CLERK_STATUSES: EquipmentStatus[] = [
  "Working", "Break Down", "Storage",
];

const STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Storage":      "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
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

const YARD_CONFIG: Partial<Record<EquipmentStatus, { label: string; siteTypes: string[] }>> = {
  "Break Down":   { label: "Repair Yard",               siteTypes: ["Repair Yard"] },
  "Under Repair": { label: "Workshop",                  siteTypes: ["Central Workshop","Regional Workshop","Field Workshop"] },
  "Storage":      { label: "Storage Yard",              siteTypes: ["Storage Yard"] },
  "Scrapped":     { label: "Disposal / Scrap Location", siteTypes: [] },
};

// ─────────────────────────────────────────────────────────────
// EXPORT COLUMN CONFIG
// ─────────────────────────────────────────────────────────────
const EXPORT_COLUMNS: { key: string; label: string; defaultOn: boolean }[] = [
  { key: "fleet_number",       label: "Fleet No.",         defaultOn: true  },
  { key: "name",               label: "Description",       defaultOn: true  },
  { key: "category",           label: "Category",          defaultOn: true  },
  { key: "make",               label: "Make",              defaultOn: true  },
  { key: "model",              label: "Model",             defaultOn: true  },
  { key: "year",               label: "Year",              defaultOn: true  },
  { key: "allocated_to",       label: "Allocated User",    defaultOn: true  },
  { key: "allocated_position", label: "Department",        defaultOn: true  },
  { key: "site",               label: "Site",              defaultOn: true  },
  { key: "region",             label: "Region",            defaultOn: true  },
  { key: "operational_status", label: "Status",            defaultOn: true  },
  { key: "current_yard",       label: "Yard / Location",   defaultOn: true  },
  { key: "assessment",         label: "Condition",         defaultOn: true  },
  { key: "current_hour_meter", label: "Hour Meter (Hrs)",  defaultOn: true  },
  { key: "current_kilometer",  label: "Km Reading",        defaultOn: true  },
  { key: "reg_no",             label: "Reg. No.",          defaultOn: true  },
  { key: "serial_no",          label: "Serial No.",        defaultOn: false },
  { key: "chassis_no",         label: "Chassis No.",       defaultOn: false },
  { key: "engine_power",       label: "Engine Power",      defaultOn: false },
  { key: "size_capacity",      label: "Size / Capacity",   defaultOn: false },
  { key: "tank_capacity",      label: "Tank Capacity",     defaultOn: false },
  { key: "meter_device",       label: "Meter Device",      defaultOn: false },
  { key: "commission_date",    label: "Commission Date",   defaultOn: false },
  { key: "hire_rate",          label: "Hire Rate (₦)",     defaultOn: false },
  { key: "purchase_cost",      label: "Purchase Cost",     defaultOn: false },
  { key: "landed_cost",        label: "Landed Cost",       defaultOn: false },
  { key: "supplier",           label: "Supplier",          defaultOn: false },
  { key: "life_expectancy",    label: "Life Expectancy",   defaultOn: false },
];

// ─────────────────────────────────────────────────────────────
// EXPORT MODAL
// ─────────────────────────────────────────────────────────────
function ExportModal({ equipment, onClose }: { equipment: Equipment[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter(c => c.defaultOn).map(c => c.key))
  );

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAll()    { setSelected(new Set(EXPORT_COLUMNS.map(c => c.key))); }
  function selectNone()   { setSelected(new Set()); }
  function selectDefault(){ setSelected(new Set(EXPORT_COLUMNS.filter(c => c.defaultOn).map(c => c.key))); }

  function doExport() {
    const cols = EXPORT_COLUMNS.filter(c => selected.has(c.key));
    const headers = cols.map(c => c.label);
    const rows = equipment.map(e => cols.map(c => {
      const val = c.key === "current_yard" ? (e as any).current_yard : (e as any)[c.key];
      return val ?? "";
    }));
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `BuildFleet_Plant_List_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  const onCount  = EXPORT_COLUMNS.filter(c => selected.has(c.key)).length;
  const coreCols = EXPORT_COLUMNS.filter(c => c.defaultOn);
  const extCols  = EXPORT_COLUMNS.filter(c => !c.defaultOn);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-slate-800 text-lg">Export Plant List</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-slate-500 text-xs mb-4">
          Exporting <span className="font-semibold text-slate-700">{equipment.length}</span> equipment ·{" "}
          <span className="font-semibold text-amber-600">{onCount} columns</span> selected
        </p>

        <div className="flex gap-2 mb-4">
          {([["All", selectAll], ["Default", selectDefault], ["None", selectNone]] as const).map(([label, fn]) => (
            <button key={label} onClick={fn}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium">
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Core Columns</p>
            <div className="space-y-1">
              {coreCols.map(c => (
                <label key={c.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  selected.has(c.key) ? "bg-amber-50 border border-amber-200" : "border border-transparent hover:bg-slate-50"
                }`}>
                  <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)}
                    className="accent-amber-500 w-4 h-4 shrink-0" />
                  <span className="text-sm text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Additional Columns</p>
            <div className="space-y-1">
              {extCols.map(c => (
                <label key={c.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  selected.has(c.key) ? "bg-amber-50 border border-amber-200" : "border border-transparent hover:bg-slate-50"
                }`}>
                  <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)}
                    className="accent-amber-500 w-4 h-4 shrink-0" />
                  <span className="text-sm text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={doExport} disabled={onCount === 0}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40">
            📊 Export {onCount} cols
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATUS MODAL
// ─────────────────────────────────────────────────────────────
function StatusModal({ item, onClose, onSave, isClerk }: {
  item: Equipment; onClose: () => void;
  onSave: (status: EquipmentStatus, yard: string) => Promise<void>;
  isClerk: boolean;
}) {
  const [allSites,      setAllSites]      = useState<any[]>([]);
  const [filteredYards, setFilteredYards] = useState<any[]>([]);
  const [status,        setStatus]        = useState<EquipmentStatus>(item.operational_status as EquipmentStatus);
  const [yard,          setYard]          = useState<string>((item as any).current_yard || "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    dbu.from("sites")
      .select("id,name,code,site_type,cost_code")
      .order("code", { ascending: true })
      .then(({ data }: { data: any[] | null }) => setAllSites(data || []));
  }, []);

  useEffect(() => {
    const config = YARD_CONFIG[status];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!config) { setFilteredYards([]); return; }
    if (config.siteTypes.length === 0) {
      setFilteredYards(allSites);
    } else {
      setFilteredYards(allSites.filter(s => config.siteTypes.includes(s.site_type)));
    }
    setYard("");
  }, [status, allSites]);

  const availableStatuses = isClerk ? CLERK_STATUSES : ALL_STATUSES;
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

  function handleStatusChange(s: EquipmentStatus) {
    setStatus(s);
    setError(null);
    if (!YARD_CONFIG[s]) setYard("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-slate-800 text-lg mb-0.5">Update Status</h3>
        <p className="text-amber-600 text-sm font-medium mb-1">{item.fleet_number}</p>
        <p className="text-slate-500 text-xs mb-5 line-clamp-1">{item.name}</p>

        {isClerk && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 text-xs text-blue-700">
            ℹ️ As Plant Clerk you can update to: Working, Break Down or Storage only.
          </div>
        )}

        {(item as any).current_yard && (
          <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-4 text-xs text-slate-500">
            Current location: <span className="font-semibold text-slate-700">{(item as any).current_yard}</span>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {availableStatuses.map(s => (
            <label key={s}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                status === s ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
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

        {needsYard && (
          <div className="mb-4 border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {yardConfig!.label} <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">
              {filteredYards.length} {yardConfig!.label.toLowerCase()}s available
            </p>
            <select className={iCls} value={yard}
              onChange={e => { setYard(e.target.value); setError(null); }}>
              <option value="">— Select {yardConfig!.label} —</option>
              {filteredYards.map(s => (
                <option key={s.id || s.code} value={s.name}>
                  {s.code ? `${s.code} — ` : ""}{s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Select where this equipment is located.
            </p>
          </div>
        )}

        {status === "Working" && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700">
            Equipment will be marked as operational at its current site.
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs">
            ⚠️ {error}
          </div>
        )}

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
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const { equipment, loading, updateStatus } = useEquipment();
  const { profile, canCommission, canTransfer, isClerk } = useAuth();

  const [search,          setSearch]          = useState("");
  const [filterSt,        setFilterSt]        = useState("");
  const [filterCat,       setFilterCat]       = useState("");
  const [filterSite,      setFilterSite]      = useState("");
  const [filterRegion,    setFilterRegion]    = useState("");
  const [statusItem,      setStatusItem]      = useState<Equipment | null>(null);
  const [view,            setView]            = useState<"table"|"grid">("table");
  const [showExportModal, setShowExportModal] = useState(false);

  const canSeeStatusBtn = profile?.roles?.some((r: string) =>
    ["plant_clerk","site_supervisor","plant_engineer","plant_admin","plant_manager","plant_director","super_admin"].includes(r)
  );

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      e.fleet_number.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.make.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      (e.reg_no||"").toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      ((e as any).allocated_to||"").toLowerCase().includes(q) ||
      ((e as any).allocated_position||"").toLowerCase().includes(q);

    const matchSt = !filterSt ||
      e.operational_status === filterSt ||
      (filterSt === "Under Repair" && e.operational_status === "Break Down");

    return (
      matchQ && matchSt &&
      (!filterCat    || e.category === filterCat) &&
      (!filterSite   || e.site === filterSite) &&
      (!filterRegion || e.region === filterRegion)
    );
  });

  const categories = [...new Set(equipment.map(e => e.category))].filter(Boolean).sort();
  const sites      = [...new Set(equipment.map(e => e.site))].filter(Boolean).sort();
  const regions    = [...new Set(equipment.map(e => e.region))].filter(Boolean).sort();

  const counts = {
    total:    equipment.length,
    working:  equipment.filter(e => e.operational_status === "Working").length,
    repair:   equipment.filter(e => ["Under Repair","Break Down"].includes(e.operational_status)).length,
    storage:  equipment.filter(e => e.operational_status === "Storage").length,
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
            onClick={() => setShowExportModal(true)}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
            📊 Export Plant List
          </button>
          {canTransfer && (
            <Link href="/transfer"
              className="border border-blue-200 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100 flex items-center gap-2">
              🔄 Transfer Equipment
            </Link>
          )}
          {canCommission && (
            <Link href="/commissioning"
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shadow-amber-200 flex items-center gap-2">
              + Commission Equipment
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Fleet",  value: counts.total,    bg: "bg-slate-900 text-white",                         filter: "" },
          { label: "Working",      value: counts.working,  bg: "bg-emerald-500 text-white",                       filter: "Working" },
          { label: "Under Repair", value: counts.repair,   bg: "bg-amber-500 text-white",                         filter: "Under Repair" },
          { label: "Storage",      value: counts.storage,  bg: "bg-white border border-slate-200 text-slate-800", filter: "Storage" },
          { label: "Scrapped",     value: counts.scrapped, bg: "bg-white border border-slate-200 text-slate-800", filter: "Scrapped" },
        ].map(k => (
          <button
            key={k.label}
            onClick={() => setFilterSt(filterSt === k.filter ? "" : k.filter)}
            className={`${k.bg} rounded-2xl p-5 text-left transition-all hover:scale-[1.02] hover:shadow-md ${
              filterSt === k.filter ? "ring-4 ring-amber-400 ring-offset-2" : ""
            }`}>
            <p className="text-3xl font-bold">{k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
            {filterSt === k.filter && (
              <p className="text-xs opacity-60 mt-1">← click to clear</p>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input placeholder="Search fleet no., name, make, user, dept..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterSt} onChange={e => setFilterSt(e.target.value)}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
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
                  {["Fleet No.","Description","Category","Make / Model","Allocated To","Department",
                    "Site","Region","Status","Yard / Location","Condition","Hr Meter / Km","Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={13} className="px-5 py-16 text-center text-slate-400">Loading equipment...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={13} className="px-5 py-16 text-center text-slate-400">
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
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <div className="truncate max-w-32">
                        {(item as any).allocated_to
                          ? <span className="font-medium">{(item as any).allocated_to}</span>
                          : <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="truncate max-w-28">
                        {(item as any).allocated_position || <span className="text-slate-300">—</span>}
                      </div>
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
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-32">
                      {(item as any).current_yard ? (
                        <span className="truncate block" title={(item as any).current_yard}>
                          {(item as any).current_yard}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
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
                        {canSeeStatusBtn && (
                          <button onClick={() => setStatusItem(item)}
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
                  ["Make / Model",  `${item.make} ${item.model}`],
                  ["Category",      item.category],
                  ...((item as any).allocated_to    ? [["Allocated To", (item as any).allocated_to]]    : []),
                  ...((item as any).allocated_position ? [["Department", (item as any).allocated_position]] : []),
                  ["Site",          item.site],
                  ["Region",        item.region],
                  ...((item as any).current_yard ? [["Yard / Location", (item as any).current_yard]] : []),
                  ["Condition",     item.assessment],
                  [item.meter_device === "Km" ? "Km Reading" : "Hour Meter",
                   item.meter_device === "Km"
                     ? `${(item.current_kilometer||0).toLocaleString()} km`
                     : `${(item.current_hour_meter||0).toLocaleString()} hrs`],
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
                {canSeeStatusBtn && (
                  <button onClick={() => setStatusItem(item)}
                    className="text-xs px-4 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium">
                    Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showExportModal && (
        <ExportModal
          equipment={filtered.length > 0 ? filtered : equipment}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {statusItem && (
        <StatusModal
          item={statusItem}
          isClerk={isClerk}
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