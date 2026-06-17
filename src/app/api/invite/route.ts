// src/app/api/invite/route.ts
// Server-side API route — uses SERVICE ROLE key safely
// Never exposed to the browser

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name, staff_no, phone, role, assigned_sites } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: "Email, full name and role are required." },
        { status: 400 }
      );
    }

    // Use SERVICE ROLE key — only available server-side, never sent to browser
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← secret key, server only
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Send invite email via Supabase Auth
    const { data, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, staff_no, phone },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    );

    if (inviteErr) {
      return NextResponse.json(
        { error: inviteErr.message },
        { status: 400 }
      );
    }

    // Create profile with role and site assignments
    if (data?.user) {
      const isAdmin = ["plant_director","plant_manager","plant_engineer","plant_admin"].includes(role);
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id:             data.user.id,
          full_name,
          email,
          staff_no:       staff_no || null,
          phone:          phone || null,
          roles:          [role],
          assigned_sites: isAdmin ? [] : (assigned_sites || []),
        }, { onConflict: "id" });

      if (profileErr) {
        console.error("Profile creation error:", profileErr.message);
        // Don't fail — invite was sent, profile can be set manually
      }
    }

    return NextResponse.json({ success: true, userId: data?.user?.id });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Invite API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}