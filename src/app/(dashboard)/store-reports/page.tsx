/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { fetchAllRows } from "@/lib/fetch-all";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const iCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─────────────────────────────────────────────────────────────
// TAB 1: MOVEMENT & USAGE — item consumption across all sites,
// exactly as requested: a chart showing amount consumed, filterable
// by period and store.
// ─────────────────────────────────────────────────────────────
function MovementUsageTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0,10));
  const [filterStore, setFilterStore] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [t, i, s] = await Promise.all([
      fetchAllRows("store_transactions", "*", (q:any) => q.order("created_at",{ascending:false})),
      fetchAllRows("stock_items", "id,name,category"),
      fetchAllRows("sites", "name"),
    ]);
    setTxns(t); setItems(i);
    setStores((s as any[]).filter(x => /store/i.test(x.name)).map(x => x.name).sort());
    setLoading(false);
  }

  const filtered = txns.filter((t:any) => {
    const d = t.created_at?.slice(0,10);
    const inRange = d >= fromDate && d <= toDate;
    const matchStore = !filterStore || t.store_location === filterStore;
    return inRange && matchStore && t.txn_type === "SIV";
  });

  // Consumption per item, in the period
  const byItem = new Map<string, number>();
  filtered.forEach((t:any) => byItem.set(t.stock_item_id, (byItem.get(t.stock_item_id)||0) + Number(t.quantity||0)));
  const chartData = [...byItem.entries()]
    .map(([id, qty]) => ({ name: items.find((i:any)=>i.id===id)?.name || "Unknown", qty }))
    .sort((a,b) => b.qty - a.qty).slice(0, 15);

  const totalConsumed = filtered.reduce((s,t:any) => s + Number(t.quantity||0), 0);

  function exportReport() {
    downloadCSV(`Movement_Usage_${fromDate}_to_${toDate}.csv`,
      ["Item","Store","Date","Qty Issued","Job Order","Fleet No."],
      filtered.map((t:any) => [items.find((i:any)=>i.id===t.stock_item_id)?.name, t.store_location, t.created_at?.slice(0,10), t.quantity, t.job_order_no||"", t.fleet_number||""]));
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">From</label>
          <input type="date" className={iCls} value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">To</label>
          <input type="date" className={iCls} value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Store</label>
          <select className={iCls} value={filterStore} onChange={e=>setFilterStore(e.target.value)}>
            <option value="">All Stores</option>
            {stores.map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div className="flex items-end"><button onClick={exportReport}
          className="w-full border border-slate-200 bg-white text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          ↓ Export CSV
        </button></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":totalConsumed.toLocaleString()}</p><p className="text-sm opacity-70 mt-1">Total Units Consumed</p></div>
        <div className="bg-orange-500 text-white rounded-2xl p-5"><p className="text-2xl font-bold">{loading?"...":filtered.length.toLocaleString()}</p><p className="text-sm opacity-70 mt-1">Issue Transactions</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Top 15 Items by Consumption</h3>
        {loading ? <p className="text-slate-400 text-sm py-12 text-center">Loading...</p>
        : chartData.length === 0 ? <p className="text-slate-400 text-sm py-12 text-center">No issues in this period.</p>
        : (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 32)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{fontSize:11,fill:"#475569"}} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="qty" name="Units Consumed" fill="#F59E0B" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 2: YEARLY GROUP SUMMARY — select any year, get category totals
// ─────────────────────────────────────────────────────────────
function GroupSummaryTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [t, i] = await Promise.all([
      fetchAllRows("store_transactions", "*"),
      fetchAllRows("stock_items", "id,name,category,unit_cost"),
    ]);
    setTxns(t); setItems(i);
    setLoading(false);
  }

  const yearTxns = txns.filter((t:any) => t.created_at?.startsWith(String(year)));
  const itemMap = new Map(items.map((i:any) => [i.id, i]));

  const byCategory: Record<string, { received: number; issued: number; value: number }> = {};
  yearTxns.forEach((t:any) => {
    const item = itemMap.get(t.stock_item_id);
    const cat = item?.category || "Uncategorized";
    byCategory[cat] = byCategory[cat] || { received: 0, issued: 0, value: 0 };
    if (t.txn_type === "GRN") { byCategory[cat].received += Number(t.quantity||0); byCategory[cat].value += Number(t.quantity||0) * Number(t.unit_cost||item?.unit_cost||0); }
    if (t.txn_type === "SIV") byCategory[cat].issued += Number(t.quantity||0);
  });

  const rows = Object.entries(byCategory).sort((a,b) => b[1].value - a[1].value);
  const totalValue = rows.reduce((s,[,v]) => s + v.value, 0);
  const years = [...new Set(txns.map((t:any) => t.created_at?.slice(0,4)))].filter(Boolean).sort().reverse();

  function exportReport() {
    downloadCSV(`Group_Summary_${year}.csv`,
      ["Category","Qty Received","Qty Issued","Value Received (₦)"],
      rows.map(([cat,v]) => [cat, v.received, v.issued, v.value.toFixed(2)]));
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center gap-4">
        <label className="text-xs font-bold text-slate-500 uppercase">Year</label>
        <select className={iCls + " w-32"} value={String(year)} onChange={e=>setYear(parseInt(e.target.value))}>
          {(years.length ? years : [String(year)]).map((y:any) => <option key={y}>{y}</option>)}
        </select>
        <button onClick={exportReport} className="ml-auto border border-slate-200 bg-white text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          ↓ Export CSV
        </button>
      </div>

      <div className="bg-amber-500 text-white rounded-2xl p-5 w-fit">
        <p className="text-3xl font-bold">{loading ? "..." : naira(totalValue)}</p>
        <p className="text-sm opacity-70 mt-1">Total Value Received — {year}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">By Category — {year}</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["Category","Qty Received","Qty Issued","Value Received"].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400">No activity in {year}.</td></tr>
              : rows.map(([cat,v]) => (
                <tr key={cat} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 font-semibold text-slate-700">{cat}</td>
                  <td className="px-4 py-3 text-emerald-700 text-xs font-medium">{v.received.toLocaleString()}</td>
                  <td className="px-4 py-3 text-orange-600 text-xs font-medium">{v.issued.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-xs">{naira(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 3: BIN CARD — per-item full history, matching the physical
// Stock Control Card: Date, Particular, Qty Rec, Qty Issue, Balance
// ─────────────────────────────────────────────────────────────
function BinCardTab() {
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAllRows("stock_items", "id,name,part_number").then(setItems); }, []);

  const filtered = items.filter((i:any) => query && (i.name||"").toLowerCase().includes(query.toLowerCase())).slice(0,10);

  async function selectItem(item: any) {
    setSelected(item); setQuery(""); setLoading(true);
    const data = await fetchAllRows("store_transactions", "*", (q:any) => q.eq("stock_item_id", item.id).order("created_at",{ascending:true}));
    setTxns(data);
    setLoading(false);
  }

  // Running balance, replayed chronologically per store — same logic
  // the database trigger uses, shown here for the printed card.
  const byStore: Record<string, number> = {};
  const rows = txns.map((t:any) => {
    const loc = t.store_location || "Unassigned";
    byStore[loc] = byStore[loc] || 0;
    if (t.txn_type === "GRN" || (t.txn_type==="ADJUSTMENT" && t.quantity>=0)) byStore[loc] += Number(t.quantity);
    else byStore[loc] -= Math.abs(Number(t.quantity));
    return { ...t, runningBalance: byStore[loc] };
  });

  function exportReport() {
    if (!selected) return;
    downloadCSV(`BinCard_${selected.name.replace(/[^a-z0-9]/gi,"_")}.csv`,
      ["Date","Store","Particular","Qty Rec","Qty Issue","Balance","Remarks"],
      rows.map((t:any) => [
        t.created_at?.slice(0,10), t.store_location, t.txn_type,
        t.txn_type==="GRN"||( t.txn_type==="ADJUSTMENT"&&t.quantity>=0) ? t.quantity : "",
        t.txn_type==="SIV"||(t.txn_type==="ADJUSTMENT"&&t.quantity<0) ? Math.abs(t.quantity) : "",
        t.runningBalance, t.remarks||"",
      ]));
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 relative">
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Search Item</label>
        {selected ? (
          <div className="flex items-center justify-between border border-amber-300 bg-amber-50 rounded-xl px-4 py-2.5">
            <span className="font-semibold text-slate-800">{selected.name}</span>
            <button onClick={()=>{setSelected(null); setTxns([]);}} className="text-slate-400 hover:text-red-500">×</button>
          </div>
        ) : (
          <input className={iCls} placeholder="Search item name..." value={query} onChange={e=>setQuery(e.target.value)} />
        )}
        {!selected && filtered.length > 0 && (
          <div className="absolute left-5 right-5 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
            {filtered.map((i:any) => (
              <button key={i.id} onClick={()=>selectItem(i)} className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-slate-50 last:border-0 text-sm">
                {i.name} <span className="text-slate-400 text-xs">({i.part_number||"no part no."})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div><h3 className="font-bold text-slate-800">Bin Card — {selected.name}</h3><p className="text-slate-400 text-xs">{rows.length} transactions, all stores</p></div>
            <button onClick={exportReport} className="border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50">↓ Export CSV</button>
          </div>
          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>{["Date","Store","Particular","Qty Rec.","Qty Issue","Balance","Remarks"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                : rows.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No history for this item yet.</td></tr>
                : rows.map((t:any) => (
                  <tr key={t.id} className="hover:bg-amber-50/20">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{t.created_at?.slice(0,10)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{t.store_location}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{t.txn_type}</td>
                    <td className="px-4 py-3 text-emerald-700 text-xs">{t.txn_type==="GRN"||(t.txn_type==="ADJUSTMENT"&&t.quantity>=0) ? t.quantity : "—"}</td>
                    <td className="px-4 py-3 text-orange-600 text-xs">{t.txn_type==="SIV"||(t.txn_type==="ADJUSTMENT"&&t.quantity<0) ? Math.abs(t.quantity) : "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 text-xs">{t.runningBalance}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-40 truncate">{t.remarks||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 4: NON-MOVING STOCK — items received but never issued (dead stock)
// ─────────────────────────────────────────────────────────────
function NonMovingTab() {
  const [balances, setBalances] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [b, i] = await Promise.all([
      fetchAllRows("store_stock_balances", "*"),
      fetchAllRows("stock_items", "id,name,unit_cost"),
    ]);
    const enriched = (b as any[]).map(x => ({ ...x, name: (i as any[]).find(y=>y.id===x.stock_item_id)?.name, unit_cost: (i as any[]).find(y=>y.id===x.stock_item_id)?.unit_cost || 0 }));
    setBalances(enriched.filter(x => Number(x.qty_issued) === 0 && Number(x.qty_received) > 0));
    setItems(i);
    setLoading(false);
  }

  const totalValueTiedUp = balances.reduce((s,b) => s + Number(b.balance||0)*Number(b.unit_cost||0), 0);

  function exportReport() {
    downloadCSV("Non_Moving_Stock.csv", ["Item","Store","Qty Received","Balance","Value Tied Up (₦)"],
      balances.map(b => [b.name, b.store_location, b.qty_received, b.balance, (Number(b.balance)*Number(b.unit_cost)).toFixed(2)]));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="bg-slate-900 text-white rounded-2xl p-5 w-fit">
          <p className="text-2xl font-bold">{loading?"...":naira(totalValueTiedUp)}</p>
          <p className="text-sm opacity-70 mt-1">Value Tied Up in Non-Moving Stock</p>
        </div>
        <button onClick={exportReport} className="border border-slate-200 bg-white text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">↓ Export CSV</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Never Issued — Received but zero activity</h3>
          <p className="text-slate-400 text-xs mt-0.5">{balances.length} items sitting untouched</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["Item","Store","Received","Balance","Value"].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              : balances.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Everything has moved at least once. 🎉</td></tr>
              : balances.map((b:any) => (
                <tr key={b.id} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 text-slate-700 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{b.store_location}</td>
                  <td className="px-4 py-3 text-xs">{b.qty_received}</td>
                  <td className="px-4 py-3 text-xs font-bold">{b.balance}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{naira(Number(b.balance)*Number(b.unit_cost))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function StoreReportsPage() {
  const [tab, setTab] = useState<"movement"|"summary"|"bincard"|"nonmoving">("movement");

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Inventory</p>
        <h1 className="text-3xl font-bold text-slate-900">Store Reports</h1>
        <p className="text-slate-500 mt-1 text-sm">Movement, usage, yearly summaries, and per-item history — every report downloadable.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {([["movement","📊 Movement & Usage"],["summary","📅 Yearly Group Summary"],
           ["bincard","🗂 Bin Card"],["nonmoving","🐌 Non-Moving Stock"]] as const).map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "movement" && <MovementUsageTab />}
      {tab === "summary" && <GroupSummaryTab />}
      {tab === "bincard" && <BinCardTab />}
      {tab === "nonmoving" && <NonMovingTab />}
    </div>
  );
}