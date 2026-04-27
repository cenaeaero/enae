import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// Public endpoint to verify a diploma or certificate
// Supports two lookup modes:
// - ?code=XXXX → look up by diploma verification_code
// - ?reg=UUID  → look up by registration id (used by certificates that
//                don't have a diploma yet); only returns data when the
//                course is completed or alumno is alumni
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const reg = searchParams.get("reg");

    if (code) {
      const { data: diploma } = await supabaseAdmin
        .from("diplomas")
        .select("verification_code, student_name, course_title, course_code, final_score, status, issued_date, theoretical_start, practical_end")
        .eq("verification_code", code.trim().toUpperCase())
        .maybeSingle();

      if (diploma) {
        return NextResponse.json({ found: true, result: diploma });
      }
      return NextResponse.json({ found: false });
    }

    if (reg) {
      const { data: r } = await supabaseAdmin
        .from("registrations")
        .select("id, first_name, last_name, status, is_alumni, final_score, created_at, theoretical_start, practical_end, courses(title, code)")
        .eq("id", reg)
        .maybeSingle();

      // Cancelled or rejected → not valid; otherwise return data
      if (!r || r.status === "cancelled" || r.status === "rejected" || r.status === "pending") {
        return NextResponse.json({ found: false });
      }

      const isCompleted = r.status === "completed" || r.is_alumni === true;
      const result = {
        verification_code: String(r.id).slice(0, 8).toUpperCase(),
        student_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        course_title: (r as any).courses?.title || "",
        course_code: (r as any).courses?.code || null,
        final_score: r.final_score,
        status: isCompleted ? "approved" : "in_progress",
        issued_date: r.practical_end || r.created_at,
        theoretical_start: r.theoretical_start,
        practical_end: r.practical_end,
      };
      return NextResponse.json({ found: true, result });
    }

    return NextResponse.json({ error: "Falta code o reg" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
