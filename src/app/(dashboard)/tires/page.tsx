/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useTires } from "@/hooks/use-tires";
import { useAuth } from "@/hooks/use-auth";
import { dbu } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const TIRE_BRANDS = ["Michelin","Bridgestone","Goodyear","Continental","Pirelli",
  "Dunlop","Firestone","Trelleborg","Alliance","BKT","Titan","Galaxy","Other"];

const TIRE_TYPES = ["Radial","Bias","Solid","Foam-filled"];

// Hartland's real position legend, from the Tyre Pass form — replaces
// the generic FL/FR/RLI/RLO scheme the page used before.
const TIRE_POSITIONS = [
  { code: "A1-L",  label: "Axle 1 Left (single)" },
  { code: "A1-R",  label: "Axle 1 Right (single)" },
  { code: "A1-LI", label: "Axle 1 Left Inner" },
  { code: "A1-LO", label: "Axle 1 Left Outer" },
  { code: "A1-RI", label: "Axle 1 Right Inner" },
  { code: "A1-RO", label: "Axle 1 Right Outer" },
  { code: "A2-L",  label: "Axle 2 Left (single)" },
  { code: "A2-R",  label: "Axle 2 Right (single)" },
  { code: "A2-LI", label: "Axle 2 Left Inner" },
  { code: "A2-LO", label: "Axle 2 Left Outer" },
  { code: "A2-RI", label: "Axle 2 Right Inner" },
  { code: "A2-RO", label: "Axle 2 Right Outer" },
  { code: "A3-LI", label: "Axle 3 Left Inner" },
  { code: "A3-LO", label: "Axle 3 Left Outer" },
  { code: "A3-RI", label: "Axle 3 Right Inner" },
  { code: "A3-RO", label: "Axle 3 Right Outer" },
  { code: "A4-LI", label: "Axle 4 Left Inner" },
  { code: "A4-LO", label: "Axle 4 Left Outer" },
  { code: "A4-RI", label: "Axle 4 Right Inner" },
  { code: "A4-RO", label: "Axle 4 Right Outer" },
  { code: "S1",    label: "Spare Tyre One" },
  { code: "S2",    label: "Spare Tyre Two" },
];
const POSITION_LABELS: Record<string,string> = Object.fromEntries(TIRE_POSITIONS.map(p => [p.code, p.label]));

const STATUS_STYLE: Record<string,string> = {
  "In Stock":  "bg-blue-100 text-blue-700",
  "Fitted":    "bg-emerald-100 text-emerald-700",
  "Worn Out":  "bg-amber-100 text-amber-700",
  "Scrapped":  "bg-red-100 text-red-600",
};

const EVENT_STYLE: Record<string, { badge: string; icon: string }> = {
  "Added to Stock": { badge: "bg-slate-100 text-slate-600",   icon: "📦" },
  "Fitted":         { badge: "bg-emerald-100 text-emerald-700", icon: "🔧" },
  "Removed":        { badge: "bg-orange-100 text-orange-700",  icon: "⬇️" },
  "Inspected":      { badge: "bg-blue-100 text-blue-700",      icon: "📏" },
};

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const esc = (v: any) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function openPrint(html: string) {
  const w = window.open("", "_blank", "width=1150,height=800");
  if (!w) return;
  w.document.write(html); w.document.close();
}

