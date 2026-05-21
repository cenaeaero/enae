import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { sendSynchronousClassInvitation } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const { data: cls } = await supabaseAdmin
    .from("synchronous_classes")
    .select("*, courses(title, code)")
    .eq("id", id).maybeSingle();
  if (!cls) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  // Alumnos elegibles
  let q = supabaseAdmin
    .from("registrations")
    .select("first_name, last_name, email")
    .eq("course_id", cls.course_id)
    .in("status", ["confirmed", "completed"]);
  if (cls.session_id) q = q.eq("session_id", cls.session_id);
  const { data: regs } = await q;

  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const r of regs || []) {
    try {
      await sendSynchronousClassInvitation({
        to: r.email,
        studentName: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        courseTitle: cls.courses?.title || "Curso",
        classTitle: cls.title,
        kind: cls.kind,
        scheduledAt: cls.scheduled_at,
        durationMin: cls.duration_minutes,
        linkUrl: cls.link_url,
        description: cls.description,
      });
      results.push({ email: r.email, ok: true });
    } catch (e: any) {
      results.push({ email: r.email, ok: false, error: e?.message || "fallo" });
    }
  }

  await supabaseAdmin
    .from("synchronous_classes")
    .update({ invitation_sent_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
