"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function AdminSupervisoresPage() {
  const [list, setList] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/supervisores").then((r) => r.json());
      setList(res.supervisors || []);
      setLoading(false);
    })();
  }, []);

  const filtered = list.filter((s) => {
    const name = `${s.profile.first_name || ""} ${s.profile.last_name || ""}`.toLowerCase();
    const email = s.profile.email.toLowerCase();
    const companies = s.companies.map((c) => c.name).join(" ").toLowerCase();
    const t = q.toLowerCase();
    return !t || name.includes(t) || email.includes(t) || companies.includes(t);
  });

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Supervisores</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personas con empresas a cargo y los alumnos asociados.
          </p>
        </div>
        <Link
          href="/admin/empresas"
          className="text-sm text-[#0072CE] hover:underline"
        >
          Gestionar desde empresas →
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email o empresa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md py-2 px-3 border border-gray-300 rounded text-sm"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
          {list.length === 0
            ? "Aún no hay supervisores asignados. Asigna desde /admin/empresas."
            : "Sin resultados."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Supervisor</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Empresas</th>
                <th className="px-4 py-3 text-center">Alumnos</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.profile.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#003366]">
                      {s.profile.first_name} {s.profile.last_name}
                    </div>
                    {s.profile.phone && (
                      <div className="text-xs text-gray-400">{s.profile.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.profile.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.companies.map((c) => (
                        <span
                          key={c.id}
                          className="bg-blue-50 text-[#003366] text-xs px-2 py-0.5 rounded border border-blue-200"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-[#0072CE]">
                    {s.studentCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/supervisores/${s.profile.id}`}
                      className="text-xs text-[#0072CE] hover:underline font-medium"
                    >
                      Ver ficha →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
