"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function InstructorDashboard() {
  const [stats, setStats] = useState({ assigned: 0, inProgress: 0, completed: 0, feesPending: 0, feesPaid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [asgRes, feesRes] = await Promise.all([
        fetch("/api/instructor/asignaciones").then((r) => r.json()),
        fetch("/api/instructor/fees").then((r) => r.json()),
      ]);
      const asgs = asgRes.assignments || [];
      const fees = feesRes.fees || [];
      setStats({
        assigned: asgs.filter((a: any) => a.status === "assigned").length,
        inProgress: asgs.filter((a: any) => a.status === "in_progress").length,
        completed: asgs.filter((a: any) => a.status === "completed").length,
        feesPending: fees.filter((f: any) => f.status === "proposed" || f.status === "approved").length,
        feesPaid: fees.filter((f: any) => f.status === "paid").length,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-6">Dashboard</h1>
      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card label="Asignados"     value={stats.assigned}    color="bg-amber-50 text-amber-700" />
            <Card label="En proceso"    value={stats.inProgress}  color="bg-blue-50 text-blue-700" />
            <Card label="Completados"   value={stats.completed}   color="bg-green-50 text-green-700" />
            <Card label="Honorarios pendientes" value={stats.feesPending} color="bg-purple-50 text-purple-700" />
            <Card label="Pagados"       value={stats.feesPaid}    color="bg-gray-50 text-gray-700" />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Accesos rápidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/instructor/asignaciones" className="block bg-[#0072CE] hover:bg-[#005fa3] text-white px-4 py-3 rounded text-sm font-medium">→ Ver mis alumnos</Link>
              <Link href="/instructor/honorarios" className="block bg-[#003366] hover:bg-[#001d3d] text-white px-4 py-3 rounded text-sm font-medium">→ Mis honorarios</Link>
              <Link href="/instructor/perfil" className="block bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded text-sm font-medium">→ Datos bancarios</Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Descarga la <a href="/templates/EVALUACION-OPERADOR-RPAS-ENAE-CHL-N1.pdf" target="_blank" className="text-[#0072CE] underline">plantilla de evaluación</a> para tus clases prácticas.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <p className="text-xs uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
