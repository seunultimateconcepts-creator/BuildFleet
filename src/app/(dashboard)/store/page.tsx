/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";
import { StoreLedgerImportModal } from "@/components/dashboard/store-ledger-import-modal";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const CATEGORIES = ["Construction Materials","Sundry Material","Spare Parts",
  "Fuel & Lubricants","Welding Materials","Retrieved Items"];
const UNITS = ["pcs","unit","set","litre","kg","bag","roll","box","carton","pack","drum",
  "meter","gallon","ton","sheet","coil","pair","bundle","Other"];

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
// RECEIVE STOCK — the digital GRN. Now store-aware: every receipt
// belongs to ONE specific store. A brand-new item still registers
// once in the shared catalog (stock_items), but the actual quantity
// always lands as a store_transactions row tagged to a store, which
// is what the balance triggers key off — never the item master.
// ─────────────────────────────────────────────────────────────
function ReceiveStockModal({ open, onClose, onSaved, itemsMaster, stores, defaultStore, lockStore, profile }: {
  open: boolean; onClose: () => void; onSaved: () => void; itemsMaster: any[];
  stores: string[]; defaultStore: string; lockStore: boolean; profile: any;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Spare Parts");
  const [newUnit, setNewUnit] = useState("pcs");
  const [storeLocation, setStoreLocation] = useState(defaultStore);
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [waybillNo, setWaybillNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lpoNo, setLpoNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setStoreLocation(defaultStore); }, [defaultStore, open]);

  const filtered = itemsMaster.filter(i => {
    if (!query) return false;
    const q = query.toLowerCase();
    return (i.name||"").toLowerCase().includes(q) || (i.part_number||"").toLowerCase().includes(q) || (i.legacy_item_code||"").toLowerCase().includes(q);
  }).slice(0, 10);

  function reset() {
    setQuery(""); setSelected(null); setIsNew(false); setNewName(""); setNewCategory("Spare Parts");
    setNewUnit("pcs"); setQty(""); setUnitCost(""); setSupplier(""); setWaybillNo(""); setInvoiceNo("");
    setLpoNo(""); setRemarks(""); setError("");
  }
  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    if (!storeLocation) { setError("Select which store this stock is going into."); return; }
    if (!qty || Number(qty) <= 0) { setError("Enter a valid quantity received."); return; }
    if (!isNew && !selected) { setError("Select an existing item, or register a new one."); return; }
    if (isNew && !newName.trim()) { setError("Enter the new item's name."); return; }
    if (isNew && !newCategory.trim()) { setError("Enter or select a category."); return; }
    setSaving(true); setError("");

    let stockItemId = selected?.id;
    let itemName = selected?.name;

    if (isNew) {
      const { data, error: err } = await dbu.from("stock_items").insert([{
        name: newName, category: newCategory, unit: newUnit,
        unit_cost: Number(unitCost) || 0, qty_received: 0, qty_issued: 0, reorder_level: 10,
      }]).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      stockItemId = data.id; itemName = data.name;
    }

    const { error: txnErr } = await dbu.from("store_transactions").insert([{
      txn_type: "GRN",
      stock_item_id: stockItemId,
      item_name: itemName,
      store_location: storeLocation,
      quantity: Number(qty),
      unit_cost: Number(unitCost) || null,
      supplier: supplier || null,
      waybill_no: waybillNo || null,
      invoice_no: invoiceNo || null,
      lpo_no: lpoNo || null,
      received_by: profile?.full_name,
      performed_by: profile?.full_name,
      remarks: remarks || null,
    }]);
    if (txnErr) { setError(txnErr.message); setSaving(false); return; }

    setSaving(false); reset(); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-emerald-700 flex items-center justify-between">
          <div>
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest">Goods Received Note</p>
            <h2 className="text-lg font-bold text-white">Receive Stock</h2>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-7 space-y-4">
          <F label="Receiving Store" required>
            {lockStore ? (
              <div className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-600">
                {storeLocation} <span className="text-slate-400 text-xs">(your assigned store)</span>
              </div>
            ) : (
              <select className={iCls} value={storeLocation} onChange={e=>setStoreLocation(e.target.value)}>
                <option value="">Select store...</option>
                {stores.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </F>

          <div className="flex gap-2">
            <button onClick={()=>setIsNew(false)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold ${!isNew ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
              Existing Item
            </button>
            <button onClick={()=>setIsNew(true)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold ${isNew ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
              + Register New Item
            </button>
          </div>

          {!isNew ? (
            <div className="relative">
              <F label="Item" required>
                {selected ? (
                  <div className="border border-amber-300 bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{selected.name}</span>
                    <button onClick={()=>setSelected(null)} className="text-slate-400 hover:text-red-500 text-lg leading-none">×</button>
                  </div>
                ) : (
                  <>
                    <input className={iCls} placeholder="Search catalog by name or part number..." value={query} onChange={e=>setQuery(e.target.value)} />
                    {filtered.length > 0 && (
                      <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filtered.map(i => (
                          <button key={i.id} onClick={()=>{setSelected(i); setQuery("");}}
                            className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-sm">
                            {i.name} <span className="text-slate-400 text-xs">({i.part_number || "no part no."})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </F>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><F label="Item Name" required>
                <input className={iCls} value={newName} onChange={e=>setNewName(e.target.value)} /></F></div>
              <div>
                <F label="Category">
                  <select className={iCls}
                    value={CATEGORIES.includes(newCategory) ? newCategory : "__other__"}
                    onChange={e=>setNewCategory(e.target.value === "__other__" ? "" : e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    <option value="__other__">+ Add New Category...</option>
                  </select>
                </F>
                {!CATEGORIES.includes(newCategory) && (
                  <input className={iCls + " mt-2"} placeholder="Type the new category name"
                    value={newCategory} onChange={e=>setNewCategory(e.target.value)} />
                )}
              </div>
              <F label="Unit"><select className={iCls} value={newUnit} onChange={e=>setNewUnit(e.target.value)}>
                {UNITS.filter(u=>u!=="Other").map(u => <option key={u}>{u}</option>)}</select></F>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <F label="Quantity Received" required><input type="number" className={iCls} value={qty} onChange={e=>setQty(e.target.value)} /></F>
            <F label="Unit Cost (₦)"><input type="number" className={iCls} value={unitCost} onChange={e=>setUnitCost(e.target.value)} /></F>
            <F label="Supplier"><input className={iCls} value={supplier} onChange={e=>setSupplier(e.target.value)} /></F>
            <F label="WayBill No."><input className={iCls} value={waybillNo} onChange={e=>setWaybillNo(e.target.value)} /></F>
            <F label="Invoice No."><input className={iCls} value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} /></F>
            <F label="LPO No."><input className={iCls} value={lpoNo} onChange={e=>setLpoNo(e.target.value)} /></F>
          </div>
          <F label="Remarks"><textarea className={iCls + " h-16 resize-none"} value={remarks} onChange={e=>setRemarks(e.target.value)} /></F>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving..." : "✓ Receive Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STOCK ADJUSTMENT — store-aware correction. Store Manager/Supervisor/
// super_admin only, per the returns-access rule. Searches within the
// selected store's own balances, since an adjustment only makes sense
// against a real existing balance at that specific store.
// ─────────────────────────────────────────────────────────────
function StockAdjustmentModal({ open, onClose, onSaved, storeBalances, stores, defaultStore, lockStore, profile }: {
  open: boolean; onClose: () => void; onSaved: () => void; storeBalances: any[];
  stores: string[]; defaultStore: string; lockStore: boolean; profile: any;
}) {
  const [storeLocation, setStoreLocation] = useState(defaultStore);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [direction, setDirection] = useState<"add"|"remove">("remove");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setStoreLocation(defaultStore); }, [defaultStore, open]);

  const itemsAtStore = storeBalances.filter(b => b.store_location === storeLocation);
  const filtered = itemsAtStore.filter(i => {
    if (!query) return false;
    const q = query.toLowerCase();
    return (i.name||"").toLowerCase().includes(q) || (i.part_number||"").toLowerCase().includes(q);
  }).slice(0, 10);

  function reset() { setQuery(""); setSelected(null); setDirection("remove"); setQty(""); setReason(""); setRemarks(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    if (!storeLocation) { setError("Select which store this adjustment applies to."); return; }
    if (!selected) { setError("Select the item to adjust."); return; }
    if (!qty || Number(qty) <= 0) { setError("Enter a valid quantity."); return; }
    if (!reason.trim()) { setError("A reason is required for every adjustment."); return; }
    setSaving(true); setError("");

    const signedQty = direction === "add" ? Number(qty) : -Number(qty);
    const { error: err } = await dbu.from("store_transactions").insert([{
      txn_type: "ADJUSTMENT",
      stock_item_id: selected.stock_item_id,
      item_name: selected.name,
      store_location: storeLocation,
      quantity: signedQty,
      performed_by: profile?.full_name,
      remarks: `${reason}${remarks ? " — " + remarks : ""}`,
    }]);
    if (err) { setError(err.message); setSaving(false); return; }

    setSaving(false); reset(); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-red-700 flex items-center justify-between">
          <div>
            <p className="text-red-200 text-xs font-bold uppercase tracking-widest">Store Manager / Supervisor Only</p>
            <h2 className="text-lg font-bold text-white">Stock Adjustment</h2>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-7 space-y-4">
          <F label="Store" required>
            {lockStore ? (
              <div className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-600">{storeLocation}</div>
            ) : (
              <select className={iCls} value={storeLocation} onChange={e=>{setStoreLocation(e.target.value); setSelected(null);}}>
                <option value="">Select store...</option>
                {stores.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </F>

          <F label="Item" required>
            {selected ? (
              <div className="border border-amber-300 bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-sm"><span className="font-semibold">{selected.name}</span> <span className="text-slate-400 text-xs">(current bal: {selected.balance})</span></span>
                <button onClick={()=>setSelected(null)} className="text-slate-400 hover:text-red-500 text-lg leading-none">×</button>
              </div>
            ) : (
              <>
                <input className={iCls} placeholder="Search name or part number..." value={query} onChange={e=>setQuery(e.target.value)} disabled={!storeLocation} />
                {filtered.length > 0 && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filtered.map(i => (
                      <button key={i.id} onClick={()=>{setSelected(i); setQuery("");}}
                        className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-sm">
                        {i.name} <span className="text-slate-400 text-xs">(bal: {i.balance})</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </F>

          <div className="flex gap-2">
            <button onClick={()=>setDirection("remove")}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold ${direction==="remove" ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}>
              − Remove (loss / damage)
            </button>
            <button onClick={()=>setDirection("add")}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold ${direction==="add" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
              + Add (found extra)
            </button>
          </div>

          <F label="Quantity" required><input type="number" className={iCls} value={qty} onChange={e=>setQty(e.target.value)} /></F>
          <F label="Reason" required>
            <select className={iCls} value={reason} onChange={e=>setReason(e.target.value)}>
              <option value="">Select a reason...</option>
              <option>Damage</option><option>Loss</option><option>Count Correction — Extra Found</option>
              <option>Count Correction — Shortage</option><option>Return (from job/site)</option><option>Other</option>
            </select>
          </F>
          <F label="Remarks"><textarea className={iCls + " h-16 resize-none"} value={remarks} onChange={e=>setRemarks(e.target.value)} /></F>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
            {saving ? "Saving..." : "Post Adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STORE — multi-store inventory. Store Officer sees only their
// assigned store(s); Store Manager, Store Supervisor, and super_admin
// can view any single store OR an "All Stores" oversight view.
// ─────────────────────────────────────────────────────────────
export default function StorePage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];
  const isSuperAdmin = roles.includes("super_admin");
  const isStoreOfficer = roles.includes("store_officer") && !roles.some(r => ["store_manager","store_supervisor","super_admin"].includes(r));
  const canReceive = roles.some(r => ["store_officer","store_manager","store_supervisor","super_admin"].includes(r));
  const canAdjust  = roles.some(r => ["store_manager","store_supervisor","super_admin"].includes(r));

  const [allStores, setAllStores] = useState<string[]>([]);
  const [myStores, setMyStores] = useState<string[]>([]);
  const [itemsMaster, setItemsMaster] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [importModal, setImportModal] = useState(false);
  const [grnModal, setGrnModal] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);

  // Store Officer only ever sees THEIR OWN assigned store(s) — this is
  // the actual access boundary, not just a UI default.
  const availableStores = isStoreOfficer ? myStores : allStores;
  const canSeeAllStores = !isStoreOfficer && allStores.length > 0;

  useEffect(() => { init(); }, []);
  async function init() {
    setLoading(true);
    // ★ Interim heuristic: sites whose name contains "Store" — matches
    // the 9 real store locations from the Sites page. If Sites ever
    // gets a formal site_type = 'Store' classification, swap this for
    // an exact type filter instead of a name match.
    const sites = await fetchAllRows("sites", "name,code");
    const storeNames = sites.filter((s: any) => /store/i.test(s.name)).map((s: any) => s.name).sort();
    setAllStores(storeNames);

    const assigned = (profile?.assigned_sites || []).filter((s: string) => storeNames.includes(s));
    setMyStores(assigned);

    const master = await fetchAllRows("stock_items", "*", q => q.order("name"));
    setItemsMaster(master);

    // Default: a scoped Data Analyst lands on their own store (they
    // have no "All Stores" option anyway). Everyone else defaults to
    // "All Stores" — landing on one arbitrary, alphabetically-first
    // store was confusing and looked like a bug.
    const initialStore = isStoreOfficer ? (assigned[0] || "") : "__all__";
    setSelectedStore(initialStore);
    setLoading(false);
  }

  useEffect(() => { if (selectedStore || selectedStore === "__all__") loadBalances(); }, [selectedStore]);
  async function loadBalances() {
    setLoading(true);
    const data = selectedStore === "__all__"
      ? await fetchAllRows("store_stock_balances", "*")
      : await fetchAllRows("store_stock_balances", "*", q => q.eq("store_location", selectedStore));
    // Enrich with item master fields for display/search.
    const enriched = data.map((b: any) => {
      const master = itemsMaster.find((m: any) => m.id === b.stock_item_id);
      return { ...b, name: master?.name, part_number: master?.part_number, category: master?.category,
        unit: master?.unit, unit_cost: master?.unit_cost, sourcing: master?.sourcing };
    });
    setBalances(enriched);
    setLoading(false);
  }

  const categories = [...new Set(balances.map((b: any) => b.category))].filter(Boolean).sort();
  const filtered = balances.filter((b: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || (b.name||"").toLowerCase().includes(q) || (b.part_number||"").toLowerCase().includes(q);
    return matchQ && (!filterCategory || b.category === filterCategory);
  });

  const totalValue = balances.reduce((s: number, b: any) => s + (Number(b.balance||0) * Number(b.unit_cost||0)), 0);
  const lowStock = balances.filter((b: any) => Number(b.balance) <= Number(b.reorder_level || 10));
  const totalReceived = balances.reduce((s: number, b: any) => s + Number(b.qty_received || 0), 0);
  const totalIssued = balances.reduce((s: number, b: any) => s + Number(b.qty_issued || 0), 0);

  const grnDefaultStore = selectedStore === "__all__" ? (availableStores[0] || "") : selectedStore;
  const lockStoreForOfficer = isStoreOfficer && myStores.length <= 1;

  // Exports exactly what's currently on screen — respects the active
  // store selection, search, and category filter, so what management
  // downloads matches what's visible, not a silent full dump.
  function exportCSV() {
    const headers = ["Name","Part No.", ...(selectedStore === "__all__" ? ["Store"] : []),
      "Category","Unit","Received","Issued","Balance","Unit Cost (₦)","Value (₦)"];
    const rows = filtered.map((b: any) => [
      b.name, b.part_number || "",
      ...(selectedStore === "__all__" ? [b.store_location] : []),
      b.category || "", b.unit || "",
      b.qty_received, b.qty_issued, b.balance,
      b.unit_cost || 0, (Number(b.balance||0) * Number(b.unit_cost||0)).toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.map((v:any) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `BuildFleet_Inventory_${selectedStore === "__all__" ? "AllStores" : selectedStore.replace(/[^a-z0-9]/gi,"_")}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Inventory</p>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Register</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Each store keeps its own independent balance — the same item can exist at multiple stores in different quantities.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button onClick={exportCSV}
            className="border border-slate-200 bg-white text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
            ↓ Export CSV
          </button>
          {canAdjust && (
            <button onClick={() => setAdjustModal(true)}
              className="border border-red-200 bg-white text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50">
              ⚠ Stock Adjustment
            </button>
          )}
          {canReceive && (
            <button onClick={() => setGrnModal(true)}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">
              📥 Receive Stock (GRN)
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={() => setImportModal(true)}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm">
              📦 Import Store Ledger
            </button>
          )}
        </div>
      </div>

      {/* Store selector — the actual access boundary for Store Officer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Viewing Store</label>
        {availableStores.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            {isStoreOfficer ? "You have no assigned store yet — ask an admin to assign one under Users." : "No store locations found."}
          </p>
        ) : (
          <select className={iCls + " max-w-md"} value={selectedStore} onChange={e=>setSelectedStore(e.target.value)}>
            {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            {canSeeAllStores && <option value="__all__">— All Stores (oversight view) —</option>}
          </select>
        )}
        {selectedStore === "__all__" && (
          <p className="text-xs text-slate-400 mt-2">Showing every store&apos;s inventory together — each row shows which store it belongs to.</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : balances.length.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">Items {selectedStore === "__all__" ? "(all stores)" : "here"}</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : naira(totalValue)}</p>
          <p className="text-sm opacity-70 mt-1">Stock Value</p>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : totalReceived.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">Total Received</p>
        </div>
        <div className="bg-slate-600 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : totalIssued.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">Total Issued</p>
        </div>
        <div className={`rounded-2xl p-5 ${lowStock.length > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          <p className="text-2xl font-bold">{loading ? "..." : lowStock.length}</p>
          <p className="text-sm opacity-70 mt-1">Low / Out of Stock</p>
        </div>
      </div>

      {!loading && balances.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
          <p className="text-blue-800 font-semibold">No stock at {selectedStore === "__all__" ? "any store" : selectedStore} yet.</p>
          <p className="text-blue-600 text-sm mt-1">
            {isSuperAdmin ? 'Import the historical ledger, or use "Receive Stock" to add the first item.' : 'Use "Receive Stock" to add the first item here.'}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <input placeholder="Search name, part no..."
          value={search} onChange={e => setSearch(e.target.value)}
          className={iCls + " lg:col-span-2"} />
        <select className={iCls} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c: any) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Stock Register</h2>
          <p className="text-slate-400 text-sm">{loading ? "Loading..." : `${filtered.length} of ${balances.length} items`}</p>
        </div>
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
              <tr>
                {["Name", ...(selectedStore === "__all__" ? ["Store"] : []), "Category","Unit","Received","Issued","Balance","Unit Cost"].map((h, i) => (
                  <th key={h}
                    className={`text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
                      i === 0 ? "sticky left-0 z-30 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : ""
                    }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400">No items match your search.</td></tr>
              ) : filtered.map((b: any) => {
                const low = Number(b.balance) <= Number(b.reorder_level || 10);
                return (
                  <tr key={b.id} className={`hover:bg-amber-50/20 group ${low ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 text-slate-700 max-w-64 truncate sticky left-0 z-10 bg-white group-hover:bg-amber-50/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      {b.name}
                      {b.part_number && <span className="block text-[10px] text-amber-600 font-mono">{b.part_number}</span>}
                    </td>
                    {selectedStore === "__all__" && <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{b.store_location}</td>}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{b.category}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.unit}</td>
                    <td className="px-4 py-3 text-emerald-700 text-xs font-medium">{Number(b.qty_received).toLocaleString()}</td>
                    <td className="px-4 py-3 text-orange-600 text-xs font-medium">{Number(b.qty_issued).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-xs font-bold ${low ? "text-red-600" : "text-slate-800"}`}>
                      {low && "🔴 "}{Number(b.balance).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{naira(b.unit_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StoreLedgerImportModal open={importModal} onClose={() => { setImportModal(false); loadBalances(); }} />
      <ReceiveStockModal open={grnModal} onClose={() => setGrnModal(false)} onSaved={loadBalances}
        itemsMaster={itemsMaster} stores={availableStores} defaultStore={grnDefaultStore}
        lockStore={lockStoreForOfficer} profile={profile} />
      <StockAdjustmentModal open={adjustModal} onClose={() => setAdjustModal(false)} onSaved={loadBalances}
        storeBalances={balances} stores={availableStores} defaultStore={grnDefaultStore}
        lockStore={lockStoreForOfficer} profile={profile} />
    </div>
  );
}