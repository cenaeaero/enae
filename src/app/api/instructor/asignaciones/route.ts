import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

// Lista las asignaciones del instructor logueado.
// Si admin → todas, o filtra por ?as_instructor=email para previsualizar.
export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const asInstructor = new URL(request.url).searchParams.get("as_instructor");

  let q = supabaseAdmin
    .from("instructor_assignments")
    .select(
      "id, instructor_email, registration_id, kind, city, scheduled_date, status, grade_theoretical, grade_practical, observations, completed_at, evaluation_file_url, created_at, registrations(id, first_name, last_name, email, rut, folio_enae, organization, company, course_id, courses(title, code), sessions(dates, location))"
    )
    .order("created_at", { ascending: false });

  if (auth.isAdmin && asInstructor) q = q.eq("instructor_email", asInstructor);
  else if (!auth.isAdmin) q = q.eq("instructor_email", auth.email);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}
