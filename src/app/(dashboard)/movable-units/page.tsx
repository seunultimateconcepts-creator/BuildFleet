/* eslint-disable react-hooks/set-state-in-effect */
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
const fmtDT = (d: string) => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

const MU_STATUS_STYLE: Record<string, string> = {
  "Draft":              "bg-slate-100 text-slate-600",
  "Sealed":             "bg-blue-100 text-blue-700",
  "Driver Verified":    "bg-indigo-100 text-indigo-700",
  "Approved":           "bg-purple-100 text-purple-700",
  "Dispatched":         "bg-amber-100 text-amber-700",
  "In Transit":         "bg-amber-100 text-amber-700",
  "Received":           "bg-emerald-100 text-emerald-700",
  "Partially Received": "bg-orange-100 text-orange-700",
  "Rejected":           "bg-red-100 text-red-600",
  "Cancelled":          "bg-slate-100 text-slate-500",
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
// VEHICLE PICKER — selecting the real transport equipment pulls its
// driver straight from the existing Equipment Allocation field,
// instead of a free-text name someone could mistype or forget to
// update. driver_name is still editable underneath, in case the
// allocation is stale for that specific trip.
// ─────────────────────────────────────────────────────────────
function VehiclePicker({ equipment, value, driverName, onChange }: {
  equipment: any[]; value: string; driverName: string;
  onChange: (fleetNo: string, equipmentId: string, driver: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = equipment.filter(e => {
    if (!query) return false;
    const q = query.toLowerCase();
    return e.fleet_number.toLowerCase().includes(q) || (e.name||"").toLowerCase().includes(q);
  }).slice(0, 12);

  const selected = equipment.find(e => e.fleet_number === value);

  return (
    <div className="relative">
      {selected ? (
        <div className="border border-amber-300 bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-sm"><span className="font-bold text-amber-700 font-mono">{selected.fleet_number}</span> — {selected.name}</span>
          <button onClick={() => onChange("", "", "")} className="text-slate-400 hover:text-red-500 text-lg leading-none">×</button>
        </div>
      ) : (
        <>
          <input className={iCls} placeholder="Search vehicle by fleet number or name..."
            value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
          {open && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filtered.map(e => (
                <button key={e.id} onClick={() => { onChange(e.fleet_number, e.id, e.allocated_to || ""); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                  <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                  {e.allocated_to && <span className="text-slate-400 text-xs ml-2">— driver: {e.allocated_to}</span>}
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
// CREATE MU MODAL — Store-only. Bulk equipment transfer was pulled
// out of this feature (site-string matching against equipment.site
// was too fragile mixed in here) — it'll come back later as its own
// feature directly on the Transfer page instead.
// ─────────────────────────────────────────────────────────────
function CreateMUModal({ open, onClose, onSaved, profile }: { open: boolean; onClose: () => void; onSaved: () => void; profile: any }) {
  const [sites, setSites] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [storeBalances, setStoreBalances] = useState<any[]>([]);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [vehicleFleet, setVehicleFleet] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [storeLines, setStoreLines] = useState<{ stock_item_id: string; name: string; qty: string; available: number }[]>([]);
  const [itemQuery, setItemQuery] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // ★ FIX: MU is specifically for store-to-store dispatch — From/To
    // must only ever list real store locations, never every site type
    // (Repair Yards, Storage Yards, Projects, etc.). Same filter
    // already used on the Store page's own selector.
    fetchAllRows("sites", "name,code,site_type").then((all:any) => {
      setSites(all.filter((s:any) => /store/i.test(s.name)));
    });
    fetchAllRows("equipment", "id,fleet_number,name,allocated_to").then(setEquipment);
  }, []);

  // ★ MULTI-STORE FIX: items you can add to an MU must come from the
  // SOURCE store's real, live balance — never the frozen global
  // stock_items number. Refetches every time From Location changes.
  useEffect(() => {
    setStoreLines([]); // location changed — old picks no longer valid
    if (!fromLocation) { setStoreBalances([]); return; }
    fetchAllRows("store_stock_balances", "*", (q:any) => q.eq("store_location", fromLocation)).then(async (balances:any) => {
      const items = await fetchAllRows("stock_items", "id,name,part_number");
      setStoreBalances(balances.map((b:any) => {
        const item = (items as any[]).find(i => i.id === b.stock_item_id);
        return { ...b, name: item?.name, part_number: item?.part_number };
      }));
    });
  }, [fromLocation]);

  function reset() {
    setFromLocation(""); setToLocation(""); setVehicleFleet(""); setVehicleId(""); setDriverName("");
    setStoreLines([]); setItemQuery(""); setRemarks(""); setError("");
  }
  function handleClose() { reset(); onClose(); }

  const filteredStock = storeBalances.filter(s => itemQuery && (s.name||"").toLowerCase().includes(itemQuery.toLowerCase()) && s.balance > 0).slice(0, 10);

  async function handleSubmit() {
    if (!fromLocation || !toLocation) { setError("From and To locations are required."); return; }
    if (fromLocation === toLocation) { setError("From and To cannot be the same location."); return; }
    if (storeLines.length === 0) { setError("Add at least one item."); return; }
    const overQty = storeLines.find(l => Number(l.qty) > l.available || Number(l.qty) <= 0);
    if (overQty) { setError(`${overQty.name}: cannot request more than the ${overQty.available} available at ${fromLocation}.`); return; }
    setSaving(true); setError("");

    const { data: mu, error: err } = await dbu.from("movable_units").insert([{
      unit_type: "Store", from_location: fromLocation, to_location: toLocation,
      transport_equipment_id: vehicleId || null, transport_fleet_number: vehicleFleet || null,
      driver_name: driverName || null,
      created_by: profile?.full_name, remarks: remarks || null, status: "Draft",
    }]).select().single();
    if (err) { setError(err.message); setSaving(false); return; }

    const { error: itemErr } = await dbu.from("movable_unit_items").insert(storeLines.map(l => ({
      mu_id: mu.id, item_type: "stock_item", stock_item_id: l.stock_item_id,
      item_name: l.name, qty_expected: Number(l.qty) || 1,
    })));
    if (itemErr) { setError(itemErr.message); setSaving(false); return; }

    setSaving(false); reset(); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Sealed Bulk Dispatch</p>
            <h2 className="text-lg font-bold text-white">Create Movable Unit</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <F label="From Location" required>
              <select className={iCls} value={fromLocation} onChange={e=>setFromLocation(e.target.value)}>
                <option value="">Select...</option>
                {sites.map(s => <option key={s.code||s.name} value={s.name}>{s.code?`${s.code} — `:""}{s.name}</option>)}
              </select>
            </F>
            <F label="To Location" required>
              <select className={iCls} value={toLocation} onChange={e=>setToLocation(e.target.value)}>
                <option value="">Select...</option>
                {sites.filter(s=>s.name!==fromLocation).map(s => <option key={s.code||s.name} value={s.name}>{s.code?`${s.code} — `:""}{s.name}</option>)}
              </select>
            </F>
          </div>

          <F label="Transport Vehicle">
            <VehiclePicker equipment={equipment} value={vehicleFleet} driverName={driverName}
              onChange={(fleetNo, id, driver) => { setVehicleFleet(fleetNo); setVehicleId(id); setDriverName(driver); }} />
          </F>
          {vehicleFleet && (
            <F label="Driver">
              <input className={iCls} value={driverName} onChange={e=>setDriverName(e.target.value)}
                placeholder="Pulled from vehicle allocation — edit if different for this trip" />
            </F>
          )}

          <div className="space-y-3">
            <F label="Add Items">
              {!fromLocation ? (
                <p className="text-sm text-slate-400 italic">Choose a From Location first — items are searched from that store&apos;s real stock.</p>
              ) : (
                <>
                  <input className={iCls} placeholder="Search item name..." value={itemQuery} onChange={e=>setItemQuery(e.target.value)} />
                  {filteredStock.length > 0 && (
                    <div className="mt-1 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                      {filteredStock.map(s => (
                        <button key={s.stock_item_id} onClick={()=>{
                          if (!storeLines.some(l=>l.stock_item_id===s.stock_item_id))
                            setStoreLines([...storeLines,{stock_item_id:s.stock_item_id, name:s.name, qty:"1", available:s.balance}]);
                          setItemQuery("");
                        }} className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-sm">
                          {s.name} <span className="text-emerald-600 text-xs font-semibold">({s.balance} available at {fromLocation})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </F>
            {storeLines.map((l,i) => (
              <div key={l.stock_item_id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                <span className="flex-1 text-sm text-slate-700">{l.name} <span className="text-slate-400 text-xs">(max {l.available})</span></span>
                <input type="number" min={1} max={l.available} className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                  value={l.qty} onChange={e=>setStoreLines(prev=>prev.map((x,idx)=>idx===i?{...x,qty:e.target.value}:x))} />
                <button onClick={()=>setStoreLines(prev=>prev.filter((_,idx)=>idx!==i))} className="text-red-500 text-xs hover:text-red-700">Remove</button>
              </div>
            ))}
          </div>

          <F label="Remarks"><textarea className={iCls + " h-16 resize-none"} value={remarks} onChange={e=>setRemarks(e.target.value)} /></F>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Creating..." : "Create MU →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MU DETAIL — Store-only workflow: seal, driver verify, approve
// (once, for everything inside), dispatch, receive.
// ─────────────────────────────────────────────────────────────
function MUDetailModal({ mu: initialMu, onClose, onSaved, profile, roles }: {
  mu: any; onClose: () => void; onSaved: () => void; profile: any; roles: string[];
}) {
  // Local, live copy of the MU — the prop is only the snapshot from
  // the moment this modal opened. Without this, clicking Seal/Approve/
  // Dispatch would silently do nothing visible until the modal was
  // closed and reopened.
  const [mu, setMu] = useState(initialMu);
  async function refreshLocalMU() {
    const { data } = await dbu.from("movable_units").select("*").eq("id", initialMu.id).single();
    if (data) setMu(data);
  }

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sealNote, setSealNote] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"Verified"|"Unverified">("Verified");
  const [receiveInput, setReceiveInput] = useState("");
  const [deficitNote, setDeficitNote] = useState("");
  const [showDeficit, setShowDeficit] = useState(false);

  const canSeal     = roles.some(r => ["store_officer","store_manager","super_admin"].includes(r));
  const canDriver   = roles.some(r => ["driver","store_officer","store_manager","super_admin"].includes(r));
  const canApprove  = roles.some(r => ["store_manager","super_admin"].includes(r));
  const canDispatch = canSeal;
  const canReceive  = roles.some(r => ["store_officer","store_manager","super_admin"].includes(r));

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const data = await dbu.from("movable_unit_items").select("*").eq("mu_id", mu.id).order("item_name");
    setItems(data.data || []);
    setLoading(false);
  }

  async function refreshMU() { await refreshLocalMU(); onSaved(); }

  async function handleSeal() {
    setSaving(true);
    await dbu.from("movable_units").update({ status: "Sealed", sealed_by: profile?.full_name, sealed_at: new Date().toISOString(), seal_note: sealNote || null }).eq("id", mu.id);
    setSaving(false); refreshMU();
  }

  async function confirmDriverItem(item: any) {
    await dbu.from("movable_unit_items").update({ confirmed: true, confirmed_by: profile?.full_name, confirmed_at: new Date().toISOString(), status: "Confirmed" }).eq("id", item.id);
    load();
  }
  async function submitDriverVerification() {
    setSaving(true);
    await dbu.from("movable_units").update({ status: "Driver Verified" }).eq("id", mu.id);
    setSaving(false); refreshMU();
  }

  async function handleApprove() {
    setSaving(true);
    await dbu.from("movable_units").update({ status: "Approved", approved_by: profile?.full_name, approved_at: new Date().toISOString() }).eq("id", mu.id);
    setSaving(false); refreshMU();
  }
  async function handleReject() {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setSaving(true);
    await dbu.from("movable_units").update({ status: "Rejected", rejection_note: reason }).eq("id", mu.id);
    setSaving(false); refreshMU();
  }

  // Dispatch is the moment stock genuinely LEAVES the source store —
  // not just a status flip. Writes a real SIV per item, tagged with
  // this MU, so store history shows exactly what moved and why. If
  // the database's own balance guard rejects any line (shouldn't
  // happen — Create MU already checked availability — but a second
  // MU could have drained stock in between), this stops cleanly
  // without flipping the MU to "In Transit" on a half-moved basis.
  async function handleDispatch() {
    setSaving(true);
    for (const item of items) {
      const { error: err } = await dbu.from("store_transactions").insert([{
        txn_type: "SIV",
        stock_item_id: item.stock_item_id,
        item_name: item.item_name,
        store_location: mu.from_location,
        quantity: item.qty_expected,
        mu_id: mu.id,
        issued_by: profile?.full_name,
        performed_by: profile?.full_name,
        remarks: `Transferred to ${mu.to_location} via ${mu.mu_number}`,
      }]);
      if (err) {
        alert(`Could not dispatch ${item.item_name}: ${err.message}`);
        setSaving(false);
        return;
      }
    }
    await dbu.from("movable_units").update({ status: "In Transit", dispatched_by: profile?.full_name, dispatched_at: new Date().toISOString() }).eq("id", mu.id);
    setSaving(false); refreshMU();
  }

  // The "type the number, system recognizes it" receiving mechanic
  function tryMatchReceive() {
    const val = receiveInput.trim();
    if (!val) return;
    const match = items.find(i => i.item_name === val && i.status !== "Confirmed");
    if (!match) { alert("No matching pending item found for that reference."); return; }
    dbu.from("movable_unit_items").update({
      qty_received: match.qty_expected, confirmed: true, confirmed_by: profile?.full_name, confirmed_at: new Date().toISOString(), status: "Confirmed",
    }).eq("id", match.id).then(() => { setReceiveInput(""); load(); });
  }

  async function receiveWholeMU() {
    setSaving(true);
    await dbu.from("movable_unit_items").update({
      confirmed: true, confirmed_by: profile?.full_name, confirmed_at: new Date().toISOString(), status: "Confirmed",
    }).eq("mu_id", mu.id).neq("status", "Confirmed");
    for (const item of items) {
      await dbu.from("movable_unit_items").update({ qty_received: item.qty_expected }).eq("id", item.id);
    }
    setSaving(false); load();
  }

  async function finalizeReceipt() {
    const allConfirmed = items.every(i => i.status === "Confirmed");
    setSaving(true);
    // Stock only lands at the destination for items ACTUALLY confirmed
    // received — never for ones still Pending/Missing. That gap between
    // what was dispatched and what arrived IS the deficit, already
    // visible by comparing qty_expected vs qty_received per line.
    for (const item of items.filter(i => i.status === "Confirmed")) {
      const { error: err } = await dbu.from("store_transactions").insert([{
        txn_type: "GRN",
        stock_item_id: item.stock_item_id,
        item_name: item.item_name,
        store_location: mu.to_location,
        quantity: item.qty_received || item.qty_expected,
        mu_id: mu.id,
        received_by: profile?.full_name,
        performed_by: profile?.full_name,
        remarks: `Transferred from ${mu.from_location} via ${mu.mu_number}`,
      }]);
      if (err) { alert(`Could not land ${item.item_name} at ${mu.to_location}: ${err.message}`); setSaving(false); return; }
    }
    await dbu.from("movable_units").update({
      status: allConfirmed ? "Received" : "Partially Received",
      received_verification_status: verifyStatus,
      received_by: profile?.full_name, received_at: new Date().toISOString(),
      deficit_found: !allConfirmed || showDeficit,
      deficit_note: deficitNote || (allConfirmed ? null : "Not all items were confirmed as received."),
    }).eq("id", mu.id);
    setSaving(false); refreshMU(); onClose();
  }

  const confirmedCount = items.filter(i => i.status === "Confirmed").length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Store MU</p>
            <h2 className="text-lg font-bold text-white">{mu.mu_number}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{mu.from_location} → {mu.to_location}</p>
            {mu.transport_fleet_number && (
              <p className="text-slate-400 text-xs mt-0.5">🚚 {mu.transport_fleet_number}{mu.driver_name && ` — Driver: ${mu.driver_name}`}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${MU_STATUS_STYLE[mu.status]}`}>{mu.status}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          </div>
        </div>

        <div className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
          {mu.status === "Draft" && canSeal && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-blue-600 uppercase">Masterbag & Seal — confirm contents physically</p>
              <input className={iCls} placeholder="Seal note (optional)" value={sealNote} onChange={e=>setSealNote(e.target.value)} />
              <button onClick={handleSeal} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">✓ Seal This Unit</button>
            </div>
          )}

          {mu.status === "Sealed" && canDriver && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Driver Verification — confirm each item was physically handed over</p>
              <p className="text-xs text-indigo-500 mb-3">{confirmedCount} of {items.length} confirmed</p>
              {confirmedCount === items.length && (
                <button onClick={submitDriverVerification} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
                  ✓ All Handed Over — Ready for Approval
                </button>
              )}
            </div>
          )}

          {mu.status === "Driver Verified" && canApprove && (
            <div className="flex gap-2">
              <button onClick={handleApprove} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold">✓ Approve — Entire Unit</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold">✗ Reject</button>
            </div>
          )}

          {mu.status === "Approved" && canDispatch && (
            <button onClick={handleDispatch} disabled={saving} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold">🚚 Dispatch</button>
          )}

          {mu.status === "In Transit" && canReceive && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-emerald-600 uppercase">Receiving</p>
              <div className="flex gap-2">
                {(["Verified","Unverified"] as const).map(v => (
                  <button key={v} onClick={()=>setVerifyStatus(v)}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold ${verifyStatus===v ? "border-emerald-400 bg-emerald-100 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                    {v === "Verified" ? "✓ Physically Verified" : "⚠ Not Verified — receiving anyway"}
                  </button>
                ))}
              </div>
              {verifyStatus === "Unverified" && (
                <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  If a deficit is found later on an unverified receipt, you will be recorded as liable.
                </p>
              )}
              <div className="flex gap-2">
                <input className={iCls} placeholder="Type or paste the item name..." value={receiveInput}
                  onChange={e=>setReceiveInput(e.target.value)} onKeyDown={e=>e.key==="Enter" && tryMatchReceive()} />
                <button onClick={tryMatchReceive} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold whitespace-nowrap">Confirm Item</button>
              </div>
              <button onClick={receiveWholeMU} disabled={saving} className="text-xs text-emerald-700 font-semibold hover:underline">Or receive the whole MU at once →</button>

              <label className="flex items-center gap-2 pt-2 border-t border-emerald-100">
                <input type="checkbox" checked={showDeficit} onChange={e=>setShowDeficit(e.target.checked)} className="accent-red-500" />
                <span className="text-xs text-slate-600">There&apos;s a shortage / deficit</span>
              </label>
              {showDeficit && (
                <textarea className={iCls + " h-16 resize-none"} placeholder="Describe the deficit..." value={deficitNote} onChange={e=>setDeficitNote(e.target.value)} />
              )}

              <button onClick={finalizeReceipt} disabled={saving} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold">
                Finalize Receipt ({confirmedCount}/{items.length} confirmed)
              </button>
            </div>
          )}

          {mu.liable_user && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
              ⚠️ Deficit liability recorded against: <strong>{mu.liable_user}</strong> (received without physical verification)
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Contents ({items.length})</p>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {loading ? <p className="p-4 text-xs text-slate-400">Loading...</p>
              : items.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-slate-700">{item.item_name}</span>
                    {item.qty_expected > 1 && <span className="text-slate-400 text-xs ml-2">×{item.qty_expected}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" :
                      item.status === "Missing" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                    }`}>{item.status}</span>
                    {mu.status === "Sealed" && canDriver && item.status !== "Confirmed" && (
                      <button onClick={()=>confirmDriverItem(item)} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-medium">Confirm</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
export default function MovableUnitsPage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];

  const [mus, setMus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const data = await fetchAllRows("movable_units", "*", q => q.order("created_at", { ascending: false }));
    setMus(data);
    setLoading(false);
  }

  const filtered = mus.filter((m:any) => !filterStatus || m.status === filterStatus);
  const counts = {
    total: mus.length,
    inProgress: mus.filter((m:any) => !["Received","Rejected","Cancelled"].includes(m.status)).length,
    inTransit: mus.filter((m:any) => m.status === "In Transit").length,
    received: mus.filter((m:any) => m.status === "Received").length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Store — Bulk Dispatch</p>
          <h1 className="text-3xl font-bold text-slate-900">Movable Units</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Seal, verify, approve once, dispatch, receive — bulk store movement, one sealed unit at a time.
          </p>
        </div>
        <button onClick={()=>setCreateModal(true)} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
          + Create MU
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.total}</p><p className="text-sm opacity-70 mt-1">Total MUs</p></div>
        <div className="bg-blue-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.inProgress}</p><p className="text-sm opacity-70 mt-1">In Progress</p></div>
        <div className="bg-amber-500 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.inTransit}</p><p className="text-sm opacity-70 mt-1">In Transit</p></div>
        <div className="bg-emerald-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.received}</p><p className="text-sm opacity-70 mt-1">Received</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <select className={iCls + " max-w-xs"} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(MU_STATUS_STYLE).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["MU No.","From","To","Created","Status",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No Movable Units yet.</td></tr>
              : filtered.map((m:any) => (
                <tr key={m.id} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{m.mu_number}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-32 truncate">{m.from_location}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-32 truncate">{m.to_location}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDT(m.created_at)}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${MU_STATUS_STYLE[m.status]}`}>{m.status}</span></td>
                  <td className="px-4 py-3"><button onClick={()=>setSelected(m)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateMUModal open={createModal} onClose={()=>setCreateModal(false)} onSaved={load} profile={profile} />
      {selected && <MUDetailModal mu={selected} onClose={()=>{setSelected(null); load();}} onSaved={load} profile={profile} roles={roles} />}
    </div>
  );
}