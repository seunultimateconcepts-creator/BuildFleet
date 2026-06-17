import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes and API routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Get all cookies and check for any Supabase auth token
  const cookies = request.cookies.getAll();
  
  const hasSession = cookies.some(c =>
    c.name.startsWith("sb-") ||
    c.name.includes("supabase") ||
    c.name.includes("auth-token") ||
    c.name.includes("access_token")
  );

  // Log for debugging (visible in Vercel logs)
  console.log("Middleware cookies:", cookies.map(c => c.name).join(", "));
  console.log("Has session:", hasSession);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};