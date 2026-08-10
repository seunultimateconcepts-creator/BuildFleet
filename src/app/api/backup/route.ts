/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/backup/route.ts
//
// Scheduled by Vercel Cron (see vercel.json). Exports every critical
// table to a private S3 bucket as one JSON file per table, under a
// dated folder — an independent, off-site safety net that survives
// even if Supabase itself had a catastrophic failure.
//
// Uses the SERVICE ROLE key (never the anon key used by the browser)
// so this always gets a complete, unrestricted read — regardless of
// whatever RLS policies exist now or get added later. This key must
// NEVER be exposed to the client; it only ever lives in this
// server-only route and in Vercel's environment variables.
//
// Protected by CRON_SECRET so this can't be triggered by anyone who
// simply guesses the URL — only Vercel's own cron caller (or a
// manual run with the correct header) can invoke it.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — generous for a full export

const PAGE = 1000;

// ── Tables backed up. Start here; add more as new modules mature.
// This is a starting set covering the highest-value, hardest-to-
// reconstruct data — the live fleet register, every approval chain,
// and the audit trail itself.
const TABLES = [
  "equipment",
  "sites",
  "transfers",
  "maintenance",
  "commissioning",
  "sro",
  "sro_items",
  "sro_history",
  "lro",
  "purchase_comparisons",
  "purchases",
  "procurement_history",
  "stock_items",
  "store_stock_balances",
  "store_transactions",
  "profiles",
  "audit_log",
];

async function fetchAllRowsServer(supabase: any, table: string) {
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`backup: failed reading ${table} at offset ${from}:`, error.message);
      break;
    }
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const bucket = process.env.AWS_S3_BACKUP_BUCKET!;
  const dateFolder = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const results: Record<string, number | string> = {};

  for (const table of TABLES) {
    try {
      const rows = await fetchAllRowsServer(supabase, table);
      const body = JSON.stringify(rows, null, 0);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `backups/${dateFolder}/${table}.json`,
        Body: body,
        ContentType: "application/json",
      }));
      results[table] = rows.length;
    } catch (err: any) {
      results[table] = `ERROR: ${err.message}`;
      console.error(`backup: ${table} failed:`, err);
    }
  }

  return NextResponse.json({
    date: dateFolder,
    bucket,
    tables: results,
  });
}