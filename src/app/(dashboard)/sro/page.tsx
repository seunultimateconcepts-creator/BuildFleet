/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

const iCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const SRO_STATUS_STYLE: Record<string, string> = {
  "Pending Plant Manager Approval": "bg-orange-100 text-orange-700",
  "At Store":                       "bg-blue-100 text-blue-700",
  "In Progress":                    "bg-amber-100 text-amber-700",
  "Completed":                      "bg-emerald-100 text-emerald-700",
  "Rejected":                       "bg-red-100 text-red-600",
  "Cancelled":                      "bg-slate-100 text-slate-500",
  "Pending Procurement Approval":   "bg-purple-100 text-purple-700",
  "Approved":                       "bg-blue-100 text-blue-700",
  "Paid":                           "bg-emerald-100 text-emerald-700",
};

const ITEM_STATUS_STYLE: Record<string, string> = {
  "Pending":                 "bg-slate-100 text-slate-600",
  "Available":               "bg-blue-100 text-blue-700",
  "Pending Store Manager":   "bg-amber-100 text-amber-700",
  "Issued":                  "bg-emerald-100 text-emerald-700",
  "To Procurement":          "bg-purple-100 text-purple-700",
  "Bill Submitted":          "bg-purple-100 text-purple-700",
  "Received":                "bg-blue-100 text-blue-700",
  "Completed":               "bg-emerald-100 text-emerald-700",
  "Rejected":                "bg-red-100 text-red-600",
};

const DEPARTMENTS = ["Plant","Admin","Store","Procurement","Finance","Bluegate","Construction","Logistics","Other"];
const UNITS = ["pcs","unit","set","litre","kg","bag","roll","box","carton","pack","drum",
  "meter","gallon","ton","sheet","coil","pair","bundle","Other"];
const fmtDT = (d: string) => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

function blankLine() { return { item_description: "", part_number: "", unit: "pcs", qty_requested: 1, remarks: "", stock_item_id: null as string | null, live_balance: 0 }; }

