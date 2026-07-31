/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────
// fetchAllRows — Supabase caps every query at 1,000 rows by
// default, silently. With 1,438+ equipment this truncates any
// unpaginated fetch and causes exactly the "only 1000 showing" /
// "438 failed on import" class of bug. This helper pages through
// .range() windows until a short page signals the end.
//
// Usage:
//   const equipment = await fetchAllRows("equipment", "*",
//     q => q.neq("operational_status", "Scrapped").order("fleet_number"));
// ─────────────────────────────────────────────────────────────
import { dbu } from "@/lib/db";

const PAGE = 1000;

export async function fetchAllRows(
  table: string,
  select: string = "*",
  modify?: (q: any) => any,
): Promise<any[]> {
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = dbu.from(table).select(select).range(from, from + PAGE - 1);
    if (modify) q = modify(q);
    const { data, error } = await q;
    if (error) {
      console.error(`fetchAllRows(${table}) page ${from / PAGE}:`, error.message);
      break;
    }
    all.push(...(data || []));
    if (!data || data.length < PAGE) break; // short page = last page
  }
  return all;
}