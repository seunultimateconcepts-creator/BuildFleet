/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────
// SERVICE DUE CALCULATION
// This is the single source of truth for "is this equipment due for
// service, and how soon" — used by both the WSPT live table and the
// WMC weekly calendar. Everything here is a pure function: give it
// equipment + daily log rows, get back forecasted rows. No database
// calls in this file — that keeps it easy to test and reuse.
// ─────────────────────────────────────────────────────────────

// How many days out counts as "Due Soon" rather than "Healthy".
// Adjustable — flagged for Plant Engineer review.
export const DUE_SOON_DAYS = 7;

// Round-robin service-type letter, cycling every 4 services.
// Simplified from the WSPT form's more intricate per-interval legend —
// flagged for Plant Engineer review, per your note that we'll revisit
// this together.
const SERVICE_LETTERS = ["A", "B", "C", "D"];

export const SERVICE_LETTER_COLOR: Record<string, { bg: string; text: string; hex: string }> = {
  A: { bg: "bg-blue-100",   text: "text-blue-700",   hex: "#3B82F6" }, // matches WMC legend: Service A = Blue
  B: { bg: "bg-yellow-100", text: "text-yellow-700", hex: "#EAB308" }, // Service B = Yellow
  C: { bg: "bg-green-100",  text: "text-green-700",  hex: "#22C55E" }, // Service C = Green
  D: { bg: "bg-red-100",    text: "text-red-700",    hex: "#EF4444" }, // Service D = Red
};

export type Urgency = "Overdue" | "Due Soon" | "Healthy" | "Unknown";

export const URGENCY_STYLE: Record<Urgency, { bg: string; text: string; dot: string }> = {
  "Overdue":  { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  "Due Soon": { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500" },
  "Healthy":  { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  "Unknown":  { bg: "bg-slate-100",  text: "text-slate-500",  dot: "bg-slate-400" },
};

export interface ServiceDueRow {
  equipment_id: string;
  fleet_number: string;
  name: string;
  category: string;
  wmc_group: string;
  meter_device: string;          // "Hours" | "Km"
  last_service_reading: number;
  last_service_date: string | null;
  current_reading: number;
  avg_per_day: number | null;    // null = not enough log history to forecast
  interval: number;
  service_number: number;        // which service in the cycle (1, 2, 3...)
  service_letter: string;        // A/B/C/D
  next_service_threshold: number;
  remaining: number;             // hrs/km left until due (negative = overdue by that much)
  days_to_due: number | null;    // null when avg_per_day is null
  urgency: Urgency;
}

// One entry per equipment: { min, max, minDate, maxDate } from its
// logged hr/km readings over the trailing window.
interface UsageWindow {
  minReading: number;
  maxReading: number;
  minDate: string;
  maxDate: string;
}

export function buildUsageWindows(dailyLogs: { equipment_id: string; hr_km_reading: number; log_date: string }[]): Map<string, UsageWindow> {
  const windows = new Map<string, UsageWindow>();
  for (const log of dailyLogs) {
    if (!log.equipment_id || !log.hr_km_reading || log.hr_km_reading <= 0) continue;
    const existing = windows.get(log.equipment_id);
    if (!existing) {
      windows.set(log.equipment_id, {
        minReading: log.hr_km_reading, maxReading: log.hr_km_reading,
        minDate: log.log_date, maxDate: log.log_date,
      });
      continue;
    }
    if (log.hr_km_reading < existing.minReading) { existing.minReading = log.hr_km_reading; existing.minDate = log.log_date; }
    if (log.hr_km_reading > existing.maxReading) { existing.maxReading = log.hr_km_reading; existing.maxDate = log.log_date; }
  }
  return windows;
}

export function computeServiceDue(equipment: any[], usageWindows: Map<string, UsageWindow>): ServiceDueRow[] {
  return equipment.map((eq): ServiceDueRow => {
    const window = usageWindows.get(eq.id);

    // Average usage per day — needs at least two distinct readings
    // spanning at least one day to mean anything.
    let avgPerDay: number | null = null;
    if (window) {
      const days = (new Date(window.maxDate).getTime() - new Date(window.minDate).getTime()) / 86400000;
      const delta = window.maxReading - window.minReading;
      if (days >= 1 && delta > 0) avgPerDay = delta / days;
    }

    const currentReading = window?.maxReading
      ?? (eq.meter_device === "Km" ? eq.current_kilometer : eq.current_hour_meter)
      ?? 0;

    const lastServiceReading = eq.last_service_reading ?? 0;
    const interval = eq.service_interval || (eq.meter_device === "Km" ? 5000 : 250);

    const unitsSinceService = Math.max(0, currentReading - lastServiceReading);
    const serviceNumber = Math.floor(unitsSinceService / interval) + 1;
    const nextServiceThreshold = lastServiceReading + serviceNumber * interval;
    const remaining = nextServiceThreshold - currentReading;
    const serviceLetter = SERVICE_LETTERS[(serviceNumber - 1) % SERVICE_LETTERS.length];

    const daysToDue = avgPerDay && avgPerDay > 0 ? remaining / avgPerDay : null;

    let urgency: Urgency;
    if (remaining <= 0) urgency = "Overdue";
    else if (daysToDue === null) urgency = "Unknown";
    else if (daysToDue <= DUE_SOON_DAYS) urgency = "Due Soon";
    else urgency = "Healthy";

    return {
      equipment_id: eq.id,
      fleet_number: eq.fleet_number,
      name: eq.name || "",
      category: eq.category || "",
      wmc_group: eq.wmc_group || "Machinery",
      meter_device: eq.meter_device || "Hours",
      last_service_reading: lastServiceReading,
      last_service_date: eq.last_service_date || null,
      current_reading: currentReading,
      avg_per_day: avgPerDay,
      interval,
      service_number: serviceNumber,
      service_letter: serviceLetter,
      next_service_threshold: nextServiceThreshold,
      remaining,
      days_to_due: daysToDue,
      urgency,
    };
  });
}

// Sort helper — Overdue first, then Due Soon, then by days remaining,
// Unknown/Healthy last. This is what makes the most urgent equipment
// float to the top of the WSPT table.
export function sortByUrgency(rows: ServiceDueRow[]): ServiceDueRow[] {
  const rank: Record<Urgency, number> = { "Overdue": 0, "Due Soon": 1, "Healthy": 2, "Unknown": 3 };
  return [...rows].sort((a, b) => {
    const r = rank[a.urgency] - rank[b.urgency];
    if (r !== 0) return r;
    if (a.days_to_due === null && b.days_to_due === null) return 0;
    if (a.days_to_due === null) return 1;
    if (b.days_to_due === null) return -1;
    return a.days_to_due - b.days_to_due;
  });
}