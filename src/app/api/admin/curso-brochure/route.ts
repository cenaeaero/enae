import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

const BUCKET = "course-brochures";

// POST multipart: course_id, file (PDF) → sube el brochure y guarda la URL pública
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const courseId = form.get("course_id")?.toString();
  const file = form.get("file") as File | null;
  if (!courseId || !file) return NextResponse.json({ error: "course_id y file requeridos" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${courseId}/brochure-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET).upload(path, bytes, { contentType: file.type || "application/pdf", upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl || null;

  const { error } = await supabaseAdmin.from("courses").update({ brochure_url: url }).eq("id", courseId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, brochure_url: url });
}

// DELETE ?course_id=... → quita el brochure
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const courseId = new URL(request.url).searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });

  const { data: course } = await supabaseAdmin.from("courses").select("brochure_url").eq("id", courseId).maybeSingle();
  const url = course?.brochure_url as string | undefined;
  if (url) {
    const marker = `/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx >= 0) await supabaseAdmin.storage.from(BUCKET).remove([url.slice(idx + marker.length)]);
  }
  await supabaseAdmin.from("courses").update({ brochure_url: null }).eq("id", courseId);
  return NextResponse.json({ ok: true });
}
