import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Passthrough middleware — auth is handled client-side via useAuth hook
// and server-side via Supabase RLS policies
// This avoids cookie name conflicts across Supabase versions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};