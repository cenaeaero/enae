import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Busca profile.id por email. Solo retorna si pertenece a una empresa que el supervisor administra.
export async function GET(request: Request) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const email = new URL(request.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, company_id").eq("email", email).maybeSingle();
  if (!profile) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!auth.isAdmin && !auth.companyIds.includes(profile.company_id as any)) {
    // También checar via registrations en caso que el profile no tenga company_id pero la reg sí
    const { data: anyReg } = await supabaseAdmin
      .from("registrations").select("company_id")
      .eq("email", email).in("company_id", auth.companyIds).limit(1);
    if (!anyReg || anyReg.length === 0) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }
  return NextResponse.json({ profile: { id: profile.id } });
}
