/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

// Guess the region from a location string
function extractRegion(location: string): string {
  if (!location) return "Nigeria";
  const l = location.toLowerCase();
  if (/\bedo\b/.test(l))         return "Edo";
  if (/\babia\b/.test(l))        return "South East";
  if (/\bdelta\b/.test(l))       return "Delta";
  if (/\bimo\b/.test(l))         return "South East";
  if (/\babuja\b|fct/.test(l))   return "Abuja, FCT";
  if (/cross.?river/.test(l))    return "South South";
  if (/kaduna/.test(l))          return "North";
  if (/abia|ohafia|aba|umuahia/.test(l)) return "South East";
  return "Nigeria";
}

// The master list has TWO separate columns discovered from the real file:
//   Assessment = condition rating  (Good, Scrapped, Very Poor, Brand New...)
//   Condition  = operational state (Working, Idle, Break Down, Disposed...)
// Both must be read — Assessment carries the 95 Scrapped machines that a
// Condition-only read completely misses.

// Assessment column → BuildFleet assessment value
function mapAssessment(assessRaw: string, condRaw: string): string {
  const a = (assessRaw || "").toLowerCase().trim();
  const map: Record<string, string> = {
    "very good": "Very Good", "good": "Good", "new": "Very Good",
    "brand new": "Very Good", "fair-good": "Fair-Good", "fair good": "Fair-Good",
    "fair": "Fair", "poor-fair": "Poor-Fair", "poor": "Poor",
    "very poor": "Poor", "accident": "Poor",
    "scrapped": "Scrapped", "deleted": "Scrapped", "cannibalized": "Scrapped",
  };
  if (map[a]) return map[a];
  // No assessment given — fall back to a guess from operational state
  const c = (condRaw || "").toLowerCase().trim();
  if (c === "disposed") return "Scrapped";
  if (c === "break down") return "Poor-Fair";
  return "Good";
}

// Assessment + Condition → operational_status
function mapOperationalStatus(assessRaw: string, condRaw: string): string {
  const a = (assessRaw || "").toLowerCase().trim();
  const c = (condRaw || "").toLowerCase().trim();
  // Scrapped-class assessment or Disposed condition overrides everything —
  // a machine assessed as scrapped is scrapped even if its last recorded
  // operational state was "Break Down" or "Idle".
  if (["scrapped", "deleted", "cannibalized"].includes(a) || c === "disposed") return "Scrapped";
  if (c === "working" || c === "testing") return "Working";
  if (c === "break down")   return "Break Down";
  if (c === "under repair") return "Under Repair";
  if (c === "idle" || c === "storage" || c === "stand by") return "Storage";
  return "Working";
}

// Map description text → equipment category
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
  if (t.includes("welding")||t.includes("workshop")||t.includes("lathe"))
    return "Workshop Equipment";
  return "Other";
}

// Strip trailing ~ and bracket notes from fleet numbers
function cleanFleet(raw: string): string {
  return String(raw || "").replace(/~+$/, "").replace(/\s*\(.*?\)\s*$/g, "").trim();
}

