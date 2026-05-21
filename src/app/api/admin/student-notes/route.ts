import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado", email: null };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado", email: null };
  return { ok: true, email: user.email };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const profileId = url.searchParams.get("profile_id");
  const registrationId = url.searchParams.get("registration_id");

  let q = supabaseAdmin.from("student_notes").select("*").order("created_at", { ascending: false });
  if (profileId) q = q.eq("profile_id", profileId);
  if (registrationId) q = q.eq("registration_id", registrationId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.profile_id || !body.body) {
    return NextResponse.json({ error: "profile_id y body requeridos" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("student_notes")
    .insert({
      profile_id: body.profile_id,
      registration_id: body.registration_id || null,
      author_email: auth.email,
      body: body.body,
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabaseAdmin.from("student_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
