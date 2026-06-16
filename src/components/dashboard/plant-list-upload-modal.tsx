/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

function extractRegion(location: string): string {
  if (!location) return "Nigeria";
  const parts = location.split(" - ");
  const last = parts[parts.length - 1].trim();
  const valid = ["Edo","Abia","Delta","Imo","Abuja","Cross River","Kaduna","North"];
  if (valid.includes(last)) return last;
  if (/\bEdo\b/i.test(location))      return "Edo";
  if (/\bAbia\b/i.test(location))     return "Abia";
  if (/\bDelta\b/i.test(location))    return "Delta";
  if (/\bImo\b/i.test(location))      return "Imo";
  if (/\bAbuja\b/i.test(location))    return "Abuja, FCT";
  if (/cross.?river/i.test(location)) return "Cross River";
  if (/kaduna/i.test(location))       return "North";
  return "Nigeria";
}

function mapCondition(raw: string): string {
  const r = (raw || "").toLowerCase().trim();
  if (r === "working")      return "Good";
  if (r === "idle")         return "Fair";
  if (r === "break down")   return "Poor-Fair";
  if (r === "scrapped")     return "Scrapped";
  if (r === "stand by")     return "Fair-Good";
  if (r === "under repair") return "Poor-Fair";
  const map: Record<string,string> = {
    "very good":"Very Good","good":"Good","fair-good":"Fair-Good",
    "fair":"Fair","poor-fair":"Poor-Fair","poor":"Poor","scrapped":"Scrapped"
  };
  return map[r] || "Good";
}

function mapCategory(desc: string): string {
  const t = (desc || "").toLowerCase();
  if (t.includes("asphalt")||t.includes("hot mix")||t.includes("paver")||
      t.includes("bitumen")||t.includes("compactor")||t.includes("roller")||
      t.includes("vibratory")) return "Asphalt & Road Maintenance Equipment";
  if (t.includes("concrete")||t.includes("mixer")||t.includes("batching"))
    return "Concrete Equipment";
  if (t.includes("crane")||t.includes("lifting")||t.includes("forklift"))
    return "Crane & Lifting Equipment";
  if (t.includes("excavat")||t.includes("bulldoz")||t.includes("dozer")||
      t.includes("grader")||t.includes("loader")||t.includes("dump truck")||
      t.includes("scraper")||t.includes("backhoe")||t.includes("tracked"))
    return "Earth Moving Equipment";
  if (t.includes("generator")||t.includes("genset")) return "Generator & Power Equipment";
  if (t.includes("compressor")||t.includes("pneumat")||t.includes("screw air"))
    return "Pneumatic Equipment";
  if (t.includes("pickup")||t.includes("saloon")||t.includes("suv")||
      t.includes("sedan")||t.includes("bus")||t.includes("coaster")||
      t.includes("ambulance")||t.includes("utility")||t.includes("light vehicle"))
    return "Light Vehicle";
  if (t.includes("truck")||t.includes("tipper")||t.includes("trailer")||
      t.includes("articulated")||t.includes("rigid dump")||t.includes("haulage"))
    return "Heavy Transport";
  if (t.includes("piling")||t.includes("boring")) return "Piling Equipment";
  if (t.includes("survey")||t.includes("total station")) return "Survey Equipment";
  if (t.includes("welding")||t.includes("workshop")||t.includes("lathe"))
    return "Workshop Equipment";
  return "Other";
}

function cleanFleet(raw: string): string {
  return String(raw||"").replace(/~+$/,"").replace(/\s*\(.*?\)\s*$/g,"").trim();
}

// Get a value from a row trying multiple key variations
function get(row: Record<string,string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()] || "";
    if (val && val.trim()) return val.trim();
  }
  return "";
}

