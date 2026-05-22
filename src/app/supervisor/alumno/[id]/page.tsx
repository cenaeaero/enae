"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Dossier = any;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", confirmed: "En curso", completed: "Completado",
  rejected: "Rechazado", cancelled: "Cancelado",
};

function fmtCLP(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export default function SupervisorAlumnoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSent, setMsgSent] = useState("");

  async function load() {
    const res = await fetch(`/api/supervisor/alumno/${id}`).then((r) => r.json());
    setD(res);
    setEditForm({
      phone: res.profile?.phone || "",
      secondary_phone: res.profile?.secondary_phone || "",
      address: res.profile?.address || "",
      city: res.profile?.city || "",
      state: res.profile?.state || "",
      country: res.profile?.country || "",
      postal_code: res.profile?.postal_code || "",
      job_title: res.profile?.job_title || "",
      birth_date: res.profile?.birth_date || "",
      personal_email: res.profile?.personal_email || "",
      corporate_email: res.profile?.corporate_email || "",
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function saveEdit() {
    setSavingEdit(true);
    const res = await fetch(`/api/supervisor/alumno/${id}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSavingEdit(false);
    if (res.ok) { setEditing(false); load(); }
    else { const e = await res.json(); alert(e.error || "Error"); }
  }

  async function sendMessage() {
    if (!msgBody.trim()) return;
    const res = await fetch("/api/supervisor/mensaje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: msgSubject, body: msgBody, about_profile_id: id }),
    });
    if (res.ok) {
      setMsgSent("✓ Mensaje enviado al admin");
      setMsgBody(""); setMsgSubject("");
      setTimeout(() => { setShowMsg(false); setMsgSent(""); }, 2000);
    }
  }

  async function downloadDiploma(regId: string) {
    const url = `/api/diploma?registration_id=${regId}`;
    window.open(url, "_blank");
  }

  async function downloadCertificado(regId: string) {
    const url = `/api/certificado-dgac?registration_id=${regId}`;
    window.open(url, "_blank");
  }

  async function exportPdf() {
    if (!d) return;
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "letter" });
      const p = d.profile;
      let y = 14;
      doc.setFillColor(0, 51, 102).rect(0, 0, 216, 30, "F");
      doc.setTextColor(255, 255, 255).setFontSize(16).text("ENAE · Informe Académico Detallado", 10, y); y = 22;
      doc.setFontSize(9).text(`Generado: ${new Date().toLocaleDateString("es-CL")}`, 10, y);
      doc.setTextColor(0, 0, 0);

      y = 40;
      doc.setFontSize(13).setFont("helvetica", "bold").text(`${p.last_name}, ${p.first_name}`, 10, y); y += 6;
      doc.setFontSize(9).setFont("helvetica", "normal");
      doc.text(`RUT/Pasaporte: ${p.rut || "—"}    Folio Alumno: ${p.folio_enae || "—"}`, 10, y); y += 5;
      doc.text(`Email: ${p.email}    Tel: ${p.phone || "—"}`, 10, y); y += 5;
      doc.text(`Empresa: ${p.companies?.name || p.organization || "—"}    Cargo: ${p.job_title || "—"}`, 10, y); y += 8;

      for (const r of d.registrations || []) {
        if (y > 230) { doc.addPage(); y = 20; }
        const dipl = (d.diplomas || []).find((x: any) => x.registration_id === r.id);
        const acc = d.accessByReg[r.id] || { count: 0, last: null };
        const grades = d.gradesByReg[r.id] || [];
        const modules = d.modulesByCourse[r.course_id] || [];
        const progress = d.progressByReg[r.id] || [];
        const completedMods = progress.filter((p: any) => p.status === "completed").length;

        doc.setFont("helvetica", "bold").setFontSize(10).text(`• ${r.courses?.title || "Curso"} ${r.courses?.code ? `(${r.courses.code})` : ""}`, 10, y); y += 4;
        doc.setFont("helvetica", "normal").setFontSize(8);
        doc.text(`  Folio Cert: ${r.folio_enae || "—"}   Estado: ${STATUS_LABELS[r.status] || r.status}   Modalidad: ${r.delivery_mode || "—"}`, 10, y); y += 4;
        doc.text(`  Sesión: ${r.sessions?.dates || "—"}   Nota final: ${r.final_score != null ? r.final_score + "%" : "—"}`, 10, y); y += 4;
        doc.text(`  Accesos: ${acc.count}   Último: ${fmtDate(acc.last)}   Avance módulos: ${completedMods}/${modules.length}`, 10, y); y += 4;
        if (dipl) { doc.text(`  Diploma: ${dipl.verification_code} (${fmtDate(dipl.issued_date)})`, 10, y); y += 4; }
        if (grades.length > 0) {
          doc.setFont("helvetica", "italic").text("  Calificaciones:", 10, y); y += 4;
          doc.setFont("helvetica", "normal");
          for (const g of grades) {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.text(`    · ${g.grade_items?.name || "—"}: ${g.score ?? "—"}${g.score != null ? "%" : ""}`, 10, y); y += 3.5;
          }
        }
        y += 3;
      }
      doc.setFontSize(7).setTextColor(150).text("Informe académico · ENAE Training", 10, 280);
      doc.save(`Informe_${p.last_name}_${p.first_name}.pdf`);
    } finally { setExportingPdf(false); }
  }

  if (loading) return <p className="text-center py-16 text-gray-400">Cargando…</p>;
  if (!d || !d.profile) return <p className="text-center py-16 text-red-600">No encontrado</p>;

  const p = d.profile;
  const asCompany = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("as_company");

  return (
    <div className="max-w-5xl space-y-4">
      <Link href={`/supervisor/alumnos${asCompany ? `?as_company=${asCompany}` : ""}`} className="text-xs text-[#0072CE] hover:underline">← Volver a mis alumnos</Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover border border-gray-200"/>
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-3xl text-gray-300">👤</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#003366]">{p.last_name}, {p.first_name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
              <Info label="RUT/Pasaporte" value={p.rut || "—"} mono />
              <Info label="Folio Alumno" value={p.folio_enae || "—"} mono />
              <Info label="Email" value={p.email} />
              <Info label="Teléfono" value={p.phone || "—"} />
              <Info label="Empresa" value={p.companies?.name || p.organization || "—"} />
              <Info label="Cargo" value={p.job_title || "—"} />
              <Info label="Ciudad" value={p.city || "—"} />
              <Info label="F. nacimiento" value={fmtDate(p.birth_date)} />
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={exportPdf} disabled={exportingPdf}
              className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded">
              {exportingPdf ? "Generando…" : "📄 PDF Detallado"}
            </button>
            <button onClick={() => setEditing(true)}
              className="bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-50">
              ✏️ Editar datos
            </button>
            <button onClick={() => setShowMsg(true)}
              className="bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-50">
              ✉️ Mensaje admin
            </button>
          </div>
        </div>
      </div>

      {/* Cursos */}
      {(d.registrations || []).map((r: any) => {
        const dipl = (d.diplomas || []).find((x: any) => x.registration_id === r.id);
        const acc = d.accessByReg[r.id] || { count: 0, last: null };
        const grades = d.gradesByReg[r.id] || [];
        const modules = d.modulesByCourse[r.course_id] || [];
        const progress = d.progressByReg[r.id] || [];
        const progressByMod = Object.fromEntries(progress.map((p: any) => [p.module_id, p.status]));
        const completedMods = progress.filter((p: any) => p.status === "completed").length;
        const bc = (d.billingCases || []).find((b: any) => b.registration_id === r.id);

        return (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[#003366]">{r.courses?.title}</p>
                <p className="text-xs text-gray-500 font-mono">{r.courses?.code || ""} · {r.delivery_mode || "—"} · {r.sessions?.dates || ""}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">{STATUS_LABELS[r.status] || r.status}</span>
                {r.final_score != null && (
                  <p className={`text-2xl font-bold mt-1 ${r.final_score >= 80 ? "text-green-700" : "text-red-600"}`}>
                    {r.final_score}%
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-3">
              <Info label="Folio Cert." value={r.folio_enae || "—"} mono />
              <Info label="Accesos" value={acc.count} />
              <Info label="Último acceso" value={fmtDate(acc.last)} />
              <Info label="Avance módulos" value={`${completedMods} / ${modules.length}`} />
            </div>

            {/* Módulos */}
            {modules.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Módulos</p>
                <ul className="space-y-1 text-xs">
                  {modules.map((m: any, i: number) => {
                    const st = progressByMod[m.id];
                    return (
                      <li key={m.id} className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          st === "completed" ? "bg-green-100 text-green-700" :
                          st === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-400"
                        }`}>{st === "completed" ? "✓" : i + 1}</span>
                        <span className="text-gray-700">{m.title}</span>
                        {m.duration_hours && <span className="text-gray-400">({m.duration_hours}h)</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Calificaciones */}
            {grades.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Calificaciones</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                  {grades.map((g: any) => (
                    <div key={g.grade_item_id} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                      <span className="text-gray-600 truncate">{g.grade_items?.name}</span>
                      <span className={`font-bold ${(g.score ?? 0) >= 80 ? "text-green-700" : "text-gray-700"}`}>{g.score ?? "—"}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diploma + Certificado */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {dipl ? (
                <>
                  <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded">
                    📜 Diploma: {dipl.verification_code}
                  </span>
                  <button onClick={() => downloadDiploma(r.id)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                    Descargar diploma
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-400">Diploma no emitido aún</span>
              )}
              {r.courses?.has_dgac_certificate && (
                <button onClick={() => downloadCertificado(r.id)} className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded">
                  Descargar certificado DGAC
                </button>
              )}
            </div>

            {/* Facturación */}
            {bc && (
              <div className="border-t border-gray-100 pt-2 text-xs">
                <p className="font-medium text-gray-500 uppercase mb-1">Facturación</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Info label="Cotización" value={bc.quotation_number || "—"} />
                  <Info label="N° Factura" value={bc.invoice_number || "—"} />
                  <Info label="Fecha factura" value={fmtDate(bc.invoice_date)} />
                  <Info label="Pago" value={bc.payment_received_at ? `✓ ${fmtDate(bc.payment_received_at)}` : "Pendiente"} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#003366]">Editar datos de contacto</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {[
                ["phone", "Teléfono"], ["secondary_phone", "Tel. secundario"],
                ["personal_email", "Email personal"], ["corporate_email", "Email empresa"],
                ["job_title", "Cargo"], ["birth_date", "Fecha nacimiento"],
                ["address", "Dirección"], ["city", "Ciudad"],
                ["state", "Región"], ["country", "País"], ["postal_code", "Código postal"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type={k === "birth_date" ? "date" : k.includes("email") ? "email" : "text"}
                    value={editForm[k] || ""} onChange={(e) => setEditForm({...editForm, [k]: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"/>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={saveEdit} disabled={savingEdit}
                className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold rounded">
                {savingEdit ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje al admin */}
      {showMsg && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMsg(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#003366]">Mensaje al administrador</h2>
              <button onClick={() => setShowMsg(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-gray-500">Sobre: <strong>{p.first_name} {p.last_name}</strong></p>
              <input type="text" placeholder="Asunto" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
              <textarea rows={4} placeholder="Tu mensaje al admin…" value={msgBody} onChange={(e) => setMsgBody(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
              {msgSent && <p className="text-sm text-green-700">{msgSent}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowMsg(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={sendMessage} disabled={!msgBody.trim()}
                className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
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
