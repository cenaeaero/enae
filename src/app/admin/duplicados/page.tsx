"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RegMember = {
  id: string;
  profile_id: string | null;
  name: string;
  email: string;
  rut: string | null;
  organization: string | null;
  status: string;
  created_at: string;
  blockers: string[];
  safeToDelete: boolean;
};
type RegGroup = {
  course: { title: string; code: string | null };
  course_id: string;
  matchedBy: string[];
  confidence: "alta" | "posible";
  members: RegMember[];
};
type ProfMember = {
  id: string;
  name: string;
  email: string;
  rut: string | null;
  organization: string | null;
  role: string;
  created_at: string;
  registrations: number;
  academic_registrations: number;
};
type ProfGroup = {
  matchedBy: string[];
  confidence: "alta" | "posible";
  members: ProfMember[];
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "alta" | "posible" | "gray" }) {
  const cls =
    tone === "alta"
      ? "bg-red-100 text-red-800"
      : tone === "posible"
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-600";
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${cls}`}>{children}</span>;
}

export default function DuplicadosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [tab, setTab] = useState<"regs" | "profiles">("regs");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/duplicados").then((r) => r.json());
    setData(res);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function deleteRegistration(m: RegMember) {
    if (!m.safeToDelete) return;
    if (!confirm(`¿Eliminar la inscripción duplicada de ${m.name}?\n\nEsta inscripción NO tiene datos académicos. La acción no se puede deshacer.`)) return;
    setBusy(m.id); setMsg("");
    const res = await fetch("/api/admin/duplicados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-registration", id: m.id }),
    });
    const j = await res.json();
    setBusy("");
    if (!res.ok) { setMsg(`✗ ${j.error}${j.blockers ? ": " + j.blockers.join(", ") : ""}`); return; }
    setMsg("✓ Inscripción eliminada");
    load();
  }

  async function mergeRegistration(source: RegMember, keeper: RegMember) {
    const srcData = source.blockers.length ? `\n\nDatos de la que se elimina (se moverán): ${source.blockers.join(", ")}` : "";
    if (!confirm(
      `Fusionar inscripciones del mismo curso:\n\n` +
      `• CONSERVAR: ${keeper.name} — ${keeper.email}\n` +
      `• ELIMINAR:  ${source.email}${srcData}\n\n` +
      `Todo el avance, notas y datos de la inscripción eliminada se mueven a la conservada. ¿Continuar?`
    )) return;
    setBusy(source.id); setMsg("");
    const res = await fetch("/api/admin/duplicados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "merge-registrations", sourceId: source.id, keeperId: keeper.id }),
    });
    const j = await res.json();
    setBusy("");
    if (!res.ok) { setMsg(`✗ ${j.error}`); return; }
    setMsg("✓ Inscripciones fusionadas");
    load();
  }

  async function mergeProfiles(source: ProfMember, target: ProfMember) {
    if (!confirm(`Fusionar perfiles:\n\n• CONSERVAR: ${target.name} (${target.email})\n• ELIMINAR: ${source.name} (${source.email})\n\nLas inscripciones de la cuenta eliminada se reasignan a la conservada. ¿Continuar?`)) return;
    setBusy(source.id); setMsg("");
    const res = await fetch("/api/admin/duplicados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "merge-profiles", sourceId: source.id, targetId: target.id }),
    });
    const j = await res.json();
    setBusy("");
    if (!res.ok) { setMsg(`✗ ${j.error}`); return; }
    setMsg("✓ Perfiles fusionados");
    load();
  }

  if (loading) return <p className="text-center py-16 text-gray-400">Buscando duplicados…</p>;

  const regGroups: RegGroup[] = data?.registration_groups || [];
  const profGroups: ProfGroup[] = data?.profile_groups || [];
  const s = data?.summary || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#003366]">Duplicados de alumnos</h1>
      <p className="text-sm text-gray-500 mt-1">
        Detección por email, RUT y nombre. La eliminación de inscripciones está bloqueada cuando hay datos académicos (exámenes, notas, diplomas, certificados, pagos).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Stat label="Grupos de inscripciones" value={s.registration_dupes ?? 0} color="text-red-700" />
        <Stat label="Grupos de perfiles" value={s.profile_dupes ?? 0} color="text-amber-700" />
        <Stat label="Inscripciones totales" value={s.total_registrations ?? 0} color="text-[#003366]" />
        <Stat label="Perfiles totales" value={s.total_profiles ?? 0} color="text-[#003366]" />
      </div>

      <div className="flex gap-2 mt-6 border-b border-gray-200">
        <TabBtn active={tab === "regs"} onClick={() => setTab("regs")}>
          Inscripciones duplicadas ({regGroups.length})
        </TabBtn>
        <TabBtn active={tab === "profiles"} onClick={() => setTab("profiles")}>
          Perfiles duplicados ({profGroups.length})
        </TabBtn>
      </div>

      {msg && <p className={`text-sm mt-3 ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</p>}

      {/* ---------------- Inscripciones ---------------- */}
      {tab === "regs" && (
        <div className="mt-4 space-y-4">
          {regGroups.length === 0 && <p className="text-gray-400 py-8 text-center">Sin inscripciones duplicadas. 🎉</p>}
          {regGroups.map((g, gi) => {
            // Conservar la que tenga más datos académicos; a igualdad, la más antigua
            const keeper = [...g.members].sort(
              (a, b) => b.blockers.length - a.blockers.length || a.created_at.localeCompare(b.created_at),
            )[0];
            const anyData = g.members.some((m) => m.blockers.length > 0);
            return (
            <div key={gi} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#003366]">{g.course.title}</span>
                {g.course.code && <span className="text-xs text-gray-400">{g.course.code}</span>}
                <Badge tone={g.confidence}>{g.confidence === "alta" ? "Duplicado" : "Posible"}</Badge>
                <span className="text-[10px] text-gray-500">coincide por: {g.matchedBy.join(", ")}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Alumno</th>
                    <th className="text-left px-4 py-2">Estado</th>
                    <th className="text-left px-4 py-2">Inscrito</th>
                    <th className="text-left px-4 py-2">Datos académicos</th>
                    <th className="text-right px-4 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.members.map((m) => {
                    const isKeeper = m.id === keeper.id;
                    return (
                    <tr key={m.id} className={isKeeper ? "bg-green-50/40" : ""}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-[#003366]">
                          {m.name}
                          {isKeeper && <span className="ml-2 text-[10px] text-green-700 font-semibold">★ conservar</span>}
                        </p>
                        <p className="text-[10px] text-gray-400">{m.email}{m.rut ? ` · ${m.rut}` : ""}{m.organization ? ` · ${m.organization}` : ""}</p>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">{m.status}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-2">
                        {m.blockers.length === 0 ? (
                          <span className="text-[10px] text-gray-400">— sin datos —</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {m.blockers.map((b, i) => (
                              <span key={i} className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">{b}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isKeeper ? (
                          <span className="text-[10px] text-green-700 font-semibold">se conserva</span>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => mergeRegistration(m, keeper)}
                              disabled={busy === m.id}
                              className="text-xs bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white font-semibold px-3 py-1.5 rounded"
                              title="Mueve avance/notas/datos a la conservada y elimina esta"
                            >
                              {busy === m.id ? "…" : "Fusionar → conservar"}
                            </button>
                            {m.safeToDelete && (
                              <button
                                onClick={() => deleteRegistration(m)}
                                disabled={busy === m.id}
                                className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold px-3 py-1.5 rounded"
                                title="Esta inscripción no tiene datos; eliminarla directamente"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {anyData && (
                <p className="px-4 py-2 text-[10px] text-gray-400 bg-gray-50">
                  Fusionar mueve todo (avance, notas, exámenes, asistencia) a la inscripción ★ y elimina la otra. Nunca se pierden datos académicos.
                </p>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* ---------------- Perfiles ---------------- */}
      {tab === "profiles" && (
        <div className="mt-4 space-y-4">
          {profGroups.length === 0 && <p className="text-gray-400 py-8 text-center">Sin perfiles duplicados. 🎉</p>}
          {profGroups.map((g, gi) => {
            // sugerir conservar el que tiene más inscripciones académicas, luego más inscripciones, luego más antiguo
            const target = [...g.members].sort(
              (a, b) =>
                b.academic_registrations - a.academic_registrations ||
                b.registrations - a.registrations ||
                a.created_at.localeCompare(b.created_at),
            )[0];
            return (
              <div key={gi} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
                  <Badge tone={g.confidence}>{g.confidence === "alta" ? "Duplicado" : "Posible"}</Badge>
                  <span className="text-[10px] text-gray-500">coincide por: {g.matchedBy.join(", ")}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Perfil</th>
                      <th className="text-left px-4 py-2">Rol</th>
                      <th className="text-left px-4 py-2">Inscripciones</th>
                      <th className="text-left px-4 py-2">Creado</th>
                      <th className="text-right px-4 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.members.map((m) => {
                      const isTarget = m.id === target.id;
                      return (
                        <tr key={m.id} className={isTarget ? "bg-green-50/40" : ""}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-[#003366]">
                              {m.name}
                              {isTarget && <span className="ml-2 text-[10px] text-green-700 font-semibold">★ conservar</span>}
                            </p>
                            <p className="text-[10px] text-gray-400">{m.email}{m.rut ? ` · ${m.rut}` : ""}{m.organization ? ` · ${m.organization}` : ""}</p>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">{m.role}</td>
                          <td className="px-4 py-2 text-xs text-gray-600">
                            {m.registrations}
                            {m.academic_registrations > 0 && (
                              <span className="ml-1 text-[10px] text-green-700">({m.academic_registrations} c/datos)</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500">{fmtDate(m.created_at)}</td>
                          <td className="px-4 py-2 text-right">
                            {!isTarget && (
                              <button
                                onClick={() => mergeProfiles(m, target)}
                                disabled={busy === m.id}
                                className="text-xs bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white font-semibold px-3 py-1.5 rounded"
                                title={`Reasigna inscripciones a ${target.name} y elimina este perfil`}
                              >
                                {busy === m.id ? "…" : "Fusionar → conservar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[10px] text-gray-400 bg-gray-50">
                  Fusionar reasigna las inscripciones del perfil elegido al perfil ★ y luego lo elimina. No se pierde ningún dato académico.
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link href="/admin" className="text-xs text-[#0072CE] hover:underline">← Volver al panel</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
        active ? "border-[#0072CE] text-[#0072CE]" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
