"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    rut: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    organization: "",
    job_title: "",
    billing_name: "",
    billing_rut: "",
    billing_address: "",
    billing_city: "",
    billing_country: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single();

      if (data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          rut: data.rut || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          country: data.country || "",
          organization: data.organization || "",
          job_title: data.job_title || "",
          billing_name: data.billing_name || "",
          billing_rut: data.billing_rut || "",
          billing_address: data.billing_address || "",
          billing_city: data.billing_city || "",
          billing_country: data.billing_country || "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        rut: profile.rut,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postal_code: profile.postal_code,
        country: profile.country,
        organization: profile.organization,
        job_title: profile.job_title,
        billing_name: profile.billing_name,
        billing_rut: profile.billing_rut,
        billing_address: profile.billing_address,
        billing_city: profile.billing_city,
        billing_country: profile.billing_country,
      })
      .eq("email", profile.email);

    if (!error) {
      setSaved(true);
      // Update user metadata
      await supabase.auth.updateUser({
        data: { full_name: profile.first_name + " " + profile.last_name },
      });
    }
    setSaving(false);
  }

  function update(field: string, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Cargando...</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-light text-gray-800 mb-6">Mi Perfil</h1>

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nombres
              </label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
          </div>

          {/* RUT/DNI */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              RUT / DNI
            </label>
            <input
              type="text"
              value={profile.rut}
              onChange={(e) => update("rut", e.target.value)}
              placeholder="12.345.678-9"
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Telefono
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
            />
          </div>

          {/* Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Organizacion
              </label>
              <input
                type="text"
                value={profile.organization}
                onChange={(e) => update("organization", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Cargo
              </label>
              <input
                type="text"
                value={profile.job_title}
                onChange={(e) => update("job_title", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Direccion
            </label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => update("address", e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Region
              </label>
              <input
                type="text"
                value={profile.state}
                onChange={(e) => update("state", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Pais
              </label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => update("country", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5 mt-6">
          <h2 className="text-lg font-medium text-[#003366]">
            Datos de Facturacion
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Razon Social / Nombre
              </label>
              <input
                type="text"
                value={profile.billing_name}
                onChange={(e) => update("billing_name", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                RUT Empresa / Personal
              </label>
              <input
                type="text"
                value={profile.billing_rut}
                onChange={(e) => update("billing_rut", e.target.value)}
                placeholder="76.123.456-7"
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Direccion de Facturacion
            </label>
            <input
              type="text"
              value={profile.billing_address}
              onChange={(e) => update("billing_address", e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={profile.billing_city}
                onChange={(e) => update("billing_city", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Pais
              </label>
              <input
                type="text"
                value={profile.billing_country}
                onChange={(e) => update("billing_country", e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white font-medium rounded-lg transition text-sm"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">
              Perfil actualizado correctamente
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