// Parse "MM/DD/YYYY" → "YYYY-MM-DD" for Postgres
// Returns null if the date is blank or invalid
function parseCommDate(raw: string): string | null {
  const cleaned = (raw || "").trim();
  // These are the "no date" placeholders in the Hartland file
  if (!cleaned || cleaned === "  -   -" || cleaned === "-   -" || cleaned === "- -") return null;
  const parts = cleaned.split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (y.length === 4 && parseInt(y) > 1990) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// CATEGORY HIRE RATES (same as commissioning page)
// ─────────────────────────────────────────────────────────────
const CATEGORY_HIRE_RATES: Record<string, number> = {
  "Light Vehicle":                        7000,
  "Heavy Transport":                      25000,
  "Earth Moving Equipment":               15000,
  "Asphalt & Road Maintenance Equipment": 55000,
  "Concrete Equipment":                   35000,
  "Crane & Lifting Equipment":            95000,
  "Generator & Power Equipment":          12000,
  "Pneumatic Equipment":                  6500,
  "Workshop Equipment":                   0,
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export function PlantListUploadModal({ open, onClose }: {
  open: boolean; onClose: () => void;
}) {
  const { profile } = useAuth();

  // ── State ─────────────────────────────────────────────────
  const [file,      setFile]      = useState<File | null>(null);
  const [step,      setStep]      = useState<"pick"|"preview"|"importing"|"done">("pick");
  const [error,     setError]     = useState<string | null>(null);

  // All parsed rows from the Excel file
  const [allRows,   setAllRows]   = useState<Record<string, string>[]>([]);

  // After checking DB: split into 3 buckets
  const [toUpdate,  setToUpdate]  = useState<Record<string, string>[]>([]);
  const [toInsert,  setToInsert]  = useState<Record<string, string>[]>([]);
  const [toSkip,    setToSkip]    = useState<number>(0);

  // Progress during import
  const [progress,  setProgress]  = useState(0);
  const [updated,   setUpdated]   = useState(0);
  const [inserted,  setInserted]  = useState(0);
  const [failed,    setFailed]    = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── STEP 1: Parse the uploaded Excel file ─────────────────
  async function handleFile(f: File) {
    setError(null);
    setFile(f);

    try {
      // Dynamically import SheetJS — it's already in your project
      const XLSX = await import("xlsx");
      const buf  = await f.arrayBuffer();

      // cellDates:false means dates come as raw strings, not JS Date objects
      // This is safer for parsing Hartland's mixed date formats
      const wb = XLSX.read(buf, { type: "array", cellDates: false });

      const allValid: Record<string, string>[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];

        // sheet_to_json with header:1 gives us a 2D array (array of arrays)
        // Each inner array is one row, we handle headers manually
        const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1, defval: "", raw: false,
        });

        // ── Find the header row ──
        // We look for a row that contains "fleet no" in one of its cells
        // The Hartland file has a title row first, then the header row
        let headerRowIdx = -1;
        let headers: string[] = [];

        for (let i = 0; i < Math.min(aoa.length, 10); i++) {
          const row    = aoa[i] as string[];
          const rowStr = row.map(c => String(c || "").toLowerCase().trim());
          if (rowStr.some(c => c === "fleet no" || c === "fleet non" || c === "fleetno")) {
            headerRowIdx = i;
            // Store headers in lowercase so we can look them up case-insensitively
            headers = row.map(c => String(c || "").toLowerCase().trim());
            break;
          }
        }

        if (headerRowIdx === -1) continue; // this sheet has no recognised header

        // ── Parse data rows ──
        // Every row after the header row is a potential equipment record
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
          const row = aoa[i] as string[];

          // Build a plain object: { "fleet no": "AC-07", "make": "Atlas Copco", ... }
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = String(row[idx] ?? "").trim();
          });

          // Clean the fleet number — skip rows with invalid/empty fleet numbers
          const fn = cleanFleet(
            obj["fleet no"] || obj["fleet non"] || obj["fleetno"] || ""
          );

          // A valid fleet number is at least 3 chars and contains a letter
          // (rules out blank rows and pure-number serial rows)
          if (fn.length >= 3 && /[A-Z]/i.test(fn)) {
            obj["_fleet"] = fn; // store cleaned fleet number for easy access later
            allValid.push(obj);
          }
        }
      }

      // ── Deduplicate by fleet number ──
      // If the same fleet number appears twice in the file, keep the first occurrence
      const seen    = new Set<string>();
      const deduped = allValid.filter(r => {
        if (seen.has(r["_fleet"])) return false;
        seen.add(r["_fleet"]);
        return true;
      });

      if (deduped.length === 0) {
        setError("No valid equipment records found. Check the file format.");
        return;
      }

      setAllRows(deduped);

      // ── Check which fleet numbers already exist in the DB ──
      // ★ FIX: Supabase caps every query at 1,000 rows. The old
      // single .select() silently returned only the first 1,000 of
      // 1,438 fleet numbers — so 438 real equipment were misread as
      // "new", sent down the INSERT path, and failed on duplicate
      // keys (the "438 Failed" you saw). fetchAllRows pages through
      // .range() windows until it has EVERY row.
      const existingData = await fetchAllRows("equipment", "fleet_number");

      const existingSet = new Set(
        (existingData || []).map((e: any) => e.fleet_number)
      );

      // Split rows into: update existing / insert new
      const updates: Record<string, string>[] = [];
      const inserts: Record<string, string>[] = [];
      let   skipCount = 0;

      for (const row of deduped) {
        const fn = row["_fleet"];
        if (!fn) { skipCount++; continue; }
        if (existingSet.has(fn)) {
          updates.push(row); // fleet already in DB → we will UPDATE it
        } else {
          inserts.push(row); // new fleet → we will INSERT it
        }
      }

      setToUpdate(updates);
      setToInsert(inserts);
      setToSkip(skipCount);
      setStep("preview");

    } catch (e) {
      console.error(e);
      setError("Could not read file. Please use the Hartland Master Plant List (.xls or .xlsx).");
    }
  }

  // ── STEP 2: Run the actual import ─────────────────────────
  async function handleImport() {
    setStep("importing");
    setProgress(0);
    setUpdated(0);
    setInserted(0);
    setFailed(0);

    // ── Fetch sites table to build proj_code → site lookup ──
    // ★ FIX: paginated too — 243 sites today is under the cap, but
    // the moment it grows past 1,000 this would silently truncate
    // the mapping. Same helper, future-proof.
    const sitesData = await fetchAllRows("sites", "legacy_code, name, region, code");

    // Build a map: old_proj_code → { name, region, code }
    const projToSite: Record<string, { name: string; region: string; code: string }> = {};
    (sitesData || []).forEach((s: any) => {
      if (s.legacy_code && !["NEW", "GENERATED"].includes(s.legacy_code)) {
        projToSite[s.legacy_code.trim()] = {
          name:   s.name,
          region: s.region,
          code:   s.code,
        };
      }
    });

    let ok_update = 0;
    let ok_insert = 0;
    let fail      = 0;
    const total   = toUpdate.length + toInsert.length;

    // ── PART A: UPDATE existing equipment ──
    // For each existing fleet number, we update:
    //   equipment.site         → new site name (from proj code → sites table)
    //   equipment.region       → from new site
    //   equipment.commission_date → from "date comm." column
    //   equipment.assessment   → from condition
    //   equipment.operational_status → from condition
    for (let i = 0; i < toUpdate.length; i++) {
      const row      = toUpdate[i];
      const fn       = row["_fleet"];
      const projCode = (row["proj code"] || row["projcode"] || "").trim();
      const rawDate  = row["date comm."] || row["datecomm"] || row["date comm"] || "";
      const rawAssess = row["assessment"] || "";
      const rawCond   = row["condition"] || "";
      const desc     = (row["type"] || row["descriptio"] || "").slice(0, 200);

      // Look up the new site using the old proj code
      const siteMatch = projToSite[projCode];

      // Build the UPDATE payload — only update what we have data for
      const equipUpdate: Record<string, any> = {};

      if (siteMatch) {
        // We found a matching site in our new system
        equipUpdate.site   = siteMatch.name;
        equipUpdate.region = siteMatch.region;
      }

      const commDate = parseCommDate(rawDate);
      if (commDate) {
        equipUpdate.commission_date = commDate;
      }

      if (rawCond || rawAssess) {
        equipUpdate.assessment         = mapAssessment(rawAssess, rawCond);
        equipUpdate.operational_status = mapOperationalStatus(rawAssess, rawCond);
      }

      if (desc) {
        // Update category from description in case it was wrong before
        const cat = mapCategory(desc);
        if (cat !== "Other") {
          equipUpdate.category  = cat;
          equipUpdate.hire_rate = CATEGORY_HIRE_RATES[cat] ?? 0;
        }
      }

      // Only run the update if we have something to update
      if (Object.keys(equipUpdate).length > 0) {
        const { error: err } = await dbu
          .from("equipment")
          .update(equipUpdate)
          .eq("fleet_number", fn);

        if (!err) {
          ok_update++;
          // Also update the commissioning table for the same fleet
          const commUpdate: Record<string, any> = {};
          if (siteMatch)   commUpdate.location          = siteMatch.name;
          if (siteMatch)   commUpdate.region            = siteMatch.region;
          if (commDate)    commUpdate.date_commissioned = commDate;
          if (rawCond || rawAssess) commUpdate.equipment_condition = mapAssessment(rawAssess, rawCond);

          if (Object.keys(commUpdate).length > 0) {
            await dbu.from("commissioning")
              .update(commUpdate)
              .eq("fleet_number", fn);
          }
        } else {
          fail++;
          console.error(`Update failed for ${fn}:`, err.message);
        }
      } else {
        ok_update++; // nothing to update = still a success (row matched, no data to change)
      }

      setProgress(i + 1);
      setUpdated(ok_update);
      setFailed(fail);
    }

    // ── PART B: INSERT new equipment ──
    // For fleet numbers not already in the DB, we insert fresh records
    // Same logic as before but now we use proj code → site name mapping
    const BATCH = 50; // insert 50 at a time to avoid timeouts
    const newRecords: any[] = [];
    // fleet_number → operational status, used when creating the equipment
    // rows after commissioning returns (assessment alone can't carry the
    // Working/Idle/Break Down distinction).
    const opMap: Record<string, string> = {};

    for (const row of toInsert) {
      const fn       = row["_fleet"];
      const projCode = (row["proj code"] || row["projcode"] || "").trim();
      const rawDate  = row["date comm."] || row["datecomm"] || row["date comm"] || "";
      const rawAssess = row["assessment"] || "";
      const rawCond   = row["condition"] || "";
      opMap[fn] = mapOperationalStatus(rawAssess, rawCond);
      const desc     = (row["type"] || row["descriptio"] || fn).slice(0, 200).trim();
      const make     = (row["make"] || "Unknown").trim();
      const model    = (row["model"] || "").trim();
      const typeCode = (row["type code"] || row["typecode"] || "").trim();
      const regNo    = (row["reg no"] || row["regno"] || row["vin"] || "").trim();
      let   year     = parseInt(row["maf year"] || row["mfgyear"] || "0") || 0;
      if (year > 2100 || year < 1900) year = 0;
      const lc       = parseFloat((row["landed cost"] || "0").replace(/,/g, "")) || 0;

      // Use the new site from proj code lookup, or fall back to the Location column
      const siteMatch   = projToSite[projCode];
      const siteName    = siteMatch?.name  || (row["location"] || "").trim();
      const siteRegion  = siteMatch?.region || extractRegion(row["location"] || "");
      const commDate    = parseCommDate(rawDate);
      const category    = mapCategory(desc);

      newRecords.push({
        fleet_number:          fn,
        fleet_status:          "Addition",
        description:           desc,
        category,
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
        date_commissioned:     commDate ||  null,
        equipment_condition:   mapAssessment(rawAssess, rawCond),
        depreciation:          "",
        condition_at_receipt:  "Second Hand",
        supplier:              "",
        supplier_code:         "",
        order_no:              "",
        invoice_no:            "",
        area_project:          siteName,
        location:              siteName,
        cost_code:             projCode,
        region:                siteRegion,
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
        remarks:               `Uploaded ${new Date().toLocaleDateString("en-GB")}`,
        commissioned_by:       profile?.id || "",
      });
    }

    // Batch INSERT into commissioning then equipment
    for (let b = 0; b < newRecords.length; b += BATCH) {
      const batch = newRecords.slice(b, b + BATCH);
      try {
        const { data: commData, error: commErr } = await dbu
          .from("commissioning")
          .insert(batch)
          .select("id,fleet_number,description,location,region,equipment_condition,fleet_status,opening_hour_meter,opening_kilometer,make,model,type_code,reg_no,year_of_manufacturing,purchase_cost,landed_cost,meter_device,policy_cover_no,insurance_expiry,supplier,date_commissioned,cost_code");

        if (!commErr && commData) {
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
            operational_status:    opMap[c.fleet_number] || "Working",
            assessment:            c.equipment_condition || "Good",
            fleet_status:          c.fleet_status || "Addition",
            current_hour_meter:    c.opening_hour_meter || 0,
            current_kilometer:     c.opening_kilometer || 0,
            commission_date:       c.date_commissioned || new Date().toISOString().slice(0, 10),
            purchase_cost:         c.purchase_cost || 0,
            landed_cost:           c.landed_cost || 0,
            insurance_policy:      c.policy_cover_no || "",
            insurance_expiry:      c.insurance_expiry || null,
            supplier:              c.supplier || "",
            hire_rate:             CATEGORY_HIRE_RATES[mapCategory(c.description || "")] ?? 0,
          }));

          const { error: eqErr } = await dbu.from("equipment").insert(equipRecords);
          if (!eqErr) {
            ok_insert += batch.length;
          } else {
            fail += batch.length;
            console.error("Equipment insert error:", eqErr.message);
          }
        } else {
          fail += batch.length;
          console.error("Commissioning insert error:", commErr?.message);
        }
      } catch (e) {
        fail += batch.length;
        console.error("Batch error:", e);
      }

      setProgress(toUpdate.length + b + BATCH);
      setInserted(ok_insert);
      setFailed(fail);

      // Small pause between batches to avoid hitting Supabase rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    setStep("done");
  }

  // ── Reset everything back to initial state ─────────────────
  function reset() {
    setFile(null); setAllRows([]); setToUpdate([]); setToInsert([]); setToSkip(0);
    setStep("pick"); setProgress(0); setUpdated(0); setInserted(0); setFailed(0);
    setError(null);
  }

  function handleClose() { reset(); onClose(); }

  if (!open) return null;

  const total = toUpdate.length + toInsert.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">
              Smart Import
            </p>
            <h2 className="text-lg font-bold text-white">Upload Master Plant List</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Updates existing equipment · Inserts new · Maps sites from proj codes
            </p>
          </div>
          {step !== "importing" && (
            <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          )}
        </div>

        <div className="p-7 space-y-5 overflow-y-auto flex-1">

          {/* ── PICK FILE ── */}
          {step === "pick" && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-amber-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all">
                <div className="text-5xl mb-3">📊</div>
                <p className="font-bold text-slate-700 text-lg">Click to select file</p>
                <p className="text-slate-400 text-sm mt-1">Hartland Master Plant List (.xls or .xlsx)</p>
                <p className="text-slate-300 text-xs mt-2">
                  Existing equipment will be updated · New equipment will be inserted
                </p>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  ⚠️ {error}
                </div>
              )}
            </>
          )}

          {/* ── PREVIEW ── */}
          {step === "preview" && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{toUpdate.length}</p>
                  <p className="text-xs text-blue-700 font-semibold mt-1">Will Update</p>
                  <p className="text-xs text-blue-500 mt-0.5">Already in BuildFleet</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{toInsert.length}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">Will Insert</p>
                  <p className="text-xs text-emerald-500 mt-0.5">New to BuildFleet</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-500">{toSkip}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Skipped</p>
                  <p className="text-xs text-slate-400 mt-0.5">No valid fleet no.</p>
                </div>
              </div>

              {/* What will be updated */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
                <p className="font-bold">For existing equipment, we will update:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Site name → mapped from old Proj Code to new site system</li>
                  <li>Commission date → from &quot;date comm.&quot; column</li>
                  <li>Assessment / Condition → from &quot;Condition&quot; column</li>
                  <li>Operational status → from &quot;Condition&quot; column</li>
                  <li>Category & hire rate → re-derived from description</li>
                </ul>
              </div>

              {/* Preview table — show first 8 rows to be updated */}
              {toUpdate.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Preview — first records to UPDATE
                  </p>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Fleet No.", "Proj Code", "New Site (mapped)", "Comm. Date", "Condition"].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {toUpdate.slice(0, 8).map((r, i) => {
                          const pc   = (r["proj code"] || r["projcode"] || "").trim();
                          const date = parseCommDate(r["date comm."] || r["datecomm"] || "");
                          return (
                            <tr key={i} className="hover:bg-blue-50">
                              <td className="px-3 py-2 font-mono font-bold text-blue-700">{r["_fleet"]}</td>
                              <td className="px-3 py-2 text-slate-500 font-mono">{pc || "—"}</td>
                              <td className="px-3 py-2 text-slate-600 max-w-40 truncate">
                                {pc ? (
                                  <span className="text-emerald-700">mapped from {pc}</span>
                                ) : (
                                  <span className="text-slate-400">no proj code</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {date ? (
                                  <span className="text-emerald-700">{date}</span>
                                ) : (
                                  <span className="text-slate-300">no date</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {r["condition"] || r["assessment"] || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {toUpdate.length > 8 && (
                    <p className="text-xs text-slate-400 mt-1.5">
                      ...and {toUpdate.length - 8} more to update
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button onClick={reset}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
                  ← Change File
                </button>
                {total > 0 && (
                  <button onClick={handleImport}
                    className="px-8 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">
                    Run Import ({toUpdate.length} updates + {toInsert.length} new) →
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── IMPORTING ── */}
          {step === "importing" && (
            <div className="py-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                <p className="font-bold text-slate-800 text-lg">Running import...</p>
                <p className="text-slate-500 text-sm mt-1">Updating existing · Inserting new · Please keep this tab open</p>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>{progress} of {total} processed</span>
                  <span>{Math.round((progress / Math.max(total, 1)) * 100)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(progress / Math.max(total, 1)) * 100}%` }}/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{updated}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1">Updated</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{inserted}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Inserted</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{failed}</p>
                  <p className="text-xs text-red-600 font-medium mt-1">Failed</p>
                </div>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="py-6 text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <p className="font-bold text-slate-800 text-xl">Import Complete!</p>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{updated}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1">Updated</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{inserted}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Inserted</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-500">{failed}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Failed</p>
                </div>
              </div>
              {failed > 0 && (
                <p className="text-xs text-slate-400">
                  Failed records may have duplicate codes or RLS issues. Check console for details.
                </p>
              )}
              <button onClick={handleClose}
                className="px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
                Done — View Equipment →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}