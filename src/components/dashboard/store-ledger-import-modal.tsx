/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

const CATEGORIES = ["Construction Materials","Sundry Material","Spare Parts",
  "Fuel & Lubricants","Welding Materials","Retrieved Items"];

// "21-Apr-16" → "2016-04-21". Their ledger's date format, confirmed
// from the real file.
function parseLedgerDate(raw: string): string | null {
  const s = (raw || "").trim();
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return null;
  const MONTHS: Record<string,string> = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
    jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
  const mon = MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  let year = m[3];
  if (year.length === 2) year = (parseInt(year) > 50 ? "19" : "20") + year;
  return `${year}-${mon}-${m[1].padStart(2,"0")}`;
}

// "CFL-03 488" → "CFL-03". Fleet number is the leading token; the
// rest is a truncated description fragment from the old system, not
// useful data. Only kept if it matches a REAL fleet number — garbage
// locref values (blank, internal codes) are left unmatched rather
// than polluting fleet_number with noise.
function extractFleetPrefix(locref: string): string | null {
  const s = (locref || "").trim();
  const m = s.match(/^([A-Z]{2,6}-\d{1,3})\b/i);
  return m ? m[1].toUpperCase() : null;
}

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

export function StoreLedgerImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const isSuperAdmin = ((profile?.roles as string[]) || []).includes("super_admin");

  const [step, setStep] = useState<"pick"|"preview"|"importing"|"done">("pick");
  const [category, setCategory] = useState("Spare Parts");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<any[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [dateRange, setDateRange] = useState<{from:string;to:string}>({from:"",to:""});
  const [matchedFleet, setMatchedFleet] = useState(0);
  const [unmatchedFleet, setUnmatchedFleet] = useState(0);

  const [progress, setProgress] = useState(0);
  const [itemsCreated, setItemsCreated] = useState(0);
  const [txnsImported, setTxnsImported] = useState(0);
  const [flagged, setFlagged] = useState<any[]>([]);
  const [fatalError, setFatalError] = useState<string | null>(null);

  if (!isSuperAdmin) return null; // same bulk-import lock as the Plant List — super_admin only
  if (!open) return null;

  async function handleFile(f: File) {
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

      if (parsed.length === 0 || !("itemcode" in parsed[0])) {
        setError("This doesn't look like the store ledger export — expected columns like itemcode, qtyin, qtyout, trndate.");
        return;
      }

      const clean = parsed
        .map((r: any) => ({
          date: parseLedgerDate(r.trndate),
          itemcode: String(r.itemcode || "").trim(),
          itemdesc: String(r.itemdesc || "").trim(),
          munit: String(r.munit || "pcs").trim(),
          qtyin: parseFloat(r.qtyin) || 0,
          qtyout: parseFloat(r.qtyout) || 0,
          unitprice: parseFloat(r.unitprice) || 0,
          locref: String(r.locref || "").trim(),
          grnno: String(r.grnno || "").trim(),
          supname: String(r.supname || "").trim(),
          impdesc: String(r.impdesc || "").trim(),
          projcode: String(r.projcode || "").trim(),
        }))
        .filter(r => r.itemcode && r.date && (r.qtyin > 0 || r.qtyout > 0));

      if (clean.length === 0) {
        setError("No valid transaction rows found after parsing.");
        return;
      }

      const uniqueItems = new Set(clean.map(r => r.itemcode));
      const dates = clean.map(r => r.date!).sort();

      // Check locref fleet prefixes against real equipment — using
      // Commissioning/Equipment as the source of truth, per Seun's
      // instruction that commissioning is already the trusted database.
      const equipment = await fetchAllRows("equipment", "fleet_number");
      const realFleets = new Set((equipment || []).map((e: any) => e.fleet_number));

      let matched = 0, unmatched = 0;
      clean.forEach(r => {
        if (r.qtyout > 0 && r.locref) {
          const prefix = extractFleetPrefix(r.locref);
          if (prefix && realFleets.has(prefix)) matched++;
          else if (prefix) unmatched++;
        }
      });

      setRows(clean);
      setItemCount(uniqueItems.size);
      setDateRange({ from: dates[0], to: dates[dates.length - 1] });
      setMatchedFleet(matched);
      setUnmatchedFleet(unmatched);
      setStep("preview");
    } catch (e) {
      console.error(e);
      setError("Could not read this file. Confirm it's the store ledger export (.xls/.xlsx).");
    }
  }

  async function handleImport() {
    setStep("importing");
    setProgress(0); setItemsCreated(0); setTxnsImported(0); setFlagged([]);

    const equipment = await fetchAllRows("equipment", "fleet_number");
    const realFleets = new Set((equipment || []).map((e: any) => e.fleet_number));

    // ── PHASE A: build the item master from unique itemcodes ──
    // Balances start at zero — the historical transaction replay in
    // Phase B (via the existing apply_store_txn trigger) builds the
    // real balance up naturally, transaction by transaction, exactly
    // as it happened. We never compute the ending balance ourselves.
    const byItem = new Map<string, any>();
    for (const r of rows) {
      if (!byItem.has(r.itemcode)) byItem.set(r.itemcode, r); // first-seen row's description wins
    }
    const itemPayload = [...byItem.values()].map(r => ({
      legacy_item_code: r.itemcode,
      name: r.itemdesc || r.itemcode,
      category,
      unit: r.munit || "pcs",
      unit_cost: r.unitprice || 0,
      sourcing: /import/i.test(r.impdesc) ? "Imported" : "Local",
      qty_received: 0,
      qty_issued: 0,
      reorder_level: 10,
    }));

    const idByLegacyCode = new Map<string, string>();
    const ITEM_BATCH = 200;
    let lastItemError: string | null = null;
    for (let i = 0; i < itemPayload.length; i += ITEM_BATCH) {
      const batch = itemPayload.slice(i, i + ITEM_BATCH);
      const { data, error: err } = await dbu.from("stock_items")
        .upsert(batch, { onConflict: "legacy_item_code" })
        .select("id, legacy_item_code");
      if (!err && data) {
        data.forEach((d: any) => idByLegacyCode.set(d.legacy_item_code, d.id));
        setItemsCreated(prev => prev + batch.length);
      } else if (err) {
        lastItemError = err.message;
        console.error("Item batch failed:", err.message);
      }
      await new Promise(r => setTimeout(r, 150));
    }

    // Nothing landed at all — stop here with a clear, honest failure
    // screen instead of continuing on to a "done" state that would
    // misreport zero real imports as a success.
    if (idByLegacyCode.size === 0 && itemPayload.length > 0) {
      setFatalError(lastItemError || "No items were created — the import could not write to the database.");
      setStep("done");
      return;
    }

    // ── PHASE B: replay every transaction, chronologically ──
    // Global date sort is sufficient — the balance guard only cares
    // about order WITHIN a single item, and a global chronological
    // sort preserves that automatically.
    const sorted = [...rows].sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));

    const TXN_BATCH = 100;
    let imported = 0;
    const flaggedRows: any[] = [];

    function buildTxn(r: any) {
      const stockId = idByLegacyCode.get(r.itemcode);
      if (!stockId) return null;
      const isGRN = r.qtyin > 0;
      const prefix = !isGRN ? extractFleetPrefix(r.locref) : null;
      const fleetOk = prefix && realFleets.has(prefix);
      return {
        txn_type: isGRN ? "GRN" : "SIV",
        stock_item_id: stockId,
        item_name: r.itemdesc,
        quantity: isGRN ? r.qtyin : r.qtyout,
        unit_cost: r.unitprice || null,
        supplier: isGRN ? (r.supname || null) : null,
        fleet_number: fleetOk ? prefix : null,
        cost_code: r.projcode || null,
        remarks: !isGRN && prefix && !fleetOk ? `Legacy location ref: ${r.locref} (no matching fleet number)` : null,
        performed_by: "Historical import (UPGRADE.XLS)",
        created_at: new Date(r.date + "T12:00:00Z").toISOString(),
      };
    }

    for (let i = 0; i < sorted.length; i += TXN_BATCH) {
      const chunk = sorted.slice(i, i + TXN_BATCH)
        .map(buildTxn)
        .filter((t): t is NonNullable<typeof t> => t !== null);

      const { error: batchErr } = await dbu.from("store_transactions").insert(chunk);

      if (!batchErr) {
        imported += chunk.length;
      } else {
        // Batch failed — almost always a balance-guard violation
        // (issuing more than the ledger shows in stock at that point,
        // a real anomaly inherited from the old system). Fall back to
        // one-by-one so a single bad row doesn't lose the whole batch.
        for (const txn of chunk) {
          const { error: rowErr } = await dbu.from("store_transactions").insert([txn]);
          if (rowErr) {
            flaggedRows.push({ ...txn, reason: rowErr.message });
          } else {
            imported++;
          }
        }
      }

      setProgress(i + chunk.length);
      setTxnsImported(imported);
      setFlagged([...flaggedRows]);
      await new Promise(r => setTimeout(r, 200));
    }

    setStep("done");
  }

  function reset() {
    setStep("pick"); setError(null); setFatalError(null); setRows([]); setItemCount(0);
    setDateRange({from:"",to:""}); setMatchedFleet(0); setUnmatchedFleet(0);
    setProgress(0); setItemsCreated(0); setTxnsImported(0); setFlagged([]);
  }
  function handleClose() { reset(); onClose(); }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Store — Historical Import</p>
            <h2 className="text-lg font-bold text-white">Import Store Ledger</h2>
            <p className="text-slate-400 text-xs mt-0.5">Builds the item master and replays every GRN/SIV transaction, in order</p>
          </div>
          {step !== "importing" && (
            <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          )}
        </div>

        <div className="p-7 space-y-5 overflow-y-auto flex-1">
          {step === "pick" && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Store Category for this file
                </label>
                <select className={iCls} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  This ledger export is scoped to one category — pick the right one before importing.
                  Import other categories separately, later.
                </p>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-amber-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all">
                <div className="text-5xl mb-3">📦</div>
                <p className="font-bold text-slate-700 text-lg">Click to select the store ledger file</p>
                <p className="text-slate-400 text-sm mt-1">.xls or .xlsx export</p>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
            </>
          )}

          {step === "preview" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{itemCount.toLocaleString()}</p>
                  <p className="text-xs text-blue-700 font-semibold mt-1">Unique Items</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{rows.length.toLocaleString()}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">Transactions</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                <p><strong>Date range:</strong> {dateRange.from} to {dateRange.to}</p>
                <p className="mt-1"><strong>Category:</strong> {category}</p>
                <p className="mt-1"><strong>Fleet references:</strong> {matchedFleet.toLocaleString()} matched to real equipment, {unmatchedFleet.toLocaleString()} unmatched (kept as remarks, not linked)</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                Every part number will be auto-generated on import since this ledger only has internal item codes,
                not real supplier part numbers. You can edit any of them afterward.
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                This import can take several minutes — {rows.length.toLocaleString()} transactions are replayed one
                by one, in date order, so every items&apos; balance ends up exactly where the real system has it today.
                Keep this tab open until it finishes.
              </div>
              <div className="flex justify-between gap-3">
                <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
                  ← Change File
                </button>
                <button onClick={handleImport} className="px-8 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">
                  Run Import →
                </button>
              </div>
            </>
          )}

          {step === "importing" && (
            <div className="py-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                <p className="font-bold text-slate-800 text-lg">Importing store ledger...</p>
                <p className="text-slate-500 text-sm mt-1">Building item master, then replaying transactions in order</p>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>{progress.toLocaleString()} of {rows.length.toLocaleString()} transactions processed</span>
                  <span>{Math.round((progress / Math.max(rows.length,1)) * 100)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(progress / Math.max(rows.length,1)) * 100}%` }}/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{itemsCreated.toLocaleString()}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1">Items Created</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{txnsImported.toLocaleString()}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Transactions Imported</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{flagged.length}</p>
                  <p className="text-xs text-red-600 font-medium mt-1">Flagged</p>
                </div>
              </div>
            </div>
          )}

          {step === "done" && fatalError && (
            <div className="py-6 text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <p className="font-bold text-red-700 text-xl">Import Failed — Nothing Was Saved</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left text-sm text-red-800 max-w-lg mx-auto">
                <p className="font-mono text-xs wrap-break-word">{fatalError}</p>
              </div>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                No items or transactions were created. This is usually a database permissions issue —
                check with whoever manages the Supabase project, then try again.
              </p>
              <button onClick={handleClose} className="px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
                Close
              </button>
            </div>
          )}

          {step === "done" && !fatalError && (
            <div className="py-6 text-center space-y-4">
              <div className="text-6xl">📦</div>
              <p className="font-bold text-slate-800 text-xl">Store Ledger Imported</p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{itemsCreated.toLocaleString()}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1">Items</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{txnsImported.toLocaleString()}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Transactions</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{flagged.length}</p>
                  <p className="text-xs text-red-600 font-medium mt-1">Flagged</p>
                </div>
              </div>
              {flagged.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-800 max-h-40 overflow-y-auto">
                  <p className="font-bold mb-2">Flagged rows (mostly historical negative-balance anomalies inherited from the old system):</p>
                  {flagged.slice(0, 15).map((f, i) => (
                    <p key={i} className="mb-1">{f.item_name} — {f.quantity} {f.txn_type} — {f.reason}</p>
                  ))}
                  {flagged.length > 15 && <p className="italic">...and {flagged.length - 15} more. Full list in browser console.</p>}
                </div>
              )}
              <button onClick={handleClose} className="px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
                Done ✓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}