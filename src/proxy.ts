import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseProxy } from "@/lib/supabase-server";

export async function proxy(request: NextRequest) {
  const { supabase, response } = createSupabaseProxy(request);
  const { pathname } = request.nextUrl;

  // Refresh session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";
  const isTpemsRoute = pathname.startsWith("/tpems");
  const isTpemsLogin = pathname === "/tpems/login";
  const isTpemsPublic = pathname === "/tpems/login" || pathname === "/tpems/restablecer-clave";

  // Admin routes
  if (isAdminRoute && !isAdminLogin && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (isAdminLogin && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // TPEMS routes
  if (isTpemsRoute && !isTpemsPublic && !user) {
    return NextResponse.redirect(new URL("/tpems/login", request.url));
  }
  if (isTpemsLogin && user) {
    return NextResponse.redirect(new URL("/tpems", request.url));
  }

  return response();
}

export const config = {
  matcher: ["/admin/:path*", "/tpems/:path*"],
};
