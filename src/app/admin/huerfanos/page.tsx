"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Orphan = {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  course: { title: string; code: string | null };
  status: string;
  created_at: string;
  blockers: string[];
  safeToDelete: boolean;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HuerfanosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string>("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/huerfanos").then((r) => r.json());
    setData(res);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(o: Orphan) {
    if (!o.safeToDelete) return;
    if (!confirm(`¿Eliminar la inscripción huérfana de ${o.name}?\n\nCurso: ${o.course.title}\nEsta inscripción NO tiene datos académicos. La acción no se puede deshacer.`)) return;
    setBusy(o.id); setMsg("");
    const res = await fetch("/api/admin/huerfanos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: o.id }),
    });
    const j = await res.json();
    setBusy("");
    if (!res.ok) { setMsg(`✗ ${j.error}${j.blockers ? ": " + j.blockers.join(", ") : ""}`); return; }
    setMsg("✓ Inscripción huérfana eliminada");
    load();
  }

  if (loading) return <p className="text-center py-16 text-gray-400">Buscando inscripciones huérfanas…</p>;

  const regs: Orphan[] = data?.registrations || [];
  const s = data?.summary || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#003366]">Inscripciones huérfanas</h1>
      <p className="text-sm text-gray-500 mt-1">
        Inscripciones sin perfil asociado (<code className="text-xs">profile_id</code> vacío). No aparecen en el listado de alumnos,
        pero pueden bloquear una reinscripción al mismo curso. La eliminación está bloqueada cuando hay datos académicos
        (exámenes, notas, diplomas, certificados, pagos).
      </p>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <Stat label="Huérfanas totales" value={s.total ?? 0} color="text-[#003366]" />
        <Stat label="Seguras de borrar" value={s.safe ?? 0} color="text-green-700" />
        <Stat label="Con datos (bloqueadas)" value={s.blocked ?? 0} color="text-amber-700" />
      </div>

      {msg && <p className={`text-sm mt-3 ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</p>}

      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
        {regs.length === 0 ? (
          <p className="text-gray-400 py-10 text-center">Sin inscripciones huérfanas. 🎉</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Alumno</th>
                <th className="text-left px-4 py-2">Curso</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Inscrito</th>
                <th className="text-left px-4 py-2">Datos académicos</th>
                <th className="text-right px-4 py-2">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {regs.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-[#003366]">{o.name}</p>
                    <p className="text-[10px] text-gray-400">{o.email}{o.organization ? ` · ${o.organization}` : ""}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-xs text-gray-700">{o.course.title}</p>
                    {o.course.code && <p className="text-[10px] text-gray-400">{o.course.code}</p>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{o.status}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-2">
                    {o.blockers.length === 0 ? (
                      <span className="text-[10px] text-gray-400">— sin datos —</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {o.blockers.map((b, i) => (
                          <span key={i} className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{b}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {o.safeToDelete ? (
                      <button
                        onClick={() => remove(o)}
                        disabled={busy === o.id}
                        className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold px-3 py-1.5 rounded"
                        title="Esta inscripción no tiene datos; eliminarla directamente"
                      >
                        {busy === o.id ? "…" : "Eliminar"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400" title="Tiene datos académicos; usa Duplicados para fusionar">protegida</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {s.blocked > 0 && (
        <p className="mt-3 text-[11px] text-gray-400">
          Las inscripciones con datos académicos no se pueden borrar aquí. Si necesitas conservar su avance, ve a{" "}
          <Link href="/admin/duplicados" className="text-[#0072CE] hover:underline">Duplicados</Link> y fusiónalas con la inscripción correcta.
        </p>
      )}

      <div className="mt-8">
        <Link href="/admin" className="text-xs text-[#0072CE] hover:underline">← Volver al panel</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
