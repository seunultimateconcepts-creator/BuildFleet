/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/notify/route.ts
// Sends in-app notification + email via Supabase

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { 
      to_user_id,    // UUID of user to notify (in-app)
      to_email,      // email address
      to_name,       // recipient name
      title,         // notification title
      message,       // notification message
      type = "info", // info | success | warning | error
      link,          // optional link
      send_email = true,
    } = await req.json();

    // 1. Save in-app notification
    if (to_user_id) {
      await supabase.from("notifications").insert([{
        user_id: to_user_id,
        title,
        message,
        type,
        link,
        read: false,
      }]);
    }

    // 2. Send email via Supabase Auth Admin (uses existing email setup)
    if (send_email && to_email) {
      // Use Supabase's built-in email via admin invite trick
      // We send a custom email by using the REST API directly
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ to_email, to_name, title, message, link }),
      }).catch(() => null); // fail silently if edge function not set up
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}