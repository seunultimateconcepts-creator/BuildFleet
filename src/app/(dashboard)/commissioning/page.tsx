/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useCommissioning } from "@/hooks/use-commissioning";
import { useSites } from "@/hooks/use-sites";
import { useAuth } from "@/hooks/use-auth";
import { PlantListUploadModal } from "@/components/dashboard/plant-list-upload-modal";
import { dbu } from "@/lib/db";

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
};

// ─────────────────────────────────────────────────────────────
// INLINE DATE EDIT MODAL — fix commissioning date on any record
// ─────────────────────────────────────────────────────────────
function EditDateModal({
  record,
  onClose,
  onSaved,
}: {
  record: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate]     = useState<string>(record.date_commissioned || "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSave() {
    if (!date) { setError("Please select a commissioning date."); return; }
    setSaving(true); setError(null);
    const { error: err } = await dbu
      .from("commissioning")
      .update({ date_commissioned: date })
      .eq("id", record.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">
              Correct Commissioning Date
            </p>
            <h3 className="text-lg font-bold text-slate-800">{record.fleet_number}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{record.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        {/* Current vs New */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Record uploaded</span>
            <span className="font-medium text-slate-700">
              {record.created_at
                ? new Date(record.created_at).toLocaleDateString("en-GB")
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current comm. date</span>
            <span className={`font-medium ${record.date_commissioned ? "text-slate-700" : "text-red-400"}`}>
              {record.date_commissioned
                ? new Date(record.date_commissioned).toLocaleDateString("en-GB")
                : "Not set"}
            </span>
          </div>
        </div>

        {/* Date picker */}
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Actual Commissioning Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          className={iCls}
          value={date}
          onChange={e => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
        />
        <p className="text-xs text-slate-400 mt-1.5">
          Enter the date this equipment was physically commissioned on site.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
            ⚠️ {error}
          </div>
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

  const [step,   setStep]   = useState<1|2|3>(1);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string|null>(null);
  const [form,   setForm]   = useState({ ...BLANK });

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

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
    const result = await submitCommissioning({
      ...form, landed_cost: landedCost,
      commissioned_by: profile?.id || "",
    });
    setSaving(false);
    if (!result.success) { setError(result.error || "Submission failed."); return; }
    onClose(); setForm({ ...BLANK }); setStep(1);
  }

  function reset() { onClose(); setForm({ ...BLANK }); setStep(1); setError(null); }
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
              <F label="Category">
                <input className={iCls} value={form.category}
                  onChange={e => set("category", e.target.value)}
                  placeholder="e.g. Pneumatic Equipment" />
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

              {/* COMMISSIONING DATE — clearly labelled as the physical on-site date */}
              <F label="Date Commissioned on Site" required>
                <input className={iCls} type="date" value={form.date_commissioned}
                  onChange={e => set("date_commissioned", e.target.value)}
                  max={new Date().toISOString().split("T")[0]} />
                <p className="text-xs text-slate-400 mt-1">
                  The actual date this equipment was commissioned on site — not todays date.
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

              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Summary</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[
                    ["Fleet No.",    form.fleet_number || "—"],
                    ["Status",       form.fleet_status],
                    ["Description",  form.description || "—"],
                    ["Make",         form.make || "—"],
                    ["Model",        form.model || "—"],
                    ["Site",         form.location || "—"],
                    ["Region",       form.region || "—"],
                    ["Cost Code",    form.cost_code || "—"],
                    ["Comm. Date",   form.date_commissioned
                      ? new Date(form.date_commissioned).toLocaleDateString("en-GB")
                      : "—"],
                    ["Meter",        form.meter_device],
                    ["Condition",    form.condition_at_receipt],
                    ["Landed Cost",  `₦${landedCost.toLocaleString()}`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-slate-400 text-xs">{l}</p>
                      <p className="font-semibold text-slate-800 truncate">{v}</p>
                    </div>
                  ))}
                </div>
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
  const { canCommission }                           = useAuth();
  const [modal, setModal]   = useState<"new"|"upload"|null>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [filterSite, setFilterSite] = useState("");

  function exportRegister() {
    const headers = ["Fleet No.","Description","Category","Make","Model",
      "Site","Region","Cost Code","Comm. Date","Condition","Supplier","Landed Cost"];
    const rows = filtered.map((r: any) => [
      r.fleet_number, r.description, r.category, r.make, r.model,
      r.location, r.region, r.cost_code || "",
      r.date_commissioned
        ? new Date(r.date_commissioned).toLocaleDateString("en-GB")
        : "",
      r.equipment_condition || "",
      r.supplier || "", r.landed_cost || 0,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `BuildFleet_Commissioning_Register_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Count records missing a commissioning date
  const missingDateCount = commissioningRecords.filter(
    (r: any) => !r.date_commissioned
  ).length;

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
            Register new equipment using the digital PLT-01 form.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button onClick={() => setModal("upload")}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
            📊 Upload Plant List
          </button>
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

      {/* Warning banner if records are missing commissioning dates */}
      {missingDateCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">📅</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              {missingDateCount} equipment {missingDateCount === 1 ? "record is" : "records are"} missing a commissioning date
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Click the <strong>✏️ pencil icon</strong> on any row to set the actual date it was commissioned on site.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Commissioned", value: commissioningRecords.length, bg: "bg-slate-900 text-white" },
          { label: "This Month",
            value: commissioningRecords.filter((r: any) => r.date_commissioned?.startsWith(thisMonth)).length,
            bg: "bg-amber-500 text-white" },
          { label: "Additions",
            value: commissioningRecords.filter((r: any) => r.fleet_status === "Addition").length,
            bg: "bg-white border border-slate-200 text-slate-800" },
          { label: "Replacements",
            value: commissioningRecords.filter((r: any) => r.fleet_status === "Replacement").length,
            bg: "bg-white border border-slate-200 text-slate-800" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Commissioned Equipment Register</h2>
            <p className="text-slate-400 text-sm">{loading ? "Loading..." : `${filtered.length} records`}</p>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm min-w-225">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Fleet No.","Description","Category","Make","Model",
                  "Site","Region","Cost Code","Comm. Date","Condition",""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={11} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-5 py-16 text-center text-slate-400">
                  {commissioningRecords.length === 0
                    ? 'No records yet. Click "+ New Commission" or upload the Plant List.'
                    : "No records match your filters."}
                </td></tr>
              ) : (filtered as any[]).map((item: any) => (
                <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="px-5 py-4 font-bold text-amber-600 font-mono text-xs">{item.fleet_number}</td>
                  <td className="px-5 py-4 text-slate-700 max-w-50 truncate">{item.description}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{item.category}</td>
                  <td className="px-5 py-4 text-slate-600">{item.make}</td>
                  <td className="px-5 py-4 text-slate-600">{item.model}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs max-w-35 truncate">{item.location}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{item.region}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs font-mono">{item.cost_code || "—"}</td>
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
                  {/* Edit date button — always visible, not just on hover */}
                  <td className="px-3 py-4">
                    <button
                      onClick={() => setEditRecord(item)}
                      title="Set commissioning date"
                      className="text-slate-300 hover:text-amber-500 transition-colors text-base"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewCommissionModal   open={modal === "new"}    onClose={() => setModal(null)} />
      <PlantListUploadModal open={modal === "upload"} onClose={() => setModal(null)} />

      {/* Inline date correction modal */}
      {editRecord && (
        <EditDateModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
            onSaved={() => {
            setEditRecord(null);
            // refresh the list so updated date shows immediately
            if (typeof fetchRecords === "function") fetchRecords();
          }}
        />
      )}
    </div>
  );
}
