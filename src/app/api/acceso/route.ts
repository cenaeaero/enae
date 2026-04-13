import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// POST: log a course access
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registration_id } = await request.json();
    if (!registration_id) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });

    // Verify the registration belongs to this user
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id")
      .eq("id", registration_id)
      .eq("email", profile.email)
      .single();

    if (!reg) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    // Throttle: only log if last access was more than 5 minutes ago
    const { data: lastAccess } = await supabaseAdmin
      .from("course_access_log")
      .select("accessed_at")
      .eq("registration_id", registration_id)
      .order("accessed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAccess) {
      const lastTime = new Date(lastAccess.accessed_at).getTime();
      const now = Date.now();
      if (now - lastTime < 5 * 60 * 1000) {
        return NextResponse.json({ logged: false, reason: "throttled" });
      }
    }

    await supabaseAdmin.from("course_access_log").insert({ registration_id });

    return NextResponse.json({ logged: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// GET: get access stats for a registration (admin)
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verify admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(request.url);
    const registrationId = url.searchParams.get("registration_id");
    if (!registrationId) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });

    // Get total access count
    const { count } = await supabaseAdmin
      .from("course_access_log")
      .select("id", { count: "exact", head: true })
      .eq("registration_id", registrationId);

    // Get last access
    const { data: lastAccess } = await supabaseAdmin
      .from("course_access_log")
      .select("accessed_at")
      .eq("registration_id", registrationId)
      .order("accessed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get all access logs for detail
    const { data: logs } = await supabaseAdmin
      .from("course_access_log")
      .select("accessed_at")
      .eq("registration_id", registrationId)
      .order("accessed_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      total_accesses: count || 0,
      last_access: lastAccess?.accessed_at || null,
      recent_logs: logs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
