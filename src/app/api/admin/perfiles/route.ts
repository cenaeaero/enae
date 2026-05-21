import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { sendStudentCredentials } from "@/lib/email";
import crypto from "crypto";

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
