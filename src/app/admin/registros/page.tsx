"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Registration = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string | null;
  rut?: string | null;
  delivery_mode?: string | null;
  status: string;
  created_at: string;
  course_title?: string;
  course_id?: string;
  progressPercent?: number;
  totalActivities?: number;
  completedActivities?: number;
  lastAccess?: string | null;
  accessCount?: number;
};

const statusOptions = [
  "pending",
  "confirmed",
  "completed",
  "rejected",
  "cancelled",
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export default function AdminRegistrosPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function loadRegistrations() {
    let baseRegs: Registration[] = [];

    // Method 1: Try admin API (bypasses RLS)
    try {
      const res = await fetch("/api/admin/registros");
      if (res.ok) {
        const json = await res.json();
        if (json.registrations && json.registrations.length >= 0) {
          baseRegs = json.registrations.map((r: any) => ({
            id: r.id,
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            company: r.company || r.organization || null,
            delivery_mode: r.delivery_mode,
            status: r.status,
            created_at: r.created_at,
            course_title: r.courses?.title,
            course_id: r.course_id,
          }));
        }
      }
    } catch {}

    // Method 2: Fallback to direct Supabase client
    if (baseRegs.length === 0) {
      const { data } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email, company, organization, delivery_mode, status, created_at, course_id, courses(title)")
        .order("created_at", { ascending: false });

      if (data) {
        baseRegs = data.map((r: any) => ({
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          company: r.company || r.organization || null,
          status: r.status,
          created_at: r.created_at,
          course_title: r.courses?.title,
          course_id: r.course_id,
        }));
      }
    }

    // Fetch profiles to backfill missing company AND get RUTs (paginated)
    const allEmails = Array.from(new Set(
      baseRegs.filter((r) => r.email).map((r) => r.email!)
    ));
    if (allEmails.length > 0) {
      const profilesByEmail: Record<string, { organization: string | null; rut: string | null }> = {};
      const PFPAGE = 500;
      for (let i = 0; i < allEmails.length; i += PFPAGE) {
        const chunk = allEmails.slice(i, i + PFPAGE);
        const { data: profs } = await supabase
          .from("profiles")
          .select("email, organization, rut")
          .in("email", chunk);
        (profs || []).forEach((p: any) => {
          profilesByEmail[p.email.toLowerCase()] = { organization: p.organization, rut: p.rut };
        });
      }
      baseRegs = baseRegs.map((r) => {
        const prof = r.email ? profilesByEmail[r.email.toLowerCase()] : null;
        return {
          ...r,
          company: r.company || prof?.organization || null,
          rut: prof?.rut || null,
        };
      });
    }

    // Show registrations immediately, then enrich with progress + access
    setRegistrations(baseRegs);
    setLoading(false);

    // Enrich with progress and access data
    const regIds = baseRegs.map((r) => r.id);
    if (regIds.length === 0) return;

    // Get all course_ids to fetch modules+activities
    const courseIds = Array.from(new Set(baseRegs.map((r) => r.course_id).filter(Boolean))) as string[];

    // Count activities per course
    const activitiesPerCourse: Record<string, number> = {};
    if (courseIds.length > 0) {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id, course_id")
        .in("course_id", courseIds)
        .limit(10000);
      const modulesByCourseId: Record<string, string[]> = {};
      (modules || []).forEach((m: any) => {
        if (!modulesByCourseId[m.course_id]) modulesByCourseId[m.course_id] = [];
        modulesByCourseId[m.course_id].push(m.id);
      });

      const allModuleIds = (modules || []).map((m: any) => m.id);
      if (allModuleIds.length > 0) {
        const { data: activities } = await supabase
          .from("module_activities")
          .select("id, module_id")
          .in("module_id", allModuleIds)
          .limit(50000);

        const activitiesByModule: Record<string, number> = {};
        (activities || []).forEach((a: any) => {
          activitiesByModule[a.module_id] = (activitiesByModule[a.module_id] || 0) + 1;
        });

        for (const [courseId, modIds] of Object.entries(modulesByCourseId)) {
          activitiesPerCourse[courseId] = modIds.reduce((sum, mid) => sum + (activitiesByModule[mid] || 0), 0);
        }
      }
    }

    // Get progress per registration — paginate to bypass Supabase 1000-row max-rows
    const completedByReg: Record<string, number> = {};
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: page, error: pErr } = await supabase
        .from("activity_progress")
        .select("registration_id")
        .in("registration_id", regIds)
        .eq("status", "completed")
        .range(from, from + PAGE - 1);
      if (pErr || !page || page.length === 0) break;
      page.forEach((p: any) => {
        completedByReg[p.registration_id] = (completedByReg[p.registration_id] || 0) + 1;
      });
      if (page.length < PAGE) break;
      from += PAGE;
    }

    // Get last access per registration — paginate to get all rows
    const accessByReg: Record<string, { last: string | null; count: number }> = {};
    try {
      let aFrom = 0;
      while (true) {
        const { data: page, error: aErr } = await supabase
          .from("course_access_log")
          .select("registration_id, accessed_at")
          .in("registration_id", regIds)
          .order("accessed_at", { ascending: false })
          .range(aFrom, aFrom + PAGE - 1);
        if (aErr || !page || page.length === 0) break;
        page.forEach((a: any) => {
          if (!accessByReg[a.registration_id]) {
            accessByReg[a.registration_id] = { last: a.accessed_at, count: 0 };
          }
          accessByReg[a.registration_id].count += 1;
        });
        if (page.length < PAGE) break;
        aFrom += PAGE;
      }
    } catch {}

    // Merge enriched data
    const enriched = baseRegs.map((r) => {
      const totalActivities = r.course_id ? (activitiesPerCourse[r.course_id] || 0) : 0;
      const completed = completedByReg[r.id] || 0;
      const progressPercent = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
      const access = accessByReg[r.id] || { last: null, count: 0 };

      return {
        ...r,
        progressPercent,
        totalActivities,
        completedActivities: completed,
        lastAccess: access.last,
        accessCount: access.count,
      };
    });

    setRegistrations(enriched);
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    let updated = false;

    // Try admin API first
    try {
      const res = await fetch("/api/admin/registros", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) updated = true;
      }
    } catch {}

    // Fallback to direct client
    if (!updated) {
      const { error } = await supabase
        .from("registrations")
        .update({ status: newStatus })
        .eq("id", id);
      if (!error) updated = true;
    }

    if (updated) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    }
    setUpdatingId(null);
  }

  const uniqueCourses = Array.from(
    new Set(registrations.map((r) => r.course_title).filter(Boolean) as string[])
  ).sort();

  const uniqueCompanies = Array.from(
    new Set(
      registrations
        .map((r) => (r.company || "").trim())
        .filter((c) => c.length > 0)
    )
  ).sort();

  const filtered = registrations.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (courseFilter !== "all" && r.course_title !== courseFilter) return false;
    if (companyFilter !== "all" && (r.company || "").trim() !== companyFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.course_title || "").toLowerCase().includes(q) ||
      (r.company || "").toLowerCase().includes(q) ||
      (r.rut || "").toLowerCase().includes(q)
    );
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatRelativeTime(dateStr: string | null | undefined) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#003366]">
          Registros de Cursos
        </h1>
        <span className="text-sm text-gray-400">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search + dropdown filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, email, RUT, curso o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] md:max-w-md border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
        />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent min-w-[180px]"
        >
          <option value="all">Todos los cursos</option>
          {uniqueCourses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent min-w-[180px]"
        >
          <option value="all">Todas las empresas</option>
          {uniqueCompanies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(courseFilter !== "all" || companyFilter !== "all" || search) && (
          <button
            onClick={() => { setCourseFilter("all"); setCompanyFilter("all"); setSearch(""); }}
            className="text-xs text-gray-500 hover:text-[#0072CE] underline self-center"
          >
            Limpiar filtros
          </button>
        )}
        {/* Generar Informe PDF button — works in any filter mode */}
        <button
          onClick={async () => {
            const targetIds = selectedIds.size > 0
              ? Array.from(selectedIds).filter((id) => filtered.some((r) => r.id === id))
              : filtered.map((r) => r.id);
            if (targetIds.length === 0) {
              alert("No hay alumnos para generar el informe.");
              return;
            }
            const limit = 200;
            if (targetIds.length > limit) {
              if (!confirm(`Vas a generar un informe para ${targetIds.length} registros. Esto puede tardar unos segundos. ¿Continuar?`)) return;
            }
            setGeneratingReport(true);
            try {
              const { buildStudentReports, generateInformePDF } = await import("@/lib/informe-alumno-pdf");
              const reports = await buildStudentReports(targetIds);
              if (reports.length === 0) {
                alert("No se pudo generar el informe.");
                return;
              }
              const doc = generateInformePDF(reports);
              const date = new Date().toISOString().split("T")[0];
              const fname = reports.length === 1
                ? `Informe_${reports[0].profile.first_name}_${reports[0].profile.last_name}_${date}.pdf`.replace(/\s+/g, "_")
                : `Informe_alumnos_${reports.length}_${date}.pdf`;
              doc.save(fname);
            } catch (err: any) {
              alert("Error: " + (err?.message || "No se pudo generar el informe"));
            } finally {
              setGeneratingReport(false);
            }
          }}
          disabled={generatingReport}
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-lg bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white transition"
          title="Genera un informe PDF con datos personales, cursos, calificaciones y avance"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          {generatingReport
            ? "Generando..."
            : selectedIds.size > 0
              ? `Generar Informe PDF (${selectedIds.size})`
              : `Generar Informe PDF (${filtered.length})`}
        </button>
        {courseFilter !== "all" && (
          <button
            onClick={async () => {
              const pool = filtered.filter((r) => r.status === "confirmed" || r.status === "completed");
              const targets = selectedIds.size > 0
                ? pool.filter((r) => selectedIds.has(r.id))
                : pool;
              if (targets.length === 0) {
                alert(selectedIds.size > 0 ? "Ningún alumno seleccionado tiene estado confirmado o completado." : "No hay alumnos confirmados o completados para este curso.");
                return;
              }
              if (!confirm(`Descargar ${targets.length} certificado(s) DGAC${selectedIds.size === 0 ? " (todos)" : " (seleccionados)"}?`)) return;
              setBulkDownloading(true);
              setBulkProgress({ done: 0, total: targets.length });
              let errors = 0;
              for (let i = 0; i < targets.length; i++) {
                const r = targets[i];
                try {
                  const res = await fetch(`/api/certificado-dgac?registration_id=${r.id}&skip_grade_check=true`);
                  if (!res.ok) {
                    errors++;
                    console.warn(`Error descargando cert de ${r.first_name} ${r.last_name}`);
                  } else {
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
                  }
                } catch {
                  errors++;
                }
                setBulkProgress({ done: i + 1, total: targets.length });
                await new Promise((res) => setTimeout(res, 400));
              }
              setBulkDownloading(false);
              setBulkProgress(null);
              if (errors > 0) alert(`Descarga completada con ${errors} error(es). Revisa la consola.`);
            }}
            disabled={bulkDownloading}
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-lg bg-[#0072CE] hover:bg-[#005BA1] disabled:bg-gray-300 text-white transition"
            title="Descarga los certificados DGAC de todos los alumnos filtrados (para firma presencial)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {bulkDownloading && bulkProgress
              ? `Descargando ${bulkProgress.done}/${bulkProgress.total}...`
              : selectedIds.size > 0
              ? `Descargar certificados (${selectedIds.size} seleccionados)`
              : "Descargar certificados (todos)"}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            filter === "all"
              ? "bg-[#003366] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos ({registrations.length})
        </button>
        {statusOptions.map((s) => {
          const count = registrations.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === s
                  ? "bg-[#003366] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {statusLabels[s]} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No hay registros</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500">
                <th className="pl-4 py-3 w-8">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#0072CE] focus:ring-[#0072CE]"
                    checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filtered.map((r) => r.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Empresa</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Curso</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">Fecha</th>
                <th className="px-4 py-3 font-medium">Avance</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Ultimo Ingreso</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reg) => {
                const isPresencial = reg.delivery_mode === "presencial";
                const progressPercent = isPresencial ? 100 : (reg.progressPercent ?? 0);
                // "No iniciado" only if NO access logs AND NO progress (not applicable to presencial)
                const hasNeverAccessed = !isPresencial && (!reg.lastAccess || reg.accessCount === 0) && progressPercent === 0;
                const progressColor = progressPercent === 100
                  ? "bg-green-500"
                  : progressPercent >= 50
                  ? "bg-[#0072CE]"
                  : progressPercent > 0
                  ? "bg-[#F57C00]"
                  : "bg-gray-300";

                return (
                <tr
                  key={reg.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 ${selectedIds.has(reg.id) ? "bg-blue-50" : ""}`}
                >
                  <td className="pl-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#0072CE] focus:ring-[#0072CE]"
                      checked={selectedIds.has(reg.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(reg.id);
                          else next.delete(reg.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/registros/${reg.id}`}
                        className="text-[#0072CE] hover:text-[#003366] hover:underline"
                      >
                        {reg.first_name} {reg.last_name}
                      </Link>
                      {reg.delivery_mode === "presencial" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wider">
                          Presencial
                        </span>
                      )}
                    </div>
                    {/* On small screens, show company under name since column is hidden */}
                    {reg.company && (
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[180px] md:hidden">{reg.company}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                    {reg.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-[180px] truncate">
                    {reg.company || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                    {reg.course_title || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">
                    {formatDate(reg.created_at)}
                  </td>
                  {/* Avance (progreso) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressColor}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-10 text-right ${
                        progressPercent === 100 ? "text-green-600" :
                        progressPercent >= 50 ? "text-[#0072CE]" :
                        progressPercent > 0 ? "text-[#F57C00]" : "text-gray-400"
                      }`}>
                        {progressPercent}%
                      </span>
                    </div>
                    {reg.totalActivities === 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">Sin contenido</p>
                    )}
                  </td>
                  {/* Último Ingreso */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {hasNeverAccessed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        No iniciado
                      </span>
                    ) : reg.lastAccess ? (
                      <div>
                        <div className="text-xs text-gray-700">{formatRelativeTime(reg.lastAccess)}</div>
                        <div className="text-[10px] text-gray-400">{reg.accessCount} ingreso{reg.accessCount !== 1 ? "s" : ""}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${statusColors[reg.status] || ""}`}
                    >
                      {statusLabels[reg.status] || reg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={reg.status}
                      onChange={(e) => updateStatus(reg.id, e.target.value)}
                      disabled={updatingId === reg.id}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0072CE] disabled:opacity-50"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