export function PlantListUploadModal({ open, onClose }: {
  open: boolean; onClose: () => void;
}) {
  const { profile } = useAuth();

  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<Record<string,string>[]>([]);
  const [total,    setTotal]    = useState(0);
  const [allRows,  setAllRows]  = useState<Record<string,string>[]>([]);
  const [step,     setStep]     = useState<"pick"|"preview"|"importing"|"done">("pick");
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [skipped,  setSkipped]  = useState(0);
  const [error,    setError]    = useState<string|null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setError(null);
    setFile(f);
    try {
      const XLSX = await import("xlsx");
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array", cellDates:false });

      const allValid: Record<string,string>[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws  = wb.Sheets[sheetName];

        // Get raw array of arrays first to find header row
        const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1, defval: "", raw: false
        });

        // Find the header row — look for row containing "Fleet no" or "fleet no"
        let headerRowIdx = -1;
        let headers: string[] = [];
        for (let i = 0; i < Math.min(aoa.length, 10); i++) {
          const row = aoa[i] as string[];
          const rowStr = row.map(c => String(c||"").toLowerCase().trim());
          if (rowStr.some(c => c === "fleet no" || c === "fleet non" || c === "fleetno")) {
            headerRowIdx = i;
            headers = row.map(c => String(c||"").toLowerCase().trim());
            break;
          }
        }

        if (headerRowIdx === -1) continue; // no header row found in this sheet

        // Build rows from header row onwards
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
          const row = aoa[i] as string[];
          const obj: Record<string,string> = {};
          headers.forEach((h, idx) => {
            obj[h] = String(row[idx] ?? "").trim();
          });

          // Must have a valid fleet number
          const fn = cleanFleet(
            obj["fleet no"] || obj["fleet non"] || obj["fleetno"] || obj["fullfleetn"] || ""
          );
          if (fn.length >= 3 && /[A-Z]/.test(fn)) {
            obj["_fleet"] = fn; // store cleaned fleet number
            allValid.push(obj);
          }
        }
      }

      // Deduplicate by fleet number
      const seen = new Set<string>();
      const deduped = allValid.filter(r => {
        const fn = r["_fleet"];
        if (seen.has(fn)) return false;
        seen.add(fn);
        return true;
      });

      setAllRows(deduped);
      setTotal(deduped.length);

      const prev = deduped.slice(0, 10).map(r => ({
        fleet_number: r["_fleet"],
        description:  (r["type"] || r["descriptio"] || "—").slice(0, 50),
        make:         r["make"] || "—",
        location:     (r["location"] || "—").slice(0, 45),
        region:       extractRegion(r["location"] || ""),
        condition:    r["condition"] || r["assessment"] || "—",
      }));

      setPreview(prev);
      setStep("preview");
    } catch (e) {
      console.error(e);
      setError("Could not read file. Please use the Hartland Master Plant List .xls or .xlsx.");
    }
  }

  async function handleImport() {
    if (!allRows.length) return;
    setStep("importing");
    setProgress(0);
    let ok = 0, fail = 0;

    // Get existing fleet numbers to skip duplicates
    const { data: existingData } = await dbu
      .from("equipment").select("fleet_number");
    const existingFleets = new Set((existingData || []).map((e: any) => e.fleet_number));

    // Build all records first
    const records: any[] = [];
    for (let i = 0; i < allRows.length; i++) {
      const r       = allRows[i];
      const fleetNo = r["_fleet"];
      if (!fleetNo || existingFleets.has(fleetNo)) {
        fail++;
        setProgress(i + 1);
        setSkipped(fail);
        continue;
      }

      const location  = (r["location"] || "").trim();
      const region    = extractRegion(location);
      const rawCond   = r["condition"] || r["assessment"] || r["cond"] || "";
      const desc      = (r["type"] || r["descriptio"] || fleetNo).slice(0,200).trim();
      const make      = (r["make"] || "Unknown").trim();
      const model     = (r["model"] || "").trim();
      const typeCode  = (r["type code"] || r["typecode"] || "").trim();
      const regNo     = (r["reg no"] || r["regno"] || r["vin"] || "").trim();
      const projCode  = (r["proj code"] || r["projcode"] || "").trim();
      let   year      = parseInt(r["maf year"] || r["mfgyear"] || "0") || 0;
      if (year > 2100 || year < 1900) year = 0;
      const lc        = parseFloat((r["landed cost"]||r["landedcost"]||"0").replace(/,/g,""))||0;

      // Build record as plain object — no strict typing issues
      const record = {
        fleet_number:          fleetNo,
        fleet_status:          "Addition",
        description:           desc,
        category:              mapCategory(desc),
        make,
        model,
        type_code:             typeCode,
        chassis_no:            "",
        serial_no:             "",
        reg_no:                regNo,
        engine_power:          "",
        engine_displacement:   "",
        size_capacity:         "",
        tank_capacity:         "",
        meter_device:          "Hours",
        year_of_manufacturing: year,
        life_expectancy:       "",
        date_received:         null,
        date_commissioned:     new Date().toISOString().slice(0,10),
        equipment_condition:   mapCondition(rawCond),
        depreciation:          "",
        condition_at_receipt:  "Second Hand",
        supplier:              "",
        supplier_code:         "",
        order_no:              "",
        invoice_no:            "",
        area_project:          location,
        location,
        cost_code:             projCode,
        region:                region || "Nigeria",
        policy_cover_no:       "",
        insurance_expiry:      null,
        total_loss:            false,
        all_risk_comprehensive: false,
        third_party_liability: false,
        plant_all_risk:        false,
        insurance_company:     "",
        insured_sum:           0,
        annual_premium:        0,
        purchase_cost:         0,
        freight:               0,
        insurance_on_sea:      0,
        clearing_customs:      0,
        inland_transport:      0,
        other_charges:         0,
        landed_cost:           lc,
        opening_hour_meter:    0,
        opening_kilometer:     0,
        plant_engineer:        "",
        plant_manager:         "",
        remarks:               `Imported ${new Date().toLocaleDateString("en-GB")}`,
        commissioned_by:       profile?.id || "",
      };

      records.push(record);
      setProgress(i + 1);
    }

    // Bulk insert in batches of 50
    const BATCH = 50;
    for (let b = 0; b < records.length; b += BATCH) {
      const batch = records.slice(b, b + BATCH);
      try {
        // Insert into commissioning
        const { data: commData, error: commErr } = await dbu
          .from("commissioning").insert(batch).select("id,fleet_number,description,location,region,equipment_condition,fleet_status,opening_hour_meter,opening_kilometer,make,model,type_code,reg_no,year_of_manufacturing,purchase_cost,landed_cost,meter_device,policy_cover_no,insurance_expiry,supplier,supplier_code,order_no,invoice_no,date_commissioned,cost_code");

        if (!commErr && commData) {
          // Build equipment records from commissioning data
          const equipRecords = commData.map((c: any) => ({
            code:                  c.fleet_number,
            fleet_number:          c.fleet_number,
            commissioning_id:      c.id,
            name:                  c.description || c.fleet_number,
            type_code:             c.type_code || "",
            category:              mapCategory(c.description || ""),
            make:                  c.make || "Unknown",
            model:                 c.model || "",
            year:                  c.year_of_manufacturing || 0,
            year_of_manufacturing: c.year_of_manufacturing || 0,
            serial_no:             "",
            chassis_no:            "",
            reg_no:                c.reg_no || "",
            engine_power:          "",
            size_capacity:         "",
            tank_capacity:         "",
            meter_device:          c.meter_device || "Hours",
            site:                  c.location || "",
            region:                c.region || "",
            operational_status:    mapCondition(c.equipment_condition || "") === "Scrapped" ? "Scrapped" : "Working",
            assessment:            c.equipment_condition || "Good",
            fleet_status:          c.fleet_status || "Addition",
            current_hour_meter:    c.opening_hour_meter || 0,
            current_kilometer:     c.opening_kilometer || 0,
            commission_date:       c.date_commissioned || new Date().toISOString().slice(0,10),
            purchase_cost:         c.purchase_cost || 0,
            landed_cost:           c.landed_cost || 0,
            insurance_policy:      c.policy_cover_no || "",
            insurance_expiry:      c.insurance_expiry || null,
            supplier:              c.supplier || "",
            supplier_code:         c.supplier_code || "",
            order_no:              c.order_no || "",
            invoice_no:            c.invoice_no || "",
          }));

          const { error: eqErr } = await dbu.from("equipment").insert(equipRecords);
          if (!eqErr) {
            ok += batch.length;
          } else {
            fail += batch.length;
            console.error("Equipment batch error:", eqErr.message);
          }
        } else {
          fail += batch.length;
          console.error("Commissioning batch error:", commErr?.message);
        }
      } catch (e) {
        fail += batch.length;
        console.error("Batch error:", e);
      }

      setImported(ok);
      setSkipped(fail);
      // Small delay between batches to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    setStep("done");
  }

  function reset() {
    setFile(null); setPreview([]); setAllRows([]); setTotal(0);
    setStep("pick"); setProgress(0); setImported(0); setSkipped(0); setError(null);
  }
  function handleClose() { reset(); onClose(); }
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Bulk Import</p>
            <h2 className="text-lg font-bold text-white">Upload Master Plant List</h2>
          </div>
          {step !== "importing" && (
            <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          )}
        </div>

        <div className="p-7 space-y-5">

          {step === "pick" && (
            <>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-amber-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all">
                <div className="text-5xl mb-3">📊</div>
                <p className="font-bold text-slate-700 text-lg">Click to select file</p>
                <p className="text-slate-400 text-sm mt-1">Hartland Master Plant List (.xls or .xlsx)</p>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
            </>
          )}

          {step === "preview" && (
            <>
              <div className={`${total>0?"bg-emerald-50 border-emerald-200":"bg-red-50 border-red-200"} border rounded-xl p-4 flex items-center gap-3`}>
                <span className="text-2xl">{total>0?"✅":"⚠️"}</span>
                <div>
                  <p className={`font-bold text-sm ${total>0?"text-emerald-800":"text-red-800"}`}>
                    {total>0 ? `${total} valid equipment records found` : "No valid records found — wrong file?"}
                  </p>
                  <p className={`text-xs mt-0.5 ${total>0?"text-emerald-600":"text-red-600"}`}>{file?.name}</p>
                </div>
              </div>

              {total > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview — first 10 records</p>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>{["Fleet No.","Description","Make","Site","Region","Status"].map(h=>(
                          <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.map((r,i)=>(
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-amber-700">{r.fleet_number}</td>
                            <td className="px-3 py-2 truncate max-w-35 text-slate-700">{r.description}</td>
                            <td className="px-3 py-2 text-slate-600">{r.make}</td>
                            <td className="px-3 py-2 truncate max-w-27.5 text-slate-500">{r.location}</td>
                            <td className="px-3 py-2 text-slate-500">{r.region}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${
                                r.condition==="Working"?"bg-emerald-100 text-emerald-700":
                                r.condition==="Scrapped"?"bg-red-100 text-red-600":
                                r.condition==="Break Down"?"bg-orange-100 text-orange-700":
                                "bg-slate-100 text-slate-500"}`}>{r.condition||"—"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Showing first 10 of {total} records.</p>
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
                  ← Change File
                </button>
                {total > 0 && (
                  <button onClick={handleImport} className="px-8 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">
                    Import All {total} Records →
                  </button>
                )}
              </div>
            </>
          )}

          {step === "importing" && (
            <div className="py-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                <p className="font-bold text-slate-800 text-lg">Importing equipment...</p>
                <p className="text-slate-500 text-sm mt-1">Please keep this tab open</p>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>{progress} of {total} processed</span>
                  <span>{Math.round((progress/Math.max(total,1))*100)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{width:`${(progress/Math.max(total,1))*100}%`}}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{imported}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Imported</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-500">{skipped}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Skipped</p>
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <p className="font-bold text-slate-800 text-xl">Import Complete!</p>
              <p className="text-slate-500 text-sm">{imported} records created · {skipped} skipped</p>
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{imported}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Imported</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-600">{skipped}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Skipped</p>
                </div>
              </div>
              <button onClick={handleClose} className="px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
                Done — View Equipment →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}