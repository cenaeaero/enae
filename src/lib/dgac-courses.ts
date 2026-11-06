import { supabaseAdmin } from "@/lib/supabase-service";

// Cursos que requieren trámite de credencial DGAC (SIPA, solicitud, examen).
// Usa courses.requires_dgac_procedure; si la columna aún no existe (migración
// pendiente), cae a has_dgac_certificate para no dejar el tablero vacío.
export async function getDgacProcedureCourses(): Promise<{ id: string; title: string; code: string | null }[]> {
  const { data, error } = await supabaseAdmin
    .from("courses").select("id, title, code").eq("requires_dgac_procedure", true);
  if (!error) return data || [];
  const { data: fb } = await supabaseAdmin
    .from("courses").select("id, title, code").eq("has_dgac_certificate", true);
  return fb || [];
}
