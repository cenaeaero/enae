import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

const BUCKET = "biblioteca";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No autenticado", status: 401 as const };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();
  if (profile?.role !== "admin") return { error: "Solo administradores", status: 403 as const };
  return { user };
}

// GET ?course_id=... → list documents for a course
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("course_documents")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

// POST multipart/form-data: file + course_id + title + description?
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const courseId = form.get("course_id") as string | null;
  const title = (form.get("title") as string | null) || "";
  const description = (form.get("description") as string | null) || null;

  if (!file || !courseId || !title) {
    return NextResponse.json({ error: "file, course_id y title son requeridos" }, { status: 400 });
  }

  // Validate it's a PDF (or at least pdf-friendly)
  if (file.type && !file.type.includes("pdf")) {
    return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${courseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Error al subir: " + uploadError.message }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("course_documents")
    .insert({
      course_id: courseId,
      title,
      description,
      file_url: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || "application/pdf",
      uploaded_by: auth.user!.id,
    })
    .select()
    .single();

  if (insertError) {
    // rollback storage
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  void ext;
  return NextResponse.json({ document: inserted });
}

// PATCH: update title/description/sort_order/is_active
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, title, description, sort_order, is_active } = body || {};
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const payload: Record<string, any> = {};
  if (typeof title === "string") payload.title = title;
  if (typeof description === "string" || description === null) payload.description = description;
  if (typeof sort_order === "number") payload.sort_order = sort_order;
  if (typeof is_active === "boolean") payload.is_active = is_active;

  const { error } = await supabaseAdmin.from("course_documents").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE ?id=...
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { data: doc } = await supabaseAdmin
    .from("course_documents")
    .select("file_url")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await supabaseAdmin.storage.from(BUCKET).remove([doc.file_url]);
  const { error } = await supabaseAdmin.from("course_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
