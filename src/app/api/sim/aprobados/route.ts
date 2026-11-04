import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ejercicios CONDOR SIM aprobados por alumno (prerrequisito de nivel).
// Solo servidor: sim_results no es legible con la publishable key.
// Body: { names: string[] } → { passed: { [nombre]: string[] /* ids de ejercicio */ } }
export async function POST(req: Request) {
  const { names } = (await req.json().catch(() => ({}))) as { names?: string[] };
  if (!Array.isArray(names) || names.length === 0 || names.length > 50) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 422 });
  }
  const url = process.env.NEXT_PUBLIC_SIM_SUPABASE_URL;
  const key = process.env.SIM_SUPABASE_SECRET;
  if (!url || !key) return NextResponse.json({ error: 'Sin configuración' }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from('sim_results')
    .select('student_name, competencies')
    .eq('passed', true)
    .in('student_name', names.map((n) => String(n).slice(0, 120)));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const passed: Record<string, string[]> = {};
  for (const r of data ?? []) {
    const ej = (r.competencies as { ejercicio?: string } | null)?.ejercicio;
    if (!ej) continue;
    (passed[r.student_name as string] ??= []).push(ej);
  }
  return NextResponse.json({ passed });
}
