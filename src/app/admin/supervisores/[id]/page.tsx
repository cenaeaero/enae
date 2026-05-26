"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  rut: string | null;
  phone: string | null;
  role: string | null;
  organization: string | null;
  job_title: string | null;
};

type Company = {
  link_id: string;
  slot: number;
  id: string;
  name: string;
  rut: string | null;
  legal_name: string | null;
};

type Reg = {
  id: string;
  course_id: string;
  status: string;
  delivery_mode: string | null;
  organization: string | null;
  company_id: string | null;
  folio_enae: string | null;
  final_score: number | null;
  grade_status: string | null;
  created_at: string;
  completed_at: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
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
  return new Date(d).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminSupervisorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fCompany, setFCompany] = useState("all");
  const [adding, setAdding] = useState(false);
  const [allCompanies, setAllCompanies] = useState<{ id: string; name: string }[]>([]);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newSlot, setNewSlot] = useState(1);
  const [err, setErr] = useState("");

  async function load() {
    const data = await fetch(`/api/admin/supervisores/${id}`).then((r) => r.json());
    if (data.error) {
      setErr(data.error);
      setLoading(false);
      return;
    }
    setProfile(data.profile);
    setCompanies(data.companies || []);
    setRegs(data.registrations || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function loadAllCompanies() {
    const res = await fetch("/api/admin/empresas").then((r) => r.json()).catch(() => null);
    setAllCompanies(res?.companies || []);
  }

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return regs.filter((r) => {
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (fCompany !== "all" && r.company_id !== fCompany) return false;
      if (!term) return true;
      return (
        r.first_name?.toLowerCase().includes(term) ||
        r.last_name?.toLowerCase().includes(term) ||
        (r.email || "").toLowerCase().includes(term) ||
        (r.courses?.title || "").toLowerCase().includes(term)
      );
    });
  }, [regs, q, fStatus, fCompany]);

  const stats = useMemo(
    () => ({
      total: regs.length,
      enCurso: regs.filter((r) => r.status === "confirmed").length,
      completados: regs.filter((r) => r.status === "completed").length,
      pendientes: regs.filter((r) => r.status === "pending").length,
    }),
    [regs],
  );

  async function assignCompany() {
    setErr("");
    if (!newCompanyId) {
      setErr("Selecciona una empresa");
      return;
    }
    const res = await fetch(`/api/admin/supervisores/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: newCompanyId, slot: newSlot }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error");
      return;
    }
    setAdding(false);
    setNewCompanyId("");
    setNewSlot(1);
    load();
  }

  async function removeCompany(linkId: string) {
    if (!confirm("¿Quitar al supervisor de esta empresa?")) return;
    await fetch(`/api/admin/company-supervisors?id=${linkId}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <p className="text-gray-400 text-sm">Cargando…</p>;
  }
  if (err && !profile) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-red-600">{err}</p>
        <Link href="/admin/supervisores" className="text-xs text-[#0072CE] hover:underline mt-3 inline-block">
          ← Volver
        </Link>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="w-full space-y-6">
      <div>
        <Link href="/admin/supervisores" className="text-xs text-[#0072CE] hover:underline">
          ← Supervisores
        </Link>
        <div className="flex items-start justify-between mt-2 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#003366]">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {profile.email}
              {profile.phone ? ` · ${profile.phone}` : ""}
              {profile.rut ? ` · RUT ${profile.rut}` : ""}
            </p>
            {(profile.job_title || profile.organization) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {profile.job_title}
                {profile.job_title && profile.organization ? " · " : ""}
                {profile.organization}
              </p>
            )}
          </div>
          <Link
            href={`/admin/perfiles?email=${encodeURIComponent(profile.email)}`}
            className="text-xs text-[#0072CE] hover:underline whitespace-nowrap"
          >
            Editar perfil →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total alumnos" value={stats.total} color="text-[#003366]" />
        <StatCard label="En curso" value={stats.enCurso} color="text-blue-700" />
        <StatCard label="Completados" value={stats.completados} color="text-green-700" />
        <StatCard label="Pendientes" value={stats.pendientes} color="text-amber-700" />
      </div>

      {/* Empresas a cargo */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#003366]">Empresas a cargo</h2>
          <button
            onClick={() => {
              setAdding(true);
              if (allCompanies.length === 0) loadAllCompanies();
            }}
            className="text-xs text-[#0072CE] hover:underline"
          >
            + Asignar empresa
          </button>
        </div>
        {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
        {adding && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3 flex flex-wrap gap-2 items-center">
            <select
              value={newCompanyId}
              onChange={(e) => setNewCompanyId(e.target.value)}
              className="flex-1 min-w-[200px] py-1.5 px-2 border border-gray-300 rounded text-sm"
            >
              <option value="">— Selecciona empresa —</option>
              {allCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={newSlot}
              onChange={(e) => setNewSlot(Number(e.target.value))}
              className="py-1.5 px-2 border border-gray-300 rounded text-sm"
            >
              <option value={1}>Slot 1</option>
              <option value={2}>Slot 2</option>
              <option value={3}>Slot 3</option>
            </select>
            <button
              onClick={assignCompany}
              className="text-xs bg-[#0072CE] text-white px-3 py-1.5 rounded"
            >
              Asignar
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setErr("");
              }}
              className="text-xs text-gray-500"
            >
              Cancelar
            </button>
          </div>
        )}
        {companies.length === 0 ? (
          <p className="text-xs text-gray-400">Sin empresas asignadas.</p>
        ) : (
          <div className="space-y-2">
            {companies.map((c) => (
              <div
                key={c.link_id}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2"
              >
                <div className="text-sm">
                  <span className="text-xs text-gray-400">Slot {c.slot}:</span>{" "}
                  <span className="font-semibold text-[#003366]">{c.name}</span>{" "}
                  {c.rut && <span className="text-xs text-gray-500 font-mono">{c.rut}</span>}
                </div>
                <div className="flex gap-3 items-center">
                  <a
                    href={`/supervisor?as_company=${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0072CE] hover:underline"
                  >
                    Ver como supervisor
                  </a>
                  <button
                    onClick={() => removeCompany(c.link_id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alumnos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#003366]">Alumnos a cargo</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            placeholder="Buscar por nombre, curso, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[260px] py-2 px-3 border border-gray-300 rounded text-sm"
          />
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">En curso</option>
            <option value="completed">Completados</option>
          </select>
          {companies.length > 1 && (
            <select
              value={fCompany}
              onChange={(e) => setFCompany(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded text-sm"
            >
              <option value="all">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            {regs.length === 0
              ? "Aún no hay alumnos asociados a las empresas de este supervisor."
              : "Sin resultados."}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
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
                      <p className="font-semibold text-[#003366]">
                        {r.last_name}, {r.first_name}
                      </p>
                      <p className="text-xs text-gray-500">{r.email}</p>
                      {r.phone && <p className="text-[10px] text-gray-400">{r.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.courses?.title}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.sessions?.dates || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-500"}`}
                      >
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${(r.final_score || 0) >= 80 ? "text-green-700" : "text-gray-700"}`}
                    >
                      {r.final_score != null ? `${r.final_score}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.last_access)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/registros/inscripcion/${r.id}`}
                        className="text-xs text-[#0072CE] hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
