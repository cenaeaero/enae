import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

const MAX_BYTES = 1_048_576; // 1 MB

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const profileId = form.get("profile_id")?.toString();
  const file = form.get("file") as File | null;
  if (!profileId || !file) {
    return NextResponse.json({ error: "profile_id y file requeridos" }, { status: 400 });
  }

  // Validar tipo y tamaño
  if (!["image/jpeg", "image/jpg"].includes(file.type)) {
    return NextResponse.json({ error: "Solo se aceptan archivos JPG/JPEG" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Máximo 1 MB" }, { status: 400 });
  }

  const ext = "jpg";
  const path = `${profileId}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // URL pública
  const { data: publicData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
  // Anti-caché simple: agregar timestamp como query
  const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { error: updErr } = await supabaseAdmin
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", profileId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ avatar_url: publicUrl });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const profileId = new URL(request.url).searchParams.get("profile_id");
  if (!profileId) return NextResponse.json({ error: "profile_id requerido" }, { status: 400 });

  await supabaseAdmin.storage.from("avatars").remove([`${profileId}/avatar.jpg`]);
  await supabaseAdmin.from("profiles").update({ avatar_url: null }).eq("id", profileId);

  return NextResponse.json({ ok: true });
}
