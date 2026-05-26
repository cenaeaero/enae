import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// Lista todos los supervisores (perfiles con al menos una fila en company_supervisors)
// con sus empresas y conteo de alumnos a su cargo.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: links, error } = await supabaseAdmin
    .from("company_supervisors")
    .select("id, slot, company_id, profile_id, created_at, profiles(id, first_name, last_name, email, rut, phone, role), companies(id, name, rut)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrupa por profile_id
  const byProfile: Record<string, any> = {};
  const companyIds = new Set<string>();
  for (const l of links || []) {
    const r = l as any;
    if (!r.profiles) continue;
    const pid = r.profiles.id;
    if (!byProfile[pid]) {
      byProfile[pid] = {
        profile: r.profiles,
        companies: [],
      };
    }
    byProfile[pid].companies.push({
      id: r.companies?.id,
      name: r.companies?.name,
      rut: r.companies?.rut,
      slot: r.slot,
      link_id: r.id,
    });
    if (r.companies?.id) companyIds.add(r.companies.id);
  }

  // Conteo de alumnos por empresa para resumen
  let countsByCompany: Record<string, number> = {};
  if (companyIds.size > 0) {
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("company_id")
      .in("company_id", Array.from(companyIds));
    for (const r of regs || []) {
      const cid = (r as any).company_id;
      if (!cid) continue;
      countsByCompany[cid] = (countsByCompany[cid] || 0) + 1;
    }
  }

  const supervisors = Object.values(byProfile).map((s: any) => {
    const studentCount = s.companies.reduce(
      (acc: number, c: any) => acc + (countsByCompany[c.id] || 0),
      0,
    );
    return { ...s, studentCount };
  });

  return NextResponse.json({ supervisors });
}
