"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type CertificateRow = {
  registration_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  course_id: string;
  course_title: string;
  course_code: string | null;
  has_dgac_certificate: boolean;
  status: string;
  is_alumni: boolean | null;
  final_score: number | null;
  grade_status: string | null;
};

export default function AdminCertificadosPage() {
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Load registrations whose course has DGAC certificate enabled and student is approved/completed
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, first_name, last_name, email, company, organization, course_id, status, is_alumni, final_score, grade_status, courses(title, code, has_dgac_certificate)")
      .or("status.eq.confirmed,status.eq.completed,is_alumni.eq.true")
      .limit(10000);

    if (!regs) {
      setLoading(false);
      return;
    }

    // Filter only courses with has_dgac_certificate = true
    const certRegs = (regs as any[]).filter((r) => r.courses?.has_dgac_certificate === true);

    // Backfill company from profile.organization where missing
    const emails: string[] = Array.from(new Set(certRegs.map((r) => r.email).filter(Boolean)));
    const profileCompanyByEmail: Record<string, string> = {};
    if (emails.length > 0) {
      for (let i = 0; i < emails.length; i += 500) {
        const chunk = emails.slice(i, i + 500);
        const { data: profs } = await supabase
          .from("profiles")
          .select("email, organization")
          .in("email", chunk);
        (profs || []).forEach((p: any) => {
          if (p.organization) profileCompanyByEmail[String(p.email).toLowerCase()] = p.organization;
        });
      }
    }

    const out: CertificateRow[] = certRegs.map((r) => ({
      registration_id: r.id,
      first_name: r.first_name || "",
      last_name: r.last_name || "",
      email: r.email || "",
      company: r.company || r.organization || (r.email ? profileCompanyByEmail[String(r.email).toLowerCase()] : null) || null,
      course_id: r.course_id,
      course_title: r.courses?.title || "",
      course_code: r.courses?.code || null,
      has_dgac_certificate: !!r.courses?.has_dgac_certificate,
      status: r.status,
      is_alumni: r.is_alumni,
      final_score: r.final_score,
      grade_status: r.grade_status,
    }));

    setRows(out);
    setLoading(false);
  }

  async function downloadCertificate(r: CertificateRow) {
    setDownloading(r.registration_id);
    try {
      const res = await fetch(`/api/certificado-dgac?registration_id=${r.registration_id}&skip_grade_check=true`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("No se pudo descargar el certificado: " + (err.error || res.statusText));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] || `Certificado_${r.first_name}_${r.last_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDownloading(null);
    }
  }

  async function sendCertificateEmail(r: CertificateRow) {
    if (!confirm(`¿Enviar el Certificado DGAC por email a ${r.first_name} ${r.last_name}?`)) return;
    setSending(r.registration_id);
    try {
      const res = await fetch("/api/admin/enviar-certificado-dgac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: r.registration_id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Certificado enviado a ${json.email || r.email}`);
      } else {
        alert("Error al enviar: " + (json.error || "Error desconocido"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSending(null);
    }
  }

  async function bulkDownload() {
    const targets = selectedIds.size > 0
      ? filtered.filter((r) => selectedIds.has(r.registration_id))
      : filtered;
    if (targets.length === 0) {
      alert("No hay alumnos para descargar.");
      return;
    }
    if (!confirm(`Descargar ${targets.length} certificado(s)?`)) return;
    setBulkDownloading(true);
    setBulkProgress({ done: 0, total: targets.length });
    let errors = 0;
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i];
      try {
        const res = await fetch(`/api/certificado-dgac?registration_id=${r.registration_id}&skip_grade_check=true`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const cd = res.headers.get("Content-Disposition") || "";
          const match = cd.match(/filename="([^"]+)"/);
          a.download = match?.[1] || `Certificado_${r.first_name}_${r.last_name}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
      await new Promise((res) => setTimeout(res, 400));
    }
    setBulkDownloading(false);
    setBulkProgress(null);
    if (errors > 0) alert(`Descarga completada con ${errors} error(es).`);
  }

  // Filter
  const filtered = rows.filter((r) => {
    if (companyFilter !== "all" && (r.company || "").trim() !== companyFilter) return false;
    if (courseFilter !== "all" && r.course_title !== courseFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company || "").toLowerCase().includes(q) ||
      r.course_title.toLowerCase().includes(q)
    );
  });

  const uniqueCompanies = Array.from(
    new Set(rows.map((r) => (r.company || "").trim()).filter((c) => c.length > 0))
  ).sort();
  const uniqueCourses = Array.from(new Set(rows.map((r) => r.course_title).filter(Boolean))).sort();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-2">Certificados DGAC</h1>
      <p className="text-sm text-gray-500 mb-6">
        Alumnos con derecho a Certificado DGAC ({rows.length} en total). Solo aparecen cursos con certificado DGAC habilitado.
      </p>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por alumno, email, empresa o curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] md:max-w-md border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
        />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0072CE] min-w-[180px]"
        >
          <option value="all">Todos los cursos</option>
          {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0072CE] min-w-[180px]"
        >
          <option value="all">Todas las empresas</option>
          {uniqueCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || courseFilter !== "all" || companyFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setCourseFilter("all"); setCompanyFilter("all"); }}
            className="text-xs text-gray-500 hover:text-[#0072CE] underline self-center"
          >
            Limpiar filtros
          </button>
        )}
        <button
          onClick={bulkDownload}
          disabled={bulkDownloading}
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-lg bg-[#0072CE] hover:bg-[#005BA1] disabled:bg-gray-300 text-white transition"
        >
          {bulkDownloading && bulkProgress
            ? `Descargando ${bulkProgress.done}/${bulkProgress.total}...`
            : selectedIds.size > 0
              ? `Descargar (${selectedIds.size} seleccionados)`
              : `Descargar todos (${filtered.length})`}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay alumnos que coincidan</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="pl-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.registration_id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(filtered.map((r) => r.registration_id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Empresa</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Curso</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Nota</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.registration_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="pl-4 py-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedIds.has(r.registration_id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(r.registration_id);
                            else next.delete(r.registration_id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <Link
                        href={`/admin/registros/${r.registration_id}`}
                        className="text-[#0072CE] hover:text-[#003366] hover:underline"
                      >
                        {r.first_name} {r.last_name}
                      </Link>
                      <div className="text-[11px] text-gray-400">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">
                      {r.company || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      <div>{r.course_title}</div>
                      {r.course_code && <div className="text-[11px] text-gray-400">{r.course_code}</div>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {r.final_score !== null ? `${r.final_score}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.is_alumni ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-purple-100 text-purple-800">Egresado</span>
                      ) : r.status === "completed" ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">Completado</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">Confirmado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => downloadCertificate(r)}
                          disabled={downloading === r.registration_id}
                          className="inline-flex items-center gap-1 text-xs text-[#0072CE] hover:text-[#003366] hover:bg-blue-50 px-2 py-1 rounded transition disabled:opacity-50"
                        >
                          {downloading === r.registration_id ? "..." : "📥 Descargar"}
                        </button>
                        <button
                          onClick={() => sendCertificateEmail(r)}
                          disabled={sending === r.registration_id}
                          className="inline-flex items-center gap-1 text-xs text-[#F57C00] hover:text-[#E65100] hover:bg-orange-50 px-2 py-1 rounded transition disabled:opacity-50"
                        >
                          {sending === r.registration_id ? "..." : "✉ Enviar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
