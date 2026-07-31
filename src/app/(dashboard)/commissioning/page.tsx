/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useCommissioning } from "@/hooks/use-commissioning";
import { useSites } from "@/hooks/use-sites";
import { useAuth } from "@/hooks/use-auth";
import { PlantListUploadModal } from "@/components/dashboard/plant-list-upload-modal";
import { dbu } from "@/lib/db";
import { fetchAllRows } from "@/lib/fetch-all";

const EQUIPMENT_CONDITIONS = [
  "Very Good","Good","Fair-Good","Fair","Poor-Fair","Poor","Scrapped",
];
const METER_DEVICE_OPTIONS = ["Hours","Km","Defect Hours","Defect Km"];

const STATUS_COLORS: Record<string, string> = {
  "Very Good": "bg-emerald-100 text-emerald-700",
  "Good":      "bg-green-100   text-green-700",
  "Fair-Good": "bg-lime-100    text-lime-700",
  "Fair":      "bg-yellow-100  text-yellow-700",
  "Poor-Fair": "bg-orange-100  text-orange-700",
  "Poor":      "bg-red-100     text-red-600",
  "Scrapped":  "bg-slate-100   text-slate-500",
};

// Live operational status — matches the same badge colors used on
// Equipment/Repair/Maintenance pages, for visual consistency.
const OP_STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Storage":      "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
};

// Equipment categories with their hire rates
// These match the Settings page CATEGORY_RATES
const CATEGORY_HIRE_RATES: Record<string, number> = {
  "Light Vehicle":                       7000,
  "Heavy Transport":                     25000,
  "Earth Moving Equipment":              15000,
  "Asphalt & Road Maintenance Equipment":55000,
  "Concrete Equipment":                  35000,
  "Crane & Lifting Equipment":           95000,
  "Generator & Power Equipment":         12000,
  "Pneumatic Equipment":                 6500,
  "Workshop Equipment":                  0,
};

const EQUIPMENT_CATEGORIES = Object.keys(CATEGORY_HIRE_RATES).sort();

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder:text-slate-300";

