"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  user_id: string | null;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string;
  rut: string | null;
  phone: string | null;
  job_title: string | null;
  organization: string | null;
  organization_type: string | null;
  city: string | null;
  country: string | null;
  role: string;
  created_at: string;
};

const roleColors: Record<string, string> = {
  student: "bg-blue-100 text-blue-800",
  instructor: "bg-orange-100 text-orange-800",
  admin: "bg-red-100 text-red-800",
};

const roleLabels: Record<string, string> = {
  student: "Estudiante",
  instructor: "Instructor",
  admin: "Admin",
};

const roleOptions = ["student", "instructor", "admin"];

const filterTabs = [
  { key: "all", label: "Todos" },
  { key: "student", label: "Estudiantes" },
  { key: "instructor", label: "Instructores" },
  { key: "admin", label: "Admins" },
];

export default function AdminPerfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  }

  async function updateRole(id: string, newRole: string) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, role: newRole } : p))
      );
    }
    setUpdatingId(null);
  }

  const filtered = profiles
    .filter((p) => (filter === "all" ? true : p.role === filter))
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.organization || "").toLowerCase().includes(q) ||
        (p.rut || "").toLowerCase().includes(q)
      );
    });

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
          Perfiles de Usuarios
        </h1>
        <span className="text-sm text-gray-400">
          {filtered.length} perfil{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterTabs.map((tab) => {
          const count =
            tab.key === "all"
              ? profiles.length
              : profiles.filter((p) => p.role === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === tab.key
                  ? "bg-[#003366] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, RUT u organización..."
          className="w-full md:w-96 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/20 focus:border-[#0072CE]"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400">
            {search ? "No se encontraron perfiles" : "No hay perfiles registrados"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Organización
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  País
                </th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Registro
                </th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Cambiar Rol</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => (
                <>
                  <tr
                    key={profile.id}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === profile.id ? null : profile.id
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {profile.title ? `${profile.title} ` : ""}
                        {profile.first_name} {profile.last_name}
                      </p>
                      {profile.rut && (
                        <p className="text-xs text-gray-400">{profile.rut}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{profile.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[180px] truncate">
                      {profile.organization || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {profile.country || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                      {formatDate(profile.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${roleColors[profile.role] || ""}`}
                      >
                        {roleLabels[profile.role] || profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={profile.role}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateRole(profile.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={updatingId === profile.id}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0072CE] disabled:opacity-50"
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedId === profile.id && (
                    <tr key={`${profile.id}-detail`} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Nombre completo
                            </p>
                            <p className="text-gray-800">
                              {profile.title ? `${profile.title} ` : ""}
                              {profile.first_name} {profile.last_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              RUT / DNI
                            </p>
                            <p className="text-gray-800">
                              {profile.rut || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Teléfono
                            </p>
                            <p className="text-gray-800">
                              {profile.phone || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Cargo
                            </p>
                            <p className="text-gray-800">
                              {profile.job_title || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Organización
                            </p>
                            <p className="text-gray-800">
                              {profile.organization || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Tipo organización
                            </p>
                            <p className="text-gray-800">
                              {profile.organization_type || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Ciudad
                            </p>
                            <p className="text-gray-800">
                              {profile.city || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              País
                            </p>
                            <p className="text-gray-800">
                              {profile.country || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Auth User ID
                            </p>
                            <p className="text-gray-800 font-mono text-xs">
                              {profile.user_id || "Sin cuenta"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Fecha registro
                            </p>
                            <p className="text-gray-800">
                              {formatDate(profile.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
