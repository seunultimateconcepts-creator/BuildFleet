/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────
// fetchAllRows — Supabase caps every query at 1,000 rows by
// default, silently. With 1,438+ equipment (and now 6,136+ stock
// items) this truncates any unpaginated fetch and causes exactly
// the "only 1000 showing" / "438 failed on import" class of bug.
// This helper pages through .range() windows until a short page
// signals the end.
//
// ★ Stable tiebreaker, always applied: range-based pagination is
// only safe when the sort order is fully deterministic. If the
// caller's own .order() has ties (e.g. many items literally named
// "BEARING KIT"), Postgres can return them in a different relative
// order on each separate page request — the same row can then land
// on two pages (duplicate), or a different row can be skipped
// entirely (silent data loss). Chaining .order("id") as a secondary,
// always-unique sort after whatever the caller specifies removes the
// ambiguity completely — id is a uuid primary key, so this tiebreak
// can never itself have a tie. This was the root cause of the
// "duplicate key" React warning on the Store register.
//
// Usage:
//   const equipment = await fetchAllRows("equipment", "*",
//     q => q.neq("operational_status", "Scrapped").order("fleet_number"));
// ─────────────────────────────────────────────────────────────
import { dbu } from "@/lib/db";

const PAGE = 1000;

// ─────────────────────────────────────────────────────────────
// Lightweight in-memory cache — lives for the browser tab's session,
// cleared on a real page reload. This is what fixes "navigating back
// to a page reloads everything again": if the same cacheKey was
// fetched within the last cacheTTL, serve it instantly instead of
// hitting the database again. Purely opt-in — any call without a
// cacheKey behaves exactly as before, so nothing existing breaks.
// ─────────────────────────────────────────────────────────────
const _cache = new Map<string, { data: any[]; ts: number }>();

// Call after any write (GRN, SIV, Adjustment, etc.) so the next load
// shows the real, current data instead of serving a stale cached
// copy for up to cacheTTL. Pass a prefix to clear a family of keys
// (e.g. "store-balances-") or nothing to clear everything.
export function invalidateCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return; }
  for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k);
}


export async function fetchAllRows(
  table: string,
  select: string = "*",
  modify?: (q: any) => any,
  options?: { cacheKey?: string; cacheTTL?: number }, // cacheTTL in ms, default 60s
): Promise<any[]> {
  const { cacheKey, cacheTTL = 60000 } = options || {};
  if (cacheKey) {
    const cached = _cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < cacheTTL) return cached.data;
  }

  const all: any[] = [];
  const seen = new Set<string>(); // belt-and-braces: drop any row whose id we've already collected
  for (let from = 0; ; from += PAGE) {
    let q = dbu.from(table).select(select).range(from, from + PAGE - 1);
    if (modify) q = modify(q);
    q = q.order("id", { ascending: true }); // stable secondary sort — always last, always unique
    const { data, error } = await q;
    if (error) {
      console.error(`fetchAllRows(${table}) page ${from / PAGE}:`, error.message);
      break;
    }
    for (const row of data || []) {
      if (row?.id != null) {
        if (seen.has(row.id)) continue; // defensive skip, shouldn't trigger now but costs nothing
        seen.add(row.id);
      }
      all.push(row);
    }
    if (!data || data.length < PAGE) break; // short page = last page
  }
  if (cacheKey) _cache.set(cacheKey, { data: all, ts: Date.now() });
  return all;
}