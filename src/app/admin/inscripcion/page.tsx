"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  company: string;
  phone: string;
  address: string;
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
  phone: "",
  address: "",
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
  const fileRef = useRef<HTMLInputElement>(null);

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

  function updateStudent(idx: number, field: keyof Student, value: string) {
    setStudents((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function addStudent() { setStudents((prev) => [...prev, emptyStudent()]); }

  function removeStudent(idx: number) {
    if (students.length === 1) return;
    setStudents((prev) => prev.filter((_, i) => i !== idx));
  }

  function downloadCSVTemplate() {
    const header = "Nombres,Apellidos,Email,RUT,Empresa,Telefono,Direccion";
    const example = "Juan Carlos,Pérez Soto,juan@ejemplo.com,12.345.678-9,Empresa SpA,+56912345678,Av. Principal 123";
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_alumnos_enae.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      // Skip header
      const dataLines = lines.slice(1);
      const parsed: Student[] = dataLines.map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          firstName: cols[0] || "",
          lastName: cols[1] || "",
          email: cols[2] || "",
          rut: cols[3] || "",
          company: cols[4] || "",
          phone: cols[5] || "",
          address: cols[6] || "",
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
    if (valid.length === 0 || !selectedCourse) return;

    setSubmitting(true);
    setResults(null);

    const res = await fetch("/api/inscripcion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        students: valid,
        courseId: selectedCourse,
        sessionId: selectedSession || null,
        theoreticalStart: theoreticalStart || null,
        practicalEnd: practicalEnd || null,
      }),
    });

    const data = await res.json();
    setResults(data.results || []);
    setSubmitting(false);

    // Reset form after successful submission to prevent accidental re-submit
    const allSuccess = (data.results || []).every((r: any) => r.success);
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
                <tr key={idx} className="border-t border-gray-50">
                  <td className="py-2 pr-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="py-2 pr-2"><input type="text" value={s.firstName} onChange={(e) => updateStudent(idx, "firstName", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Nombres" /></td>
                  <td className="py-2 pr-2"><input type="text" value={s.lastName} onChange={(e) => updateStudent(idx, "lastName", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Apellidos" /></td>
                  <td className="py-2 pr-2"><input type="email" value={s.email} onChange={(e) => updateStudent(idx, "email", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="email@ejemplo.com" /></td>
                  <td className="py-2 pr-2"><input type="text" value={s.rut} onChange={(e) => updateStudent(idx, "rut", e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-sm" placeholder="12.345.678-9" /></td>
                  <td className="py-2 pr-2"><input type="text" value={s.company} onChange={(e) => updateStudent(idx, "company", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Empresa" /></td>
                  <td className="py-2 pr-2"><input type="tel" value={s.phone} onChange={(e) => updateStudent(idx, "phone", e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1 text-sm" placeholder="+56 9..." /></td>
                  <td className="py-2 pr-2"><input type="text" value={s.address} onChange={(e) => updateStudent(idx, "address", e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" placeholder="Dirección" /></td>
                  <td className="py-2"><button onClick={() => removeStudent(idx)} className="text-red-400 hover:text-red-600 text-xs">✕</button></td>
                </tr>
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

      <button onClick={handleSubmit} disabled={submitting || !selectedCourse} className="bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition">
        {submitting ? "Inscribiendo..." : `Inscribir ${students.filter((s) => s.email).length} alumno(s)`}
      </button>
    </div>
  );
}