const PRINT_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; padding: 12px; }
  .header { display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:10px; }
  .logo { font-weight:bold; font-size:14px; color:#c00; }
  h1 { font-size:18px; text-align:center; letter-spacing:2px; }
  .meta { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:10px; font-size:10px; }
  .meta .label { font-size:8px; color:#555; font-weight:bold; text-transform:uppercase; }
  .meta .field { border-bottom:1px solid #000; min-height:16px; padding:1px 0; }
  table { width:100%; border-collapse:collapse; font-size:9px; }
  th { background:#eee; border:1px solid #999; padding:3px 5px; font-size:8px; text-transform:uppercase; }
  td { border:1px solid #ccc; padding:3px 5px; text-align:center; }
  .sig { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:18px; font-size:9px; }
  .sig-line { border-top:1px solid #000; padding-top:3px; margin-top:24px; }
  .legend { font-size:8px; border:1px solid #999; padding:6px; margin-bottom:8px; }
  .print-bar { background:#F5A623; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; margin:-12px -12px 12px; }
  .print-btn { background:#080D1A; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer; }
  @media print { .print-bar { display:none; } @page { size: A4 landscape; margin: 8mm; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`;

// ─────────────────────────────────────────────────────────────
// PRINT: TYRE PASS
// ─────────────────────────────────────────────────────────────
function printTyrePass(equipment: any, fittedTires: any[]) {
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const rows = fittedTires.map((t, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700">${esc(t.current_position)}</td>
      <td>${t.fitted_date ? new Date(t.fitted_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : ""}</td>
      <td>${t.fitted_tread_depth ?? ""}</td>
      <td>${esc(t.inventory_no)}</td>
      <td>${esc(t.tire_number)}</td>
      <td>${esc(t.brand)}</td>
      <td>${esc(t.size)}</td>
      <td>${esc(t.pattern)}</td>
      <td>${esc(t.date_of_manufacture)}</td>
      <td>${esc(t.cost_code)}</td>
      <td>${t.fitted_km_reading ?? t.fitted_hr_reading ?? ""}</td>
    </tr>`).join("");
  const blank = Array.from({length: Math.max(0, 15 - fittedTires.length)})
    .map(() => `<tr>${Array(12).fill("<td>&nbsp;</td>").join("")}</tr>`).join("");

  openPrint(`<!DOCTYPE html><html><head><title>Tyre Pass — ${esc(equipment.fleet_number)}</title>
  <style>${PRINT_CSS}</style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Tyre Pass — ${esc(equipment.fleet_number)} — ${dateStr}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span></div>
    <h1>TYRE PASS</h1>
    <div class="legend">
      <b>Position of Tyre</b><br>
      A1 L/R — single axle left/right · LI/LO/RI/RO — inner/outer<br>
      A2, A3… — axle two, three… · S1/S2 — spare tyres
    </div>
  </div>
  <div class="meta">
    <div><span class="label">Fleet No.:</span><div class="field">${esc(equipment.fleet_number)}</div></div>
    <div><span class="label">Veh. Reg. No.:</span><div class="field">${esc(equipment.reg_no)}</div></div>
    <div><span class="label">Date of Issue:</span><div class="field">${dateStr}</div></div>
    <div><span class="label">Make:</span><div class="field">${esc(equipment.make)}</div></div>
    <div><span class="label">Model:</span><div class="field">${esc(equipment.model)}</div></div>
    <div><span class="label">Num. of Tyres:</span><div class="field">${fittedTires.length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>S/N</th><th>Position</th><th>Date of Mount</th><th>Tread Depth</th>
      <th>Inventory No</th><th>Serial No.</th><th>Make</th><th>Size</th>
      <th>Pattern</th><th>Date of Man.</th><th>Cost Code</th><th>Hr/Km Reading</th>
    </tr></thead>
    <tbody>${rows}${blank}</tbody>
  </table>
  <div class="sig">
    <div><span>Date: ____________ &nbsp; Plant Clerk Name:</span><div class="sig-line">Staff No. / Signature</div></div>
    <div><span>Date: ____________ &nbsp; Supervisor Name:</span><div class="sig-line">Staff No. / Signature</div></div>
  </div>
  </body></html>`);
}

// ─────────────────────────────────────────────────────────────
// PRINT: WEEKLY UPDATE
// ─────────────────────────────────────────────────────────────
function printWeeklyUpdate(fitted: any[], removed: any[], weekFrom: string, weekTo: string) {
  const maxRows = Math.max(fitted.length, removed.length, 1);
  const rows = Array.from({ length: maxRows }).map((_, i) => {
    const f = fitted[i]; const r = removed[i];
    return `<tr>
      <td>${i+1}</td>
      <td style="font-weight:700;color:#92400e">${esc(f?.fleet_number || r?.fleet_number || "")}</td>
      <td>${(f||r)?.created_at ? new Date((f||r).created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : ""}</td>
      <td>${f?.km_reading ?? f?.hr_reading ?? ""}</td>
      <td style="font-weight:700">${esc(f?.position || r?.position || "")}</td>
      <td style="background:#e8f5e9">${esc(f?.tire_number)}</td>
      <td style="background:#e8f5e9">${esc(f?.tread_depth)}</td>
      <td style="background:#fff3e0">${esc(r?.tire_number)}</td>
      <td style="background:#fff3e0">${esc(r?.tread_depth)}</td>
      <td>${esc(r?.reason)}</td>
    </tr>`;
  }).join("");

  openPrint(`<!DOCTYPE html><html><head><title>Tyre Records Weekly Update</title>
  <style>${PRINT_CSS}</style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Tyre Records Weekly Update</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span></div>
    <h1>TYRE RECORDS WEEKLY UPDATE</h1>
    <div style="font-size:9px">Calendar Week:<br><b>${esc(weekFrom)} — ${esc(weekTo)}</b></div>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">S/N</th><th rowspan="2">Fleet No.</th><th rowspan="2">Date</th>
        <th rowspan="2">Hr/Km</th><th rowspan="2">Position</th>
        <th colspan="2" style="background:#c8e6c9">NEW TYRE</th>
        <th colspan="2" style="background:#ffe0b2">REMOVED TYRE</th>
        <th rowspan="2">Reason / Condition</th>
      </tr>
      <tr>
        <th style="background:#c8e6c9">Tire No.</th><th style="background:#c8e6c9">Tread</th>
        <th style="background:#ffe0b2">Tire No.</th><th style="background:#ffe0b2">Tread</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sig">
    <div><span>Date: ____________ &nbsp; Plant Clerk / Officer:</span><div class="sig-line">Staff No. / Signature</div></div>
    <div><span>Date: ____________ &nbsp; Plant Engineer / SV:</span><div class="sig-line">Staff No. / Signature</div></div>
  </div>
  </body></html>`);
}

// ─────────────────────────────────────────────────────────────
// PRINT: QUARTERLY TREAD DEPTH REPORT
// ─────────────────────────────────────────────────────────────
function printQuarterly(equipment: any, rows: any[], quarter: string, year: number, hrKm: string) {
  const dateStr = new Date().toLocaleDateString("en-GB");
  const body = rows.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700">${esc(r.current_position)}</td>
      <td>${esc(r.inventory_no)}</td>
      <td>${esc(r.tire_number)}</td>
      <td>${esc(r.brand)}</td>
      <td>${esc(r.size)}</td>
      <td>${esc(r.pattern)}</td>
      <td style="font-weight:700">${r.actual_depth ?? ""}</td>
      <td>${r.fitted_tread_depth ?? ""}</td>
      <td>${r.fitted_date ? new Date(r.fitted_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : ""}</td>
      <td>${esc(r.comments)}</td>
    </tr>`).join("");

  openPrint(`<!DOCTYPE html><html><head><title>Tyre Tread Depth Quarterly — ${esc(equipment.fleet_number)}</title>
  <style>${PRINT_CSS}</style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Tyre Tread Depth Quarterly Report — ${esc(equipment.fleet_number)}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span></div>
    <h1>TYRE TREAD DEPTH QUARTERLY REPORT</h1><div></div>
  </div>
  <div class="meta">
    <div><span class="label">Area / Project:</span><div class="field">${esc(equipment.site)}</div></div>
    <div><span class="label">Fleet No.:</span><div class="field">${esc(equipment.fleet_number)}</div></div>
    <div><span class="label">Quarter / Year:</span><div class="field">${esc(quarter)} / ${year}</div></div>
    <div><span class="label">Hr/Km Reading:</span><div class="field">${esc(hrKm)}</div></div>
    <div><span class="label">Serial No.:</span><div class="field"></div></div>
    <div><span class="label">Actual Date:</span><div class="field">${dateStr}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>S/No.</th><th>Position</th><th>Inventory No.</th><th>Serial No.</th>
      <th>Make</th><th>Size</th><th>Pattern</th>
      <th>T. Depth (Actual)</th><th>T. Depth (Fix. Date)</th><th>Fixing Date</th><th>Comments</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="sig">
    <div><span>Date: ____________ &nbsp; Plant Clerk/Officer:</span><div class="sig-line">Staff No. / Signature</div></div>
    <div><span>Date: ____________ &nbsp; Plant Engr. / Supervisor:</span><div class="sig-line">Staff No. / Signature</div></div>
  </div>
  </body></html>`);
}

// ─────────────────────────────────────────────────────────────
// ADD TIRE MODAL — extended with inventory_no, pattern, date_of_manufacture, cost_code
// ─────────────────────────────────────────────────────────────
function AddTireModal({ open, onClose, onAdded, profile }: { open: boolean; onClose: () => void; onAdded: () => void; profile: any }) {
  const { addTire } = useTires();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string|null>(null);
  const [form, setForm] = useState({
    tire_number:"", brand:"Michelin", size:"", type:"Radial",
    ply_rating:"", pattern:"", date_of_manufacture:"", inventory_no:"", cost_code:"",
    purchase_date:"", purchase_cost:"",
    supplier:"", expected_life_km:"", expected_life_hrs:"",
    minimum_tread_depth:"3", notes:"",
  });

  function set(k: string, v: string) { setForm(p => ({...p, [k]: v})); }

  async function handleSave() {
    if (!form.tire_number || !form.size) { setError("Tire number and size are required."); return; }
    setSaving(true); setError(null);
    const result = await addTire({
      ...form,
      purchase_cost: parseFloat(form.purchase_cost)||0,
      expected_life_km: parseFloat(form.expected_life_km)||null,
      expected_life_hrs: parseFloat(form.expected_life_hrs)||null,
      minimum_tread_depth: parseFloat(form.minimum_tread_depth)||3,
      performed_by: profile?.full_name || "",
    });
    setSaving(false);
    if (!result.success) { setError(result.error||"Failed to add tire."); return; }
    onAdded(); onClose();
    setForm({ tire_number:"", brand:"Michelin", size:"", type:"Radial", ply_rating:"", pattern:"", date_of_manufacture:"", inventory_no:"", cost_code:"", purchase_date:"", purchase_cost:"", supplier:"", expected_life_km:"", expected_life_hrs:"", minimum_tread_depth:"3", notes:"" });
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">
        <div className="px-7 py-5 bg-slate-900 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">TMS</p>
            <h2 className="text-lg font-bold text-white">Add New Tire to Stock</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-7 grid grid-cols-2 gap-5">
          <F label="Tire / Serial Number" required>
            <input className={iCls} value={form.tire_number} onChange={e=>set("tire_number",e.target.value)} placeholder="e.g. 4610"/>
          </F>
          <F label="Size" required>
            <input className={iCls} value={form.size} onChange={e=>set("size",e.target.value)} placeholder="e.g. 185/80R14"/>
          </F>
          <F label="Make / Brand">
            <select className={iCls} value={form.brand} onChange={e=>set("brand",e.target.value)}>
              {TIRE_BRANDS.map(b=><option key={b}>{b}</option>)}
            </select>
          </F>
          <F label="Pattern">
            <input className={iCls} value={form.pattern} onChange={e=>set("pattern",e.target.value)} placeholder="e.g. MXTE"/>
          </F>
          <F label="Type">
            <select className={iCls} value={form.type} onChange={e=>set("type",e.target.value)}>
              {TIRE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </F>
          <F label="Ply Rating">
            <input className={iCls} value={form.ply_rating} onChange={e=>set("ply_rating",e.target.value)} placeholder="e.g. 16PR"/>
          </F>
          <F label="Date of Manufacture">
            <input className={iCls} value={form.date_of_manufacture} onChange={e=>set("date_of_manufacture",e.target.value)} placeholder="e.g. Nov, 2021"/>
          </F>
          <F label="Inventory No.">
            <input className={iCls} value={form.inventory_no} onChange={e=>set("inventory_no",e.target.value)} placeholder="From store paperwork"/>
          </F>
          <F label="Cost Code">
            <input className={iCls} value={form.cost_code} onChange={e=>set("cost_code",e.target.value)}/>
          </F>
          <F label="Supplier">
            <input className={iCls} value={form.supplier} onChange={e=>set("supplier",e.target.value)}/>
          </F>
          <F label="Purchase Date">
            <input className={iCls} type="date" value={form.purchase_date} onChange={e=>set("purchase_date",e.target.value)}/>
          </F>
          <F label="Purchase Cost (₦)">
            <input className={iCls} type="number" value={form.purchase_cost} onChange={e=>set("purchase_cost",e.target.value)}/>
          </F>
          <F label="Expected Life (km)">
            <input className={iCls} type="number" value={form.expected_life_km} onChange={e=>set("expected_life_km",e.target.value)} placeholder="e.g. 5000"/>
          </F>
          <F label="Expected Life (hrs)">
            <input className={iCls} type="number" value={form.expected_life_hrs} onChange={e=>set("expected_life_hrs",e.target.value)} placeholder="e.g. 2000"/>
          </F>
          <F label="Min. Tread Depth (mm)">
            <input className={iCls} type="number" value={form.minimum_tread_depth} onChange={e=>set("minimum_tread_depth",e.target.value)}/>
          </F>
          <F label="Notes">
            <input className={iCls} value={form.notes} onChange={e=>set("notes",e.target.value)}/>
          </F>
        </div>
        {error && <div className="mx-7 mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        <div className="px-7 py-5 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Adding..." : "Add to Stock ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FIT TIRE MODAL — now captures tread depth at fitment (the missing
// baseline the quarterly wear calculation needs)
// ─────────────────────────────────────────────────────────────
function FitTireModal({ tire, onClose, onDone }: { tire: any; onClose: () => void; onDone: () => void }) {
  const { fitTire } = useTires();
  const { profile } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selected,  setSelected]  = useState("");
  const [position,  setPosition]  = useState("");
  const [kmReading, setKmReading] = useState("");
  const [hrReading, setHrReading] = useState("");
  const [treadDepth, setTreadDepth] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string|null>(null);

  useEffect(() => {
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name,category,meter_device,current_hour_meter,current_kilometer,operational_status").range(0,999),
      dbu.from("equipment").select("id,fleet_number,name,category,meter_device,current_hour_meter,current_kilometer,operational_status").range(1000,1999),
    ]).then(([p1,p2]) => {
      const all = [...(p1.data||[]), ...(p2.data||[])];
      setEquipment(all.filter(e=>!["Scrapped"].includes(e.operational_status)));
    });
  }, []);

  const selectedEquip = equipment.find(e => e.id === selected);

  useEffect(() => {
    if (selectedEquip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKmReading(String(selectedEquip.current_kilometer||0));
      setHrReading(String(selectedEquip.current_hour_meter||0));
    }
  }, [selected, selectedEquip]);

  async function handleFit() {
    if (!selected || !position || !treadDepth) { setError("Select equipment, position and enter tread depth."); return; }
    setSaving(true); setError(null);
    const equip = equipment.find(e=>e.id===selected);
    const result = await fitTire(
      tire.id, selected, equip.fleet_number, position,
      parseFloat(kmReading)||0, parseFloat(hrReading)||0,
      parseFloat(treadDepth)||0,
      profile?.full_name||"User"
    );
    setSaving(false);
    if (!result.success) { setError(result.error||"Failed to fit tire."); return; }
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Fit Tire</p>
            <h3 className="text-lg font-bold text-slate-800">{tire.tire_number}</h3>
            <p className="text-sm text-slate-500">{tire.brand} · {tire.size} · {tire.type}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <F label="Select Equipment" required>
            <select className={iCls} value={selected} onChange={e=>setSelected(e.target.value)}>
              <option value="">— Choose equipment —</option>
              {equipment.sort((a,b)=>a.fleet_number.localeCompare(b.fleet_number)).map(e=>(
                <option key={e.id} value={e.id}>{e.fleet_number} — {e.name}</option>
              ))}
            </select>
          </F>

          {selected && (
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Category:</span> <span className="font-medium">{selectedEquip?.category}</span></div>
              <div><span className="text-slate-400">Status:</span> <span className="font-medium">{selectedEquip?.operational_status}</span></div>
              <div><span className="text-slate-400">Hour Meter:</span> <span className="font-medium">{(selectedEquip?.current_hour_meter||0).toLocaleString()} hrs</span></div>
              <div><span className="text-slate-400">Kilometer:</span> <span className="font-medium">{(selectedEquip?.current_kilometer||0).toLocaleString()} km</span></div>
            </div>
          )}

          <F label="Tire Position" required>
            <select className={iCls} value={position} onChange={e=>setPosition(e.target.value)}>
              <option value="">— Select position —</option>
              {TIRE_POSITIONS.map(p=>(
                <option key={p.code} value={p.code}>{p.code} — {p.label}</option>
              ))}
            </select>
          </F>

          <F label="Tread Depth at Fitment (mm)" required>
            <input className={iCls} type="number" step="0.5" value={treadDepth} onChange={e=>setTreadDepth(e.target.value)}
              placeholder="e.g. 12" />
            <p className="text-[11px] text-slate-400 mt-1">Captured once — this becomes the baseline the Quarterly Report compares wear against.</p>
          </F>

          <div className="grid grid-cols-2 gap-4">
            <F label="KM Reading at Fitment">
              <input className={iCls} type="number" value={kmReading} onChange={e=>setKmReading(e.target.value)}/>
            </F>
            <F label="Hour Meter at Fitment">
              <input className={iCls} type="number" value={hrReading} onChange={e=>setHrReading(e.target.value)}/>
            </F>
          </div>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleFit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Fitting..." : "✓ Confirm Fitment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REMOVE TIRE MODAL — unchanged, already correct
// ─────────────────────────────────────────────────────────────
function RemoveTireModal({ tire, onClose, onDone }: { tire: any; onClose: () => void; onDone: () => void }) {
  const { removeTire } = useTires();
  const { profile } = useAuth();
  const [kmReading,  setKmReading]  = useState(String(tire.fitted_km_reading||0));
  const [hrReading,  setHrReading]  = useState(String(tire.fitted_hr_reading||0));
  const [treadDepth, setTreadDepth] = useState("");
  const [reason,     setReason]     = useState("");
  const [newStatus,  setNewStatus]  = useState<"In Stock"|"Worn Out"|"Scrapped">("Scrapped");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  async function handleRemove() {
    if (!reason || !treadDepth) { setError("Please fill reason and tread depth."); return; }
    setSaving(true); setError(null);
    const result = await removeTire(
      tire.id, parseFloat(kmReading)||0, parseFloat(hrReading)||0,
      parseFloat(treadDepth)||0, reason, newStatus,
      profile?.full_name||"User"
    );
    setSaving(false);
    if (!result.success) { setError(result.error||"Failed."); return; }
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-0.5">Remove Tire</p>
            <h3 className="text-lg font-bold text-slate-800">{tire.tire_number}</h3>
            <p className="text-sm text-slate-500">{tire.current_fleet_number} · {POSITION_LABELS[tire.current_position]||tire.current_position}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <F label="KM Reading at Removal">
              <input className={iCls} type="number" value={kmReading} onChange={e=>setKmReading(e.target.value)}/>
            </F>
            <F label="Hour Meter at Removal">
              <input className={iCls} type="number" value={hrReading} onChange={e=>setHrReading(e.target.value)}/>
            </F>
          </div>
          <F label="Current Tread Depth (mm)" required>
            <input className={iCls} type="number" value={treadDepth} onChange={e=>setTreadDepth(e.target.value)} placeholder="e.g. 8"/>
          </F>
          <F label="Reason for Removal" required>
            <select className={iCls} value={reason} onChange={e=>setReason(e.target.value)}>
              <option value="">— Select reason —</option>
              {["Worn out","Puncture","Sidewall damage","Rotation","Breakdown","Scheduled change","Retreading","Scrapped"].map(r=><option key={r}>{r}</option>)}
            </select>
          </F>
          <F label="After Removal — Tire Goes To" required>
            <div className="space-y-2">
              {(["Scrapped","In Stock","Worn Out"] as const).map(s=>(
                <label key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${newStatus===s?"border-amber-400 bg-amber-50":"border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="newStatus" checked={newStatus===s} onChange={()=>setNewStatus(s)} className="accent-amber-500"/>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>
                  {s === "In Stock" && <span className="text-[11px] text-slate-400">— reusable, back to store</span>}
                </label>
              ))}
            </div>
          </F>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleRemove} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
            {saving ? "Removing..." : "Remove Tire"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INSPECT TIRE MODAL — unchanged UI, now benefits from the hook fix
// ─────────────────────────────────────────────────────────────
function InspectTireModal({ tire, onClose, onDone }: { tire: any; onClose: () => void; onDone: () => void }) {
  const { inspectTire } = useTires();
  const { profile } = useAuth();
  const [treadDepth, setTreadDepth] = useState(String(tire.current_tread_depth||""));
  const [kmReading,  setKmReading]  = useState("");
  const [hrReading,  setHrReading]  = useState("");
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);

  const minDepth = tire.minimum_tread_depth || 3;
  const currentDepth = parseFloat(treadDepth)||0;
  const isLow = currentDepth > 0 && currentDepth <= minDepth;
  const isWarning = currentDepth > 0 && currentDepth <= minDepth * 1.5 && !isLow;

  async function handleSave() {
    if (!treadDepth) return;
    setSaving(true);
    await inspectTire(tire.id, parseFloat(treadDepth), parseFloat(kmReading)||0, parseFloat(hrReading)||0, notes, profile?.full_name||"User");
    setSaving(false);
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Inspect Tire</p>
            <h3 className="text-lg font-bold text-slate-800">{tire.tire_number}</h3>
            <p className="text-sm text-slate-500">{tire.brand} · {tire.size}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <F label="Current Tread Depth (mm)" required>
            <input className={iCls} type="number" step="0.5" value={treadDepth} onChange={e=>setTreadDepth(e.target.value)} placeholder="e.g. 12.5"/>
          </F>

          {isLow && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-semibold">
              🚨 CRITICAL: Tread depth is at or below minimum ({minDepth}mm). Replace immediately.
            </div>
          )}
          {isWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs font-semibold">
              ⚠️ WARNING: Tread depth is approaching minimum. Plan for replacement.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <F label="KM Reading">
              <input className={iCls} type="number" value={kmReading} onChange={e=>setKmReading(e.target.value)}/>
            </F>
            <F label="Hour Meter">
              <input className={iCls} type="number" value={hrReading} onChange={e=>setHrReading(e.target.value)}/>
            </F>
          </div>
          <F label="Notes">
            <textarea className={`${iCls} h-20 resize-none`} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any observations..."/>
          </F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSave} disabled={saving||!treadDepth} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Inspection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: TYRE PASS — per-equipment current fitment + full history
// ─────────────────────────────────────────────────────────────
function TyrePassTab({ tires, canManage, onFit, onRemove, onInspect }: {
  tires: any[]; canManage: boolean;
  onFit: (t:any)=>void; onRemove: (t:any)=>void; onInspect: (t:any)=>void;
}) {
  const { fetchHistoryForFleet } = useTires();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selected,  setSelected]  = useState<any>(null);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [history,   setHistory]   = useState<any[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    dbu.from("equipment")
      .select("id,fleet_number,name,make,model,reg_no,site")
      .neq("operational_status", "Scrapped")
      .order("fleet_number")
      .then(({ data }: any) => setEquipment(data || []));
  }, []);

  async function selectEquipment(eq: any) {
    setSelected(eq);
    setEqSearch(`${eq.fleet_number} — ${eq.name}`);
    setShowDrop(false);
    setLoadingHist(true);
    const h = await fetchHistoryForFleet(eq.fleet_number);
    setHistory(h);
    setLoadingHist(false);
  }

  const fittedTires = tires.filter(t => t.status === "Fitted" && t.current_fleet_number === selected?.fleet_number);

  const filteredEq = equipment.filter(e =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0, 15);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Select Equipment</label>
        <div className="relative max-w-xl">
          <input className={iCls} placeholder="Search fleet number or name..."
            value={eqSearch}
            onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)} />
          {showDrop && filteredEq.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filteredEq.map(e => (
                <button key={e.id} onClick={() => selectEquipment(e)}
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                  <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                  <span className="text-slate-400 text-xs ml-2">{e.site}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Current Tyre Pass — {selected.fleet_number}</h2>
                <p className="text-slate-400 text-sm">{selected.make} {selected.model} · {fittedTires.length} tyre{fittedTires.length===1?"":"s"} fitted</p>
              </div>
              <button onClick={() => printTyrePass(selected, fittedTires)} disabled={fittedTires.length === 0}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 disabled:opacity-40">
                🖨 Print Tyre Pass
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Position","Serial No.","Make","Size","Pattern","Fitted","Tread @ Fit","Current Tread","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fittedTires.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      No tyres fitted yet — fit tyres from the &quot;In Stock &amp; Fitted&quot; tab.
                    </td></tr>
                  ) : fittedTires.map(t => {
                    const minDepth = t.minimum_tread_depth || 3;
                    const isCrit = t.current_tread_depth != null && t.current_tread_depth <= minDepth;
                    return (
                      <tr key={t.id} className={isCrit ? "bg-red-50" : "hover:bg-amber-50/20"}>
                        <td className="px-4 py-3 font-bold text-slate-800 font-mono text-xs">{t.current_position}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{t.tire_number}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{t.brand}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{t.size}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{t.pattern||"—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {t.fitted_date ? new Date(t.fitted_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{t.fitted_tread_depth ?? "—"}</td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          {t.current_tread_depth != null ? (
                            <span className={isCrit ? "text-red-600" : "text-emerald-700"}>{t.current_tread_depth}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {canManage && (
                            <div className="flex gap-1.5">
                              <button onClick={()=>onInspect(t)} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium whitespace-nowrap">Inspect</button>
                              <button onClick={()=>onRemove(t)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium whitespace-nowrap">Remove</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Tyre History — {selected.fleet_number}</h2>
              <p className="text-slate-400 text-sm">{history.length} recorded event{history.length===1?"":"s"} · every fit, removal and inspection, newest first</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-50">
              {loadingHist ? (
                <div className="px-6 py-12 text-center text-slate-400">Loading...</div>
              ) : history.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">No history yet for this equipment.</div>
              ) : history.map((ev: any) => (
                <div key={ev.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/50">
                  <span className="text-xl mt-0.5">{EVENT_STYLE[ev.action_type]?.icon || "•"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${EVENT_STYLE[ev.action_type]?.badge || "bg-slate-100 text-slate-600"}`}>
                        {ev.action_type}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">{ev.position || ""}</span>
                      <span className="text-xs text-slate-500">{ev.tire_number ? `Tire ${ev.tire_number}` : ""}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(ev.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}
                      {ev.km_reading ? ` · Km: ${Number(ev.km_reading).toLocaleString()}` : ""}
                      {ev.hr_reading ? ` · Hr: ${Number(ev.hr_reading).toLocaleString()}` : ""}
                      {ev.tread_depth != null ? ` · Tread: ${ev.tread_depth}mm` : ""}
                      {ev.performed_by ? ` · by ${ev.performed_by}` : ""}
                    </p>
                    {(ev.reason || ev.notes) && <p className="text-xs text-slate-400 mt-0.5 italic">{ev.reason || ev.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: WEEKLY UPDATE — reads tire_history directly, no new table
// ─────────────────────────────────────────────────────────────
function WeeklyUpdateTab() {
  const [fitted,  setFitted]  = useState<any[]>([]);
  const [removed, setRemoved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekFrom, setWeekFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().slice(0,10);
  });
  const [weekTo, setWeekTo] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7);
    return d.toISOString().slice(0,10);
  });

  useEffect(() => { load(); }, [weekFrom, weekTo]); // eslint-disable-line

  async function load() {
    setLoading(true);
    const toDate = new Date(weekTo); toDate.setDate(toDate.getDate() + 1); // inclusive end
    const [f, r] = await Promise.all([
      dbu.from("tire_history").select("*").eq("action_type","Fitted")
        .gte("created_at", weekFrom).lt("created_at", toDate.toISOString())
        .order("created_at", { ascending: false }),
      dbu.from("tire_history").select("*").eq("action_type","Removed")
        .gte("created_at", weekFrom).lt("created_at", toDate.toISOString())
        .order("created_at", { ascending: false }),
    ]);
    setFitted(f.data || []);
    setRemoved(r.data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Week From</label>
          <input type="date" className={iCls + " w-44"} value={weekFrom} onChange={e => setWeekFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Week To</label>
          <input type="date" className={iCls + " w-44"} value={weekTo} onChange={e => setWeekTo(e.target.value)} />
        </div>
        <button onClick={() => printWeeklyUpdate(fitted, removed, weekFrom, weekTo)}
          className="ml-auto px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900">
          🖨 Print Weekly Form
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50">
            <h2 className="font-bold text-emerald-700">🔧 Fitted this week</h2>
            <p className="text-emerald-500 text-xs">{fitted.length} tyre{fitted.length===1?"":"s"} mounted</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {loading ? <div className="px-5 py-8 text-center text-slate-400">Loading...</div>
            : fitted.length === 0 ? <div className="px-5 py-8 text-center text-slate-400">None this week.</div>
            : fitted.map((r:any) => (
              <div key={r.id} className="px-5 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold text-amber-600 font-mono text-xs">{r.fleet_number}</span>
                  <span className="text-slate-400 text-xs">{new Date(r.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{r.position} · Tire {r.tire_number} · {r.tread_depth}mm</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-orange-50">
            <h2 className="font-bold text-orange-700">⬇️ Removed this week</h2>
            <p className="text-orange-500 text-xs">{removed.length} tyre{removed.length===1?"":"s"} removed</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {loading ? <div className="px-5 py-8 text-center text-slate-400">Loading...</div>
            : removed.length === 0 ? <div className="px-5 py-8 text-center text-slate-400">None this week.</div>
            : removed.map((r:any) => (
              <div key={r.id} className="px-5 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold text-amber-600 font-mono text-xs">{r.fleet_number}</span>
                  <span className="text-slate-400 text-xs">{new Date(r.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{r.position} · Tire {r.tire_number} · {r.tread_depth}mm · {r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: QUARTERLY TREAD REPORT
// ─────────────────────────────────────────────────────────────
function QuarterlyTab({ tires }: { tires: any[] }) {
  const { inspectTire } = useTires();
  const QUARTERS = ["Q1","Q2","Q3","Q4"];
  const [equipment, setEquipment] = useState<any[]>([]);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [selEq,     setSelEq]     = useState<any>(null);
  const [quarter,   setQuarter]   = useState(`Q${Math.floor(new Date().getMonth()/3)+1}`);
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [hrKm,      setHrKm]      = useState("");
  const [rows,      setRows]      = useState<any[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    dbu.from("equipment")
      .select("id,fleet_number,name,site,meter_device,current_hour_meter,current_kilometer")
      .neq("operational_status", "Scrapped")
      .order("fleet_number")
      .then(({ data }: any) => setEquipment(data || []));
  }, []);

  async function selectEquipment(eq: any) {
    setSelEq(eq);
    setEqSearch(`${eq.fleet_number} — ${eq.name}`);
    setShowDrop(false);
    setSaved(false);
    const { data: latestLog } = await dbu.from("daily_logs")
      .select("hr_km_reading")
      .eq("fleet_no", eq.fleet_number)
      .gt("hr_km_reading", 0)
      .order("log_date", { ascending: false })
      .limit(1);
    const reading = latestLog?.[0]?.hr_km_reading
      ?? (eq.meter_device === "Km" ? eq.current_kilometer : eq.current_hour_meter) ?? "";
    setHrKm(String(reading || ""));

    const fittedTires = tires.filter(t => t.status === "Fitted" && t.current_fleet_number === eq.fleet_number);
    setRows(fittedTires.map((t:any) => ({ ...t, actual_depth: t.current_tread_depth ?? "", comments: "" })));
  }

  function updateRow(id: string, field: string, value: any) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    if (!selEq || rows.length === 0) return;
    setSaving(true);
    for (const r of rows) {
      if (r.actual_depth === "" || r.actual_depth == null) continue;
      await inspectTire(r.id, Number(r.actual_depth), Number(hrKm) || 0, Number(hrKm) || 0,
        `${quarter} ${year} quarterly check${r.comments ? " — " + r.comments : ""}`,
        profile?.full_name || "");
    }
    setSaving(false);
    setSaved(true);
  }

  const filteredEq = equipment.filter(e =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0, 15);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Equipment</label>
            <input className={iCls} placeholder="Search fleet number..."
              value={eqSearch}
              onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && filteredEq.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {filteredEq.map(e => (
                  <button key={e.id} onClick={() => selectEquipment(e)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                    <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Quarter / Year</label>
            <div className="flex gap-2">
              <select className={iCls} value={quarter} onChange={e => setQuarter(e.target.value)}>
                {QUARTERS.map(q => <option key={q}>{q}</option>)}
              </select>
              <select className={iCls} value={String(year)} onChange={e => setYear(parseInt(e.target.value))}>
                {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Hr/Km Reading</label>
            <input type="number" className={iCls} value={hrKm} onChange={e => setHrKm(e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1">Pre-filled from latest Daily Log — verify.</p>
          </div>
        </div>
      </div>

      {selEq && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-slate-800">Tread Measurement — {selEq.fleet_number} · {quarter} {year}</h2>
              <p className="text-slate-400 text-sm">Enter the measured depth for each fitted tyre</p>
            </div>
            <div className="flex gap-3 items-center">
              {saved && <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold">✓ Saved</span>}
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Saving..." : "💾 Save Measurements"}
              </button>
              <button onClick={() => printQuarterly(selEq, rows, quarter, year, hrKm)}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900">
                🖨 Print Report
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Position","Serial No.","Make","Size","Pattern","T. Depth @ Fit","T. Depth Actual (mm)","Wear","Comments"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r:any) => {
                  const wear = r.fitted_tread_depth != null && r.actual_depth !== ""
                    ? (Number(r.fitted_tread_depth) - Number(r.actual_depth)) : null;
                  return (
                    <tr key={r.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-bold font-mono text-xs text-slate-800">{r.current_position}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.tire_number}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.brand}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.size}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.pattern||"—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.fitted_tread_depth ?? "—"}</td>
                      <td className="px-4 py-3">
                        <input type="number" step="0.5"
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          value={r.actual_depth}
                          onChange={e => updateRow(r.id, "actual_depth", e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {wear != null ? (
                          <span className={wear >= 4 ? "text-red-600" : wear >= 2 ? "text-amber-600" : "text-emerald-700"}>
                            −{wear.toFixed(1)}mm
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <input className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          value={r.comments} placeholder="—"
                          onChange={e => updateRow(r.id, "comments", e.target.value)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selEq && rows.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          No fitted tyres on {selEq.fleet_number} — fit tyres from the &quot;In Stock &amp; Fitted&quot; tab first.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: IN STOCK & FITTED (original register, extended fields)
// ─────────────────────────────────────────────────────────────
function RegisterTab({ tires, loading, canManage, onFit, onInspect, onRemove }: {
  tires: any[]; loading: boolean; canManage: boolean;
  onFit:(t:any)=>void; onInspect:(t:any)=>void; onRemove:(t:any)=>void;
}) {
  const [subTab, setSubTab] = useState<"stock"|"fitted">("stock");
  const [search, setSearch] = useState("");

  const stockList = tires.filter(t => t.status === "In Stock" &&
    (!search || t.tire_number?.toLowerCase().includes(search.toLowerCase()) || t.brand?.toLowerCase().includes(search.toLowerCase())));
  const fittedList = tires.filter(t => t.status === "Fitted" &&
    (!search || t.tire_number?.toLowerCase().includes(search.toLowerCase()) || t.current_fleet_number?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([["stock",`📦 In Stock (${tires.filter(t=>t.status==="In Stock").length})`],
           ["fitted",`🔩 Fitted (${tires.filter(t=>t.status==="Fitted").length})`]] as const).map(([k,l]) => (
          <button key={k} onClick={()=>setSubTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${subTab===k?"bg-white text-slate-800 shadow-sm":"text-slate-500"}`}>
            {l}
          </button>
        ))}
      </div>
      <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className={iCls + " max-w-sm"} />

      {subTab === "stock" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>{["Tire No.","Brand","Size","Pattern","Type","Purchase Date","Cost","Actions"].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                : stockList.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No tires in stock.</td></tr>
                : stockList.map(t=>(
                  <tr key={t.id} className="hover:bg-amber-50/20 group">
                    <td className="px-5 py-3 font-bold text-amber-600 font-mono text-xs">{t.tire_number}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{t.brand}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">{t.size}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{t.pattern||"—"}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{t.type}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{t.purchase_date?new Date(t.purchase_date).toLocaleDateString("en-GB"):"—"}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">{t.purchase_cost?`₦${Number(t.purchase_cost).toLocaleString()}`:"—"}</td>
                    <td className="px-5 py-3">
                      {canManage && (
                        <button onClick={()=>onFit(t)} className="opacity-0 group-hover:opacity-100 text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium whitespace-nowrap transition-opacity">
                          Fit to Equipment →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>{["Tire No.","Brand","Size","Fleet No.","Position","Fitted","Tread @ Fit","Current Tread","Actions"].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                : fittedList.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">No fitted tires.</td></tr>
                : fittedList.map(t=>{
                  const minDepth = t.minimum_tread_depth||3;
                  const isCrit = t.current_tread_depth!=null && t.current_tread_depth<=minDepth;
                  const isWarn = t.current_tread_depth!=null && t.current_tread_depth<=minDepth*1.5 && !isCrit;
                  return (
                    <tr key={t.id} className={`group ${isCrit?"bg-red-50":isWarn?"bg-amber-50/30":"hover:bg-amber-50/20"}`}>
                      <td className="px-5 py-3 font-bold text-amber-600 font-mono text-xs">{t.tire_number}</td>
                      <td className="px-5 py-3 font-medium text-slate-700">{t.brand}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs">{t.size}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 text-xs">{t.current_fleet_number||"—"}</td>
                      <td className="px-5 py-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-xs font-mono">{t.current_position}</span></td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{t.fitted_date?new Date(t.fitted_date).toLocaleDateString("en-GB"):"—"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{t.fitted_tread_depth ?? "—"}</td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap">
                        {t.current_tread_depth!=null ? (
                          <span className={`font-bold ${isCrit?"text-red-600":isWarn?"text-amber-600":"text-slate-700"}`}>
                            {isCrit&&"🚨 "}{isWarn&&"⚠️ "}{t.current_tread_depth}mm
                          </span>
                        ) : <span className="text-slate-300">Not inspected</span>}
                      </td>
                      <td className="px-5 py-3">
                        {canManage && (
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>onInspect(t)} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium whitespace-nowrap">Inspect</button>
                            <button onClick={()=>onRemove(t)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium whitespace-nowrap">Remove</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function TiresPage() {
  const { tires, loading, fetchTires } = useTires();
  const { profile } = useAuth();

  const [tab, setTab] = useState<"pass"|"weekly"|"quarterly"|"register"|"alerts">("pass");
  const [addModal,     setAddModal]     = useState(false);
  const [fitModal,     setFitModal]     = useState<any>(null);
  const [removeModal,  setRemoveModal]  = useState<any>(null);
  const [inspectModal, setInspectModal] = useState<any>(null);

  const inStock = tires.filter(t => t.status === "In Stock").length;
  const fitted  = tires.filter(t => t.status === "Fitted").length;

  const alerts = tires.filter(t =>
    t.status === "Fitted" && t.current_tread_depth !== null &&
    t.current_tread_depth <= (t.minimum_tread_depth || 3) * 1.5
  );
  const critical = alerts.filter(t => t.current_tread_depth <= (t.minimum_tread_depth||3));

  const canManage = (profile?.roles as string[]||[]).some(r=>
    ["super_admin","plant_admin","plant_engineer","plant_manager"].includes(r)
  );

  function exportTireList() {
    const headers = ["Tire No.","Brand","Size","Pattern","Type","Ply","Status","Fleet No.","Position",
      "Fitted Date","Fitted KM","Fitted HR","Tread @ Fit","Current Tread (mm)","Min Tread (mm)",
      "Expected Life km","Expected Life hrs","Purchase Cost","Supplier","Purchase Date"];
    const rows = tires.map(t=>[
      t.tire_number, t.brand, t.size, t.pattern||"", t.type, t.ply_rating, t.status,
      t.current_fleet_number||"", t.current_position||"",
      t.fitted_date||"", t.fitted_km_reading||0, t.fitted_hr_reading||0,
      t.fitted_tread_depth||"", t.current_tread_depth||"", t.minimum_tread_depth||3,
      t.expected_life_km||"", t.expected_life_hrs||"",
      t.purchase_cost||0, t.supplier||"", t.purchase_date||"",
    ]);
    const csv=[headers,...rows].map(r=>r.map((v:any)=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`TMS_Tire_Register_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const TABS = [
    { key: "pass",      label: "🛞 Tyre Pass" },
    { key: "weekly",    label: "📅 Weekly Update" },
    { key: "quarterly", label: "📏 Quarterly Report" },
    { key: "register",  label: `📦 In Stock & Fitted` },
    { key: "alerts",    label: `🚨 Alerts (${alerts.length})` },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">TMS</p>
          <h1 className="text-3xl font-bold text-slate-900">Tire Management</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Tyre passes, weekly change records and quarterly tread reports — full history per equipment.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button onClick={exportTireList}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
            ↓ Export Register
          </button>
          {canManage && (
            <button onClick={() => setAddModal(true)}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm flex items-center gap-2">
              + Add Tire to Stock
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Total Tires", value:tires.length, bg:"bg-slate-900 text-white" },
          { label:"In Stock",    value:inStock,       bg:"bg-blue-500 text-white" },
          { label:"Fitted",      value:fitted,        bg:"bg-emerald-500 text-white" },
          { label:"🚨 Alerts",   value:critical.length, bg:critical.length>0?"bg-red-600 text-white":"bg-white border border-slate-200 text-slate-800" },
        ].map(k=>(
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{loading?"...":k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {critical.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">
              {critical.length} tire{critical.length>1?"s are":" is"} at or below minimum tread depth
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {critical.map(t=>`${t.tire_number} on ${t.current_fleet_number} (${t.current_tread_depth}mm)`).join(" · ")}
            </p>
          </div>
          <button onClick={()=>setTab("alerts")}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 whitespace-nowrap">
            View Alerts
          </button>
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pass" && (
        <TyrePassTab tires={tires} canManage={canManage}
          onFit={setFitModal} onRemove={setRemoveModal} onInspect={setInspectModal} />
      )}
      {tab === "weekly" && <WeeklyUpdateTab />}
      {tab === "quarterly" && <QuarterlyTab tires={tires} />}
      {tab === "register" && (
        <RegisterTab tires={tires} loading={loading} canManage={canManage}
          onFit={setFitModal} onInspect={setInspectModal} onRemove={setRemoveModal} />
      )}
      {tab === "alerts" && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-lg font-semibold text-slate-600">All tires are within safe tread depth</p>
            </div>
          ) : alerts.map(t=>{
            const minDepth = t.minimum_tread_depth||3;
            const isCrit = t.current_tread_depth<=minDepth;
            return (
              <div key={t.id} className={`rounded-2xl border p-5 flex items-center gap-5 ${isCrit?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
                <span className="text-3xl">{isCrit?"🚨":"⚠️"}</span>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isCrit?"text-red-800":"text-amber-800"}`}>
                    {isCrit?"CRITICAL":"WARNING"} — {t.tire_number}
                  </p>
                  <p className={`text-xs mt-0.5 ${isCrit?"text-red-600":"text-amber-600"}`}>
                    {t.brand} {t.size} · fitted on {t.current_fleet_number} at {t.current_position}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${isCrit?"text-red-700":"text-amber-700"}`}>
                    Tread depth: {t.current_tread_depth}mm · Minimum: {minDepth}mm
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>setInspectModal(t)} className="text-xs px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium">Re-inspect</button>
                    <button onClick={()=>setRemoveModal(t)} className="text-xs px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium">Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddTireModal    open={addModal}       onClose={()=>setAddModal(false)}   onAdded={fetchTires} profile={profile} />
      {fitModal     && <FitTireModal     tire={fitModal}     onClose={()=>setFitModal(null)}     onDone={fetchTires} />}
      {removeModal  && <RemoveTireModal  tire={removeModal}  onClose={()=>setRemoveModal(null)}  onDone={fetchTires} />}
      {inspectModal && <InspectTireModal tire={inspectModal} onClose={()=>setInspectModal(null)} onDone={fetchTires} />}
    </div>
  );
}