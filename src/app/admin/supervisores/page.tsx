"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import NewRoleProfileModal from "@/components/NewRoleProfileModal";

// Workspace de supervisores estilo Dynamics: panel maestro (lista) + ficha con
// pestañas. Al asociar una empresa, el supervisor ve automáticamente a TODOS
// los alumnos de esa empresa (el vínculo es por company_id en registrations).

type Supervisor = {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    rut: string | null;
    phone: string | null;
    role: string | null;
  };
  companies: { id: string; name: string; rut: string | null; slot: number }[];
  studentCount: number;
};

type Company = { id: string; name: string; rut: string | null };

type Reg = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  final_score: number | null;
  grade_status: string | null;
  company_id: string | null;
  created_at: string;
  courses?: { title: string; code: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", confirmed: "En curso", completed: "Completado",
  rejected: "Rechazado", cancelled: "Cancelado",
};

export default function AdminSupervisoresPage() {
  const [list, setList] = useState<Supervisor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<"resumen" | "alumnos">("resumen");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [showNew, setShowNew] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [supRes, empRes] = await Promise.all([
      fetch("/api/admin/supervisores").then((r) => r.json()),
      fetch("/api/admin/empresas").then((r) => r.json()),
    ]);
    setList(supRes.supervisors || []);
    setCompanies((empRes.companies || []).map((c: any) => ({ id: c.id, name: c.name, rut: c.rut })));
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const selected = list.find((s) => s.profile.id === selectedId) || null;

  // Alumnos de las empresas del supervisor seleccionado
  useEffect(() => {
    if (!selected || selected.companies.length === 0) { setRegs([]); return; }
    (async () => {
      setLoadingRegs(true);
      const { data } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email, status, final_score, grade_status, company_id, created_at, courses(title, code)")
        .in("company_id", selected.companies.map((c) => c.id))
        .order("created_at", { ascending: false });
      setRegs((data as any[] as Reg[]) || []);
      setLoadingRegs(false);
    })();
  }, [selectedId, list]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => ({
    empresas: selected?.companies.length || 0,
    total: regs.length,
    enCurso: regs.filter((r) => r.status === "confirmed").length,
    completados: regs.filter((r) => r.status === "completed").length,
  }), [selected, regs]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return [...list]
      .filter((s) => {
        if (!t) return true;
        const name = `${s.profile.first_name || ""} ${s.profile.last_name || ""}`.toLowerCase();
        return name.includes(t) || s.profile.email.toLowerCase().includes(t) ||
          s.companies.some((c) => c.name.toLowerCase().includes(t));
      })
      .sort((a, b) => `${a.profile.last_name || ""} ${a.profile.first_name || ""}`.localeCompare(`${b.profile.last_name || ""} ${b.profile.first_name || ""}`));
  }, [list, search]);

  const companyNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of companies) m[c.id] = c.name;
    return m;
  }, [companies]);

  async function asociarEmpresa(companyId: string) {
    if (!companyId || !selected) return;
    // Primer slot libre (máx 3 supervisores por empresa)
    const res = await fetch(`/api/admin/company-supervisors?company_id=${companyId}`).then((r) => r.json());
    const ocupados = new Set((res.supervisors || []).map((s: any) => s.slot));
    const slot = [1, 2, 3].find((n) => !ocupados.has(n));
    if (!slot) { setMessage("Error: esa empresa ya tiene 3 supervisores (máximo)."); return; }

    const post = await fetch("/api/admin/company-supervisors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, profile_id: selected.profile.id, slot }),
    });
    const d = await post.json();
    if (!post.ok) { setMessage(`Error: ${d.error || "no se pudo asociar"}`); return; }
    setMessage(`✓ Empresa asociada. ${selected.profile.first_name} ya ve a todos los alumnos de ${companyNameById[companyId] || "la empresa"}.`);
    loadAll();
  }

  async function quitarEmpresa(companyId: string) {
    if (!selected) return;
    if (!confirm("¿Quitar esta empresa? El supervisor dejará de ver a sus alumnos.")) return;
    // El DELETE necesita el id de la fila company_supervisors
    const res = await fetch(`/api/admin/company-supervisors?company_id=${companyId}`).then((r) => r.json());
    const row = (res.supervisors || []).find((s: any) => s.profile_id === selected.profile.id);
    if (!row) { setMessage("Error: asociación no encontrada."); return; }
    const del = await fetch(`/api/admin/company-supervisors?id=${row.id}`, { method: "DELETE" });
    if (!del.ok) { const d = await del.json().catch(() => ({})); setMessage(`Error: ${d.error || "no se pudo quitar"}`); return; }
    setMessage("✓ Empresa desasociada.");
    loadAll();
  }

  const initials = (s: Supervisor) =>
    `${(s.profile.first_name || " ")[0] || ""}${(s.profile.last_name || " ")[0] || ""}`.toUpperCase() || "?";

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-0px)] bg-[#F3F4F6]">
      {/* ── Panel maestro ── */}
      <aside className="w-full md:w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col md:h-full max-h-72 md:max-h-none">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-[#003366]">Supervisores</h1>
            <button onClick={() => setShowNew(true)}
              className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white font-semibold px-3 py-1.5 rounded">
              + Nuevo
            </button>
          </div>
          <input type="search" placeholder="Buscar nombre, email, empresa…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0072CE]" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <p className="p-4 text-sm text-gray-400">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Sin supervisores{search ? ` para "${search}"` : ""}.</p>
          ) : filtered.map((s) => {
            const active = s.profile.id === selectedId;
            return (
              <button key={s.profile.id} onClick={() => { setSelectedId(s.profile.id); setTab("resumen"); setMessage(""); }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${active ? "bg-blue-50 border-l-4 border-[#0072CE]" : "hover:bg-gray-50 border-l-4 border-transparent"}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? "bg-[#0072CE] text-white" : "bg-gray-200 text-gray-600"}`}>
                  {initials(s)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#003366] truncate">{s.profile.last_name}, {s.profile.first_name}</span>
                  <span className="block text-xs text-gray-500 truncate">{s.profile.email}</span>
                  <span className="flex gap-2 mt-0.5 text-[10px]">
                    {s.companies.length > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 rounded">{s.companies.length} empresa{s.companies.length !== 1 ? "s" : ""}</span>}
                    {s.studentCount > 0 && <span className="bg-green-100 text-green-700 px-1.5 rounded">{s.studentCount} alumnos</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-gray-100 text-[11px] text-gray-400">
          {list.length} supervisor{list.length !== 1 ? "es" : ""} · gestión también desde <a href="/admin/empresas" className="text-[#0072CE] hover:underline">Empresas</a>
        </div>
      </aside>

      {/* ── Área de trabajo ── */}
      <main className="flex-1 md:h-full md:overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center p-12">
            <div className="text-center text-gray-400">
              <p className="text-5xl mb-3">🧑‍💼</p>
              <p className="font-medium">Selecciona un supervisor del panel izquierdo</p>
              <p className="text-sm mt-1">o crea uno nuevo y asócialo a su empresa</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-4">
            {/* Barra de comandos */}
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-xs text-gray-400">Supervisores <span className="mx-1">›</span> <span className="text-gray-700 font-medium">{selected.profile.first_name} {selected.profile.last_name}</span></span>
              <span className="flex-1" />
              {selected.companies.length > 0 && (
                <a href={`/supervisor?as_company=${selected.companies[0].id}`} target="_blank" rel="noopener noreferrer"
                  className="text-[#0072CE] hover:underline">👁 Ver como supervisor</a>
              )}
              <a href={`/admin/perfiles?id=${selected.profile.id}`} className="text-[#0072CE] hover:underline">✏️ Editar perfil</a>
            </div>

            {message && (
              <div className={`px-4 py-2 rounded-lg text-sm border ${message.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                {message}
              </div>
            )}

            {/* Ficha */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-wrap items-center gap-4">
              <span className="w-16 h-16 rounded-full bg-[#003366] text-white flex items-center justify-center text-xl font-bold">
                {initials(selected)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#003366]">{selected.profile.first_name} {selected.profile.last_name}</h2>
                <p className="text-sm text-gray-500">{selected.profile.email}{selected.profile.phone ? ` · ${selected.profile.phone}` : ""}{selected.profile.rut ? ` · ${selected.profile.rut}` : ""}</p>
              </div>
              <span className="text-xs bg-blue-50 text-[#003366] px-2.5 py-1 rounded-full border border-blue-100">
                Supervisor de empresa
              </span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Empresas", value: kpi.empresas, color: "text-[#003366]" },
                { label: "Alumnos totales", value: kpi.total, color: "text-[#0072CE]" },
                { label: "En curso", value: kpi.enCurso, color: "text-blue-600" },
                { label: "Completados", value: kpi.completados, color: "text-green-600" },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                  <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-[11px] text-gray-500">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Pestañas */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex border-b border-gray-200 text-sm">
                {([["resumen", "Resumen"], ["alumnos", `Alumnos (${regs.length})`]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`px-5 py-3 font-medium border-b-2 -mb-px transition ${tab === key ? "border-[#0072CE] text-[#0072CE]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === "resumen" && (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Empresas a cargo</p>
                    <p className="text-[11px] text-gray-400 mb-2">Al asociar una empresa, el supervisor ve automáticamente a todos sus alumnos (actuales y futuros).</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selected.companies.length === 0 && <span className="text-sm text-gray-400">Sin empresas asociadas — asocia una para activar su acceso.</span>}
                      {selected.companies.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-[#003366] text-xs px-2.5 py-1 rounded-full border border-blue-100">
                          🏢 {c.name}{c.rut ? ` (${c.rut})` : ""}
                          <button onClick={() => quitarEmpresa(c.id)} className="text-red-400 hover:text-red-600 font-bold" title="Quitar">×</button>
                        </span>
                      ))}
                    </div>
                    <select defaultValue="" onChange={(e) => { asociarEmpresa(e.target.value); e.target.value = ""; }}
                      className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white">
                      <option value="">＋ Asociar empresa…</option>
                      {companies.filter((c) => !selected.companies.some((sc) => sc.id === c.id)).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.rut ? ` (${c.rut})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded p-3">
                    El supervisor ingresa en <code className="text-[#0072CE]">enae.cl/supervisor</code> con su email y contraseña.
                    Desde ahí ve el avance de sus alumnos, descarga diplomas y certificados, y exporta informes.
                  </div>
                </div>
              )}

              {tab === "alumnos" && (
                <div className="overflow-x-auto">
                  {loadingRegs ? (
                    <p className="p-6 text-sm text-gray-400">Cargando alumnos…</p>
                  ) : regs.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400">Las empresas asociadas no tienen alumnos registrados.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="px-5 py-2">Alumno</th>
                          <th className="px-5 py-2">Curso</th>
                          <th className="px-5 py-2">Empresa</th>
                          <th className="px-5 py-2">Estado</th>
                          <th className="px-5 py-2">Nota final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {regs.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-5 py-2.5">
                              <a href={`/admin/registros/inscripcion/${r.id}`} className="font-medium text-[#0072CE] hover:underline">
                                {r.last_name}, {r.first_name}
                              </a>
                              <span className="block text-xs text-gray-400">{r.email}</span>
                            </td>
                            <td className="px-5 py-2.5 text-xs text-gray-600">{r.courses?.title || "—"}</td>
                            <td className="px-5 py-2.5 text-xs text-gray-600">{(r.company_id && companyNameById[r.company_id]) || "—"}</td>
                            <td className="px-5 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                r.status === "completed" ? "bg-green-100 text-green-700" :
                                r.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                                "bg-amber-100 text-amber-700"}`}>
                                {STATUS_LABEL[r.status] || r.status}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-xs font-semibold">{r.final_score != null ? `${r.final_score}%` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showNew && (
        <NewRoleProfileModal role="supervisor" title="Nuevo supervisor"
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); setMessage("✓ Supervisor creado. Selecciónalo y asócialo a su empresa en la pestaña Resumen."); loadAll(); }} />
      )}
    </div>
  );
}