// ─────────────────────────────────────────────────────────────
// FLEET PICKER — searchable, scoped by the selected site.
// Central Workshop (or no site chosen yet) sees every equipment;
// a site-based store only sees equipment actually at that site —
// this is what keeps fleet_number trustworthy as real history
// instead of a free-text field someone could mistype.
// ─────────────────────────────────────────────────────────────
function FleetPicker({ equipment, site, sites, value, onChange }: {
  equipment: any[]; site: string; sites: any[]; value: string; onChange: (fleetNo: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const siteRecord = sites.find(s => s.name === site);
  const isCentral = !site || siteRecord?.site_type === "Central Workshop";
  const scoped = isCentral ? equipment : equipment.filter(e => e.site === site);

  const filtered = scoped.filter(e => {
    if (!query) return true;
    const q = query.toLowerCase();
    return e.fleet_number.toLowerCase().includes(q) || (e.name||"").toLowerCase().includes(q);
  }).slice(0, 15);

  const selected = equipment.find(e => e.fleet_number === value);

  return (
    <div className="relative">
      {selected ? (
        <div className="border border-amber-300 bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-sm"><span className="font-bold text-amber-700 font-mono">{selected.fleet_number}</span> — {selected.name}</span>
          <button onClick={() => onChange("")} className="text-slate-400 hover:text-red-500 text-lg leading-none">×</button>
        </div>
      ) : (
        <>
          <input className={iCls} placeholder={isCentral ? "Search any equipment..." : `Search equipment at ${site}...`}
            value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-400 text-xs">
                  {scoped.length === 0 ? `No equipment found at ${site}.` : "No match — keep typing."}
                </div>
              ) : filtered.map(e => (
                <button key={e.id} onClick={() => { onChange(e.fleet_number); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                  <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {!isCentral && site && (
        <p className="text-[11px] text-slate-400 mt-1">Scoped to equipment at {site}. Central Workshop requests can pick from any site.</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ITEM PICKER — search real stock, get live availability as you
// pick. This IS the "request comes in, store verifies immediately"
// requirement: the requester sees stock balance right here, before
// the formal store confirmation step even happens. If nothing
// matches, free-text entry still works — that's simply an item not
// yet in the catalog, which the formal availability check (and
// possibly procurement) will handle downstream, same as before.
// ─────────────────────────────────────────────────────────────
function ItemPicker({ stockItems, line, onSelect, onFreeText }: {
  stockItems: any[]; line: any;
  onSelect: (item: any) => void; onFreeText: (text: string) => void;
}) {
  const [query, setQuery] = useState(line.item_description || "");
  const [open, setOpen] = useState(false);

  const filtered = stockItems.filter(s => {
    if (!query) return false;
    const q = query.toLowerCase();
    return (s.name||"").toLowerCase().includes(q) || (s.part_number||"").toLowerCase().includes(q) || (s.legacy_item_code||"").toLowerCase().includes(q);
  }).slice(0, 10);

  return (
    <div className="relative">
      <input className={iCls} placeholder="Search item name or part no., or type a new item..."
        value={query}
        onChange={e => { setQuery(e.target.value); onFreeText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {line.stock_item_id && (
        <div className="mt-1 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            line.live_balance > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
          }`}>
            {line.live_balance > 0 ? `✓ In system: ${line.live_balance} total across all stores` : "⚠ Not currently in any store"}
          </span>
          {line.part_number && <span className="text-[10px] text-slate-400 font-mono">Part No. {line.part_number}</span>}
        </div>
      )}
      {!line.stock_item_id && query && (
        <p className="mt-1 text-[10px] text-slate-400">Not in the store catalog yet — will be flagged for the store to review.</p>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
          {filtered.map(s => (
            <button key={s.id} type="button"
              onMouseDown={() => { onSelect(s); setQuery(s.name); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 text-sm">{s.name}</span>
                <span className={`text-[10px] font-bold ${s.balance > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {s.balance > 0 ? `${s.balance} in stock` : "Out of stock"}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-mono">{s.part_number || s.legacy_item_code || "no part no."}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RAISE SRO MODAL
// ─────────────────────────────────────────────────────────────
function RaiseSROModal({ onClose, onSaved, profile }: { onClose: () => void; onSaved: () => void; profile: any }) {
  const [sroType, setSroType] = useState<"Standard"|"Retroactive">("Standard");
  const [department, setDepartment] = useState("Plant");
  const [sectionCode, setSectionCode] = useState("");
  const [requestedBy, setRequestedBy] = useState(profile?.full_name || "");
  const [dateRaised, setDateRaised] = useState(new Date().toISOString().slice(0,10));
  const [site, setSite] = useState("");
  const [sites, setSites] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [fleetNumber, setFleetNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lines, setLines] = useState<any[]>([blankLine()]);
  // Retroactive-only fields
  const [amountPaid, setAmountPaid] = useState("");
  const [vendor, setVendor] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Site dropdown is scoped to Project and Workshop types ONLY —
    // that's where actual work (and therefore material consumption)
    // happens. Repair Yards and Storage Yards just hold idle/waiting
    // equipment; nothing is being built or fixed there, so an SRO
    // from one wouldn't make operational sense.
    fetchAllRows("sites", "name,code,site_type").then(all =>
      setSites(all.filter((s:any) => s.site_type === "Project" || ["Central Workshop","Regional Workshop","Field Workshop"].includes(s.site_type)))
    );
    fetchAllRows("equipment", "id,fleet_number,name,site").then(setEquipment);
    // ★ MULTI-STORE FIX: stock_items.balance is now a frozen legacy
    // snapshot — live balances live in store_stock_balances, per
    // store. At raise time we don't yet know WHICH store will
    // fulfill this request, so this shows a SUM across every store —
    // "does this exist anywhere in our system" — not a promise of
    // availability. The real, store-specific check happens later
    // when a Data Analyst confirms it (see SRODetailModal below).
    Promise.all([
      fetchAllRows("stock_items", "id,name,part_number,legacy_item_code,unit,category"),
      fetchAllRows("store_stock_balances", "stock_item_id,balance"),
    ]).then(([items, allBalances]) => {
      const totals = new Map<string, number>();
      (allBalances as any[]).forEach(b => totals.set(b.stock_item_id, (totals.get(b.stock_item_id)||0) + Number(b.balance||0)));
      setStockItems((items as any[]).map(i => ({ ...i, balance: totals.get(i.id) || 0 })));
    });
  }, []);

  function setLine(i: number, k: string, v: any) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }

  async function handleSubmit() {
    if (!purpose.trim()) { setError("Purpose is required."); return; }
    if (!requestedBy.trim()) { setError("Requested By is required."); return; }
    if (sroType === "Standard" && lines.every(l => !l.item_description.trim())) {
      setError("Add at least one item."); return;
    }
    if (sroType === "Retroactive" && (!amountPaid || !vendor.trim())) {
      setError("Amount paid and vendor are required for a retroactive SRO."); return;
    }
    setSaving(true); setError("");

    const { data: sro, error: err } = await dbu.from("sro").insert([{
      sro_type: sroType,
      raised_by: requestedBy,
      raised_by_id: profile?.id || null,
      department, site: site || null, fleet_number: fleetNumber || null,
      section_code: sectionCode || null,
      date_raised: dateRaised,
      purpose,
      status: sroType === "Standard" ? "Pending Plant Manager Approval" : "Pending Procurement Approval",
      amount_paid: sroType === "Retroactive" ? Number(amountPaid) : null,
      vendor: sroType === "Retroactive" ? vendor : null,
      receipt_ref: sroType === "Retroactive" ? receiptRef : null,
    }]).select().single();

    if (err) { setError(err.message); setSaving(false); return; }

    if (sroType === "Standard") {
      const validLines = lines.filter(l => l.item_description.trim());
      await dbu.from("sro_items").insert(validLines.map(l => ({
        sro_id: sro.id,
        item_description: l.item_description,
        part_number: l.part_number || null,
        stock_item_id: l.stock_item_id || null,
        unit: l.unit,
        qty_requested: Number(l.qty_requested) || 1,
        remarks: l.remarks || null,
      })));
    }

    await dbu.from("sro_history").insert([{
      sro_id: sro.id, action: "Raised", performed_by: profile?.full_name || "", role: "Requester",
      note: requestedBy !== profile?.full_name ? `Raised on behalf of ${requestedBy}` : undefined,
    }]);

    setSaving(false); onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Store Requisition Order</p>
            <h2 className="text-lg font-bold text-white">Raise New SRO</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-7 space-y-5">
          <div className="flex gap-2">
            {(["Standard","Retroactive"] as const).map(t => (
              <button key={t} onClick={() => setSroType(t)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  sroType === t ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"
                }`}>
                {t === "Standard" ? "📋 Standard — request items" : "🧾 Retroactive — already bought"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Requested By *</label>
              <input className={iCls} value={requestedBy} onChange={e=>setRequestedBy(e.target.value)}
                placeholder="Name of the person requesting" />
              <p className="text-[11px] text-slate-400 mt-1">Pre-filled with your name — edit if raising on someone else&apos;s behalf.</p></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date Raised</label>
              <input type="date" className={iCls} value={dateRaised} onChange={e=>setDateRaised(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Department</label>
              <select className={iCls} value={department} onChange={e=>setDepartment(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Unit / Section</label>
              <input className={iCls} value={sectionCode} onChange={e=>setSectionCode(e.target.value)}
                placeholder="e.g. Plant Admin Office, Workshop" /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Site (Projects &amp; Workshops only)</label>
              <select className={iCls} value={site} onChange={e=>{ setSite(e.target.value); setFleetNumber(""); }}>
                <option value="">Select site...</option>
                {sites.map(s => <option key={s.code || s.name} value={s.name}>{s.code ? `${s.code} — ` : ""}{s.name}</option>)}
              </select></div>
            <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fleet No. (optional — for a specific machine)</label>
              <FleetPicker equipment={equipment} site={site} sites={sites} value={fleetNumber} onChange={setFleetNumber} /></div>
            <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Purpose *</label>
              <input className={iCls} value={purpose} onChange={e=>setPurpose(e.target.value)} /></div>
          </div>

          {sroType === "Standard" ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase block">Items Requested</label>
              {lines.map((l, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <ItemPicker
                    stockItems={stockItems}
                    line={l}
                    onSelect={(item) => setLines(prev => prev.map((ln, idx) => idx === i ? {
                      ...ln, item_description: item.name, part_number: item.part_number || "",
                      unit: item.unit || "pcs", stock_item_id: item.id, live_balance: item.balance,
                    } : ln))}
                    onFreeText={(text) => setLines(prev => prev.map((ln, idx) => idx === i ? {
                      ...ln, item_description: text, stock_item_id: null, live_balance: 0,
                    } : ln))}
                  />
                  <div className="grid grid-cols-12 gap-2">
                    <input type="number" className={iCls + " col-span-3"} placeholder="Qty" value={l.qty_requested}
                      onChange={e=>setLine(i,"qty_requested",e.target.value)} />
                    <select className={iCls + " col-span-3"}
                      value={UNITS.includes(l.unit) ? l.unit : "Other"}
                      onChange={e=>setLine(i,"unit", e.target.value === "Other" ? "" : e.target.value)}>
                      {UNITS.map(u => <option key={u} value={u}>{u === "Other" ? "Other..." : u}</option>)}
                    </select>
                    <input className={iCls + " col-span-4"} placeholder="Remarks (optional)" value={l.remarks}
                      onChange={e=>setLine(i,"remarks",e.target.value)} />
                    <button onClick={()=>setLines(prev => prev.filter((_,idx)=>idx!==i))}
                      className="col-span-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                  {!UNITS.includes(l.unit) && (
                    <input className={iCls} placeholder="Type the unit (e.g. sachet, coil, tin)" value={l.unit}
                      onChange={e=>setLine(i,"unit",e.target.value)} />
                  )}
                </div>
              ))}
              <button onClick={()=>setLines([...lines, blankLine()])}
                className="text-sm text-amber-600 font-semibold hover:text-amber-700">+ Add item</button>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-purple-600 uppercase">Already purchased — for approval &amp; account payment</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-purple-500 block mb-1">Vendor *</label>
                  <input className={iCls} value={vendor} onChange={e=>setVendor(e.target.value)} /></div>
                <div><label className="text-xs text-purple-500 block mb-1">Amount Paid (₦) *</label>
                  <input type="number" className={iCls} value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} /></div>
                <div className="col-span-2"><label className="text-xs text-purple-500 block mb-1">Receipt Reference</label>
                  <input className={iCls} value={receiptRef} onChange={e=>setReceiptRef(e.target.value)} /></div>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Submitting..." : "Submit SRO →"}
          </button>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
// SRO DETAIL / WORKFLOW MODAL — the whole state machine lives here
// ─────────────────────────────────────────────────────────────
function SRODetailModal({ sro, onClose, onSaved, profile, roles }: {
  sro: any; onClose: () => void; onSaved: () => void; profile: any; roles: string[];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [actingStore, setActingStore] = useState("");
  const [storeBalances, setStoreBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkMap, setLinkMap] = useState<Record<string, string>>({}); // sro_item_id -> stock_item_id chosen
  const [availQty, setAvailQty] = useState<Record<string, string>>({}); // sro_item_id -> qty to issue now

  const canApprovePlant = roles.some(r => ["plant_manager","plant_engineer","super_admin"].includes(r));
  const canCheckAvail    = roles.some(r => ["store_officer","store_manager","store_supervisor","super_admin"].includes(r));
  const canApproveIssue  = roles.some(r => ["store_manager","super_admin"].includes(r));
  const canApproveProc   = roles.some(r => ["procurement_manager","super_admin"].includes(r));

  // A Data Analyst (store_officer, no cross-store role) is already
  // scoped to exactly one store — no need to ask which one they're
  // checking from, the system already knows. Store Manager/Supervisor/
  // super_admin see every store, so they must declare which one
  // they're acting from before they can confirm anything.
  const isScopedOfficer = roles.includes("store_officer") && !roles.some(r => ["store_manager","store_supervisor","super_admin"].includes(r));

  useEffect(() => {
    fetchAllRows("sites", "name,code").then((all:any) => {
      const storeNames = all.filter((s:any) => /store/i.test(s.name)).map((s:any) => s.name).sort();
      setStores(storeNames);
      if (isScopedOfficer) {
        const mine = (profile?.assigned_sites || []).find((s:string) => storeNames.includes(s));
        if (mine) setActingStore(mine);
      }
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!actingStore) { setStoreBalances([]); return; }
    fetchAllRows("store_stock_balances", "*", (q:any) => q.eq("store_location", actingStore)).then(async (balances:any) => {
      const items = await fetchAllRows("stock_items", "id,name");
      setStoreBalances(balances.map((b:any) => ({ ...b, name: (items as any[]).find(i=>i.id===b.stock_item_id)?.name })));
    });
  }, [actingStore]);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [it, hi] = await Promise.all([
      dbu.from("sro_items").select("*").eq("sro_id", sro.id).order("created_at"),
      dbu.from("sro_history").select("*").eq("sro_id", sro.id).order("created_at", { ascending: false }),
    ]);
    setItems(it.data || []);
    setHistory(hi.data || []);
    setLoading(false);
  }

  async function logHistory(action: string, note?: string, itemId?: string) {
    await dbu.from("sro_history").insert([{
      sro_id: sro.id, sro_item_id: itemId || null, action,
      performed_by: profile?.full_name || "", note: note || null,
    }]);
  }

  // Plant Manager approves the whole SRO → moves to store
  async function approvePlant() {
    setSaving(true);
    await dbu.from("sro").update({ status: "At Store", approved_by: profile?.full_name, approved_at: new Date().toISOString() }).eq("id", sro.id);
    await logHistory("Plant Manager Approved");
    setSaving(false); onSaved();
  }
  async function rejectPlant() {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setSaving(true);
    await dbu.from("sro").update({ status: "Rejected", rejection_reason: reason }).eq("id", sro.id);
    await logHistory("Rejected", reason);
    setSaving(false); onSaved();
  }

  // Store confirms availability per line — this IS the "issue what you
  // have, route the rest" mechanic. Now checks the REAL balance at the
  // acting store, and remembers that store on the line so issue-time
  // can never drift onto a different one.
  async function confirmAvailability(item: any) {
    if (!actingStore) { alert("Select which store you're checking from first."); return; }
    const stockId = linkMap[item.id];
    const qty = Number(availQty[item.id] ?? item.qty_requested);
    if (!stockId) { alert("Link this line to a stock item first."); return; }
    const stock = storeBalances.find(s => s.stock_item_id === stockId);
    const available = Math.min(qty, stock?.balance ?? 0);
    const shortfall = Number(item.qty_requested) - available;

    setSaving(true);
    await dbu.from("sro_items").update({
      stock_item_id: stockId,
      store_location: actingStore,
      qty_approved: available,
      qty_to_procure: shortfall > 0 ? shortfall : 0,
      status: available > 0 ? "Pending Store Manager" : "To Procurement",
      availability_checked_by: profile?.full_name,
    }).eq("id", item.id);

    // ★ CLOSES THE LOOP: a shortfall used to just tell someone to go
    // manually create a comparison on the Procurement page. Now it's
    // auto-created as a Draft, pre-filled with the item, quantity, and
    // SRO number — Procurement opens it and just fills in the quotes.
    if (shortfall > 0) {
      const { data: comp } = await dbu.from("purchase_comparisons").insert([{
        sro_number: sro.sro_number,
        site: sro.site,
        fleet_number: sro.fleet_number,
        line_items: [{
          part_no: item.part_number || "",
          description: item.item_description,
          qty: shortfall,
          fleet_number: sro.fleet_number || "",
          site: sro.site || "",
          avg_price: "", last_purchase_price: "",
          quotes: [
            { supplier:"", brand:"", country:"", offered_price:"", negotiated_price:"" },
            { supplier:"", brand:"", country:"", offered_price:"", negotiated_price:"" },
            { supplier:"", brand:"", country:"", offered_price:"", negotiated_price:"" },
          ],
          selected_supplier: "",
        }],
        status: "Draft",
        prepared_by: profile?.full_name || "",
        remarks: `Auto-created from ${sro.sro_number} shortfall — ${item.item_description} (${shortfall} short at ${actingStore})`,
      }]).select().single();
      if (comp) {
        await logHistory("Routed to Procurement", `${shortfall} short — draft comparison auto-created for Procurement to review`, item.id);
      }
    }
    if (available > 0) {
      await logHistory("Availability Confirmed", `${available} of ${item.qty_requested} available at ${actingStore}`, item.id);
    }
    setSaving(false); load();
  }

  // Store Manager approves the issue → generates the SIV, decrements
  // stock AT THE RIGHT STORE (the same one that confirmed availability —
  // never re-derived, never left blank).
  async function approveIssue(item: any) {
    if (!item.store_location) { alert("This line has no store recorded from the availability check — re-confirm it first."); return; }
    setSaving(true);
    const siv = `SIV-${sro.sro_number}-${item.id.slice(0,4)}`;
    const { error: err } = await dbu.from("store_transactions").insert([{
      txn_type: "SIV",
      stock_item_id: item.stock_item_id,
      item_name: item.item_description,
      store_location: item.store_location,
      quantity: item.qty_approved,
      sro_id: sro.id, sro_item_id: item.id,
      siv_number: siv,
      job_order_no: sro.job_order_no,
      fleet_number: sro.fleet_number,
      issued_by: profile?.full_name,
      issued_to: sro.raised_by,
      performed_by: profile?.full_name,
    }]);
    if (err) { alert(err.message); setSaving(false); return; }
    await dbu.from("sro_items").update({
      status: "Issued", issued_by: profile?.full_name, issued_at: new Date().toISOString(), siv_number: siv,
    }).eq("id", item.id);
    await logHistory("Issued", `SIV ${siv} from ${item.store_location}`, item.id);
    setSaving(false); load();
  }

  const allTerminal = items.length > 0 && items.every(i => ["Issued","Rejected","Completed"].includes(i.status) || i.status === "To Procurement");
  useEffect(() => {
    if (!loading && items.length > 0 && items.every(i => ["Issued","Rejected"].includes(i.status))) {
      dbu.from("sro").update({ status: "Completed" }).eq("id", sro.id).then(() => {});
    }
  }, [items]); // eslint-disable-line

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">{sro.sro_type} SRO</p>
            <h2 className="text-lg font-bold text-white">{sro.sro_number}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{sro.purpose}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${SRO_STATUS_STYLE[sro.status]}`}>{sro.status}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          </div>
        </div>

        <div className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-4 gap-3 text-xs bg-slate-50 rounded-xl p-4">
            <div><p className="text-slate-400">Raised By</p><p className="font-semibold text-slate-800">{sro.raised_by}</p></div>
            <div><p className="text-slate-400">Department</p><p className="font-semibold text-slate-800">{sro.department}</p></div>
            <div><p className="text-slate-400">Site</p><p className="font-semibold text-slate-800">{sro.site || "—"}</p></div>
            <div><p className="text-slate-400">Fleet No.</p><p className="font-semibold text-slate-800">{sro.fleet_number || "—"}</p></div>
          </div>

          {sro.sro_type === "Retroactive" ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><p className="text-purple-500">Vendor</p><p className="font-semibold">{sro.vendor}</p></div>
                <div><p className="text-purple-500">Amount</p><p className="font-semibold">₦{Number(sro.amount_paid).toLocaleString()}</p></div>
                <div><p className="text-purple-500">Receipt</p><p className="font-semibold">{sro.receipt_ref || "—"}</p></div>
              </div>
              {canApproveProc && sro.status === "Pending Procurement Approval" && (
                <div className="flex gap-2">
                  <button onClick={async()=>{await dbu.from("sro").update({status:"Approved",approved_by:profile?.full_name,approved_at:new Date().toISOString()}).eq("id",sro.id); await logHistory("Approved"); onSaved();}}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">✓ Approve for Payment</button>
                  <button onClick={rejectPlant} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold">✗ Reject</button>
                </div>
              )}
            </div>
          ) : (
            <>
              {sro.status === "Pending Plant Manager Approval" && canApprovePlant && (
                <div className="flex gap-2">
                  <button onClick={approvePlant} disabled={saving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">✓ Approve — Send to Store</button>
                  <button onClick={rejectPlant} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold">✗ Reject</button>
                </div>
              )}

              {sro.status === "At Store" && canCheckAvail && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Checking From — Store</label>
                  {isScopedOfficer ? (
                    <div className="border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm text-slate-600">
                      {actingStore || "No store assigned to you yet — ask an admin to assign one."}
                    </div>
                  ) : (
                    <select className={iCls} value={actingStore} onChange={e=>setActingStore(e.target.value)}>
                      <option value="">Select the store you're checking from...</option>
                      {stores.map(s => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-800 text-sm">{item.item_description}</p>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ITEM_STATUS_STYLE[item.status]}`}>{item.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Requested: {item.qty_requested} {item.unit}{item.qty_approved != null && ` · Approved: ${item.qty_approved}`}{item.qty_to_procure > 0 && ` · Shortfall to procure: ${item.qty_to_procure}`}</p>

                    {/* Store availability check */}
                    {sro.status === "At Store" && item.status === "Pending" && canCheckAvail && (
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        {!actingStore ? (
                          <p className="text-xs text-blue-700">Select which store you're checking from, above, before confirming any lines.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <select className={iCls} value={linkMap[item.id] || ""} onChange={e=>setLinkMap(p=>({...p,[item.id]:e.target.value}))}>
                              <option value="">Link to stock item at {actingStore}...</option>
                              {storeBalances.map(s => <option key={s.stock_item_id} value={s.stock_item_id}>{s.name} (bal: {s.balance})</option>)}
                            </select>
                            <input type="number" className={iCls} placeholder="Qty available"
                              value={availQty[item.id] ?? item.qty_requested}
                              onChange={e=>setAvailQty(p=>({...p,[item.id]:e.target.value}))} />
                            <button onClick={()=>confirmAvailability(item)} disabled={saving}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Confirm</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Store Manager issue approval */}
                    {item.status === "Pending Store Manager" && canApproveIssue && (
                      <button onClick={()=>approveIssue(item)} disabled={saving}
                        className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold">
                        ✓ Approve Issue — Generate SIV
                      </button>
                    )}

                    {item.status === "Issued" && (
                      <p className="text-xs text-emerald-700 font-semibold">✓ Issued · SIV {item.siv_number} · by {item.issued_by}</p>
                    )}
                    {item.status === "To Procurement" && (
                      <p className="text-xs text-purple-700">
                        ✓ Not available at {actingStore || "the store"} — a draft Purchase Comparison for {sro.sro_number} was created automatically. Procurement just needs to fill in supplier quotes.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* History */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">History</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {loading ? <p className="text-xs text-slate-400">Loading...</p>
              : history.length === 0 ? <p className="text-xs text-slate-400">No history yet.</p>
              : history.map((h:any) => (
                <div key={h.id} className="text-xs flex justify-between border-b border-slate-50 pb-1.5">
                  <span><strong>{h.action}</strong> by {h.performed_by} {h.note && `— ${h.note}`}</span>
                  <span className="text-slate-400 whitespace-nowrap ml-2">{fmtDT(h.created_at)}</span>
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
export default function SROPage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];

  const [sros, setSros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard"|"all">("dashboard");
  const [raiseModal, setRaiseModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const data = await fetchAllRows("sro", "*", q => q.order("created_at", { ascending: false }));
    setSros(data);
    setLoading(false);
  }

  const filtered = sros.filter((s:any) => {
    const q = search.toLowerCase();
    return !q || (s.sro_number||"").toLowerCase().includes(q) || (s.purpose||"").toLowerCase().includes(q) || (s.raised_by||"").toLowerCase().includes(q);
  });

  const myApprovals = sros.filter((s:any) => {
    if (s.status === "Pending Plant Manager Approval" && roles.some(r=>["plant_manager","plant_engineer","super_admin"].includes(r))) return true;
    if (s.status === "Pending Procurement Approval" && roles.some(r=>["procurement_manager","super_admin"].includes(r))) return true;
    return false;
  });

  const counts = {
    total: sros.length,
    pendingPlant: sros.filter((s:any)=>s.status==="Pending Plant Manager Approval").length,
    atStore: sros.filter((s:any)=>s.status==="At Store"||s.status==="In Progress").length,
    completed: sros.filter((s:any)=>s.status==="Completed").length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Store Requisition</p>
          <h1 className="text-3xl font-bold text-slate-900">SRO</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Raise a requisition — plant approves, store checks availability and issues, shortfalls route to procurement automatically.
          </p>
        </div>
        <button onClick={() => setRaiseModal(true)}
          className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
          + Raise SRO
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.total}</p><p className="text-sm opacity-70 mt-1">Total SROs</p></div>
        <div className="bg-orange-500 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.pendingPlant}</p><p className="text-sm opacity-70 mt-1">Pending Plant Approval</p></div>
        <div className="bg-blue-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.atStore}</p><p className="text-sm opacity-70 mt-1">At Store / In Progress</p></div>
        <div className="bg-emerald-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":counts.completed}</p><p className="text-sm opacity-70 mt-1">Completed</p></div>
      </div>

      {myApprovals.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="font-bold text-orange-800 text-sm mb-2">🔔 {myApprovals.length} awaiting your approval</p>
          <div className="flex flex-wrap gap-2">
            {myApprovals.map((s:any) => (
              <button key={s.id} onClick={()=>setSelected(s)}
                className="px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-semibold text-orange-700 hover:bg-orange-100">
                {s.sro_number} — {s.purpose?.slice(0,30)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <input placeholder="Search SRO number, purpose, requester..." value={search} onChange={e=>setSearch(e.target.value)} className={iCls} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["SRO No.","Type","Raised By","Department","Purpose","Date","Status",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No SROs yet.</td></tr>
              : filtered.map((s:any) => (
                <tr key={s.id} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{s.sro_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.sro_type}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{s.raised_by}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.department}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-56 truncate">{s.purpose}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDT(s.created_at)}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SRO_STATUS_STYLE[s.status]}`}>{s.status}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={()=>setSelected(s)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {raiseModal && <RaiseSROModal onClose={()=>setRaiseModal(false)} onSaved={load} profile={profile} />}
      {selected && <SRODetailModal sro={selected} onClose={()=>setSelected(null)} onSaved={()=>{load(); setSelected(null);}} profile={profile} roles={roles} />}
    </div>
  );
}