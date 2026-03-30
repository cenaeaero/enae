"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Registration = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
  course_title?: string;
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

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function loadRegistrations() {
    const { data, error } = await supabase
      .from("registrations")
      .select("id, first_name, last_name, email, status, created_at, courses(title)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRegistrations(
        data.map((r: any) => ({
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          status: r.status,
          created_at: r.created_at,
          course_title: r.courses?.title,
        }))
      );
    }
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("registrations")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    }
    setUpdatingId(null);
  }

  const filtered =
    filter === "all"
      ? registrations
      : registrations.filter((r) => r.status === filter);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Curso
                </th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Fecha
                </th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reg) => (
                <tr
                  key={reg.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {reg.first_name} {reg.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {reg.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                    {reg.course_title || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                    {formatDate(reg.created_at)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
