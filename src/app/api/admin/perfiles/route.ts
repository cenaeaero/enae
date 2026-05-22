import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { sendStudentCredentials } from "@/lib/email";
import crypto from "crypto";

// GET: lista todos los perfiles (server-side, bypass RLS)
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data || [] });
}

// PATCH: actualiza un perfil (server-side, bypass RLS)
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  // Si cambia email, actualiza también auth.users
  if (updates.email) {
    const { data: prof } = await supabaseAdmin.from("profiles").select("user_id, email").eq("id", id).maybeSingle();
    if (prof?.user_id && prof.email !== updates.email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(prof.user_id, { email: updates.email });
      if (authErr) return NextResponse.json({ error: "No se pudo cambiar email en auth: " + authErr.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("profiles").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

// DELETE: borra perfil y su auth user
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { data: prof } = await supabaseAdmin.from("profiles").select("user_id").eq("id", id).maybeSingle();
  await supabaseAdmin.from("profiles").delete().eq("id", id);
  if (prof?.user_id) {
    try { await supabaseAdmin.auth.admin.deleteUser(prof.user_id); } catch {}
  }
  return NextResponse.json({ ok: true });
}

// Crea un perfil con un rol específico (student | instructor | supervisor | admin)
// Si el email no existe en auth, crea la cuenta y envía credenciales.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { email, first_name, last_name, rut, phone, role, company_id, send_credentials } = body;

  if (!email || !first_name || !last_name || !role) {
    return NextResponse.json({ error: "email, first_name, last_name y role requeridos" }, { status: 400 });
  }
  if (!["student","instructor","supervisor","admin"].includes(role)) {
    return NextResponse.json({ error: "role inválido" }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // ¿Existe auth?
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles").select("id, user_id").eq("email", normalizedEmail).maybeSingle();

  let userId: string | undefined = existingProfile?.user_id || undefined;
  let createdCredentials = false;
  let password: string | null = null;

  if (!userId) {
    password = crypto.randomBytes(4).toString("hex");
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail, password, email_confirm: true,
      user_metadata: { full_name: `${first_name} ${last_name}` },
    });
    if (authErr && !authErr.message.includes("already been registered")) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
    if (authData?.user) {
      userId = authData.user.id;
      createdCredentials = true;
    } else {
      // Buscar el usuario existente
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const ex = users?.users?.find((u: any) => u.email === normalizedEmail);
      if (ex) userId = ex.id;
    }
  }

  const profilePayload: Record<string, any> = {
    user_id: userId,
    first_name, last_name, email: normalizedEmail,
    rut: rut || null, phone: phone || null,
    role, company_id: company_id || null,
  };

  const { data: profile, error: pErr } = await supabaseAdmin
    .from("profiles").upsert(profilePayload, { onConflict: "email" }).select().single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Enviar credenciales si se creó la cuenta y el admin lo pidió
  if (createdCredentials && password && send_credentials !== false) {
    try {
      await sendStudentCredentials(normalizedEmail, password, `${first_name} ${last_name}`, "Portal ENAE");
    } catch (e) { console.error(e); }
  }

  return NextResponse.json({ profile, credentialsSent: createdCredentials, tempPassword: createdCredentials ? password : null });
}
