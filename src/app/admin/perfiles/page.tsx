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
  secondary_phone: string | null;
  job_title: string | null;
  organization: string | null;
  organization_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  supervisor_name: string | null;
  supervisor_email: string | null;
  supervisor_phone: string | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function startEditing(profile: Profile) {
    setEditingId(profile.id);
    setEditForm({
      title: profile.title || "",
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      rut: profile.rut || "",
      phone: profile.phone || "",
      secondary_phone: profile.secondary_phone || "",
      job_title: profile.job_title || "",
      organization: profile.organization || "",
      organization_type: profile.organization_type || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      postal_code: profile.postal_code || "",
      country: profile.country || "",
      supervisor_name: profile.supervisor_name || "",
      supervisor_email: profile.supervisor_email || "",
      supervisor_phone: profile.supervisor_phone || "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);

    const updates: Record<string, any> = {};
    const fields = [
      "title",
      "first_name",
      "last_name",
      "email",
      "rut",
      "phone",
      "secondary_phone",
      "job_title",
      "organization",
      "organization_type",
      "address",
      "city",
      "state",
      "postal_code",
      "country",
      "supervisor_name",
      "supervisor_email",
      "supervisor_phone",
    ];

    fields.forEach((f) => {
      const val = (editForm as any)[f];
      updates[f] = val === "" ? null : val;
    });

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", editingId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingId ? { ...p, ...updates } : p
        )
      );
      setEditingId(null);
      setEditForm({});
    }
    setSaving(false);
  }

  async function deleteProfile(id: string) {
    setDeleting(true);
    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (!error) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setExpandedId(null);
      setDeleteConfirm(null);
    }
    setDeleting(false);
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
            {search
              ? "No se encontraron perfiles"
              : "No hay perfiles registrados"}
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
                <th className="px-4 py-3 font-medium">Acciones</th>
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
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(profile.id);
                            startEditing(profile);
                          }}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded transition"
                        >
                          Editar
                        </button>
                        {deleteConfirm === profile.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProfile(profile.id);
                              }}
                              disabled={deleting}
                              className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-2 py-1 rounded transition"
                            >
                              {deleting ? "..." : "Si"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
                              }}
                              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(profile.id);
                            }}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded transition"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail / Edit form */}
                  {expandedId === profile.id && (
                    <tr key={`${profile.id}-detail`} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        {editingId === profile.id ? (
                          <EditForm
                            form={editForm}
                            onChange={setEditForm}
                            onSave={saveEdit}
                            onCancel={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                            saving={saving}
                          />
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <DetailField
                              label="Nombre completo"
                              value={`${profile.title ? profile.title + " " : ""}${profile.first_name} ${profile.last_name}`}
                            />
                            <DetailField label="Email" value={profile.email} />
                            <DetailField
                              label="RUT / DNI"
                              value={profile.rut}
                            />
                            <DetailField
                              label="Teléfono"
                              value={profile.phone}
                            />
                            <DetailField
                              label="Teléfono secundario"
                              value={profile.secondary_phone}
                            />
                            <DetailField
                              label="Cargo"
                              value={profile.job_title}
                            />
                            <DetailField
                              label="Organización"
                              value={profile.organization}
                            />
                            <DetailField
                              label="Tipo organización"
                              value={profile.organization_type}
                            />
                            <DetailField
                              label="Dirección"
                              value={profile.address}
                            />
                            <DetailField label="Ciudad" value={profile.city} />
                            <DetailField
                              label="Región/Estado"
                              value={profile.state}
                            />
                            <DetailField
                              label="Código postal"
                              value={profile.postal_code}
                            />
                            <DetailField label="País" value={profile.country} />
                            <DetailField
                              label="Supervisor"
                              value={profile.supervisor_name}
                            />
                            <DetailField
                              label="Email supervisor"
                              value={profile.supervisor_email}
                            />
                            <DetailField
                              label="Tel. supervisor"
                              value={profile.supervisor_phone}
                            />
                            <DetailField
                              label="Auth User ID"
                              value={profile.user_id}
                              mono
                            />
                            <DetailField
                              label="Fecha registro"
                              value={formatDate(profile.created_at)}
                            />
                            <div className="col-span-2 md:col-span-4 pt-2">
                              <button
                                onClick={() => startEditing(profile)}
                                className="text-xs bg-[#0072CE] hover:bg-[#005BA1] text-white px-4 py-1.5 rounded transition"
                              >
                                Editar perfil
                              </button>
                            </div>
                          </div>
                        )}
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

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function EditForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  form: Partial<Profile>;
  onChange: (f: Partial<Profile>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  function field(key: keyof Profile, label: string) {
    return (
      <div>
        <label className="block text-xs text-gray-500 uppercase mb-1">
          {label}
        </label>
        <input
          type="text"
          value={(form[key] as string) || ""}
          onChange={(e) => onChange({ ...form, [key]: e.target.value })}
          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0072CE] focus:border-[#0072CE]"
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Editar Perfil
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {field("title", "Título")}
        {field("first_name", "Nombre")}
        {field("last_name", "Apellido")}
        {field("email", "Email")}
        {field("rut", "RUT / DNI")}
        {field("phone", "Teléfono")}
        {field("secondary_phone", "Tel. secundario")}
        {field("job_title", "Cargo")}
        {field("organization", "Organización")}
        {field("organization_type", "Tipo organización")}
        {field("address", "Dirección")}
        {field("city", "Ciudad")}
        {field("state", "Región/Estado")}
        {field("postal_code", "Código postal")}
        {field("country", "País")}
        {field("supervisor_name", "Supervisor")}
        {field("supervisor_email", "Email supervisor")}
        {field("supervisor_phone", "Tel. supervisor")}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-1.5 rounded font-medium transition"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1.5 rounded transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
