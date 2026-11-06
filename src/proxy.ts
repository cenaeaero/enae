import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseProxy } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-service";

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
  const isInstructorRoute = pathname.startsWith("/instructor");
  const isInstructorLogin = pathname === "/instructor/login";

  // Admin routes
  if (isAdminRoute && !isAdminLogin && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  // Seguridad Fase 0: /admin exige rol "admin" (antes bastaba con tener sesión,
  // por lo que un alumno o instructor autenticado podía entrar al panel).
  if (isAdminRoute && !isAdminLogin && user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("role").eq("email", user.email ?? "").maybeSingle();
    if (profile?.role !== "admin") {
      const dest = profile?.role === "instructor" ? "/instructor" : "/tpems";
      return NextResponse.redirect(new URL(dest, request.url));
    }
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

  // Instructor routes (reuses admin auth — role is checked inside the page/API)
  if (isInstructorRoute && !isInstructorLogin && !user) {
    return NextResponse.redirect(new URL("/instructor/login", request.url));
  }
  if (isInstructorLogin && user) {
    return NextResponse.redirect(new URL("/instructor", request.url));
  }

  return response();
}

export const config = {
  matcher: ["/admin/:path*", "/tpems/:path*", "/instructor/:path*"],
};
