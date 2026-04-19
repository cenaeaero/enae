import { supabaseAdmin } from "@/lib/supabase-service";
import Link from "next/link";

type VerifyData = {
  found: boolean;
  student_name?: string;
  course_title?: string;
  course_code?: string | null;
  registration_date?: string;
  apendice_c_uploaded_at?: string | null;
  company?: string;
};

async function lookup(code: string): Promise<VerifyData> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { found: false };

  const { data: proc } = await supabaseAdmin
    .from("dgac_procedures")
    .select("registration_id, apendice_c_uploaded_at")
    .eq("apendice_c_verification_code", clean)
    .maybeSingle();

  if (!proc?.registration_id) return { found: false };

  const { data: reg } = await supabaseAdmin
    .from("registrations")
    .select("first_name, last_name, created_at, courses(title, code)")
    .eq("id", proc.registration_id)
    .maybeSingle();

  if (!reg) return { found: false };

  const r = reg as any;
  return {
    found: true,
    student_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
    course_title: r.courses?.title || "",
    course_code: r.courses?.code || null,
    registration_date: r.created_at,
    apendice_c_uploaded_at: proc.apendice_c_uploaded_at || null,
    company: "Escuela de Navegación Aérea SpA",
  };
}

export default async function VerifyApendiceCPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await lookup(code);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#003366] text-white flex items-center justify-center text-2xl">
              📄
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#003366]">Verificación Apéndice C</h1>
              <p className="text-sm text-gray-500">Declaración Jurada DAN 151 — DGAC Chile</p>
            </div>
          </div>

          {!data.found ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 font-semibold">Código no encontrado</p>
              <p className="text-sm text-red-600 mt-1">
                El código <code className="font-mono bg-red-100 px-2 py-0.5 rounded">{code}</code> no corresponde a ningún Apéndice C emitido por ENAE.
              </p>
            </div>
          ) : (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-800 font-semibold">Documento válido</p>
                  <p className="text-xs text-green-700">Apéndice C emitido por ENAE para el alumno indicado.</p>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Alumno</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{data.student_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Código de verificación</dt>
                  <dd className="font-mono text-gray-800 mt-0.5">{code.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Curso</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">
                    {data.course_title}{data.course_code ? ` (${data.course_code})` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Fecha de inscripción</dt>
                  <dd className="text-gray-800 mt-0.5">
                    {data.registration_date ? new Date(data.registration_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Empresa AOC</dt>
                  <dd className="text-gray-800 mt-0.5">{data.company}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Apéndice C firmado subido</dt>
                  <dd className="text-gray-800 mt-0.5">
                    {data.apendice_c_uploaded_at ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700 text-xs font-medium bg-green-100 border border-green-200 px-2 py-1 rounded">
                        ✓ Subido el {new Date(data.apendice_c_uploaded_at).toLocaleString("es-CL")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-yellow-700 text-xs font-medium bg-yellow-100 border border-yellow-200 px-2 py-1 rounded">
                        Pendiente de firma y huella
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/" className="text-xs text-[#0072CE] hover:text-[#003366]">
              Escuela de Navegación Aérea SpA — enae.cl
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