function F({ label, required, span, children }: {
  label: string; required?: boolean; span?: "2"; children: React.ReactNode;
}) {
  return (
    <div className={span === "2" ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SecHead({ letter, title, sub }: { letter: string; title: string; sub: string }) {
  return (
    <div className="col-span-2 flex items-center gap-3 pt-2 pb-1 border-b border-slate-100">
      <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
        {letter}
      </span>
      <div>
        <p className="font-bold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

const BLANK: any = {
  fleet_number: "", fleet_status: "Addition",
  area_project: "", location: "", cost_code: "", serial_no: "", region: "",
  type_code: "", description: "", category: "", make: "", model: "",
  chassis_no: "", engine_power: "", engine_displacement: "",
  size_capacity: "", tank_capacity: "", meter_device: "Hours",
  year_of_manufacturing: new Date().getFullYear(),
  life_expectancy: "", date_received: "", date_commissioned: "",
  equipment_condition: "Good", depreciation: "",
  condition_at_receipt: "New",
  supplier: "", supplier_code: "", order_no: "", invoice_no: "",
  reg_no: "", remarks: "",
  policy_cover_no: "", insurance_expiry: null,
  total_loss: false, all_risk_comprehensive: false,
  third_party_liability: false, plant_all_risk: false,
  insurance_company: "", insured_sum: 0, annual_premium: 0,
  purchase_cost: 0, freight: 0, insurance_on_sea: 0,
  clearing_customs: 0, inland_transport: 0, other_charges: 0, landed_cost: 0,
  opening_hour_meter: 0, opening_kilometer: 0,
  plant_engineer: "", plant_manager: "", commissioned_by: "",
  hire_rate: 0,
};

// ─────────────────────────────────────────────────────────────
// INLINE DATE EDIT MODAL
// ─────────────────────────────────────────────────────────────
function EditDateModal({ record, onClose, onSaved }: {
  record: any; onClose: () => void; onSaved: () => void;
}) {
  const [date,   setDate]   = useState<string>(record.date_commissioned || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    if (!date) { setError("Please select a commissioning date."); return; }
    setSaving(true); setError(null);
    const { error: err } = await dbu.from("commissioning")
      .update({ date_commissioned: date }).eq("id", record.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Correct Commissioning Date</p>
            <h3 className="text-lg font-bold text-slate-800">{record.fleet_number}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{record.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Current comm. date</span>
            <span className={`font-medium ${record.date_commissioned ? "text-slate-700" : "text-red-400"}`}>
              {record.date_commissioned
                ? new Date(record.date_commissioned).toLocaleDateString("en-GB")
                : "Not set"}
            </span>
          </div>
        </div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Actual Commissioning Date <span className="text-red-400">*</span>
        </label>
        <input type="date" className={iCls} value={date}
          onChange={e => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]} />
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Save Date ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW COMMISSIONING MODAL
// ─────────────────────────────────────────────────────────────
function NewCommissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { submitCommissioning } = useCommissioning();
  const { sites }               = useSites();
  const { profile }             = useAuth();

  const [step,      setStep]      = useState<1|2|3>(1);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string|null>(null);
  const [form,      setForm]      = useState({ ...BLANK });
  const [hireRate,  setHireRate]  = useState<number>(0);
  const [rateLabel, setRateLabel] = useState<string>("");

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  // Auto-assign hire rate when category changes
  function handleCategoryChange(category: string) {
    set("category", category);
    const rate = CATEGORY_HIRE_RATES[category] || 0;
    setHireRate(rate);
    set("hire_rate", rate);
    if (rate > 0) {
      setRateLabel(`₦${rate.toLocaleString()}/day — auto-assigned from category`);
    } else {
      setRateLabel(category === "Workshop Equipment"
        ? "₦0 — Workshop equipment is not chargeable"
        : "₦0 — No rate set for this category yet"
      );
    }
  }

  function handleSiteSelect(siteName: string) {
    set("location", siteName);
    const siteRecord = sites.find(s => s.name === siteName);
    if (siteRecord) {
      set("region",       siteRecord.region);
      set("cost_code",    siteRecord.cost_code || siteRecord.code);
      set("area_project", siteRecord.name);
    }
  }

  const landedCost =
    (Number(form.purchase_cost)    || 0) +
    (Number(form.freight)          || 0) +
    (Number(form.insurance_on_sea) || 0) +
    (Number(form.clearing_customs) || 0) +
    (Number(form.inland_transport) || 0) +
    (Number(form.other_charges)    || 0);

  async function handleSubmit() {
    if (!form.fleet_number || !form.description || !form.make ||
        !form.model || !form.date_commissioned || !form.location) {
      setError("Please fill all required fields (marked *)."); setStep(1); return;
    }
    setSaving(true); setError(null);

    // Auto-fetch hire rate from equipment table category settings if not set
    let finalHireRate = hireRate;
    if (!finalHireRate && form.category) {
      const { data: equipWithRate } = await dbu
        .from("equipment")
        .select("hire_rate")
        .ilike("category", `%${form.category}%`)
        .gt("hire_rate", 0)
        .limit(1)
        .single();
      if (equipWithRate?.hire_rate) {
        finalHireRate = equipWithRate.hire_rate;
      }
    }

    const result = await submitCommissioning({
      ...form,
      landed_cost: landedCost,
      hire_rate: finalHireRate,
      commissioned_by: profile?.id || "",
    });
    setSaving(false);
    if (!result.success) { setError(result.error || "Submission failed."); return; }
    onClose(); setForm({ ...BLANK }); setStep(1); setHireRate(0); setRateLabel("");
  }

  function reset() {
    onClose(); setForm({ ...BLANK }); setStep(1);
    setError(null); setHireRate(0); setRateLabel("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-6 overflow-hidden flex flex-col">
        <div className="px-8 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-0.5">PLT-01</p>
            <h2 className="text-xl font-bold text-white">Commissioning Report Form</h2>
          </div>
          <button onClick={reset} className="text-slate-400 hover:text-white text-3xl">×</button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          {([
            [1,"Plant Section","Equipment identity & location"],
            [2,"Account Section","Insurance & costs"],
            [3,"Meters & Sign","Opening readings"],
          ] as [1|2|3,string,string][]).map(([num,label,sub]) => (
            <button key={num} onClick={() => setStep(num)}
              className={`flex-1 py-4 px-3 text-left border-b-2 transition-all ${
                step === num ? "border-amber-500 bg-white" : "border-transparent hover:bg-white/70"
              }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${step === num ? "text-amber-500" : "text-slate-400"}`}>
                Step {num}
              </span>
              <span className={`text-sm font-semibold ${step === num ? "text-slate-800" : "text-slate-500"}`}>{label}</span>
              <span className="text-xs text-slate-400 hidden sm:block">{sub}</span>
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-8 flex-1">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <SecHead letter="A" title="Header Information" sub="Location auto-fills area, region and cost code" />
              <F label="Location / Cost Centre" required>
                <select className={iCls} value={form.location}
                  onChange={e => handleSiteSelect(e.target.value)}>
                  <option value="">Select site — auto-fills area & region...</option>
                  {sites.map(s => (
                    <option key={s.id || s.code} value={s.name}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Area / Project">
                <input className={`${iCls} bg-slate-50`} value={form.area_project}
                  onChange={e => set("area_project", e.target.value)}
                  placeholder="Auto-filled from site" />
              </F>
              <F label="Region">
                <input className={`${iCls} bg-slate-50`} value={form.region}
                  onChange={e => set("region", e.target.value)}
                  placeholder="Auto-filled from site" />
              </F>
              <F label="Cost Code">
                <input className={`${iCls} bg-slate-50`} value={form.cost_code}
                  onChange={e => set("cost_code", e.target.value)}
                  placeholder="Auto-filled from site" />
              </F>

              <SecHead letter="B" title="Fleet Status & Identity" sub="Fleet status, type code, description, category" />
              <F label="Fleet Status" required>
                <select className={iCls} value={form.fleet_status} onChange={e => set("fleet_status", e.target.value)}>
                  <option value="Addition">Addition (New to fleet)</option>
                  <option value="Replacement">Replacement</option>
                </select>
              </F>
              <F label="Fleet Number" required>
                <input className={iCls} value={form.fleet_number}
                  onChange={e => set("fleet_number", e.target.value)} placeholder="e.g. AC-01" />
              </F>
              <F label="Type Code">
                <input className={iCls} value={form.type_code}
                  onChange={e => set("type_code", e.target.value)} />
              </F>
              <F label="Description" required>
                <input className={iCls} value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="e.g. Portable Air Compressor" />
              </F>

              {/* CATEGORY — now a dropdown with auto hire rate */}
              <F label="Category">
                <select className={iCls} value={form.category}
                  onChange={e => handleCategoryChange(e.target.value)}>
                  <option value="">Select category...</option>
                  {EQUIPMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                {rateLabel && (
                  <p className={`text-xs mt-1.5 font-medium ${
                    hireRate > 0 ? "text-emerald-600" : "text-slate-400"
                  }`}>
                    {hireRate > 0 ? "✓" : "ℹ️"} {rateLabel}
                  </p>
                )}
              </F>

              <SecHead letter="C" title="Machine Details" sub="Make, model, chassis, engine" />
              <F label="Make" required>
                <input className={iCls} value={form.make}
                  onChange={e => set("make", e.target.value)} placeholder="e.g. Sullair" />
              </F>
              <F label="Model" required>
                <input className={iCls} value={form.model}
                  onChange={e => set("model", e.target.value)} placeholder="e.g. 185JD" />
              </F>
              <F label="Chassis / Machine No.">
                <input className={iCls} value={form.chassis_no} onChange={e => set("chassis_no", e.target.value)} />
              </F>
              <F label="Veh. Reg. Nr.">
                <input className={iCls} value={form.reg_no} onChange={e => set("reg_no", e.target.value)} />
              </F>
              <F label="Engine Power Rating">
                <input className={iCls} value={form.engine_power} onChange={e => set("engine_power", e.target.value)} />
              </F>
              <F label="Engine Displacement">
                <input className={iCls} value={form.engine_displacement} onChange={e => set("engine_displacement", e.target.value)} />
              </F>
              <F label="Size / Capacity">
                <input className={iCls} value={form.size_capacity} onChange={e => set("size_capacity", e.target.value)} />
              </F>
              <F label="Tank Capacity">
                <input className={iCls} value={form.tank_capacity} onChange={e => set("tank_capacity", e.target.value)} />
              </F>
              <F label="Meter Device" required>
                <select className={iCls} value={form.meter_device} onChange={e => set("meter_device", e.target.value)}>
                  {METER_DEVICE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </F>
              <F label="Year of Manufacturing">
                <input className={iCls} type="number" value={form.year_of_manufacturing}
                  onChange={e => set("year_of_manufacturing", parseInt(e.target.value) || 0)} />
              </F>
              <F label="Life Expectancy">
                <input className={iCls} value={form.life_expectancy}
                  onChange={e => set("life_expectancy", e.target.value)} placeholder="e.g. 10 years" />
              </F>
              <F label="Date Received">
                <input className={iCls} type="date" value={form.date_received || ""}
                  onChange={e => set("date_received", e.target.value)} />
              </F>
              <F label="Date Commissioned on Site" required>
                <input className={iCls} type="date" value={form.date_commissioned}
                  onChange={e => set("date_commissioned", e.target.value)}
                  max={new Date().toISOString().split("T")[0]} />
                <p className="text-xs text-slate-400 mt-1">
                  The actual date this equipment was commissioned on site — not today&apos;s date.
                </p>
              </F>
              <F label="Equipment Condition">
                <select className={iCls} value={form.equipment_condition}
                  onChange={e => set("equipment_condition", e.target.value)}>
                  {EQUIPMENT_CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="Depreciation">
                <input className={iCls} value={form.depreciation}
                  onChange={e => set("depreciation", e.target.value)} placeholder="e.g. 10% p.a." />
              </F>

              <SecHead letter="D" title="Condition at Receipt & Supplier" sub="New or second hand, supplier info" />
              <F label="Condition at Receipt" required>
                <div className="flex gap-4 pt-1">
                  {["New","Second Hand"].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cond_receipt" value={v}
                        checked={form.condition_at_receipt === v}
                        onChange={() => set("condition_at_receipt", v)}
                        className="accent-amber-500" />
                      <span className="text-sm font-medium text-slate-700">{v}</span>
                    </label>
                  ))}
                </div>
              </F>
              <F label="Supplier">
                <input className={iCls} value={form.supplier} onChange={e => set("supplier", e.target.value)} />
              </F>
              <F label="Supplier Code">
                <input className={iCls} value={form.supplier_code} onChange={e => set("supplier_code", e.target.value)} />
              </F>
              <F label="Order No.">
                <input className={iCls} value={form.order_no} onChange={e => set("order_no", e.target.value)} />
              </F>
              <F label="Invoice No.">
                <input className={iCls} value={form.invoice_no} onChange={e => set("invoice_no", e.target.value)} />
              </F>
              <F label="Remarks (if any)" span="2">
                <textarea className={`${iCls} h-20 resize-none`} value={form.remarks}
                  onChange={e => set("remarks", e.target.value)} />
              </F>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <SecHead letter="E" title="Insurance Part" sub="Policy cover, expiry, coverage" />
              <F label="Policy Cover No.">
                <input className={iCls} value={form.policy_cover_no} onChange={e => set("policy_cover_no", e.target.value)} />
              </F>
              <F label="Expiry Date">
                <input className={iCls} type="date" value={form.insurance_expiry || ""}
                  onChange={e => set("insurance_expiry", e.target.value || null)} />
              </F>
              <F label="Insurance Company">
                <input className={iCls} value={form.insurance_company} onChange={e => set("insurance_company", e.target.value)} />
              </F>
              <F label="Insured Sum (₦)">
                <input className={iCls} type="number" value={form.insured_sum || ""}
                  onChange={e => set("insured_sum", parseFloat(e.target.value) || 0)} />
              </F>
              <F label="Annual Premium (₦)">
                <input className={iCls} type="number" value={form.annual_premium || ""}
                  onChange={e => set("annual_premium", parseFloat(e.target.value) || 0)} />
              </F>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                {[["total_loss","Total Loss"],["all_risk_comprehensive","All Risk Comprehensive"],
                  ["third_party_liability","Third Party Liability"],["plant_all_risk","Plant All Risk"],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={Boolean(form[k])}
                      onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>

              <SecHead letter="F" title="Costs Part" sub="Purchase, freight, insurance, customs, transport" />
              {[["purchase_cost","Purchase Cost (₦)"],["freight","Freight (₦)"],
                ["insurance_on_sea","Insurance on Sea (₦)"],["clearing_customs","Clearing & Customs (₦)"],
                ["inland_transport","Inland Transport (₦)"],["other_charges","Other Charges (₦)"],
              ].map(([k, label]) => (
                <F key={k} label={label}>
                  <input className={iCls} type="number" value={form[k] || ""}
                    onChange={e => set(k, parseFloat(e.target.value) || 0)} />
                </F>
              ))}
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Auto-calculated</p>
                  <p className="font-bold text-slate-800">Landed Cost</p>
                </div>
                <p className="text-3xl font-bold text-amber-600">
                  ₦{landedCost.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <SecHead letter="G" title="Opening Meter Readings" sub="Starting values when commissioned" />
              <F label="Opening Hour Meter">
                <input className={iCls} type="number" value={form.opening_hour_meter || ""}
                  onChange={e => set("opening_hour_meter", parseFloat(e.target.value) || 0)} placeholder="0" />
              </F>
              <F label="Opening Kilometer">
                <input className={iCls} type="number" value={form.opening_kilometer || ""}
                  onChange={e => set("opening_kilometer", parseFloat(e.target.value) || 0)} placeholder="0" />
              </F>
              <SecHead letter="H" title="Signatories" sub="Plant Engineer and Plant Manager / Director" />
              <F label="Plant Engineer — Name">
                <input className={iCls} value={form.plant_engineer} onChange={e => set("plant_engineer", e.target.value)} />
              </F>
              <F label="(Gen.) Plant Manager / Director">
                <input className={iCls} value={form.plant_manager} onChange={e => set("plant_manager", e.target.value)} />
              </F>

              {/* Summary with hire rate shown */}
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Summary</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[
                    ["Fleet No.",    form.fleet_number || "—"],
                    ["Status",       form.fleet_status],
                    ["Description",  form.description || "—"],
                    ["Make",         form.make || "—"],
                    ["Model",        form.model || "—"],
                    ["Category",     form.category || "—"],
                    ["Site",         form.location || "—"],
                    ["Region",       form.region || "—"],
                    ["Cost Code",    form.cost_code || "—"],
                    ["Comm. Date",   form.date_commissioned
                      ? new Date(form.date_commissioned).toLocaleDateString("en-GB") : "—"],
                    ["Meter",        form.meter_device],
                    ["Landed Cost",  `₦${landedCost.toLocaleString()}`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-slate-400 text-xs">{l}</p>
                      <p className="font-semibold text-slate-800 truncate">{v}</p>
                    </div>
                  ))}
                </div>
                {/* Hire rate highlight */}
                {hireRate > 0 && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Auto-assigned Hire Rate</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Based on category: {form.category}</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">₦{hireRate.toLocaleString()}/day</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div>{step > 1 && (
            <button onClick={() => setStep(s => (s-1) as 1|2|3)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-white">
              ← Back
            </button>
          )}</div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
              Cancel
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(s => (s+1) as 1|2|3)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Commissioning..." : "Commission Equipment ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CommissioningPage() {
  const { commissioningRecords, loading, fetchRecords } = useCommissioning();
  const { canCommission, profile }                      = useAuth();

  // ── SECURITY: bulk plant list upload is the single most destructive
  // action in BuildFleet — it can overwrite the entire equipment
  // register in one click. Locked to super_admin ONLY (not even
  // plant_admin/plant_manager), as a deliberate insider-threat guard:
  // once BuildFleet is acquired, an aggrieved staff member must not be
  // able to reset live operational data via a bulk upload.
  const isSuperAdmin = ((profile?.roles as string[]) || []).includes("super_admin");
  const [modal,      setModal]      = useState<"new"|"upload"|null>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [filterSite, setFilterSite] = useState("");

  // ── Live status — read fresh from `equipment` on every load, never
  // stored on the commissioning row. This is what actually answers
  // "does Commissioning reflect the current status": it's not synced,
  // it's looked up live, so it can never go stale the way a copied/
  // duplicated field could.
  const [liveStatus, setLiveStatus] = useState<Record<string, { status: string; yard: string }>>({});

  useEffect(() => {
    async function loadLiveStatus() {
      // ★ FIX: paginated — a single select caps at 1,000 rows, which
      // silently dropped live status for 438 of the 1,438 equipment.
      const data = await fetchAllRows("equipment", "fleet_number,operational_status,current_yard");
      const map: Record<string, { status: string; yard: string }> = {};
      (data || []).forEach((e: any) => {
        map[e.fleet_number] = { status: e.operational_status, yard: e.current_yard || "" };
      });
      setLiveStatus(map);
    }
    loadLiveStatus();
  }, [commissioningRecords]); // refresh alongside the commissioning list

  function exportRegister() {
    const headers = ["Fleet No.","Description","Category","Make","Model",
      "Site","Region","Cost Code","Comm. Date","Condition","Status","Hire Rate","Supplier","Landed Cost"];
    const rows = filtered.map((r: any) => [
      r.fleet_number, r.description, r.category, r.make, r.model,
      r.location, r.region, r.cost_code || "",
      r.date_commissioned ? new Date(r.date_commissioned).toLocaleDateString("en-GB") : "",
      r.equipment_condition || "",
      liveStatus[r.fleet_number]?.status || "",
      r.hire_rate || 0,
      r.supplier || "",
      r.landed_cost || 0,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `BuildFleet_Commissioning_Register_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const filtered = commissioningRecords.filter((r: any) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      r.fleet_number.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.make.toLowerCase().includes(q);
    return matchQ &&
      (!filterCat  || r.category === filterCat) &&
      (!filterSite || r.location === filterSite);
  });

  const missingDateCount = commissioningRecords.filter((r: any) => !r.date_commissioned).length;
  const uniqueSites = [...new Set(commissioningRecords.map((r: any) => r.location))].filter(Boolean);
  const uniqueCats  = [...new Set(commissioningRecords.map((r: any) => r.category))].filter(Boolean).sort();
  const thisMonth   = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">PLT-01</p>
          <h1 className="text-3xl font-bold text-slate-900">Commissioning</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Register new equipment using the digital PLT-01 form. Hire rates are auto-assigned by category.
            Status shown here is read live from Equipment — update it from the Equipment page.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          {isSuperAdmin && (
            <button onClick={() => setModal("upload")}
              className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
              📊 Upload Plant List
            </button>
          )}
          <button onClick={exportRegister}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
            ↓ Export Register
          </button>
          {canCommission && (
            <button onClick={() => setModal("new")}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shadow-amber-200">
              + New Commission
            </button>
          )}
        </div>
      </div>

      {missingDateCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">📅</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              {missingDateCount} equipment {missingDateCount === 1 ? "record is" : "records are"} missing a commissioning date
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Click the ✏️ pencil icon on any row to set the actual date.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Total Commissioned", value:commissioningRecords.length,                                                                    bg:"bg-slate-900 text-white" },
          { label:"This Month",         value:commissioningRecords.filter((r:any)=>r.date_commissioned?.startsWith(thisMonth)).length,         bg:"bg-amber-500 text-white" },
          { label:"Additions",          value:commissioningRecords.filter((r:any)=>r.fleet_status==="Addition").length,                        bg:"bg-white border border-slate-200 text-slate-800" },
          { label:"Replacements",       value:commissioningRecords.filter((r:any)=>r.fleet_status==="Replacement").length,                     bg:"bg-white border border-slate-200 text-slate-800" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <input placeholder="Search fleet no., description, make..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-1"} />
          <select className={iCls} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {uniqueCats.map((c: any) => <option key={c}>{c}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {uniqueSites.map((s: any) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Commissioned Equipment Register</h2>
            <p className="text-slate-400 text-sm">{loading ? "Loading..." : `${filtered.length} records`}</p>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm min-w-225">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
              <tr>
                {["Fleet No.","Description","Category","Make","Model",
                  "Site","Region","Hire Rate","Comm. Date","Condition","Status",""].map((h, i) => (
                  <th key={h}
                    className={`text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
                      i === 0 ? "sticky left-0 z-30 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : ""
                    }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={12} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="px-5 py-16 text-center text-slate-400">
                  {commissioningRecords.length === 0
                    ? 'No records yet. Click "+ New Commission" or upload the Plant List.'
                    : "No records match your filters."}
                </td></tr>
              ) : (filtered as any[]).map((item: any) => {
                const live = liveStatus[item.fleet_number];
                return (
                <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="px-5 py-4 font-bold text-amber-600 font-mono text-xs sticky left-0 z-10 bg-white group-hover:bg-amber-50/30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{item.fleet_number}</td>
                  <td className="px-5 py-4 text-slate-700 max-w-50 truncate">{item.description}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{item.category}</td>
                  <td className="px-5 py-4 text-slate-600">{item.make}</td>
                  <td className="px-5 py-4 text-slate-600">{item.model}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs max-w-35 truncate">{item.location}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{item.region}</td>
                  <td className="px-5 py-4 text-xs font-mono font-semibold text-emerald-700">
                    {item.hire_rate ? `₦${Number(item.hire_rate).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-5 py-4 text-xs whitespace-nowrap">
                    {item.date_commissioned ? (
                      <span className="text-slate-600">
                        {new Date(item.date_commissioned).toLocaleDateString("en-GB")}
                      </span>
                    ) : (
                      <span className="text-red-400 font-medium">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      STATUS_COLORS[item.equipment_condition] || "bg-slate-100 text-slate-600"
                    }`}>
                      {item.equipment_condition || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {live ? (
                      <div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          OP_STATUS_STYLE[live.status] || "bg-slate-100 text-slate-600"
                        }`}>
                          {live.status}
                        </span>
                        {live.yard && (
                          <p className="text-[10px] text-slate-400 mt-1 max-w-32 truncate" title={live.yard}>{live.yard}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">No equipment record</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <button onClick={() => setEditRecord(item)} title="Set commissioning date"
                      className="text-slate-300 hover:text-amber-500 transition-colors text-base">
                      ✏️
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NewCommissionModal   open={modal === "new"}    onClose={() => setModal(null)} />
      <PlantListUploadModal open={modal === "upload" && isSuperAdmin} onClose={() => setModal(null)} />

      {editRecord && (
        <EditDateModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            if (typeof fetchRecords === "function") fetchRecords();
          }}
        />
      )}
    </div>
  );
}