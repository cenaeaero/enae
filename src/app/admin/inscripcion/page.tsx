"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  company: string;
  organizationType: string;
  jobTitle: string;
  phone: string;
  secondaryPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  supervisorName: string;
  supervisorEmail: string;
};

type CourseOption = { id: string; title: string; code: string | null };
type SessionOption = { id: string; dates: string; location: string };
type ProgramOption = { id: string; title: string; slug: string; course_ids: string[] };

const emptyStudent = (): Student => ({
  firstName: "",
  lastName: "",
  email: "",
  rut: "",
  company: "",
  organizationType: "",
  jobTitle: "",
  phone: "",
  secondaryPhone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  supervisorName: "",
  supervisorEmail: "",
});

export default function AdminInscripcionPage() {
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [theoreticalStart, setTheoreticalStart] = useState("");
  const [practicalEnd, setPracticalEnd] = useState("");
  const [students, setStudents] = useState<Student[]>([emptyStudent()]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<
    { email: string; success: boolean; error?: string }[] | null
  >(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Existing-student search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<Set<string>>(new Set());
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load courses
    supabase
      .from("courses")
      .select("id, title, code")
      .eq("is_active", true)
      .order("title")
      .then(({ data, error }) => {
        if (error) console.error("Error loading courses:", error.message);
        if (data && data.length > 0) {
          setAllCourses(data as CourseOption[]);
          setCourses(data as CourseOption[]);
        } else {
          supabase
            .from("courses")
            .select("id, title, code")
            .order("title")
            .then(({ data: allData }) => {
              if (allData) {
                setAllCourses(allData as CourseOption[]);
                setCourses(allData as CourseOption[]);
              }
            });
        }
      });

    // Load programs
    supabase
      .from("programs")
      .select("id, title, slug, course_ids")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setPrograms(data as ProgramOption[]);
      });

    // Check sessionStorage for prefilled student data (from admin detail "Inscribir en otro curso")
    try {
      const prefillData = sessionStorage.getItem("prefillStudent");
      if (prefillData) {
        const student = JSON.parse(prefillData) as Student;
        setStudents([student]);
        sessionStorage.removeItem("prefillStudent");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setSessions([]); return; }
    supabase
      .from("sessions")
      .select("id, dates, location")
      .eq("course_id", selectedCourse)
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) console.error("Error loading sessions:", error.message);
        if (data && data.length > 0) {
          setSessions(data as SessionOption[]);
        } else {
          // Fallback: load sessions without is_active filter
          supabase
            .from("sessions")
            .select("id, dates, location")
            .eq("course_id", selectedCourse)
            .then(({ data: allData }) => {
              if (allData) setSessions(allData as SessionOption[]);
            });
        }
      });
  }, [selectedCourse]);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    setSearching(true);
    try {
      const escaped = trimmed.replace(/[%,]/g, " ");
      const pattern = `%${escaped}%`;
      const { data } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, email, rut, organization, organization_type, job_title, phone, secondary_phone, address, city, state, postal_code, country, supervisor_name, supervisor_email"
        )
        .eq("role", "student")
        .or(
          `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},rut.ilike.${pattern}`
        )
        .order("last_name")
        .limit(50);
      if (ctrl.signal.aborted) return;
      const mapped: Student[] = (data || []).map((p: any) => ({
        firstName: p.first_name || "",
        lastName: p.last_name || "",
        email: p.email || "",
        rut: p.rut || "",
        company: p.organization || "",
        organizationType: p.organization_type || "",
        jobTitle: p.job_title || "",
        phone: p.phone || "",
        secondaryPhone: p.secondary_phone || "",
        address: p.address || "",
        city: p.city || "",
        state: p.state || "",
        postalCode: p.postal_code || "",
        country: p.country || "",
        supervisorName: p.supervisor_name || "",
        supervisorEmail: p.supervisor_email || "",
      }));
      setSearchResults(mapped);
    } finally {
      if (!ctrl.signal.aborted) setSearching(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function toggleSearchSelect(email: string) {
    setSelectedSearch((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function addSelectedToList() {
    const picked = searchResults.filter((s) => selectedSearch.has(s.email));
    if (picked.length === 0) return;
    setStudents((prev) => {
      const existingEmails = new Set(prev.filter((s) => s.email).map((s) => s.email.toLowerCase()));
      const onlyEmpty = prev.length === 1 && !prev[0].email && !prev[0].firstName && !prev[0].lastName;
      const base = onlyEmpty ? [] : prev;
      const fresh = picked.filter((p) => !existingEmails.has(p.email.toLowerCase()));
      return [...base, ...fresh];
    });
    setSelectedSearch(new Set());
    setSearchResults([]);
    setSearchQuery("");
  }

  function updateStudent(idx: number, field: keyof Student, value: string) {
    setStudents((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function addStudent() { setStudents((prev) => [...prev, emptyStudent()]); }

  function removeStudent(idx: number) {
    if (students.length === 1) return;
    setStudents((prev) => prev.filter((_, i) => i !== idx));
  }

  function downloadCSVTemplate() {
    const header = "Nombres,Apellidos,Email,RUT,Empresa,TipoOrganizacion,Cargo,Telefono,TelefonoSecundario,Direccion,Ciudad,Region,CodigoPostal,Pais,Supervisor,EmailSupervisor";
    const example = 'Juan Carlos,Pérez Soto,juan@ejemplo.com,12.345.678-9,Empresa SpA,Empresa privada,Operador,+56912345678,,Av. Principal 123,Santiago,Región Metropolitana,8320000,Chile,María López,maria@ejemplo.com';
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_alumnos_enae.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // CSV parser that handles quoted fields with commas
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'; i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      // Skip header
      const dataLines = lines.slice(1);
      const parsed: Student[] = dataLines.map((line) => {
        const cols = parseCSVLine(line);
        // Support both old (7 cols) and new (16 cols) format
        return {
          firstName: cols[0] || "",
          lastName: cols[1] || "",
          email: cols[2] || "",
          rut: cols[3] || "",
          company: cols[4] || "",
          organizationType: cols[5] || "",
          jobTitle: cols[6] || "",
          phone: cols[7] || "",
          secondaryPhone: cols[8] || "",
          address: cols[9] || "",
          city: cols[10] || "",
          state: cols[11] || "",
          postalCode: cols[12] || "",
          country: cols[13] || "",
          supervisorName: cols[14] || "",
          supervisorEmail: cols[15] || "",
        };
      }).filter((s) => s.email);

      if (parsed.length > 0) {
        setStudents(parsed);
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    const valid = students.filter((s) => s.firstName && s.lastName && s.email);
    if (valid.length === 0) return;

    // Determine which courses to enroll in
    let courseIds: string[] = [];
    if (selectedCourse) {
      courseIds = [selectedCourse];
    } else if (selectedProgram) {
      const prog = programs.find((p) => p.id === selectedProgram);
      if (prog) courseIds = prog.course_ids;
    }
    if (courseIds.length === 0) return;

    setSubmitting(true);
    setResults(null);

    const allResults: { email: string; success: boolean; error?: string }[] = [];

    for (const courseId of courseIds) {
      const courseName = allCourses.find((c) => c.id === courseId)?.title || "";
      const res = await fetch("/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: valid,
          courseId,
          sessionId: selectedSession || null,
          theoreticalStart: theoreticalStart || null,
          practicalEnd: practicalEnd || null,
        }),
      });
      const data = await res.json();
      (data.results || []).forEach((r: any) => {
        allResults.push({
          email: r.email,
          success: r.success,
          error: r.error ? `[${courseName}] ${r.error}` : undefined,
        });
      });
    }

    setResults(allResults);
    setSubmitting(false);

    const allSuccess = allResults.every((r) => r.success);
    if (allSuccess) {
      setStudents([emptyStudent()]);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">
        Inscripción de Alumnos
      </h1>

      {/* Program & Course selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Programa, Curso y Fechas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Programa</label>
            <select value={selectedProgram} onChange={(e) => {
              const progId = e.target.value;
              setSelectedProgram(progId);
              setSelectedCourse("");
              if (progId) {
                const prog = programs.find((p) => p.id === progId);
                if (prog && prog.course_ids.length > 0) {
                  setCourses(allCourses.filter((c) => prog.course_ids.includes(c.id)));
                } else {
                  setCourses(allCourses);
                }
              } else {
                setCourses(allCourses);
              }
            }} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="">Todos los cursos</option>
              {programs.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Curso</label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="">Seleccionar curso</option>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.title} {c.code ? `(${c.code})` : ""}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Sesión</label>
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="">Sin sesión</option>
              {sessions.map((s) => (<option key={s.id} value={s.id}>{s.dates} - {s.location}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Inicio Teórico</label>
            <input type="date" value={theoreticalStart} onChange={(e) => setTheoreticalStart(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Fin Práctico</label>
            <input type="date" value={practicalEnd} onChange={(e) => setPracticalEnd(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Search existing students */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Buscar alumnos existentes</h2>
        <p className="text-xs text-gray-500 mb-3">Busca por nombre, apellido, email o RUT. Marca los que quieras inscribir y agrégalos a la lista.</p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mínimo 2 caracteres..."
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSelectedToList}
            disabled={selectedSearch.size === 0}
            className="bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium transition"
          >
            Agregar seleccionados ({selectedSearch.size})
          </button>
        </div>
        {searching && <p className="text-xs text-gray-400">Buscando...</p>}
        {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <p className="text-xs text-gray-400">Sin resultados.</p>
        )}
        {searchResults.length > 0 && (
          <div className="max-h-64 overflow-y-auto border border-gray-100 rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={searchResults.length > 0 && selectedSearch.size === searchResults.length}
                      onChange={(e) => setSelectedSearch(e.target.checked ? new Set(searchResults.map((s) => s.email)) : new Set())}
                    />
                  </th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">RUT</th>
                  <th className="px-3 py-2">Empresa</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => (
                  <tr key={s.email} className="border-t border-gray-50 hover:bg-blue-50/30">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedSearch.has(s.email)}
                        onChange={() => toggleSearchSelect(s.email)}
                      />
                    </td>
                    <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                    <td className="px-3 py-2 text-gray-600">{s.email}</td>
                    <td className="px-3 py-2 text-gray-600">{s.rut || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{s.company || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Students list */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Alumnos ({students.length})
          </h2>
          <div className="flex gap-2">
            <button onClick={downloadCSVTemplate} className="text-xs text-[#0072CE] hover:underline flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Descargar plantilla CSV
            </button>
            <label className="text-xs bg-blue-50 hover:bg-blue-100 text-[#0072CE] px-3 py-1 rounded cursor-pointer font-medium transition">
              Subir CSV
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            <button onClick={addStudent} className="text-xs text-[#0072CE] hover:underline">
              + Agregar alumno
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Nombres</th>
                <th className="pb-2 pr-2">Apellidos</th>
                <th className="pb-2 pr-2">Email</th>
                <th className="pb-2 pr-2">RUT</th>
                <th className="pb-2 pr-2">Empresa</th>
                <th className="pb-2 pr-2">Teléfono</th>
                <th className="pb-2 pr-2">Dirección</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <React.Fragment key={idx}>
                  <tr className="border-t border-gray-50">
                    <td className="py-2 pr-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2 pr-2"><input type="text" value={s.firstName} onChange={(e) => updateStudent(idx, "firstName", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Nombres" /></td>
                    <td className="py-2 pr-2"><input type="text" value={s.lastName} onChange={(e) => updateStudent(idx, "lastName", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Apellidos" /></td>
                    <td className="py-2 pr-2"><input type="email" value={s.email} onChange={(e) => updateStudent(idx, "email", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="email@ejemplo.com" /></td>
                    <td className="py-2 pr-2"><input type="text" value={s.rut} onChange={(e) => updateStudent(idx, "rut", e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-sm" placeholder="12.345.678-9" /></td>
                    <td className="py-2 pr-2"><input type="text" value={s.company} onChange={(e) => updateStudent(idx, "company", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Empresa" /></td>
                    <td className="py-2 pr-2"><input type="tel" value={s.phone} onChange={(e) => updateStudent(idx, "phone", e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1 text-sm" placeholder="+56 9..." /></td>
                    <td className="py-2 pr-2"><input type="text" value={s.address} onChange={(e) => updateStudent(idx, "address", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Dirección" /></td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => setExpandedRow(expandedRow === idx ? null : idx)} className="text-xs text-[#0072CE] hover:underline whitespace-nowrap" title="Más datos">
                        {expandedRow === idx ? "−" : "+"}
                      </button>
                      <button onClick={() => removeStudent(idx)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                  {expandedRow === idx && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block text-gray-500 mb-0.5">Cargo</label>
                            <input type="text" value={s.jobTitle} onChange={(e) => updateStudent(idx, "jobTitle", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="Cargo" />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">Tipo Organización</label>
                            <input type="text" value={s.organizationType} onChange={(e) => updateStudent(idx, "organizationType", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="Empresa privada / DGAC..." />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">Tel. Secundario</label>
                            <input type="tel" value={s.secondaryPhone} onChange={(e) => updateStudent(idx, "secondaryPhone", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="+56 9..." />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">Ciudad</label>
                            <input type="text" value={s.city} onChange={(e) => updateStudent(idx, "city", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="Santiago" />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">Región</label>
                            <input type="text" value={s.state} onChange={(e) => updateStudent(idx, "state", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="Región Metropolitana" />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">Código Postal</label>
                            <input type="text" value={s.postalCode} onChange={(e) => updateStudent(idx, "postalCode", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="8320000" />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">País</label>
                            <input type="text" value={s.country} onChange={(e) => updateStudent(idx, "country", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="Chile" />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-0.5">Supervisor</label>
                            <input type="text" value={s.supervisorName} onChange={(e) => updateStudent(idx, "supervisorName", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="Nombre supervisor" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-gray-500 mb-0.5">Email Supervisor</label>
                            <input type="email" value={s.supervisorEmail} onChange={(e) => updateStudent(idx, "supervisorEmail", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" placeholder="supervisor@empresa.com" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Resultados</h2>
          <div className="space-y-1">
            {results.map((r, idx) => (
              <div key={idx} className={`text-sm px-3 py-2 rounded ${r.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {r.email}: {r.success ? "Inscrito correctamente" : r.error}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSubmit} disabled={submitting || (!selectedCourse && !selectedProgram)} className="bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition">
        {submitting ? "Inscribiendo..." : (() => {
          const numStudents = students.filter((s) => s.email).length;
          const numCourses = selectedCourse ? 1 : (programs.find((p) => p.id === selectedProgram)?.course_ids.length || 0);
          return numCourses > 1
            ? `Inscribir ${numStudents} alumno(s) en ${numCourses} cursos`
            : `Inscribir ${numStudents} alumno(s)`;
        })()}
      </button>
    </div>
  );
}
