/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

const iCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const naira = (n: number) => `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const FUEL_TYPES = ["Diesel","Petrol","Kerosine"];

const TXN_STYLE: Record<string, { bg: string; icon: string }> = {
  "Receipt":     { bg: "bg-emerald-100 text-emerald-700", icon: "📥" },
  "Issue":       { bg: "bg-orange-100 text-orange-700",   icon: "📤" },
  "Dip Reading": { bg: "bg-blue-100 text-blue-700",       icon: "📏" },
};

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
// ADD TANK MODAL
// ─────────────────────────────────────────────────────────────
function AddTankModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [tankName, setTankName] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [capacity, setCapacity] = useState("");
  const [site, setSite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!tankName.trim()) { setError("Tank name is required."); return; }
    setSaving(true); setError("");
    const { error: err } = await dbu.from("fuel_tanks").insert([{
      tank_name: tankName, fuel_type: fuelType, capacity_litres: Number(capacity) || null, site: site || null,
    }]);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); setTankName(""); setCapacity(""); setSite(""); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add Fuel Tank</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <F label="Tank Name" required><input className={iCls} value={tankName} onChange={e=>setTankName(e.target.value)} placeholder="e.g. Main Diesel Tank — Central Store" /></F>
          <F label="Fuel Type"><select className={iCls} value={fuelType} onChange={e=>setFuelType(e.target.value)}>{FUEL_TYPES.map(f=><option key={f}>{f}</option>)}</select></F>
          <F label="Capacity (Litres)"><input type="number" className={iCls} value={capacity} onChange={e=>setCapacity(e.target.value)} /></F>
          <F label="Site"><input className={iCls} value={site} onChange={e=>setSite(e.target.value)} /></F>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Add Tank"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOG TRANSACTION MODAL — Receipt / Issue / Dip Reading, all three
// ultimately produce a dip-based variance the moment a dip is taken.
// ─────────────────────────────────────────────────────────────
function LogTxnModal({ open, onClose, onSaved, tank, profile }: {
  open: boolean; onClose: () => void; onSaved: () => void; tank: any; profile: any;
}) {
  const [txnType, setTxnType] = useState<"Receipt"|"Issue"|"Dip Reading">("Dip Reading");
  const [qty, setQty] = useState("");
  const [dip, setDip] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [waybillNo, setWaybillNo] = useState("");
  const [fleetNumber, setFleetNumber] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setTxnType("Dip Reading"); setQty(""); setDip(""); setUnitPrice(""); setSupplier("");
    setWaybillNo(""); setFleetNumber(""); setIssuedTo(""); setRemarks(""); setError("");
  }
  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    if (txnType !== "Dip Reading" && (!qty || Number(qty) <= 0)) { setError("Enter a valid quantity."); return; }
    setSaving(true); setError("");
    const { error: err } = await dbu.from("fuel_transactions").insert([{
      tank_id: tank.id,
      txn_type: txnType,
      quantity_litres: txnType === "Dip Reading" ? 0 : Number(qty),
      dip_reading: dip !== "" ? Number(dip) : null,
      unit_price: unitPrice !== "" ? Number(unitPrice) : null,
      supplier: txnType === "Receipt" ? (supplier || null) : null,
      waybill_no: txnType === "Receipt" ? (waybillNo || null) : null,
      fleet_number: txnType === "Issue" ? (fleetNumber || null) : null,
      issued_to: txnType === "Issue" ? (issuedTo || null) : null,
      performed_by: profile?.full_name,
      remarks: remarks || null,
    }]);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); reset(); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-6 py-5 bg-blue-700 flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">{tank?.tank_name}</p>
            <h2 className="text-lg font-bold text-white">Log Fuel Transaction</h2>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            {(["Receipt","Issue","Dip Reading"] as const).map(t => (
              <button key={t} onClick={()=>setTxnType(t)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold ${txnType===t ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>
                {TXN_STYLE[t].icon} {t}
              </button>
            ))}
          </div>

          {txnType !== "Dip Reading" && (
            <F label={`Quantity Litres (${txnType})`} required>
              <input type="number" className={iCls} value={qty} onChange={e=>setQty(e.target.value)} />
            </F>
          )}

          <F label="Dip Reading After This Event (Litres)">
            <input type="number" className={iCls} value={dip} onChange={e=>setDip(e.target.value)}
              placeholder="Physical dip, if taken now" />
            <p className="text-[11px] text-slate-400 mt-1">Enter this whenever you physically check the tank — its&apos; what drives the variance/loss report.</p>
          </F>

          {txnType === "Receipt" && (
            <div className="grid grid-cols-2 gap-3">
              <F label="Unit Price (₦/litre)"><input type="number" className={iCls} value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} /></F>
              <F label="Supplier"><input className={iCls} value={supplier} onChange={e=>setSupplier(e.target.value)} /></F>
              <F label="WayBill No."><input className={iCls} value={waybillNo} onChange={e=>setWaybillNo(e.target.value)} /></F>
            </div>
          )}
          {txnType === "Issue" && (
            <div className="grid grid-cols-2 gap-3">
              <F label="Fleet No."><input className={iCls} value={fleetNumber} onChange={e=>setFleetNumber(e.target.value)} /></F>
              <F label="Issued To"><input className={iCls} value={issuedTo} onChange={e=>setIssuedTo(e.target.value)} /></F>
            </div>
          )}
          {txnType === "Dip Reading" && (
            <F label="Value Per Litre (₦) — for loss valuation"><input type="number" className={iCls} value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} /></F>
          )}

          <F label="Remarks"><textarea className={iCls + " h-16 resize-none"} value={remarks} onChange={e=>setRemarks(e.target.value)} /></F>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Log Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TANK DETAIL — live variance + history + loss report
// ─────────────────────────────────────────────────────────────
function TankDetail({ tank, canManage, profile }: { tank: any; canManage: boolean; profile: any }) {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModal, setLogModal] = useState(false);
  const [period, setPeriod] = useState<"week"|"month">("week");

  useEffect(() => { load(); }, [tank.id]); 
  async function load() {
    setLoading(true);
    const data = await fetchAllRows("fuel_transactions", "*", q => q.eq("tank_id", tank.id).order("txn_date", { ascending: false }));
    setTxns(data);
    setLoading(false);
  }

  const latest = txns[0];
  const latestDip = txns.find(t => t.dip_reading != null);
  const bookBalance = latest?.book_balance ?? 0;
  const dipReading = latestDip?.dip_reading ?? null;
  const variance = dipReading != null ? bookBalance - dipReading : null;

  // Period loss report — every dip reading in the window, valued.
  const now = new Date();
  const cutoff = new Date(now);
  if (period === "week") cutoff.setDate(now.getDate() - 7); else cutoff.setMonth(now.getMonth() - 1);
  const periodDips = txns.filter(t => t.dip_reading != null && new Date(t.txn_date) >= cutoff);
  const totalVariance = periodDips.reduce((s, t, i, arr) => {
    // Variance per dip = book_balance at that point minus the dip itself
    return s + (Number(t.book_balance || 0) - Number(t.dip_reading || 0));
  }, 0);
  const avgPrice = periodDips.filter(t=>t.unit_price).reduce((s,t,_,arr)=>s+Number(t.unit_price)/arr.length,0);
  const valuedLoss = totalVariance * (avgPrice || 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : Number(bookBalance).toLocaleString()}L</p>
          <p className="text-sm opacity-70 mt-1">Book Balance</p>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{dipReading != null ? `${Number(dipReading).toLocaleString()}L` : "—"}</p>
          <p className="text-sm opacity-70 mt-1">Last Dip Reading</p>
        </div>
        <div className={`rounded-2xl p-5 ${variance != null && variance > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          <p className="text-2xl font-bold">{variance != null ? `${variance > 0 ? "−" : "+"}${Math.abs(variance).toLocaleString()}L` : "—"}</p>
          <p className="text-sm opacity-70 mt-1">Variance {variance != null && variance > 0 ? "(loss)" : ""}</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{tank.capacity_litres ? `${Number(tank.capacity_litres).toLocaleString()}L` : "—"}</p>
          <p className="text-sm opacity-70 mt-1">Tank Capacity</p>
        </div>
      </div>

      {canManage && (
        <button onClick={()=>setLogModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
          + Log Transaction
        </button>
      )}

      {/* Loss report */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Loss Report</h3>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["week","month"] as const).map(p => (
              <button key={p} onClick={()=>setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${period===p ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                This {p === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-slate-400">Dip Readings in Period</p><p className="font-bold text-slate-800 text-lg">{periodDips.length}</p></div>
          <div><p className="text-xs text-slate-400">Total Variance</p>
            <p className={`font-bold text-lg ${totalVariance > 0 ? "text-red-600" : "text-emerald-700"}`}>
              {totalVariance > 0 ? "−" : "+"}{Math.abs(totalVariance).toLocaleString()}L
            </p></div>
          <div><p className="text-xs text-slate-400">Estimated Value Lost</p>
            <p className={`font-bold text-lg ${valuedLoss > 0 ? "text-red-600" : "text-slate-700"}`}>{naira(valuedLoss)}</p></div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">Transaction History</h3></div>
        <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
          {loading ? <div className="px-6 py-8 text-center text-slate-400">Loading...</div>
          : txns.length === 0 ? <div className="px-6 py-8 text-center text-slate-400">No transactions logged yet.</div>
          : txns.map(t => (
            <div key={t.id} className="px-6 py-3 flex items-start gap-3 text-sm">
              <span className="text-lg">{TXN_STYLE[t.txn_type]?.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TXN_STYLE[t.txn_type]?.bg}`}>{t.txn_type}</span>
                  {t.quantity_litres > 0 && <span className="text-xs text-slate-600">{Number(t.quantity_litres).toLocaleString()}L</span>}
                  {t.dip_reading != null && <span className="text-xs text-blue-600">Dip: {Number(t.dip_reading).toLocaleString()}L</span>}
                  <span className="text-xs text-slate-400 ml-auto">{new Date(t.txn_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Book balance after: {Number(t.book_balance).toLocaleString()}L
                  {t.supplier && ` · ${t.supplier}`}{t.fleet_number && ` · ${t.fleet_number}`}{t.issued_to && ` · to ${t.issued_to}`}
                  {" · by "}{t.performed_by}
                </p>
                {t.remarks && <p className="text-xs text-slate-400 italic mt-0.5">{t.remarks}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <LogTxnModal open={logModal} onClose={()=>setLogModal(false)} onSaved={load} tank={tank} profile={profile} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function FillingStationPage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];
  const canManage = roles.some(r => ["store_officer","store_manager","super_admin"].includes(r));

  const [tanks, setTanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [addTankModal, setAddTankModal] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const data = await fetchAllRows("fuel_tanks", "*", q => q.eq("is_active", true).order("tank_name"));
    setTanks(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Store — Filling Station</p>
          <h1 className="text-3xl font-bold text-slate-900">Fuel Tanks</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Dip-reading based variance tracking — book balance vs physical dip, valued in naira.
          </p>
        </div>
        {canManage && (
          <button onClick={()=>setAddTankModal(true)} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
            + Add Tank
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading tanks...</div>
      ) : tanks.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
          <p className="text-blue-800 font-semibold">No fuel tanks set up yet.</p>
          {canManage && <p className="text-blue-600 text-sm mt-1">Click &quot;+ Add Tank&quot; to register your first tank.</p>}
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {tanks.map(t => (
              <button key={t.id} onClick={()=>setSelected(t)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 ${
                  selected?.id === t.id ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                ⛽ {t.tank_name} <span className="text-xs opacity-60">({t.fuel_type})</span>
              </button>
            ))}
          </div>
          {selected && <TankDetail tank={selected} canManage={canManage} profile={profile} />}
        </>
      )}

      <AddTankModal open={addTankModal} onClose={()=>setAddTankModal(false)} onSaved={load} />
    </div>
  );
}