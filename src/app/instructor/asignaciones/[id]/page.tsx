"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Assignment = any;

export default function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [a, setA] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [gradeT, setGradeT] = useState("");
  const [gradeP, setGradeP] = useState("");
  const [obs, setObs] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");

  async function load() {
    const res = await fetch(`/api/instructor/asignaciones/${id}`).then((r) => r.json());
    if (res.assignment) {
      setA(res.assignment);
      setGradeT(res.assignment.grade_theoretical?.toString() || "");
      setGradeP(res.assignment.grade_practical?.toString() || "");
      setObs(res.assignment.observations || "");
      setCity(res.assignment.city || "");
      setDate(res.assignment.scheduled_date || "");
    }
    setDocuments(res.documents || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function save(markCompleted = false) {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/instructor/asignaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade_theoretical: gradeT ? Number(gradeT) : null,
        grade_practical: gradeP ? Number(gradeP) : null,
        observations: obs || null,
        city: city || null,
        scheduled_date: date || null,
        markCompleted,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMsg(markCompleted ? "✓ Marcado como completado. El admin fue notificado." : "✓ Guardado y admin notificado.");
      load();
    } else {
      setMsg(data.error || "Error");
    }
  }

  async function uploadEval(f: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("kind", "evaluation");
    fd.append("id", id);
    fd.append("file", f);
    const res = await fetch("/api/instructor/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) { setMsg("✓ Hoja de evaluación subida"); load(); }
  }

  async function viewEval() {
    if (!a?.evaluation_file_url) return;
    const res = await fetch(`/api/instructor/upload?bucket=instructor-evaluations&path=${encodeURIComponent(a.evaluation_file_url)}`).then((r) => r.json());
    if (res.url) window.open(res.url, "_blank");
  }

  async function uploadDoc(f: File) {
    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("kind", "document");
    fd.append("id", id);
    fd.append("file", f);
    const res = await fetch("/api/instructor/upload", { method: "POST", body: fd });
    setUploadingDoc(false);
    if (res.ok) { setMsg("✓ Documento subido"); load(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || "Error al subir documento"); }
  }

  async function viewDoc(path: string) {
    const res = await fetch(`/api/instructor/upload?bucket=instructor-documents&path=${encodeURIComponent(path)}`).then((r) => r.json());
    if (res.url) window.open(res.url, "_blank");
  }

  async function deleteDoc(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/instructor/upload?doc_id=${docId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-center py-16 text-gray-400">Cargando…</p>;
  if (!a) return <p className="text-center py-16 text-red-600">No encontrada</p>;

  const r = a.registrations;
  return (
    <div className="max-w-4xl">
      <Link href="/instructor/asignaciones" className="text-xs text-[#0072CE] hover:underline">← Volver al listado</Link>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-2">
        <h1 className="text-xl font-bold text-[#003366]">{r?.last_name}, {r?.first_name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
          <Info label="RUT" value={r?.rut || "—"} />
          <Info label="Folio" value={r?.folio_enae || "—"} />
          <Info label="Empresa" value={r?.organization || "—"} />
          <Info label="Email" value={r?.email} />
          <Info label="Curso" value={r?.courses?.title || "—"} />
          <Info label="Código" value={r?.courses?.code || "—"} />
          <Info label="Sesión" value={r?.sessions?.dates || "—"} />
          <Info label="Tipo" value={a.kind === "theoretical" ? "Teórico" : a.kind === "practical" ? "Práctico" : "Ambos"} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4">
        <h2 className="text-sm font-semibold text-[#003366] mb-3">Detalles de la clase</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4">
        <h2 className="text-sm font-semibold text-[#003366] mb-3">Calificaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota teórica (0-100)</label>
            <input type="number" min={0} max={100} step={0.1} value={gradeT} onChange={(e) => setGradeT(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota práctica (0-100)</label>
            <input type="number" min={0} max={100} step={0.1} value={gradeP} onChange={(e) => setGradeP(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
          <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>

      <div className="bg-[#003366] rounded-lg p-5 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Evaluación práctica en línea · ENAE-CHL-N1</h2>
          <p className="text-xs text-blue-200 mt-0.5">Registra el cumplimiento de ejercicios por fase (Pre-Solo, Progreso, Final y Chequeo) directamente en la plataforma.</p>
        </div>
        <Link href={`/instructor/asignaciones/${id}/evaluacion`}
          className="bg-white hover:bg-blue-50 text-[#003366] text-sm font-semibold px-5 py-2 rounded">
          📋 Abrir formulario
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4">
        <h2 className="text-sm font-semibold text-[#003366] mb-3">Hoja de evaluación</h2>
        <p className="text-xs text-gray-500 mb-2">
          <a href="/templates/EVALUACION-OPERADOR-RPAS-ENAE-CHL-N1.pdf" target="_blank" className="text-[#0072CE] underline">📥 Descargar plantilla PDF</a>
          {" · "}
          <a href="/templates/EVALUACION-OPERADOR-RPAS-ENAE-CHL-N1.docx" target="_blank" className="text-[#0072CE] underline">📥 Descargar Word</a>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept="application/pdf,image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadEval(f); }}
            className="text-xs"/>
          {uploading && <span className="text-xs text-gray-400">Subiendo…</span>}
          {a.evaluation_file_url && !uploading && (
            <button onClick={viewEval} className="text-xs text-[#0072CE] hover:underline">Ver evaluación subida</button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4">
        <h2 className="text-sm font-semibold text-[#003366] mb-1">Otros documentos</h2>
        <p className="text-xs text-gray-500 mb-3">Sube documentos adicionales del alumno: bitácora de vuelo, registro fotográfico, checklist, informes, etc. (PDF, imagen, Word o Excel)</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadDoc(f); e.target.value = ""; } }}
            className="text-xs"/>
          {uploadingDoc && <span className="text-xs text-gray-400">Subiendo…</span>}
        </div>
        {documents.length > 0 && (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <button onClick={() => viewDoc(d.file_path)} className="text-xs text-[#0072CE] hover:underline truncate text-left flex-1">
                  📎 {d.file_name}
                </button>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(d.uploaded_at).toLocaleDateString("es-CL")}</span>
                <button onClick={() => deleteDoc(d.id)} className="text-xs text-red-500 hover:underline shrink-0">eliminar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">{msg}</div>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => save(false)} disabled={saving}
          className="bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <button onClick={() => save(true)} disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded">
          Guardar y marcar como completado
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}
