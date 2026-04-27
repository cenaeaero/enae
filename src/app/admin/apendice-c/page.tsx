"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ApendiceRow = {
  registration_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  rut: string | null;
  job_title: string | null;
  address: string | null;
  city: string | null;
  course_id: string;
  course_title: string;
  course_code: string | null;
  habilitation_text: string | null;
  status: string;
  is_alumni: boolean | null;
  apendice_c_required: boolean;
  apendice_c_file_url: string | null;
  apendice_c_uploaded_at: string | null;
};

export default function AdminApendiceCPage() {
  const [rows, setRows] = useState<ApendiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "subido" | "pendiente">("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingPrep, setDownloadingPrep] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Load registrations whose course requires Apéndice C
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, first_name, last_name, email, company, organization, course_id, status, is_alumni, courses(title, code, apendice_c_required)")
      .or("status.eq.confirmed,status.eq.completed,is_alumni.eq.true")
      .limit(10000);

    if (!regs) {
      setLoading(false);
      return;
    }

    // Filter only courses with apendice_c_required = true
    const apRegs = (regs as any[]).filter((r) => r.courses?.apendice_c_required === true);
    const regIds = apRegs.map((r) => r.id);

    // Fetch dgac_procedures to know which have already uploaded
    const procsByReg: Record<string, { file_url: string | null; uploaded_at: string | null }> = {};
    if (regIds.length > 0) {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data: page } = await supabase
          .from("dgac_procedures")
          .select("registration_id, apendice_c_file_url, apendice_c_uploaded_at")
          .in("registration_id", regIds)
          .range(from, from + PAGE - 1);
        if (!page || page.length === 0) break;
        page.forEach((p: any) => {
          if (!procsByReg[p.registration_id] || p.apendice_c_uploaded_at) {
            procsByReg[p.registration_id] = {
              file_url: p.apendice_c_file_url,
              uploaded_at: p.apendice_c_uploaded_at,
            };
          }
        });
        if (page.length < PAGE) break;
        from += PAGE;
      }
    }

    // Fetch full profile data (organization + rut + job_title + address + city)
    const emails: string[] = Array.from(new Set(apRegs.map((r) => r.email).filter(Boolean)));
    const profilesByEmail: Record<string, any> = {};
    if (emails.length > 0) {
      for (let i = 0; i < emails.length; i += 500) {
        const chunk = emails.slice(i, i + 500);
        const { data: profs } = await supabase
          .from("profiles")
          .select("email, organization, rut, job_title, address, city")
          .in("email", chunk);
        (profs || []).forEach((p: any) => {
          if (p.email) profilesByEmail[String(p.email).toLowerCase()] = p;
        });
      }
    }

    // Fetch habilitation_text per course
    const courseHabs: Record<string, string> = {};
    const courseIds: string[] = Array.from(new Set(apRegs.map((r) => r.course_id).filter(Boolean)));
    if (courseIds.length > 0) {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, apendice_c_habilitation_text")
        .in("id", courseIds)
        .limit(1000);
      (courses || []).forEach((c: any) => {
        courseHabs[c.id] = c.apendice_c_habilitation_text || "";
      });
    }

    const out: ApendiceRow[] = apRegs.map((r) => {
      const proc = procsByReg[r.id] || { file_url: null, uploaded_at: null };
      const profile = r.email ? profilesByEmail[String(r.email).toLowerCase()] : null;
      return {
        registration_id: r.id,
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        email: r.email || "",
        company: r.company || r.organization || profile?.organization || null,
        rut: profile?.rut || null,
        job_title: profile?.job_title || null,
        address: profile?.address || null,
        city: profile?.city || null,
        course_id: r.course_id,
        course_title: r.courses?.title || "",
        course_code: r.courses?.code || null,
        habilitation_text: courseHabs[r.course_id] || null,
        status: r.status,
        is_alumni: r.is_alumni,
        apendice_c_required: !!r.courses?.apendice_c_required,
        apendice_c_file_url: proc.file_url,
        apendice_c_uploaded_at: proc.uploaded_at,
      };
    });

    setRows(out);
    setLoading(false);
  }

  async function downloadPrefilled(r: ApendiceRow) {
    setDownloadingPrep(r.registration_id);
    try {
      // Get/create verification code from server
      const prepRes = await fetch("/api/apendice-c/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: r.registration_id }),
      });
      const prepJson = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepJson?.error || "Error preparando código");
      const verificationCode = prepJson.verification_code as string;
      const verificationUrl = `${window.location.origin}/verify/apendice-c/${verificationCode}`;

      const { generateApendiceCPDF } = await import("@/lib/apendice-c-pdf");
      const pdf = await generateApendiceCPDF({
        student_name: `${r.first_name} ${r.last_name}`.trim(),
        rut: r.rut || "",
        profession: r.job_title || "",
        address: r.address || "",
        city: r.city || "",
        date: new Date(),
        habilitation_text: r.habilitation_text || "",
        verification_code: verificationCode,
        verification_url: verificationUrl,
      });
      const safe = `${r.first_name}_${r.last_name}`.replace(/\s+/g, "_");
      pdf.save(`Apendice_C_${safe}.pdf`);
    } catch (err: any) {
      alert("Error: " + (err?.message || "Error desconocido"));
    } finally {
      setDownloadingPrep(null);
    }
  }

  async function viewSigned(r: ApendiceRow) {
    if (!r.apendice_c_file_url) {
      alert("El alumno aún no ha subido el Apéndice C firmado.");
      return;
    }
    setDownloading(`view-${r.registration_id}`);
    try {
      const res = await fetch(`/api/apendice-c/download?registration_id=${r.registration_id}`);
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json?.error || "Error abriendo documento");
      window.open(json.url, "_blank");
    } catch (err: any) {
      alert("Error: " + (err?.message || "Error desconocido"));
    } finally {
      setDownloading(null);
    }
  }

  async function downloadSigned(r: ApendiceRow) {
    if (!r.apendice_c_file_url) {
      alert("El alumno aún no ha subido el Apéndice C firmado.");
      return;
    }
    setDownloading(`dl-${r.registration_id}`);
    try {
      const res = await fetch(`/api/apendice-c/download?registration_id=${r.registration_id}`);
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json?.error || "Error descargando");
      // Fetch the file as a blob to force download (cross-origin signed URL)
      const fileRes = await fetch(json.url);
      const blob = await fileRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      // Determine extension from content-type or URL
      const ct = fileRes.headers.get("Content-Type") || "";
      let ext = "pdf";
      if (ct.includes("image/jpeg")) ext = "jpg";
      else if (ct.includes("image/png")) ext = "png";
      else if (json.url.match(/\.(jpg|jpeg|png|pdf)/i)) {
        ext = json.url.match(/\.(jpg|jpeg|png|pdf)/i)![1].toLowerCase();
      }
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `ApendiceC_${r.first_name}_${r.last_name}.${ext}`.replace(/\s+/g, "_");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert("Error: " + (err?.message || "Error desconocido"));
    } finally {
      setDownloading(null);
    }
  }

  function triggerUpload(regId: string) {
    setUploadTargetId(regId);
    fileInputRef.current?.click();
  }

  async function handleDelete(r: ApendiceRow) {
    if (!confirm(`¿Eliminar el Apéndice C de ${r.first_name} ${r.last_name}? El alumno deberá volver a subir el documento firmado.`)) return;
    setDeleting(r.registration_id);
    try {
      const res = await fetch("/api/apendice-c/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: r.registration_id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await loadData();
      } else {
        alert("Error al eliminar: " + (json.error || res.statusText));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const regId = uploadTargetId;
    if (!file || !regId) return;
    setUploading(regId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("registration_id", regId);
      const res = await fetch("/api/apendice-c/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.success) {
        await loadData();
      } else {
        alert("Error: " + (json.error || res.statusText));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploading(null);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Filter
  const filtered = rows.filter((r) => {
    if (companyFilter !== "all" && (r.company || "").trim() !== companyFilter) return false;
    if (courseFilter !== "all" && r.course_title !== courseFilter) return false;
    if (statusFilter === "subido" && !r.apendice_c_file_url) return false;
    if (statusFilter === "pendiente" && r.apendice_c_file_url) return false;
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

  const subidoCount = rows.filter((r) => r.apendice_c_file_url).length;
  const pendienteCount = rows.length - subidoCount;

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-2">Apéndice C</h1>
      <p className="text-sm text-gray-500 mb-6">
        Solo se muestran cursos que requieren Apéndice C. Subidos: {subidoCount} · Pendientes: {pendienteCount}
      </p>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            statusFilter === "all" ? "bg-[#003366] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos ({rows.length})
        </button>
        <button
          onClick={() => setStatusFilter("subido")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            statusFilter === "subido" ? "bg-[#003366] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Subidos ({subidoCount})
        </button>
        <button
          onClick={() => setStatusFilter("pendiente")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            statusFilter === "pendiente" ? "bg-[#003366] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Pendientes ({pendienteCount})
        </button>
      </div>

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
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Empresa</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Curso</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Subido</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.registration_id} className="border-t border-gray-100 hover:bg-gray-50">
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
                    <td className="px-4 py-3">
                      {r.apendice_c_file_url ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">Subido</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                      {formatDate(r.apendice_c_uploaded_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => downloadPrefilled(r)}
                          disabled={downloadingPrep === r.registration_id}
                          className="inline-flex items-center gap-1 text-xs text-[#0072CE] hover:text-[#003366] hover:bg-blue-50 px-2 py-1 rounded transition disabled:opacity-50"
                          title="Descargar Apéndice C pre-llenado para firmar"
                        >
                          {downloadingPrep === r.registration_id ? "..." : "📥 Pre-llenado"}
                        </button>
                        {r.apendice_c_file_url && (
                          <>
                            <button
                              onClick={() => viewSigned(r)}
                              disabled={downloading === `view-${r.registration_id}`}
                              className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 px-2 py-1 rounded transition disabled:opacity-50"
                              title="Ver el documento firmado por el alumno"
                            >
                              {downloading === `view-${r.registration_id}` ? "..." : "👁 Ver"}
                            </button>
                            <button
                              onClick={() => downloadSigned(r)}
                              disabled={downloading === `dl-${r.registration_id}`}
                              className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded transition disabled:opacity-50"
                              title="Descargar el documento firmado por el alumno"
                            >
                              {downloading === `dl-${r.registration_id}` ? "..." : "📥 Descargar"}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => triggerUpload(r.registration_id)}
                          disabled={uploading === r.registration_id}
                          className="inline-flex items-center gap-1 text-xs text-[#F57C00] hover:text-[#E65100] hover:bg-orange-50 px-2 py-1 rounded transition disabled:opacity-50"
                          title={r.apendice_c_file_url ? "Reemplazar Apéndice C" : "Subir Apéndice C firmado"}
                        >
                          {uploading === r.registration_id ? "Subiendo..." : (r.apendice_c_file_url ? "🔄 Reemplazar" : "⬆ Subir")}
                        </button>
                        {r.apendice_c_file_url && (
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={deleting === r.registration_id}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-50"
                            title="Eliminar el Apéndice C subido para que pueda ser reemplazado"
                          >
                            {deleting === r.registration_id ? "..." : "🗑 Eliminar"}
                          </button>
                        )}
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
