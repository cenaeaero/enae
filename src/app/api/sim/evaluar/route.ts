import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Guarda los resultados de evaluación del simulador (solo servidor: usa la
// secret key, la tabla sim_results no permite insert con la publishable key).

interface ResultRow {
  position_id: string | null;
  student_name: string;
  score: number;
  passed: boolean;
  competencies: Record<string, unknown>;
}

export async function POST(req: Request) {
  const { sessionId, results } = (await req.json()) as { sessionId: string; results: ResultRow[] };
  if (!sessionId || !Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 422 });
  }
  const db = createClient(process.env.NEXT_PUBLIC_SIM_SUPABASE_URL!, process.env.SIM_SUPABASE_SECRET!, {
    auth: { persistSession: false },
  });
  const year = new Date().getFullYear();
  const rows = results.map((r) => ({
    session_id: sessionId,
    position_id: r.position_id,
    student_name: r.student_name,
    score: r.score,
    passed: r.passed,
    competencies: r.competencies,
    certificate_folio: r.passed
      ? `CS-${year}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      : null,
  }));
  const { data, error } = await db.from('sim_results').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data });
}
