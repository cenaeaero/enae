import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Campos que un supervisor puede editar (datos de contacto, no email/rol/credenciales)
const ALLOWED = new Set([
  "phone", "secondary_phone",
  "address", "city", "state", "country", "postal_code",
  "job_title", "birth_date",
  "personal_email", "corporate_email",
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  // Verifica que el alumno pertenece a su empresa
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, email, company_id").eq("id", id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let allowed = auth.isAdmin || (profile.company_id && auth.companyIds.includes(profile.company_id));
  if (!allowed) {
    const { data: anyReg } = await supabaseAdmin
      .from("registrations").select("id")
      .eq("email", profile.email).in("company_id", auth.companyIds).limit(1);
    allowed = !!(anyReg && anyReg.length > 0);
  }
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const updates: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) updates[k] = v === "" ? null : v;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios válidos" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
