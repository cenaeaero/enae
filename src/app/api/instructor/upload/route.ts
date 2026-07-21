import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

// POST multipart: kind in ('evaluation'|'receipt'|'document'), id (assignment_id|fee_id), file
export async function POST(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const kind = form.get("kind")?.toString();
  const id   = form.get("id")?.toString();
  const file = form.get("file") as File | null;

  if (!kind || !id || !file) return NextResponse.json({ error: "kind, id y file requeridos" }, { status: 400 });

  const bucket = kind === "evaluation" ? "instructor-evaluations"
    : kind === "document" ? "instructor-documents"
    : "instructor-receipts";
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${id}/${kind}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Linkear al record correspondiente (sólo si el instructor es dueño)
  if (kind === "evaluation") {
    const { data: a } = await supabaseAdmin.from("instructor_assignments").select("instructor_email").eq("id", id).maybeSingle();
    if (a && (auth.isAdmin || a.instructor_email === auth.email)) {
      await supabaseAdmin.from("instructor_assignments").update({ evaluation_file_url: path }).eq("id", id);
    }
  } else if (kind === "document") {
    const { data: a } = await supabaseAdmin.from("instructor_assignments").select("instructor_email").eq("id", id).maybeSingle();
    if (!a || (!auth.isAdmin && a.instructor_email !== auth.email)) {
      await supabaseAdmin.storage.from(bucket).remove([path]);
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    await supabaseAdmin.from("instructor_assignment_documents").insert({
      assignment_id: id,
      instructor_email: a.instructor_email,
      file_path: path,
      file_name: file.name,
    });
  } else if (kind === "receipt") {
    const { data: f } = await supabaseAdmin.from("instructor_fees").select("instructor_email").eq("id", id).maybeSingle();
    if (f && (auth.isAdmin || f.instructor_email === auth.email)) {
      await supabaseAdmin.from("instructor_fees").update({ receipt_file_url: path }).eq("id", id);
    }
  }

  return NextResponse.json({ ok: true, path, bucket });
}

// DELETE ?doc_id=...  → elimina un documento adicional (dueño o admin)
export async function DELETE(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const docId = u.searchParams.get("doc_id");
  if (!docId) return NextResponse.json({ error: "doc_id requerido" }, { status: 400 });

  const { data: doc } = await supabaseAdmin
    .from("instructor_assignment_documents")
    .select("id, instructor_email, file_path")
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!auth.isAdmin && doc.instructor_email !== auth.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await supabaseAdmin.storage.from("instructor-documents").remove([doc.file_path]);
  await supabaseAdmin.from("instructor_assignment_documents").delete().eq("id", docId);
  return NextResponse.json({ ok: true });
}

// GET ?bucket=...&path=...  → signed URL
export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const bucket = u.searchParams.get("bucket");
  const path = u.searchParams.get("path");
  if (!bucket || !path) return NextResponse.json({ error: "bucket y path requeridos" }, { status: 400 });
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data) return NextResponse.json({ error: error?.message || "no url" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
