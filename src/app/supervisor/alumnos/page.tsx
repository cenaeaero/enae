"use client";

import { useEffect, useMemo, useState } from "react";

type Reg = {
  id: string;
  course_id: string;
  status: string;
  delivery_mode: string | null;
  folio_enae: string | null;
  final_score: number | null;
  grade_status: string | null;
  created_at: string;
  completed_at: string | null;
  first_name: string;
  last_name: string;
  email: string;
  last_access: string | null;
  courses?: { title: string; code: string | null } | null;
  sessions?: { dates: string; location: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "En curso",
  completed: "Completado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SupervisorAlumnosPage() {
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_company");
    const suffix = q ? `?as_company=${q}` : "";
    (async () => {
      const data = await fetch(`/api/supervisor/dashboard${suffix}`).then((r) => r.json());
      setRegs(data.registrations || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return regs.filter((r) => {
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (!term) return true;
      return (
        r.first_name.toLowerCase().includes(term) ||
        r.last_name.toLowerCase().includes(term) ||
        (r.email || "").toLowerCase().includes(term) ||
        (r.courses?.title || "").toLowerCase().includes(term)
      );
    });
  }, [regs, q, fStatus]);

  // Resolver profile.id desde email (necesario para /api/supervisor/alumno/[id])
  async function exportPdfFor(email: string, firstName: string, lastName: string) {
    setExporting(email);
    try {
      // Busca profile_id por email
      const profRes = await fetch(`/api/supervisor/dashboard`).then(r => r.json());
      // shortcut: el dossier por id devuelve todo via /api/supervisor/alumno/[id]
      // pero no tenemos profile_id en regs. Le vamos a pedir buscar por email mediante un endpoint dedicado:
      // Aprovechamos: el dossier API usa el profile.id, lo buscamos en supabase via fetch wrapper:
      const lookup = await fetch(`/api/supervisor/alumno/by-email?email=${encodeURIComponent(email)}`).then(r => r.json()).catch(() => null);
      if (!lookup?.profile?.id) { alert("No se encontró el perfil"); return; }
      const dossier = await fetch(`/api/supervisor/alumno/${lookup.profile.id}`).then(r => r.json());
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "letter" });
      const p = dossier.profile;

      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, 216, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16).text("ENAE · Informe Académico", 10, 14);
      doc.setFontSize(9).text(`Generado: ${new Date().toLocaleDateString("es-CL")}`, 10, 22);
      doc.setTextColor(0, 0, 0);

      let y = 40;
      doc.setFontSize(13).setFont("helvetica", "bold").text(`${p.last_name}, ${p.first_name}`, 10, y); y += 6;
      doc.setFontSize(9).setFont("helvetica", "normal");
      doc.text(`RUT/Pasaporte: ${p.rut || "—"}    Folio: ${p.folio_enae || "—"}    Email: ${p.email}`, 10, y); y += 5;
      doc.text(`Empresa: ${p.companies?.name || p.organization || "—"}`, 10, y); y += 8;

      doc.setFont("helvetica", "bold").setFontSize(11).text("Cursos realizados", 10, y); y += 6;
      doc.setFont("helvetica", "normal").setFontSize(8);

      for (const r of dossier.registrations || []) {
        if (y > 240) { doc.addPage(); y = 20; }
        const dipl = (dossier.diplomas || []).find((d: any) => d.registration_id === r.id);
        doc.setFont("helvetica", "bold").text(`• ${r.courses?.title || "Curso"} ${r.courses?.code ? `(${r.courses.code})` : ""}`, 10, y); y += 4;
        doc.setFont("helvetica", "normal");
        doc.text(`  Folio Certificado: ${r.folio_enae || "—"}   Modalidad: ${r.delivery_mode || "—"}   Sesión: ${r.sessions?.dates || "—"}`, 10, y); y += 4;
        doc.text(`  Estado: ${STATUS_LABELS[r.status] || r.status}   Nota final: ${r.final_score != null ? r.final_score + "%" : "—"}`, 10, y); y += 4;
        if (dipl) { doc.text(`  Diploma: ${dipl.verification_code} (${fmtDate(dipl.issued_date)})`, 10, y); y += 4; }
        y += 3;
      }

      doc.setFontSize(7).setTextColor(150);
      doc.text("Informe académico · ENAE Training", 10, 280);
      doc.save(`Informe_${lastName}_${firstName}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-4">Mis Alumnos</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Buscar por nombre, curso, email…"
          value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[260px] py-2 px-3 border border-gray-300 rounded text-sm" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="py-2 px-3 border border-gray-300 rounded text-sm">
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="confirmed">En curso</option>
          <option value="completed">Completados</option>
        </select>
      </div>

      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Alumno</th>
                <th className="text-left px-4 py-3">Curso</th>
                <th className="text-left px-4 py-3">Sesión</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Nota</th>
                <th className="text-left px-4 py-3">Últ. acceso</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#003366]">{r.last_name}, {r.first_name}</p>
                    <p className="text-xs text-gray-500">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.courses?.title}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.sessions?.dates || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${(r.final_score || 0) >= 80 ? "text-green-700" : "text-gray-700"}`}>
                    {r.final_score != null ? `${r.final_score}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.last_access)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <a href={`/api/supervisor/alumno/by-email?email=${encodeURIComponent(r.email)}`}
                      onClick={async (e) => {
                        e.preventDefault();
                        const data = await fetch(`/api/supervisor/alumno/by-email?email=${encodeURIComponent(r.email)}`).then((r) => r.json());
                        if (data.profile?.id) window.location.href = `/supervisor/alumno/${data.profile.id}`;
                      }}
                      className="text-xs text-[#0072CE] hover:underline cursor-pointer">Ver ficha</a>
                    <button onClick={() => exportPdfFor(r.email, r.first_name, r.last_name)} disabled={exporting === r.email}
                      className="text-xs text-[#0072CE] hover:underline">
                      {exporting === r.email ? "Generando…" : "PDF rápido"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin alumnos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
