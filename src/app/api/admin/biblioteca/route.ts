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

// POST: dos modos
//   1) ?action=sign-upload  → JSON { course_id, file_name } → devuelve { path, signedUrl, token }
//      El cliente sube el archivo PUT directo a signedUrl (evita el límite de
//      ~4.5 MB de Vercel para body de rutas API).
//   2) ?action=commit       → JSON { course_id, path, title, description?, file_name, file_size, mime_type? }
//      Inserta el registro en course_documents una vez que el archivo ya está en Storage.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "commit";
  const body = await request.json().catch(() => ({}));

  if (action === "sign-upload") {
    const { course_id, file_name } = body || {};
    if (!course_id || !file_name) {
      return NextResponse.json({ error: "course_id y file_name son requeridos" }, { status: 400 });
    }
    const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${course_id}/${Date.now()}-${safeName}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo firmar URL: " + (error?.message || "desconocido") }, { status: 500 });
    }
    return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token });
  }

  // action === "commit"
  const { course_id, path, title, description, file_name, file_size, mime_type } = body || {};
  if (!course_id || !path || !title) {
    return NextResponse.json({ error: "course_id, path y title son requeridos" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("course_documents")
    .insert({
      course_id,
      title,
      description: description || null,
      file_url: path,
      file_name: file_name || null,
      file_size: typeof file_size === "number" ? file_size : null,
      mime_type: mime_type || "application/pdf",
      uploaded_by: auth.user!.id,
    })
    .select()
    .single();

  if (insertError) {
    // rollback storage
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

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
