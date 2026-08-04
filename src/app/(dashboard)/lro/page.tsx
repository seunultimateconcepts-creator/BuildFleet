/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

const iCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const fmtDT = (d: string) => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const naira = (n: number) => `₦${Number(n||0).toLocaleString()}`;

// The exact rows on the real Lubricant Requisition Order form.
const FUEL_LINE_TYPES = ["Diesel","Petrol","Kerosine","Engine Oil","Gear Oil","Others"];
// These three map to real fuel_tanks; the rest are regular Store items.
const TANK_TYPES = ["Diesel","Petrol","Kerosine"];

const LRO_STATUS_STYLE: Record<string,string> = {
  "Pending Approval": "bg-orange-100 text-orange-700",
  "Approved":          "bg-blue-100 text-blue-700",
  "Dispensed":         "bg-emerald-100 text-emerald-700",
  "Rejected":          "bg-red-100 text-red-600",
  "Cancelled":         "bg-slate-100 text-slate-500",
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
// FLEET PICKER — simple searchable equipment picker for Vehicle No.
// ─────────────────────────────────────────────────────────────
function FleetPicker({ equipment, value, onChange }: { equipment: any[]; value: string; onChange: (v:string)=>void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = equipment.find(e => e.fleet_number === value);
  const filtered = equipment.filter(e => query && (e.fleet_number.toLowerCase().includes(query.toLowerCase()) || (e.name||"").toLowerCase().includes(query.toLowerCase()))).slice(0,12);

  return (
    <div className="relative">
      {selected ? (
        <div className="border border-amber-300 bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-sm"><span className="font-bold text-amber-700 font-mono">{selected.fleet_number}</span> — {selected.name}</span>
          <button onClick={()=>onChange("")} className="text-slate-400 hover:text-red-500 text-lg leading-none">×</button>
        </div>
      ) : (
        <>
          <input className={iCls} placeholder="Search vehicle by fleet number..." value={query}
            onChange={e=>{setQuery(e.target.value); setOpen(true);}} onFocus={()=>setOpen(true)} />
          {open && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filtered.map(e => (
                <button key={e.id} onClick={()=>{onChange(e.fleet_number); setOpen(false); setQuery("");}}
                  className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                  <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RAISE LRO MODAL
// ─────────────────────────────────────────────────────────────
function RaiseLROModal({ onClose, onSaved, profile }: { onClose: () => void; onSaved: () => void; profile: any }) {
  const [sites, setSites] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [stationLocation, setStationLocation] = useState("");
  const [fleetNumber, setFleetNumber] = useState("");
  const [destination, setDestination] = useState("");
  const [driverName, setDriverName] = useState(profile?.full_name || "");
  const [dateRaised, setDateRaised] = useState(new Date().toISOString().slice(0,10));
  const [lines, setLines] = useState<Record<string, string>>({}); // fuel_type -> approved_litre
  const [customType, setCustomType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllRows("sites", "name,code,site_type").then((all:any) =>
      setSites(all.filter((s:any) => s.site_type === "Project" || ["Central Workshop","Regional Workshop","Field Workshop"].includes(s.site_type)))
    );
    fetchAllRows("equipment", "id,fleet_number,name").then(setEquipment);
  }, []);

  function toggleLine(type: string) {
    setLines(prev => {
      const next = { ...prev };
      if (type in next) delete next[type]; else next[type] = "";
      return next;
    });
  }

  async function handleSubmit() {
    const activeLines = Object.entries(lines).filter(([,qty]) => qty && Number(qty) > 0);
    if (!fleetNumber) { setError("Vehicle No. is required."); return; }
    if (!driverName.trim()) { setError("Driver name is required."); return; }
    if (activeLines.length === 0) { setError("Select at least one fuel/lubricant type and enter a quantity."); return; }
    setSaving(true); setError("");

    const { data: lro, error: err } = await dbu.from("lro").insert([{
      station_location: stationLocation || null,
      fleet_number: fleetNumber,
      destination: destination || null,
      date_raised: dateRaised,
      raised_by: profile?.full_name || "",
      raised_by_id: profile?.id || null,
      driver_name: driverName,
      status: "Pending Approval",
      remarks: remarks || null,
    }]).select().single();

    if (err) { setError(err.message); setSaving(false); return; }

    await dbu.from("lro_items").insert(activeLines.map(([type, qty]) => ({
      lro_id: lro.id,
      fuel_type: type,
      custom_type: type === "Others" ? customType : null,
      approved_litre: Number(qty),
    })));

    setSaving(false); onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Lubricant Requisition Order</p>
            <h2 className="text-lg font-bold text-white">Raise New LRO</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <F label="Station Location">
              <select className={iCls} value={stationLocation} onChange={e=>setStationLocation(e.target.value)}>
                <option value="">Select site...</option>
                {sites.map(s => <option key={s.code||s.name} value={s.name}>{s.code?`${s.code} — `:""}{s.name}</option>)}
              </select>
            </F>
            <F label="Vehicle No." required>
              <FleetPicker equipment={equipment} value={fleetNumber} onChange={setFleetNumber} />
            </F>
            <F label="Destination"><input className={iCls} value={destination} onChange={e=>setDestination(e.target.value)} /></F>
            <F label="Date"><input type="date" className={iCls} value={dateRaised} onChange={e=>setDateRaised(e.target.value)} /></F>
            <div className="col-span-2"><F label="Driver" required>
              <input className={iCls} value={driverName} onChange={e=>setDriverName(e.target.value)} /></F></div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase block">Fuel / Lubricant Requested</label>
            {FUEL_LINE_TYPES.map(type => (
              <div key={type} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${type in lines ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                <input type="checkbox" checked={type in lines} onChange={()=>toggleLine(type)} className="accent-amber-500 w-4 h-4" />
                <span className="flex-1 text-sm font-medium text-slate-700">{type}</span>
                {type in lines && (
                  <input type="number" placeholder="Litres" className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                    value={lines[type]} onChange={e=>setLines(prev=>({...prev,[type]:e.target.value}))} />
                )}
              </div>
            ))}
            {"Others" in lines && (
              <input className={iCls} placeholder="Specify what 'Others' means" value={customType} onChange={e=>setCustomType(e.target.value)} />
            )}
          </div>

          <F label="Remarks"><textarea className={iCls + " h-16 resize-none"} value={remarks} onChange={e=>setRemarks(e.target.value)} /></F>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Submitting..." : "Submit LRO →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LRO DETAIL MODAL — approval, then dispensing (tank or store, per line)
// ─────────────────────────────────────────────────────────────
function LRODetailModal({ lro: initialLro, onClose, onSaved, profile, roles }: {
  lro: any; onClose: () => void; onSaved: () => void; profile: any; roles: string[];
}) {
  const [lro, setLro] = useState(initialLro);
  const [items, setItems] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // per-item dispense form state, keyed by lro_item.id
  const [dispenseForm, setDispenseForm] = useState<Record<string, { linkId: string; collected: string; rate: string; store: string }>>({});

  const canApprove  = roles.some(r => ["plant_manager","plant_engineer","super_admin"].includes(r));
  const canDispense = roles.some(r => ["store_officer","store_manager","store_supervisor","super_admin"].includes(r));

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [it, tk, si, st] = await Promise.all([
      dbu.from("lro_items").select("*").eq("lro_id", initialLro.id),
      fetchAllRows("fuel_tanks", "*", (q:any) => q.eq("is_active", true)),
      fetchAllRows("stock_items", "id,name,part_number"),
      fetchAllRows("sites", "name"),
    ]);
    setItems(it.data || []);
    setTanks(tk);
    setStockItems(si);
    setStores((st as any[]).filter(s => /store/i.test(s.name)).map(s => s.name).sort());
    setLoading(false);
  }
  async function refresh() {
    const { data } = await dbu.from("lro").select("*").eq("id", initialLro.id).single();
    if (data) setLro(data);
    onSaved(); load();
  }

  async function approve() {
    setSaving(true);
    await dbu.from("lro").update({ status: "Approved", approved_by: profile?.full_name, approved_at: new Date().toISOString() }).eq("id", lro.id);
    setSaving(false); refresh();
  }
  async function reject() {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setSaving(true);
    await dbu.from("lro").update({ status: "Rejected", rejection_reason: reason }).eq("id", lro.id);
    setSaving(false); refresh();
  }

  async function dispenseLine(item: any) {
    const form = dispenseForm[item.id];
    if (!form?.linkId || !form?.collected) { alert("Select where this is dispensed from and enter the collected litres."); return; }
    const isTank = TANK_TYPES.includes(item.fuel_type);
    if (!isTank && !form?.store) { alert("Select which store this oil is coming from."); return; }
    setSaving(true);

    if (isTank) {
      const { error: err } = await dbu.from("fuel_transactions").insert([{
        tank_id: form.linkId, txn_type: "Issue",
        quantity_litres: Number(form.collected),
        fleet_number: lro.fleet_number,
        issued_to: lro.driver_name,
        performed_by: profile?.full_name,
        remarks: `LRO ${lro.lro_number}`,
      }]);
      if (err) { alert(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await dbu.from("store_transactions").insert([{
        txn_type: "SIV", stock_item_id: form.linkId,
        item_name: stockItems.find((s:any)=>s.id===form.linkId)?.name,
        store_location: form.store,
        quantity: Number(form.collected),
        fleet_number: lro.fleet_number,
        issued_to: lro.driver_name,
        performed_by: profile?.full_name,
        remarks: `LRO ${lro.lro_number}`,
      }]);
      if (err) { alert(err.message); setSaving(false); return; }
    }

    await dbu.from("lro_items").update({
      collected_litre: Number(form.collected),
      rate: form.rate ? Number(form.rate) : null,
      [isTank ? "tank_id" : "stock_item_id"]: form.linkId,
      status: "Dispensed",
    }).eq("id", item.id);

    // If every line is now dispensed, close out the LRO itself.
    const { data: refreshedItems } = await dbu.from("lro_items").select("status").eq("lro_id", lro.id);
    const allDone = (refreshedItems||[]).every((i:any) => i.status === "Dispensed");
    if (allDone) {
      await dbu.from("lro").update({ status: "Dispensed", attendant_name: profile?.full_name }).eq("id", lro.id);
    }
    setSaving(false); refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">LRO</p>
            <h2 className="text-lg font-bold text-white">{lro.lro_number}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{lro.fleet_number} — {lro.destination || "no destination given"}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${LRO_STATUS_STYLE[lro.status]}`}>{lro.status}</span>
        </div>

        <div className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-4 gap-3 text-xs bg-slate-50 rounded-xl p-4">
            <div><p className="text-slate-400">Driver</p><p className="font-semibold">{lro.driver_name}</p></div>
            <div><p className="text-slate-400">Station</p><p className="font-semibold">{lro.station_location||"—"}</p></div>
            <div><p className="text-slate-400">Raised By</p><p className="font-semibold">{lro.raised_by}</p></div>
            <div><p className="text-slate-400">Date</p><p className="font-semibold">{lro.date_raised}</p></div>
          </div>

          {lro.status === "Pending Approval" && canApprove && (
            <div className="flex gap-2">
              <button onClick={approve} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">✓ Approve</button>
              <button onClick={reject} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold">✗ Reject</button>
            </div>
          )}

          <div className="space-y-3">
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : items.map(item => {
              const isTank = TANK_TYPES.includes(item.fuel_type);
              const linkOptions = isTank ? tanks.filter((t:any)=>t.fuel_type===item.fuel_type) : stockItems;
              return (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-800 text-sm">{item.fuel_type === "Others" ? item.custom_type : item.fuel_type}</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status==="Dispensed"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Approved: {item.approved_litre}L{item.collected_litre != null && ` · Collected: ${item.collected_litre}L`}{item.rate && ` · Rate: ${naira(item.rate)}/L · Value: ${naira(item.value)}`}</p>

                  {lro.status === "Approved" && item.status === "Pending" && canDispense && (
                    <div className="grid grid-cols-3 gap-2 bg-blue-50 rounded-lg p-3">
                      <select className={iCls} value={dispenseForm[item.id]?.linkId || ""} onChange={e=>setDispenseForm(p=>({...p,[item.id]:{linkId:e.target.value,collected:p[item.id]?.collected||"",rate:p[item.id]?.rate||"",store:p[item.id]?.store||""}}))}>
                        <option value="">{isTank ? "Select tank..." : "Select store item..."}</option>
                        {linkOptions.map((o:any) => <option key={o.id} value={o.id}>{isTank ? o.tank_name : o.name}</option>)}
                      </select>
                      {!isTank && (
                        <select className={iCls} value={dispenseForm[item.id]?.store || ""} onChange={e=>setDispenseForm(p=>({...p,[item.id]:{linkId:p[item.id]?.linkId||"",collected:p[item.id]?.collected||"",rate:p[item.id]?.rate||"",store:e.target.value}}))}>
                          <option value="">Select store...</option>
                          {stores.map(s => <option key={s}>{s}</option>)}
                        </select>
                      )}
                      <input type="number" placeholder="Collected L" className={iCls}
                        value={dispenseForm[item.id]?.collected || ""} onChange={e=>setDispenseForm(p=>({...p,[item.id]:{linkId:p[item.id]?.linkId||"",collected:e.target.value,rate:p[item.id]?.rate||"",store:p[item.id]?.store||""}}))} />
                      <input type="number" placeholder="Rate ₦/L" className={iCls}
                        value={dispenseForm[item.id]?.rate || ""} onChange={e=>setDispenseForm(p=>({...p,[item.id]:{linkId:p[item.id]?.linkId||"",collected:p[item.id]?.collected||"",rate:e.target.value,store:p[item.id]?.store||""}}))} />
                      <button onClick={()=>dispenseLine(item)} disabled={saving} className="col-span-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Dispense</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function LROPage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];

  const [lros, setLros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [raiseModal, setRaiseModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const data = await fetchAllRows("lro", "*", (q:any) => q.order("created_at", { ascending: false }));
    setLros(data);
    setLoading(false);
  }

  const filtered = lros.filter((l:any) => {
    const q = search.toLowerCase();
    return !q || (l.lro_number||"").toLowerCase().includes(q) || (l.fleet_number||"").toLowerCase().includes(q) || (l.driver_name||"").toLowerCase().includes(q);
  });

  const counts = {
    total: lros.length,
    pending: lros.filter((l:any)=>l.status==="Pending Approval").length,
    approved: lros.filter((l:any)=>l.status==="Approved").length,
    dispensed: lros.filter((l:any)=>l.status==="Dispensed").length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Material Requisition</p>
          <h1 className="text-3xl font-bold text-slate-900">LRO</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Lubricant Requisition — approve once, dispense from the right tank or store item, no procurement branch.
          </p>
        </div>
        <button onClick={()=>setRaiseModal(true)} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
          + Raise LRO
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.total}</p><p className="text-sm opacity-70 mt-1">Total LROs</p></div>
        <div className="bg-orange-500 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.pending}</p><p className="text-sm opacity-70 mt-1">Pending Approval</p></div>
        <div className="bg-blue-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.approved}</p><p className="text-sm opacity-70 mt-1">Approved — awaiting dispense</p></div>
        <div className="bg-emerald-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.dispensed}</p><p className="text-sm opacity-70 mt-1">Dispensed</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <input placeholder="Search LRO number, fleet number, driver..." value={search} onChange={e=>setSearch(e.target.value)} className={iCls} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["LRO No.","Vehicle","Driver","Destination","Date","Status",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No LROs yet.</td></tr>
              : filtered.map((l:any) => (
                <tr key={l.id} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{l.lro_number}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs font-mono">{l.fleet_number}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{l.driver_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{l.destination||"—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDT(l.created_at)}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${LRO_STATUS_STYLE[l.status]}`}>{l.status}</span></td>
                  <td className="px-4 py-3"><button onClick={()=>setSelected(l)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {raiseModal && <RaiseLROModal onClose={()=>setRaiseModal(false)} onSaved={load} profile={profile} />}
      {selected && <LRODetailModal lro={selected} onClose={()=>{setSelected(null); load();}} onSaved={load} profile={profile} roles={roles} />}
    </div>
  );
}