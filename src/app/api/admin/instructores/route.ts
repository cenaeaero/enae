import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("course_instructors")
    .select("id, instructor_email, course_id, created_at, course:courses(title, code)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { instructor_email, course_id } = await request.json();
  if (!instructor_email || !course_id) {
    return NextResponse.json({ error: "instructor_email y course_id requeridos" }, { status: 400 });
  }

  const email = String(instructor_email).trim().toLowerCase();

  // Ensure profile exists with role=instructor (or upgrade if already exists).
  // profiles.first_name / last_name are NOT NULL so we fill them with placeholders
  // derived from the email — the instructor can update them when they log in.
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("email, role")
    .eq("email", email)
    .maybeSingle();

  if (!existingProfile) {
    const localPart = email.split("@")[0] || "instructor";
    const placeholder = localPart.replace(/[._-]+/g, " ").trim() || "Instructor";
    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      email,
      first_name: placeholder,
      last_name: "(Instructor)",
      role: "instructor",
    });
    if (profileErr) {
      return NextResponse.json({ error: `No se pudo crear el perfil: ${profileErr.message}` }, { status: 500 });
    }
  } else if (existingProfile.role !== "admin" && existingProfile.role !== "instructor") {
    await supabaseAdmin.from("profiles").update({ role: "instructor" }).eq("email", email);
  }

  const { data, error } = await supabaseAdmin
    .from("course_instructors")
    .insert({ instructor_email: email, course_id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Este instructor ya está asignado a ese curso." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignment: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  // Look up the email before deleting so we can clean up role if needed
  const { data: assignment } = await supabaseAdmin
    .from("course_instructors")
    .select("instructor_email")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("course_instructors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If this was the last assignment for that instructor, downgrade their role
  if (assignment?.instructor_email) {
    const { count } = await supabaseAdmin
      .from("course_instructors")
      .select("id", { count: "exact", head: true })
      .eq("instructor_email", assignment.instructor_email);

    if ((count || 0) === 0) {
      // Only downgrade if currently instructor (never touch admin)
      await supabaseAdmin
        .from("profiles")
        .update({ role: null })
        .eq("email", assignment.instructor_email)
        .eq("role", "instructor");
    }
  }

  return NextResponse.json({ ok: true });
}
