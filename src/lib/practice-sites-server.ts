import { supabaseAdmin } from "@/lib/supabase-service";
import type { PracticeSite } from "@/lib/practice-sites";

// Carga fichas de lugares por id (con autorizaciones). Tolerante a errores:
// si la tabla no existe o falla la consulta, devuelve un mapa vacío.
export async function loadPracticeSites(ids: (string | null | undefined)[]): Promise<Record<string, PracticeSite>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabaseAdmin
      .from("practice_sites")
      .select("*, practice_site_authorizations(*)")
      .in("id", unique);
    if (error) return {};
    const map: Record<string, PracticeSite> = {};
    for (const s of (data || []) as PracticeSite[]) map[s.id] = s;
    return map;
  } catch {
    return {};
  }
}
