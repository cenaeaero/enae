import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// Returns the list of courses assigned to the logged-in instructor.
// Admins see all assigned courses too (for convenience when impersonating).
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const isInstructor = profile?.role === "instructor";
  if (!isAdmin && !isInstructor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: assignments } = await supabaseAdmin
    .from("course_instructors")
    .select("course_id")
    .eq("instructor_email", user.email);

  const courseIds = (assignments || []).map((a: any) => a.course_id);
  if (courseIds.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("id, title, code, area")
    .in("id", courseIds)
    .eq("is_active", true)
    .order("title");

  return NextResponse.json({ courses: courses || [] });
}
