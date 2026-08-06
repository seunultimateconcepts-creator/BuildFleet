/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows, invalidateCache } from "@/lib/fetch-all";

const iCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const STATUS_STYLE: Record<string, string> = {
  "Draft":      "bg-slate-100 text-slate-600",
  "Checked":    "bg-blue-100 text-blue-700",
  "Approved":   "bg-emerald-100 text-emerald-700",
  "Purchased":  "bg-amber-100 text-amber-700",
  "Signed Off": "bg-teal-100 text-teal-700",
  "Closed":     "bg-slate-200 text-slate-500",
  "Rejected":   "bg-red-100 text-red-600",
};

const naira = (n: number, cur = "NGN") =>
  `${cur === "USD" ? "$" : "₦"}${Number(n || 0).toLocaleString()}`;

function blankQuote() { return { supplier: "", brand: "", country: "", offered_price: "", negotiated_price: "" }; }
function blankLine() {
  return {
    part_no: "", description: "", qty: 1, fleet_number: "", site: "",
    avg_price: "", last_purchase_price: "",
    quotes: [blankQuote(), blankQuote(), blankQuote()],
    selected_supplier: "",
  };
}

// ─────────────────────────────────────────────────────────────
// COMPARISON FORM MODAL — the digital Purchase Comparison & Analysis Form
// Full chain: Draft (Officer prepares) → Checked (Procurement Manager
// ONLY — not Officer, that was the earlier bug) → Approved (Plant
// Engineer/Manager releases funds) → Purchased (Officer records the
// buy) → Signed Off (Officer/Manager confirms goods match the order —
// THIS is what gates Store's GRN from receiving against this SRO).
// ─────────────────────────────────────────────────────────────
function ComparisonModal({ record, onClose, onSaved, profile, canEdit, canCheck, canApprove, canSignOff }: {
  record: any | null; onClose: () => void; onSaved: () => void;
  profile: any; canEdit: boolean; canCheck: boolean; canApprove: boolean; canSignOff: boolean;
}) {
  const isNew = !record;
  const [form, setForm] = useState<any>(record ? {
    ...record,
    line_items: record.line_items?.length ? record.line_items : [blankLine()],
  } : {
    sro_number: "", currency: "NGN", payment_method: "CASH",
    site: "", fleet_number: "", cost_code: "",
    line_items: [blankLine()], status: "Draft", remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // "Signed Off" is now also a locked/terminal state, same as Approved/Purchased/Closed
  const readOnly = !canEdit || ["Approved","Purchased","Signed Off","Closed"].includes(form.status);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  function setLine(i: number, k: string, v: any) {
    setForm((p: any) => ({ ...p,
      line_items: p.line_items.map((l: any, idx: number) => idx === i ? { ...l, [k]: v } : l) }));
  }
  function setQuote(i: number, qi: number, k: string, v: any) {
    setForm((p: any) => ({ ...p,
      line_items: p.line_items.map((l: any, idx: number) => idx === i
        ? { ...l, quotes: l.quotes.map((q: any, qidx: number) => qidx === qi ? { ...q, [k]: v } : q) }
        : l) }));
  }

  // Auto-fill Last Purchase Price from purchase history for a description
  async function autoFillHistory(i: number) {
    const desc = form.line_items[i]?.description?.trim();
    if (!desc) return;
    const { data } = await dbu.from("purchases")
      .select("amount,purchase_date")
      .ilike("description", `%${desc}%`)
      .order("purchase_date", { ascending: false })
      .limit(5);
    if (data && data.length) {
      const last = data[0].amount;
      const avg = data.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) / data.length;
      setLine(i, "last_purchase_price", String(last));
      setLine(i, "avg_price", Math.round(avg).toString());
    }
  }

  // Totals per supplier column (across all lines)
  const supplierTotals: Record<number, number> = {};
  for (const l of form.line_items) {
    (l.quotes || []).forEach((q: any, qi: number) => {
      const price = Number(q.negotiated_price || q.offered_price || 0);
      if (price > 0) supplierTotals[qi] = (supplierTotals[qi] || 0) + price * (Number(l.qty) || 1);
    });
  }

  async function save(nextStatus?: string, historyAction?: string) {
    setSaving(true); setError("");
    const suppliers = [0,1,2].map(qi =>
      form.line_items.map((l:any) => l.quotes?.[qi]?.supplier).find(Boolean) || "");
    // Winning total = lowest non-zero supplier total, or selected supplier's total
    const totals = Object.entries(supplierTotals).map(([qi, t]) => ({ qi: Number(qi), t }));
    const best = totals.sort((a,b) => a.t - b.t)[0];
    const payload: any = {
      sro_number: form.sro_number, currency: form.currency,
      payment_method: form.payment_method, site: form.site,
      fleet_number: form.fleet_number, cost_code: form.cost_code,
      line_items: form.line_items, suppliers,
      selected_supplier: form.selected_supplier || (best ? suppliers[best.qi] : ""),
      total_amount: best ? best.t : 0,
      remarks: form.remarks,
    };
    if (nextStatus) payload.status = nextStatus;
    if (nextStatus === "Checked")    { payload.checked_by    = profile?.full_name || ""; payload.checked_at    = new Date().toISOString(); }
    if (nextStatus === "Approved")   { payload.approved_by   = profile?.full_name || ""; payload.approved_at   = new Date().toISOString(); }
    if (nextStatus === "Signed Off") { payload.signed_off_by = profile?.full_name || ""; payload.signed_off_at = new Date().toISOString(); }
    if (isNew) payload.prepared_by = profile?.full_name || "";

    let compId = record?.id;
    if (isNew) {
      const { data, error: err } = await dbu.from("purchase_comparisons").insert([payload]).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      compId = data.id;
    } else {
      const { error: err } = await dbu.from("purchase_comparisons").update(payload).eq("id", record.id);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    await dbu.from("procurement_history").insert([{
      comparison_id: compId,
      action: historyAction || (isNew ? "Prepared" : "Updated"),
      performed_by: profile?.full_name || "",
    }]);
    setSaving(false); onSaved(); onClose();
  }

  // Approved → record the actual purchase
  async function markPurchased() {
    setSaving(true);
    const { data: pData, error: err } = await dbu.from("purchases").insert([{
      comparison_id: record.id,
      sro_number: form.sro_number,
      supplier: form.selected_supplier,
      description: form.line_items.map((l:any)=>l.description).filter(Boolean).join("; ").slice(0,300),
      payment_method: form.payment_method,
      currency: form.currency,
      amount: form.total_amount || record.total_amount || 0,
      cost_code: form.cost_code, site: form.site, fleet_number: form.fleet_number,
      performed_by: profile?.full_name || "",
    }]).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    await dbu.from("purchase_comparisons").update({ status: "Purchased" }).eq("id", record.id);
    await dbu.from("procurement_history").insert([{
      comparison_id: record.id, purchase_id: pData.id,
      action: "Purchased", performed_by: profile?.full_name || "",
    }]);
    setSaving(false); onSaved(); onClose();
  }

  // Purchased → Signed Off. This is the gate Store's GRN checks before
  // allowing receipt against this SRO. Kept as its own explicit action
  // (not folded into markPurchased) so the Procurement Clerk who signs
  // off can be a different person/moment than whoever recorded the buy.
  async function signOff() {
    setSaving(true); setError("");
    const { error: err } = await dbu.from("purchase_comparisons").update({
      status: "Signed Off",
      signed_off_by: profile?.full_name || "",
      signed_off_at: new Date().toISOString(),
    }).eq("id", record.id);
    if (err) { setError(err.message); setSaving(false); return; }
    await dbu.from("procurement_history").insert([{
      comparison_id: record.id, action: "Signed Off", performed_by: profile?.full_name || "",
    }]);
    setSaving(false); onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">Purchase Comparison &amp; Analysis</p>
            <h2 className="text-lg font-bold text-white">{isNew ? "New Comparison" : `SRO ${form.sro_number || "—"}`}</h2>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[form.status]}`}>{form.status}</span>}
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          </div>
        </div>

        <div className="p-7 space-y-5">
          {/* Header fields */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">SRO No.</label>
              <input className={iCls} value={form.sro_number} disabled={readOnly}
                onChange={e=>set("sro_number",e.target.value)} placeholder="e.g. 43510"/></div>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Currency</label>
              <select className={iCls} value={form.currency} disabled={readOnly} onChange={e=>set("currency",e.target.value)}>
                <option value="NGN">₦ Naira</option><option value="USD">$ USD</option></select></div>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Payment</label>
              <select className={iCls} value={form.payment_method} disabled={readOnly} onChange={e=>set("payment_method",e.target.value)}>
                <option>CASH</option><option>LPO</option></select></div>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Site</label>
              <input className={iCls} value={form.site} disabled={readOnly} onChange={e=>set("site",e.target.value)}/></div>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Fleet No.</label>
              <input className={iCls} value={form.fleet_number} disabled={readOnly} onChange={e=>set("fleet_number",e.target.value)}/></div>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Cost Code</label>
              <input className={iCls} value={form.cost_code} disabled={readOnly} onChange={e=>set("cost_code",e.target.value)}/></div>
          </div>

          {/* Line items */}
          {form.line_items.map((l: any, i: number) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="lg:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                  <input className={iCls} value={l.description} disabled={readOnly}
                    onChange={e=>setLine(i,"description",e.target.value)}
                    onBlur={()=>!readOnly && autoFillHistory(i)}
                    placeholder="e.g. CAT Battery Switch Main Relay 24V"/></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Part #</label>
                  <input className={iCls} value={l.part_no} disabled={readOnly} onChange={e=>setLine(i,"part_no",e.target.value)}/></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                  <input type="number" className={iCls} value={l.qty} disabled={readOnly} onChange={e=>setLine(i,"qty",e.target.value)}/></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Avg Price (hist.)</label>
                  <input className={iCls + " bg-slate-50"} value={l.avg_price} disabled
                    placeholder="auto"/></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Last Purchase</label>
                  <input className={iCls + " bg-slate-50"} value={l.last_purchase_price} disabled
                    placeholder="auto"/></div>
              </div>

              {/* 3 supplier quotes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(l.quotes || []).map((q: any, qi: number) => {
                  const line = (Number(q.negotiated_price || q.offered_price || 0)) * (Number(l.qty)||1);
                  const isSelected = l.selected_supplier && l.selected_supplier === q.supplier && q.supplier;
                  return (
                    <div key={qi} className={`rounded-xl border p-3 space-y-2 ${isSelected ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Supplier {qi+1}</p>
                        {!readOnly && q.supplier && (
                          <button onClick={()=>setLine(i,"selected_supplier",q.supplier)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-100"}`}>
                            {isSelected ? "✓ Selected" : "Select"}
                          </button>
                        )}
                      </div>
                      <input className={iCls} value={q.supplier} disabled={readOnly} placeholder="Supplier name"
                        onChange={e=>setQuote(i,qi,"supplier",e.target.value)}/>
                      <div className="grid grid-cols-2 gap-2">
                        <input className={iCls} value={q.brand} disabled={readOnly} placeholder="Brand"
                          onChange={e=>setQuote(i,qi,"brand",e.target.value)}/>
                        <input className={iCls} value={q.country} disabled={readOnly} placeholder="Country"
                          onChange={e=>setQuote(i,qi,"country",e.target.value)}/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className={iCls} value={q.offered_price} disabled={readOnly} placeholder="Offered ₦"
                          onChange={e=>setQuote(i,qi,"offered_price",e.target.value)}/>
                        <input type="number" className={iCls} value={q.negotiated_price} disabled={readOnly} placeholder="Negotiated ₦"
                          onChange={e=>setQuote(i,qi,"negotiated_price",e.target.value)}/>
                      </div>
                      <p className="text-right text-xs font-bold text-slate-700">Line: {naira(line, form.currency)}</p>
                    </div>
                  );
                })}
              </div>
              {!readOnly && form.line_items.length > 1 && (
                <button onClick={()=>set("line_items", form.line_items.filter((_:any,idx:number)=>idx!==i))}
                  className="text-xs text-red-500 hover:text-red-700">Remove item</button>
              )}
            </div>
          ))}

          {!readOnly && (
            <button onClick={()=>set("line_items",[...form.line_items, blankLine()])}
              className="text-sm text-amber-600 font-semibold hover:text-amber-700">+ Add item</button>
          )}

          {/* Supplier totals */}
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3">
            {[0,1,2].map(qi => (
              <div key={qi} className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Supplier {qi+1} Total</p>
                <p className="font-bold text-slate-800">{supplierTotals[qi] ? naira(supplierTotals[qi], form.currency) : "—"}</p>
              </div>
            ))}
          </div>

          {form.status === "Signed Off" && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-teal-700 text-sm">
              ✓ Signed off by {form.signed_off_by || "—"}
              {form.signed_off_at && ` on ${new Date(form.signed_off_at).toLocaleDateString("en-GB")}`}.
              Store can now receive against SRO {form.sro_number}.
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>

        {/* Action bar — workflow-aware */}
        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">Close</button>
          {canEdit && !readOnly && (
            <button onClick={()=>save()} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 disabled:opacity-50">
              {saving ? "Saving..." : "💾 Save Draft"}
            </button>
          )}
          {canCheck && form.status === "Draft" && !isNew && (
            <button onClick={()=>save("Checked","Checked")} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
              ✓ Check (Procurement Manager)
            </button>
          )}
          {canApprove && form.status === "Checked" && (
            <button onClick={()=>save("Approved","Approved")} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              ✓ Approve — Release Funds (Plant Mgr)
            </button>
          )}
          {canEdit && form.status === "Approved" && !isNew && (
            <button onClick={markPurchased} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
              🛒 Mark Purchased
            </button>
          )}
          {canSignOff && form.status === "Purchased" && (
            <button onClick={signOff} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
              ✍️ Sign Off — Release to Store
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function ProcurementPage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];

  // Access matrix: Officer prepares/edits Drafts and signs off after
  // purchase. Manager is the ONLY one who Checks (this was the bug —
  // Officer used to be allowed to Check too, collapsing the two-person
  // control). Plant Eng/Mgr give final Approval to release funds.
  const canEdit     = roles.some(r => ["procurement_officer","procurement_manager","super_admin"].includes(r));
  const canCheck    = roles.some(r => ["procurement_manager","super_admin"].includes(r));
  const canApprove  = roles.some(r => ["plant_engineer","plant_manager","super_admin"].includes(r));
  const canSignOff  = roles.some(r => ["procurement_officer","procurement_manager","super_admin"].includes(r));
  const canView     = canEdit || canApprove || roles.some(r =>
    ["store_manager","plant_admin","executive","finance_viewer"].includes(r));

  const [tab, setTab] = useState<"dashboard"|"comparisons"|"purchases"|"history">("dashboard");
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [purchases,   setPurchases]   = useState<any[]>([]);
  const [history,     setHistory]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<any|"new"|null>(null);
  const [month,       setMonth]       = useState(() => new Date().toISOString().slice(0,7));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [c, p, h] = await Promise.all([
      fetchAllRows("purchase_comparisons", "*", q => q.order("created_at", { ascending: false }), { cacheKey: "purchase-comparisons", cacheTTL: 20000 }),
      fetchAllRows("purchases", "*", q => q.order("purchase_date", { ascending: false }), { cacheKey: "purchases", cacheTTL: 20000 }),
      dbu.from("procurement_history").select("*").order("created_at", { ascending: false }).limit(100)
        .then(({ data }: any) => data || []),
    ]);
    setComparisons(c); setPurchases(p); setHistory(h);
    setLoading(false);
  }
  function reloadFresh() {
    invalidateCache("purchase-comparisons");
    invalidateCache("purchases");
    load();
  }

  if (!canView) {
    return <div className="py-24 text-center text-slate-400">You don&apos;t have access to Procurement.</div>;
  }

  // Monthly spend (requirement #3: "how much has been spent in a month")
  const monthPurchases = purchases.filter(p => (p.purchase_date || "").startsWith(month));
  const monthTotal = monthPurchases.reduce((s, p) => s + Number(p.amount || 0), 0);
  const months = [...new Set(purchases.map(p => (p.purchase_date || "").slice(0,7)))].filter(Boolean).sort().reverse();
  const bySupplier: Record<string, number> = {};
  monthPurchases.forEach(p => { bySupplier[p.supplier || "—"] = (bySupplier[p.supplier || "—"] || 0) + Number(p.amount || 0); });

  const pendingCheck    = comparisons.filter(c => c.status === "Draft").length;
  const pendingApprove  = comparisons.filter(c => c.status === "Checked").length;
  const pendingSignOff  = comparisons.filter(c => c.status === "Purchased").length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Procurement</p>
          <h1 className="text-3xl font-bold text-slate-900">Purchasing</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Purchase comparison &amp; analysis, approvals, and spend records.
            {!canEdit && " (View-only access)"}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setModal("new")}
            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shrink-0">
            + New Comparison
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {([["dashboard","📊 Dashboard"],["comparisons",`📋 Comparisons (${comparisons.length})`],
           ["purchases",`🛒 Purchases (${purchases.length})`],["history","🕒 History"]] as const).map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 text-white rounded-2xl p-5">
              <p className="text-2xl font-bold">{naira(monthTotal)}</p>
              <p className="text-sm opacity-70 mt-1">Spend — {month}</p>
            </div>
            <div className="bg-amber-500 text-white rounded-2xl p-5">
              <p className="text-3xl font-bold">{monthPurchases.length}</p>
              <p className="text-sm opacity-70 mt-1">Purchases this month</p>
            </div>
            <div className="bg-blue-600 text-white rounded-2xl p-5">
              <p className="text-3xl font-bold">{pendingCheck}</p>
              <p className="text-sm opacity-70 mt-1">Awaiting Check</p>
            </div>
            <div className="bg-emerald-600 text-white rounded-2xl p-5">
              <p className="text-3xl font-bold">{pendingApprove}</p>
              <p className="text-sm opacity-70 mt-1">Awaiting Approval</p>
            </div>
            <div className="bg-teal-600 text-white rounded-2xl p-5">
              <p className="text-3xl font-bold">{pendingSignOff}</p>
              <p className="text-sm opacity-70 mt-1">Awaiting Sign Off</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center gap-4">
            <label className="text-xs font-bold text-slate-500 uppercase">Month</label>
            <select className={iCls + " w-44"} value={month} onChange={e=>setMonth(e.target.value)}>
              {(months.length ? months : [month]).map(m => <option key={m}>{m}</option>)}
            </select>
            <p className="text-sm text-slate-500">{monthPurchases.length} purchase{monthPurchases.length===1?"":"s"} · {naira(monthTotal)}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">Spend by Supplier — {month}</h3></div>
            <div className="divide-y divide-slate-50">
              {Object.entries(bySupplier).sort((a,b)=>b[1]-a[1]).map(([s, amt]) => (
                <div key={s} className="px-6 py-3 flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{s}</span>
                  <span className="font-bold text-slate-800">{naira(amt)}</span>
                </div>
              ))}
              {monthPurchases.length === 0 && (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">No purchases recorded for {month} yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "comparisons" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["SRO No.","Date","Items","Suppliers","Selected","Total","Status",""].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                : comparisons.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No comparisons yet.</td></tr>
                : comparisons.map((c:any) => (
                  <tr key={c.id} className="hover:bg-amber-50/20">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{c.sro_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {c.comparison_date ? new Date(c.comparison_date).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-48 truncate">
                      {(c.line_items||[]).map((l:any)=>l.description).filter(Boolean).join("; ") || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{(c.suppliers||[]).filter(Boolean).length}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs font-medium">{c.selected_supplier || "—"}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{naira(c.total_amount, c.currency)}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[c.status]}`}>{c.status}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={()=>setModal(c)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "purchases" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Date","SRO","Supplier","Description","Payment","Cost Code","Amount","By"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchases.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No purchases recorded yet.</td></tr>
                : purchases.map((p:any) => (
                  <tr key={p.id} className="hover:bg-amber-50/20">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {p.purchase_date ? new Date(p.purchase_date).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{p.sro_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs font-medium">{p.supplier || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-56 truncate">{p.description || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.payment_method}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.cost_code || "—"}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{naira(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.performed_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
          {history.length === 0 ? <div className="px-6 py-12 text-center text-slate-400 text-sm">No history yet.</div>
          : history.map((h:any) => (
            <div key={h.id} className="px-6 py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-slate-700">{h.action}</span>
                <span className="text-slate-400 text-xs ml-2">by {h.performed_by}</span>
                {h.note && <span className="text-slate-400 text-xs ml-2 italic">— {h.note}</span>}
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(h.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
              </span>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ComparisonModal
          record={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={reloadFresh}
          profile={profile}
          canEdit={canEdit} canCheck={canCheck} canApprove={canApprove} canSignOff={canSignOff}
        />
      )}
    </div>
  );
}