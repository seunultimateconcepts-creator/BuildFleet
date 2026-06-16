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

// Tire positions by equipment type
const POSITIONS_SINGLE = ["FL","FR","RL","RR","Spare"];
const POSITIONS_DUAL   = ["FL","FR","RLI","RLO","RRI","RRO","Spare"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const POSITIONS_ALL    = ["FL","FR","RL","RR","RLI","RLO","RRI","RRO","Spare","Front","Rear"];

const POSITION_LABELS: Record<string,string> = {
  FL:"Front Left", FR:"Front Right",
  RL:"Rear Left", RR:"Rear Right",
  RLI:"Rear Left Inner", RLO:"Rear Left Outer",
  RRI:"Rear Right Inner", RRO:"Rear Right Outer",
  Spare:"Spare", Front:"Front", Rear:"Rear",
};

const STATUS_STYLE: Record<string,string> = {
  "In Stock":  "bg-blue-100 text-blue-700",
  "Fitted":    "bg-emerald-100 text-emerald-700",
  "Worn Out":  "bg-amber-100 text-amber-700",
  "Scrapped":  "bg-red-100 text-red-600",
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

// ─────────────────────────────────────────────────────────────
// ADD TIRE MODAL
// ─────────────────────────────────────────────────────────────
function AddTireModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const { addTire } = useTires();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string|null>(null);
  const [form, setForm] = useState({
    tire_number:"", brand:"Michelin", size:"", type:"Radial",
    ply_rating:"", purchase_date:"", purchase_cost:"",
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
    });
    setSaving(false);
    if (!result.success) { setError(result.error||"Failed to add tire."); return; }
    onAdded(); onClose();
    setForm({ tire_number:"", brand:"Michelin", size:"", type:"Radial", ply_rating:"", purchase_date:"", purchase_cost:"", supplier:"", expected_life_km:"", expected_life_hrs:"", minimum_tread_depth:"3", notes:"" });
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
          <F label="Tire Number" required>
            <input className={iCls} value={form.tire_number} onChange={e=>set("tire_number",e.target.value)} placeholder="e.g. TIR-001"/>
          </F>
          <F label="Size" required>
            <input className={iCls} value={form.size} onChange={e=>set("size",e.target.value)} placeholder="e.g. 23.5R25"/>
          </F>
          <F label="Brand">
            <select className={iCls} value={form.brand} onChange={e=>set("brand",e.target.value)}>
              {TIRE_BRANDS.map(b=><option key={b}>{b}</option>)}
            </select>
          </F>
          <F label="Type">
            <select className={iCls} value={form.type} onChange={e=>set("type",e.target.value)}>
              {TIRE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </F>
          <F label="Ply Rating">
            <input className={iCls} value={form.ply_rating} onChange={e=>set("ply_rating",e.target.value)} placeholder="e.g. 16PR"/>
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
// FIT TIRE MODAL
// ─────────────────────────────────────────────────────────────
function FitTireModal({ tire, onClose, onDone }: { tire: any; onClose: () => void; onDone: () => void }) {
  const { fitTire } = useTires();
  const { profile } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selected,  setSelected]  = useState("");
  const [position,  setPosition]  = useState("");
  const [kmReading, setKmReading] = useState("");
  const [hrReading, setHrReading] = useState("");
  const [dualRear,  setDualRear]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string|null>(null);

  useEffect(() => {
    // Load working/idle equipment only
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name,category,meter_device,current_hour_meter,current_kilometer,operational_status").range(0,999),
      dbu.from("equipment").select("id,fleet_number,name,category,meter_device,current_hour_meter,current_kilometer,operational_status").range(1000,1999),
    ]).then(([p1,p2]) => {
      const all = [...(p1.data||[]),(p2.data||[])];
      setEquipment(all.filter(e=>!["Scrapped"].includes(e.operational_status)));
    });
  }, []);

  const selectedEquip = equipment.find(e => e.id === selected);
  const positions = dualRear ? POSITIONS_DUAL : POSITIONS_SINGLE;

  // Auto-fill meter reading from equipment
  useEffect(() => {
    if (selectedEquip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKmReading(String(selectedEquip.current_kilometer||0));
      setHrReading(String(selectedEquip.current_hour_meter||0));
    }
  }, [selected, selectedEquip]);

  async function handleFit() {
    if (!selected || !position) { setError("Select equipment and position."); return; }
    setSaving(true); setError(null);
    const equip = equipment.find(e=>e.id===selected);
    const result = await fitTire(
      tire.id, selected, equip.fleet_number, position,
      parseFloat(kmReading)||0, parseFloat(hrReading)||0,
      profile?.full_name||"User"
    );
    setSaving(false);
    if (!result.success) { setError(result.error||"Failed to fit tire."); return; }
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7">
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

          {/* Dual rear toggle */}
          <label className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={dualRear} onChange={e=>setDualRear(e.target.checked)} className="w-4 h-4 accent-amber-500"/>
            <div>
              <p className="text-sm font-medium text-slate-700">Dual rear wheels</p>
              <p className="text-xs text-slate-400">For trucks, graders with inner/outer rear tires</p>
            </div>
          </label>

          <F label="Tire Position" required>
            <select className={iCls} value={position} onChange={e=>setPosition(e.target.value)}>
              <option value="">— Select position —</option>
              {positions.map(p=>(
                <option key={p} value={p}>{p} — {POSITION_LABELS[p]}</option>
              ))}
            </select>
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
// REMOVE TIRE MODAL
// ─────────────────────────────────────────────────────────────
function RemoveTireModal({ tire, onClose, onDone }: { tire: any; onClose: () => void; onDone: () => void }) {
  const { removeTire } = useTires();
  const { profile } = useAuth();
  const [kmReading,  setKmReading]  = useState(String(tire.fitted_km_reading||0));
  const [hrReading,  setHrReading]  = useState(String(tire.fitted_hr_reading||0));
  const [treadDepth, setTreadDepth] = useState("");
  const [reason,     setReason]     = useState("");
  const [newStatus,  setNewStatus]  = useState<"In Stock"|"Worn Out"|"Scrapped">("In Stock");
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
              {(["In Stock","Worn Out","Scrapped"] as const).map(s=>(
                <label key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${newStatus===s?"border-amber-400 bg-amber-50":"border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="newStatus" checked={newStatus===s} onChange={()=>setNewStatus(s)} className="accent-amber-500"/>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>
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
// INSPECT TIRE MODAL
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
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function TiresPage() {
  const { tires, loading, fetchTires } = useTires();
  const { profile } = useAuth();

  const [tab,       setTab]       = useState<"stock"|"fitted"|"alerts"|"history">("stock");
  const [search,    setSearch]    = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterSize,  setFilterSize]  = useState("");

  const [addModal,     setAddModal]     = useState(false);
  const [fitModal,     setFitModal]     = useState<any>(null);
  const [removeModal,  setRemoveModal]  = useState<any>(null);
  const [inspectModal, setInspectModal] = useState<any>(null);

  // KPIs
  const inStock  = tires.filter(t => t.status === "In Stock").length;
  const fitted   = tires.filter(t => t.status === "Fitted").length;
  const wornOut  = tires.filter(t => t.status === "Worn Out").length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scrapped = tires.filter(t => t.status === "Scrapped").length;

  // Alerts — tires below or near minimum tread depth
  const alerts = tires.filter(t =>
    t.status === "Fitted" && t.current_tread_depth !== null &&
    t.current_tread_depth <= (t.minimum_tread_depth || 3) * 1.5
  );
  const critical = alerts.filter(t => t.current_tread_depth <= (t.minimum_tread_depth||3));

  const brands = [...new Set(tires.map(t=>t.brand))].filter(Boolean).sort();
  const sizes  = [...new Set(tires.map(t=>t.size))].filter(Boolean).sort();

  function filterTires(list: any[]) {
    const q = search.toLowerCase();
    return list.filter(t => {
      const matchQ = !q ||
        (t.tire_number||"").toLowerCase().includes(q) ||
        (t.brand||"").toLowerCase().includes(q) ||
        (t.size||"").toLowerCase().includes(q) ||
        (t.current_fleet_number||"").toLowerCase().includes(q);
      return matchQ &&
        (!filterBrand || t.brand === filterBrand) &&
        (!filterSize  || t.size  === filterSize);
    });
  }

  const stockList  = filterTires(tires.filter(t=>t.status==="In Stock"));
  const fittedList = filterTires(tires.filter(t=>t.status==="Fitted"));

  function exportTireList() {
    const headers = ["Tire No.","Brand","Size","Type","Ply","Status","Fleet No.","Position",
      "Fitted Date","Fitted KM","Fitted HR","Current Tread (mm)","Min Tread (mm)",
      "Expected Life km","Expected Life hrs","Purchase Cost","Supplier","Purchase Date"];
    const rows = tires.map(t=>[
      t.tire_number, t.brand, t.size, t.type, t.ply_rating, t.status,
      t.current_fleet_number||"", t.current_position||"",
      t.fitted_date||"", t.fitted_km_reading||0, t.fitted_hr_reading||0,
      t.current_tread_depth||"", t.minimum_tread_depth||3,
      t.expected_life_km||"", t.expected_life_hrs||"",
      t.purchase_cost||0, t.supplier||"", t.purchase_date||"",
    ]);
    const csv=[headers,...rows].map(r=>r.map((v:any)=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`TMS_Tire_Register_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const canManage = (profile?.roles as string[]||[]).some(r=>
    ["super_admin","plant_admin","plant_engineer","plant_manager"].includes(r)
  );

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">TMS</p>
          <h1 className="text-3xl font-bold text-slate-900">Tire Management</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Track tire stock, fitment, tread depth and replacement across all fleet equipment.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label:"Total Tires",  value:tires.length,        bg:"bg-slate-900 text-white" },
          { label:"In Stock",     value:inStock,             bg:"bg-blue-500 text-white" },
          { label:"Fitted",       value:fitted,              bg:"bg-emerald-500 text-white" },
          { label:"Worn Out",     value:wornOut,             bg:"bg-amber-500 text-white" },
          { label:"🚨 Alerts",    value:critical.length,     bg:critical.length>0?"bg-red-600 text-white":"bg-white border border-slate-200 text-slate-800" },
        ].map(k=>(
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{loading?"...":k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Critical alert banner */}
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

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <input placeholder="Search tire no., brand, size, fleet no..."
            value={search} onChange={e=>setSearch(e.target.value)} className={iCls}/>
          <select className={iCls} value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}>
            <option value="">All Brands</option>
            {brands.map(b=><option key={b}>{b}</option>)}
          </select>
          <select className={iCls} value={filterSize} onChange={e=>setFilterSize(e.target.value)}>
            <option value="">All Sizes</option>
            {sizes.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          ["stock",   `📦 In Stock (${inStock})`],
          ["fitted",  `🔩 Fitted (${fitted})`],
          ["alerts",  `🚨 Alerts (${alerts.length})`],
        ] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab===key?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── IN STOCK TAB ── */}
      {tab === "stock" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Tire Stock</h2>
            <span className="text-sm text-slate-400">{stockList.length} tires</span>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {["Tire No.","Brand","Size","Type","Ply","Purchase Date","Cost","Notes","Actions"].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                : stockList.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">No tires in stock. Add tires to get started.</td></tr>
                : stockList.map(t=>(
                  <tr key={t.id} className="hover:bg-amber-50/20 group">
                    <td className="px-5 py-3 font-bold text-amber-600 font-mono text-xs">{t.tire_number}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{t.brand}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">{t.size}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{t.type}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{t.ply_rating||"—"}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {t.purchase_date?new Date(t.purchase_date).toLocaleDateString("en-GB"):"—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {t.purchase_cost?`₦${Number(t.purchase_cost).toLocaleString()}`:"—"}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs max-w-32 truncate">{t.notes||"—"}</td>
                    <td className="px-5 py-3">
                      {canManage && (
                        <button onClick={()=>setFitModal(t)}
                          className="opacity-0 group-hover:opacity-100 text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium whitespace-nowrap transition-opacity">
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
      )}

      {/* ── FITTED TAB ── */}
      {tab === "fitted" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Fitted Tires</h2>
            <span className="text-sm text-slate-400">{fittedList.length} tires fitted</span>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {["Tire No.","Brand","Size","Fleet No.","Position","Fitted Date","Fitted KM","Fitted HR","Tread Depth","Actions"].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                : fittedList.length === 0 ? <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400">No fitted tires. Fit tires from stock to equipment.</td></tr>
                : fittedList.map(t=>{
                  const minDepth = t.minimum_tread_depth||3;
                  const isCrit  = t.current_tread_depth!==null && t.current_tread_depth<=minDepth;
                  const isWarn  = t.current_tread_depth!==null && t.current_tread_depth<=minDepth*1.5 && !isCrit;
                  return (
                    <tr key={t.id} className={`group ${isCrit?"bg-red-50":isWarn?"bg-amber-50/30":"hover:bg-amber-50/20"}`}>
                      <td className="px-5 py-3 font-bold text-amber-600 font-mono text-xs">{t.tire_number}</td>
                      <td className="px-5 py-3 font-medium text-slate-700">{t.brand}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs">{t.size}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 text-xs">{t.current_fleet_number||"—"}</td>
                      <td className="px-5 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-xs font-mono">
                          {t.current_position} <span className="text-slate-400 font-normal">({POSITION_LABELS[t.current_position]||t.current_position})</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {t.fitted_date?new Date(t.fitted_date).toLocaleDateString("en-GB"):"—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{t.fitted_km_reading?.toLocaleString()||"—"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{t.fitted_hr_reading?.toLocaleString()||"—"}</td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap">
                        {t.current_tread_depth!==null ? (
                          <span className={`font-bold ${isCrit?"text-red-600":isWarn?"text-amber-600":"text-slate-700"}`}>
                            {isCrit&&"🚨 "}{isWarn&&"⚠️ "}{t.current_tread_depth}mm
                          </span>
                        ) : <span className="text-slate-300">Not inspected</span>}
                      </td>
                      <td className="px-5 py-3">
                        {canManage && (
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>setInspectModal(t)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium whitespace-nowrap">
                              Inspect
                            </button>
                            <button onClick={()=>setRemoveModal(t)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium whitespace-nowrap">
                              Remove
                            </button>
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

      {/* ── ALERTS TAB ── */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-lg font-semibold text-slate-600">All tires are within safe tread depth</p>
              <p className="text-sm text-slate-400 mt-1">Inspect tires regularly to keep this status updated.</p>
            </div>
          ) : alerts.map(t=>{
            const minDepth = t.minimum_tread_depth||3;
            const isCrit  = t.current_tread_depth<=minDepth;
            return (
              <div key={t.id} className={`rounded-2xl border p-5 flex items-center gap-5 ${isCrit?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
                <span className="text-3xl">{isCrit?"🚨":"⚠️"}</span>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isCrit?"text-red-800":"text-amber-800"}`}>
                    {isCrit?"CRITICAL":"WARNING"} — {t.tire_number}
                  </p>
                  <p className={`text-xs mt-0.5 ${isCrit?"text-red-600":"text-amber-600"}`}>
                    {t.brand} {t.size} · fitted on {t.current_fleet_number} at {POSITION_LABELS[t.current_position]||t.current_position}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${isCrit?"text-red-700":"text-amber-700"}`}>
                    Tread depth: {t.current_tread_depth}mm · Minimum: {minDepth}mm
                    {isCrit?" · REPLACE IMMEDIATELY":" · Plan replacement soon"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>setInspectModal(t)}
                      className="text-xs px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium">
                      Re-inspect
                    </button>
                    <button onClick={()=>setRemoveModal(t)}
                      className="text-xs px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddTireModal    open={addModal}       onClose={()=>setAddModal(false)}   onAdded={fetchTires} />
      {fitModal     && <FitTireModal     tire={fitModal}     onClose={()=>setFitModal(null)}     onDone={fetchTires} />}
      {removeModal  && <RemoveTireModal  tire={removeModal}  onClose={()=>setRemoveModal(null)}  onDone={fetchTires} />}
      {inspectModal && <InspectTireModal tire={inspectModal} onClose={()=>setInspectModal(null)} onDone={fetchTires} />}
    </div>
  );
}
