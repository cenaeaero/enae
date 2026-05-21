"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  rut: string | null;
  folio_enae: string | null;
  phone: string | null;
  secondary_phone: string | null;
  job_title: string | null;
  organization: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  company_id: string | null;
  companies?: { id: string; name: string; rut: string | null; legal_name: string | null } | null;
  created_at: string;
};

type Registration = {
  id: string;
  course_id: string;
  status: string;
  delivery_mode: string | null;
  organization: string | null;
  final_score: number | null;
  grade_status: string | null;
  is_alumni: boolean;
  theoretical_start: string | null;
  practical_end: string | null;
  created_at: string;
  completed_at: string | null;
  courses?: { title: string; code: string | null; area: string; modality: string; duration: string } | null;
  sessions?: { dates: string; location: string; modality: string; fee: string | null } | null;
};

type Grade = {
  registration_id: string;
  grade_item_id: string;
  score: number | null;
  comments: string | null;
  graded_at: string | null;
  grade_items?: { name: string; weight: number; is_practical: boolean } | null;
};

type Diploma = {
  id: string;
  registration_id: string;
  verification_code: string;
  final_score: number;
  status: string;
  issued_date: string;
  course_title: string;
  course_code: string | null;
};

type BillingCase = {
  registration_id: string;
  id: string;
  company: string | null;
  quotation_number: string | null;
  quotation_amount: number | null;
  quotation_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  payment_received_at: string | null;
  payment_amount: number | null;
  status: string;
  hes_number: string | null;
  oc_number: string | null;
};

