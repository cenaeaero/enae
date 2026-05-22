"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SupervisorDashboard() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [asCompany, setAsCompany] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_company");
    setAsCompany(q);
    const suffix = q ? `?as_company=${q}` : "";
    (async () => {
      const data = await fetch(`/api/supervisor/dashboard${suffix}`).then((r) => r.json());
      setCompanies(data.companies || []);
      setRegs(data.registrations || []);
      setLoading(false);
    })();
  }, []);

  const stats = {
    enCurso: regs.filter((r) => r.status === "confirmed").length,
    completados: regs.filter((r) => r.status === "completed").length,
    pendientes: regs.filter((r) => r.status === "pending").length,
    total: regs.length,
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-2">Panel del Supervisor</h1>
      <p className="text-sm text-gray-500 mb-2">Empresas a tu cargo y resumen de avance de tus alumnos.</p>
      {asCompany && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-xs">
          🔍 Modo previsualización admin · viendo solo empresa filtrada.
          {" "}
          <a href="/admin" className="underline">Volver al admin</a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {companies.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] text-gray-400 uppercase">Empresa</p>
            <p className="font-bold text-[#003366]">{c.name}</p>
            {c.rut && <p className="text-xs text-gray-500 font-mono mt-1">RUT: {c.rut}</p>}
          </div>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card label="Total alumnos" value={stats.total} color="text-[#003366]" />
            <Card label="En curso" value={stats.enCurso} color="text-blue-700" />
            <Card label="Completados" value={stats.completados} color="text-green-700" />
            <Card label="Pendientes" value={stats.pendientes} color="text-amber-700" />
          </div>
          <Link href={`/supervisor/alumnos${asCompany ? `?as_company=${asCompany}` : ""}`}
            className="inline-block bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-5 py-2.5 rounded">
            Ver mis alumnos →
          </Link>
        </>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
