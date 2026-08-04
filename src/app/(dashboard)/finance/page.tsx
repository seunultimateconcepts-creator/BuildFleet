/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const iCls = "border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

// ─────────────────────────────────────────────────────────────
// FINANCE — complete template (per Hartland's ask): cost-code
// dashboards, budget vs actual, monthly trends. Reads REAL data
// where it already exists (purchases + maintenance costs), and is
// structured to absorb payroll/revenue/etc. in later phases.
// ─────────────────────────────────────────────────────────────
export default function FinancePage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];
  const canView = roles.some(r =>
    ["finance_viewer","finance_manager","procurement_manager","store_manager",
     "plant_engineer","plant_manager","plant_admin","executive","super_admin"].includes(r));
  const canEditBudget = roles.some(r => ["finance_manager","super_admin"].includes(r));

  const [purchases,   setPurchases]   = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [budgets,     setBudgets]     = useState<any[]>([]);
  const [sites,       setSites]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [year,        setYear]        = useState(new Date().getFullYear());
  const [editBudget,  setEditBudget]  = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [p, m, b, s] = await Promise.all([
      fetchAllRows("purchases", "purchase_date,amount,cost_code,supplier,site"),
      fetchAllRows("maintenance", "completion_date,created_at,cost,status,site"),
      fetchAllRows("finance_budgets", "*"),
      fetchAllRows("sites", "name,code,cost_code,site_type"),
    ]);
    setPurchases(p); setMaintenance(m); setBudgets(b); setSites(s);
    setLoading(false);
  }

  // ── Cost aggregation ──
  // Site name → cost code map (maintenance rows carry site, not code)
  const siteToCode: Record<string, string> = {};
  sites.forEach((s: any) => { if (s.name) siteToCode[s.name] = s.cost_code || s.code || ""; });

  const yearStr = String(year);
  const completedMaint = maintenance.filter((m: any) =>
    m.status === "Completed" && (m.completion_date || m.created_at || "").startsWith(yearStr));
  const yearPurchases = purchases.filter((p: any) => (p.purchase_date || "").startsWith(yearStr));

  // Spend per cost code
  const codeSpend: Record<string, { procurement: number; maintenance: number }> = {};
  yearPurchases.forEach((p: any) => {
    const code = p.cost_code || siteToCode[p.site] || "Unassigned";
    codeSpend[code] = codeSpend[code] || { procurement: 0, maintenance: 0 };
    codeSpend[code].procurement += Number(p.amount || 0);
  });
  completedMaint.forEach((m: any) => {
    const code = siteToCode[m.site] || "Unassigned";
    codeSpend[code] = codeSpend[code] || { procurement: 0, maintenance: 0 };
    codeSpend[code].maintenance += Number(m.cost || 0);
  });

  const budgetFor = (code: string) =>
    Number(budgets.find((b: any) => b.cost_code === code && b.year === year)?.amount || 0);

  const totalProcurement = yearPurchases.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalMaintenance = completedMaint.reduce((s, m) => s + Number(m.cost || 0), 0);
  const totalSpend = totalProcurement + totalMaintenance;
  const totalBudget = budgets.filter((b: any) => b.year === year)
    .reduce((s, b) => s + Number(b.amount || 0), 0);

  // Monthly trend
  const monthly: number[] = Array(12).fill(0);
  yearPurchases.forEach((p: any) => {
    const m = parseInt((p.purchase_date || "").slice(5, 7)) - 1;
    if (m >= 0) monthly[m] += Number(p.amount || 0);
  });
  completedMaint.forEach((mt: any) => {
    const m = parseInt((mt.completion_date || mt.created_at || "").slice(5, 7)) - 1;
    if (m >= 0) monthly[m] += Number(mt.cost || 0);
  });
  const maxMonth = Math.max(...monthly, 1);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  async function saveBudget(code: string) {
    const amount = Number(editBudget[code]);
    if (isNaN(amount)) return;
    await dbu.from("finance_budgets").upsert(
      { cost_code: code, year, amount },
      { onConflict: "cost_code,year" }
    );
    setEditBudget(prev => { const n = { ...prev }; delete n[code]; return n; });
    load();
  }

  if (!canView) {
    return <div className="py-24 text-center text-slate-400">You don&apos;t have access to Finance.</div>;
  }

  const codes = Object.keys(codeSpend).sort();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Finance</p>
          <h1 className="text-3xl font-bold text-slate-900">Cost &amp; Budget Overview</h1>
          <p className="text-slate-500 mt-1 text-sm max-w-lg">
            Live spend by cost code from Procurement and Maintenance. Budget vs actual per code.
            {!canEditBudget && " (View-only)"}
          </p>
        </div>
        <select className={iCls + " shrink-0"} value={String(year)} onChange={e => setYear(parseInt(e.target.value))}>
          {[year - 1, year, year + 1].filter(y => y > 2023).map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : naira(totalSpend)}</p>
          <p className="text-sm opacity-70 mt-1">Total Spend {year}</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : naira(totalProcurement)}</p>
          <p className="text-sm opacity-70 mt-1">Procurement</p>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : naira(totalMaintenance)}</p>
          <p className="text-sm opacity-70 mt-1">Maintenance &amp; Repairs</p>
        </div>
        <div className={`rounded-2xl p-5 ${totalBudget && totalSpend > totalBudget ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          <p className="text-2xl font-bold">{loading ? "..." : totalBudget ? naira(totalBudget - totalSpend) : "—"}</p>
          <p className="text-sm opacity-70 mt-1">{totalBudget ? "Budget Remaining" : "No budgets set"}</p>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Monthly Spend — {year}</h3>
        <div className="flex items-end gap-2 h-40">
          {monthly.map((amt, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-slate-400">{amt > 0 ? `₦${(amt/1000).toFixed(0)}k` : ""}</span>
              <div className="w-full bg-amber-400 rounded-t-md transition-all hover:bg-amber-500"
                style={{ height: `${(amt / maxMonth) * 100}%`, minHeight: amt > 0 ? "4px" : "1px" }}
                title={`${MONTHS[i]}: ${naira(amt)}`} />
              <span className="text-[10px] text-slate-400">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Budget vs actual per cost code */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Cost Code — Budget vs Actual ({year})</h3>
          <p className="text-slate-400 text-xs mt-0.5">Procurement + completed maintenance, grouped by cost code</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["Cost Code","Procurement","Maintenance","Total Actual","Budget","Variance",""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              : codes.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  No spend recorded for {year} yet — data appears as Procurement and Maintenance record costs.</td></tr>
              : codes.map(code => {
                const s = codeSpend[code];
                const actual = s.procurement + s.maintenance;
                const budget = budgetFor(code);
                const variance = budget - actual;
                const editing = editBudget[code] !== undefined;
                return (
                  <tr key={code} className="hover:bg-amber-50/20">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{code}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{naira(s.procurement)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{naira(s.maintenance)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{naira(actual)}</td>
                    <td className="px-4 py-3 text-xs">
                      {editing ? (
                        <input type="number" autoFocus
                          className="w-28 border border-amber-300 rounded-lg px-2 py-1 text-xs"
                          value={editBudget[code]}
                          onChange={e => setEditBudget(p => ({ ...p, [code]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && saveBudget(code)} />
                      ) : budget ? naira(budget) : <span className="text-slate-300">not set</span>}
                    </td>
                    <td className={`px-4 py-3 text-xs font-semibold ${
                      !budget ? "text-slate-300" : variance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {budget ? (variance < 0 ? `−${naira(Math.abs(variance)).slice(1)} over` : naira(variance)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canEditBudget && (editing ? (
                        <button onClick={() => saveBudget(code)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">Save</button>
                      ) : (
                        <button onClick={() => setEditBudget(p => ({ ...p, [code]: String(budget || "") }))}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium">
                          Set budget
                        </button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        ℹ️ Template scope: spend data flows in live from Procurement purchases and completed Maintenance jobs.
        Revenue (rental billing), payroll, and full ledger integration are Phase-2 items — the cost-code
        structure here is already the backbone they will plug into.
      </div>
    </div>
  );
}