type Payment = {
  id: string;
  registration_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type Note = {
  id: string;
  profile_id: string;
  registration_id: string | null;
  author_email: string;
  body: string;
  created_at: string;
};

type Dossier = {
  profile: Profile;
  registrations: Registration[];
  gradesByReg: Record<string, Grade[]>;
  diplomas: Diploma[];
  billingCases: BillingCase[];
  payments: Payment[];
  notes: Note[];
  surveys: { id: string; registration_id: string; questionnaire_type: string; created_at: string }[];
  accessSummary: { lastAccess: string | null; totalAccess: number };
  companyHistory: { company: string; from: string; to: string | null }[];
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "En curso",
  completed: "Completado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function fmtCLP(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AlumnoDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteForReg, setNoteForReg] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/alumno/${id}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Error"); setLoading(false); return; }
    setDossier(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function addNote() {
    if (!noteText.trim() || !dossier) return;
    setSavingNote(true);
    const res = await fetch("/api/admin/student-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: dossier.profile.id,
        registration_id: noteForReg || null,
        body: noteText.trim(),
      }),
    });
    setSavingNote(false);
    if (res.ok) {
      setNoteText("");
      setNoteForReg("");
      load();
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("¿Eliminar esta anotación?")) return;
    await fetch(`/api/admin/student-notes?id=${noteId}`, { method: "DELETE" });
    load();
  }

  async function exportPdf() {
    if (!dossier) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "letter" });
      const p = dossier.profile;

      // Header
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, 216, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16).text("ENAE · Ficha del Alumno", 10, 14);
      doc.setFontSize(9).text(`Generado: ${new Date().toLocaleDateString("es-CL")}`, 10, 22);

      // Body
      doc.setTextColor(0, 0, 0);
      let y = 40;
      doc.setFontSize(13).setFont("helvetica", "bold").text(`${p.last_name}, ${p.first_name}`, 10, y);
      y += 6;
      doc.setFontSize(9).setFont("helvetica", "normal");
      doc.text(`Folio ENAE: ${p.folio_enae || "—"}    RUT: ${p.rut || "—"}    Email: ${p.email}`, 10, y); y += 5;
      doc.text(`Teléfono: ${p.phone || "—"}    Cargo: ${p.job_title || "—"}`, 10, y); y += 5;
      doc.text(`Empresa: ${p.companies?.name || p.organization || "—"}    Razón social: ${p.companies?.legal_name || "—"}`, 10, y); y += 5;
      doc.text(`Dirección: ${p.address || "—"}, ${p.city || ""} ${p.state || ""} ${p.country || ""}`, 10, y); y += 8;

      // Cursos
      doc.setFont("helvetica", "bold").setFontSize(11).text("Cursos realizados", 10, y); y += 6;
      doc.setFont("helvetica", "normal").setFontSize(8);
      for (const r of dossier.registrations) {
        if (y > 250) { doc.addPage(); y = 20; }
        const dipl = dossier.diplomas.find((d) => d.registration_id === r.id);
        const bc = dossier.billingCases.find((b) => b.registration_id === r.id);
        doc.setFont("helvetica", "bold").text(`• ${r.courses?.title || "Curso"} ${r.courses?.code ? `(${r.courses.code})` : ""}`, 10, y); y += 4;
        doc.setFont("helvetica", "normal");
        doc.text(`  Estado: ${statusLabels[r.status] || r.status}   Modalidad: ${r.delivery_mode || "—"}   Sesión: ${r.sessions?.dates || "—"}`, 10, y); y += 4;
        doc.text(`  Nota final: ${r.final_score != null ? r.final_score + "%" : "—"}   Diploma: ${dipl ? dipl.verification_code : "no emitido"}`, 10, y); y += 4;
        if (bc) {
          doc.text(`  Cotización: ${bc.quotation_number || "—"}   Factura: ${bc.invoice_number || "—"} ${bc.invoice_amount ? "($" + bc.invoice_amount.toLocaleString("es-CL") + ")" : ""}`, 10, y); y += 4;
        }
        y += 2;
      }

      // Notas
      if (dossier.notes.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold").setFontSize(11).text("Anotaciones", 10, y); y += 6;
        doc.setFont("helvetica", "normal").setFontSize(8);
        for (const n of dossier.notes) {
          if (y > 260) { doc.addPage(); y = 20; }
          doc.text(`[${fmtDate(n.created_at)}] ${n.author_email}:`, 10, y); y += 4;
          const lines = doc.splitTextToSize(n.body, 190);
          doc.text(lines, 12, y); y += lines.length * 4 + 2;
        }
      }

      // Footer en última página
      doc.setFontSize(7).setTextColor(150);
      doc.text("Documento generado automáticamente · ENAE Training", 10, 280);

      doc.save(`Ficha_${p.last_name}_${p.first_name}_${p.folio_enae || "sf"}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando ficha…</div>;
  if (error || !dossier) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-red-600">{error || "No se pudo cargar"}</p>
      <Link href="/admin/registros" className="text-[#0072CE] mt-4 inline-block">← Volver al listado</Link>
    </div>
  );

  const p = dossier.profile;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header con identidad */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <Link href="/admin/registros" className="text-xs text-[#0072CE] hover:underline">← Listado de alumnos</Link>
            <h1 className="text-2xl font-bold text-[#003366] mt-1">{p.last_name}, {p.first_name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              <Info label="Folio ENAE" value={p.folio_enae || "—"} mono />
              <Info label="RUT" value={p.rut || "—"} mono />
              <Info label="Email" value={p.email} />
              <Info label="Teléfono" value={p.phone || "—"} />
              <Info label="Cargo" value={p.job_title || "—"} />
              <Info label="Empresa actual" value={
                p.companies ? <Link href={`/admin/empresas`} className="text-[#0072CE] hover:underline">{p.companies.name}</Link> : (p.organization || "—")
              } />
              <Info label="Ciudad" value={[p.city, p.state, p.country].filter(Boolean).join(", ") || "—"} />
              <Info label="Último acceso" value={fmtDate(dossier.accessSummary.lastAccess)} />
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={exportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {exporting ? "Generando…" : "📄 Exportar PDF"}
            </button>
            <Link href={`/admin/perfiles`} className="inline-block text-center bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
              Editar perfil
            </Link>
          </div>
        </div>
      </div>

      {/* Histórico de empresas */}
      {dossier.companyHistory.length > 0 && (
        <Section title="Histórico de empresas">
          <ol className="space-y-2 text-sm">
            {dossier.companyHistory.map((h, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0">{fmtDate(h.from)} → {h.to ? fmtDate(h.to) : "actual"}</span>
                <span className="font-medium text-[#003366]">{h.company}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Cursos */}
      <Section title={`Cursos (${dossier.registrations.length})`}>
        {dossier.registrations.length === 0 ? (
          <p className="text-sm text-gray-400">Sin inscripciones registradas.</p>
        ) : (
          <div className="space-y-4">
            {dossier.registrations.map((r) => {
              const grades = dossier.gradesByReg[r.id] || [];
              const dipl = dossier.diplomas.find((d) => d.registration_id === r.id);
              const bc = dossier.billingCases.find((b) => b.registration_id === r.id);
              const regNotes = dossier.notes.filter((n) => n.registration_id === r.id);
              return (
                <div key={r.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#0072CE] transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/registros/inscripcion/${r.id}`} className="block hover:underline">
                        <p className="font-semibold text-[#003366]">{r.courses?.title || "Curso"}</p>
                        <p className="text-xs text-gray-500 font-mono">{r.courses?.code || "—"}</p>
                      </Link>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                        <span>Sesión: {r.sessions?.dates || "—"}</span>
                        <span>Modalidad: {r.delivery_mode || r.courses?.modality || "—"}</span>
                        <span>Inscrito: {fmtDate(r.created_at)}</span>
                        {r.completed_at && <span>Completado: {fmtDate(r.completed_at)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabels[r.status] || r.status}
                      </span>
                      {r.final_score != null && (
                        <p className={`mt-2 text-lg font-bold ${r.final_score >= 80 ? "text-green-700" : "text-red-600"}`}>
                          {r.final_score}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Calificaciones */}
                  {grades.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Calificaciones</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {grades.map((g) => (
                          <div key={g.grade_item_id} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                            <span className="text-gray-600 truncate">{g.grade_items?.name || "Item"}</span>
                            <span className={`font-bold ${(g.score ?? 0) >= 80 ? "text-green-700" : "text-gray-800"}`}>
                              {g.score ?? "—"}{g.score != null && "%"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diploma + Cotización + Factura */}
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 uppercase text-[10px]">Diploma</p>
                      {dipl ? (
                        <p className="font-mono text-[#003366]">{dipl.verification_code}</p>
                      ) : (
                        <p className="text-gray-400">No emitido</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase text-[10px]">Cotización</p>
                      {bc?.quotation_number ? (
                        <Link href="/admin/facturacion" className="text-[#0072CE] hover:underline">
                          {bc.quotation_number} {bc.quotation_amount ? `· ${fmtCLP(bc.quotation_amount)}` : ""}
                        </Link>
                      ) : <p className="text-gray-400">—</p>}
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase text-[10px]">Factura</p>
                      {bc?.invoice_number ? (
                        <span className={bc.payment_received_at ? "text-green-700" : "text-amber-700"}>
                          {bc.invoice_number} · {fmtCLP(bc.invoice_amount)} {bc.payment_received_at ? "✓" : "⏳"}
                        </span>
                      ) : <p className="text-gray-400">—</p>}
                    </div>
                  </div>

                  {/* Notas por inscripción */}
                  {regNotes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Observaciones del curso</p>
                      <ul className="space-y-1 text-xs">
                        {regNotes.map((n) => (
                          <li key={n.id} className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            <span className="text-gray-500">[{fmtDate(n.created_at)} · {n.author_email}]</span> {n.body}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Pagos Webpay */}
      {dossier.payments.length > 0 && (
        <Section title="Pagos Webpay">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Fecha</th>
                <th className="text-left py-2">Estado</th>
                <th className="text-right py-2">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dossier.payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{fmtDate(p.created_at)}</td>
                  <td className="py-2">{p.status}</td>
                  <td className="py-2 text-right font-semibold">{fmtCLP(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Anotaciones del alumno */}
      <Section title="Anotaciones / Observaciones internas">
        <div className="mb-4 space-y-2">
          <textarea
            rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)}
            placeholder="Nueva anotación…"
            className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
          />
          <div className="flex gap-2 items-center">
            <select value={noteForReg} onChange={(e) => setNoteForReg(e.target.value)}
              className="text-xs py-1.5 px-2 border border-gray-300 rounded">
              <option value="">Sobre el alumno (general)</option>
              {dossier.registrations.map((r) => (
                <option key={r.id} value={r.id}>Sobre curso: {r.courses?.title || "—"}</option>
              ))}
            </select>
            <button onClick={addNote} disabled={savingNote || !noteText.trim()}
              className="text-xs bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white font-semibold px-3 py-1.5 rounded">
              {savingNote ? "Guardando…" : "+ Agregar"}
            </button>
          </div>
        </div>
        {dossier.notes.length === 0 ? (
          <p className="text-sm text-gray-400">Sin anotaciones.</p>
        ) : (
          <ul className="space-y-2">
            {dossier.notes.filter((n) => !n.registration_id).map((n) => (
              <li key={n.id} className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    {fmtDate(n.created_at)} · {n.author_email}
                  </p>
                  <button onClick={() => deleteNote(n.id)} className="text-xs text-red-500 hover:underline">eliminar</button>
                </div>
                <p className="mt-1 text-gray-800 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-[#003366] uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
