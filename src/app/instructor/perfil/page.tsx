"use client";

import { useEffect, useState } from "react";

type ProfileBank = {
  first_name: string;
  last_name: string;
  email: string;
  rut: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_account_confirmed_at: string | null;
};

export default function PerfilInstructorPage() {
  const [profile, setProfile] = useState<ProfileBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/instructor/bank-data").then((r) => r.json());
    setProfile(res.profile);
    setForm(res.profile || {});
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function saveDraft() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/instructor/bank-data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setMsg("✓ Guardado (sin confirmar)"); load(); }
  }

  async function confirmData() {
    if (!confirm("¿Confirmas que tus datos bancarios son correctos? El admin los usará para pagar tus honorarios.")) return;
    setSaving(true); setMsg("");
    const res = await fetch("/api/instructor/bank-data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, confirmed: true }),
    });
    setSaving(false);
    if (res.ok) { setMsg("✓ Datos confirmados"); load(); }
  }

  async function unconfirm() {
    if (!confirm("¿Quitar confirmación para editar?")) return;
    setSaving(true);
    await fetch("/api/instructor/bank-data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: false }),
    });
    setSaving(false);
    load();
  }

  if (loading) return <p className="text-gray-400 py-12 text-center">Cargando…</p>;
  const confirmed = !!profile?.bank_account_confirmed_at;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-4">Mi Perfil</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Datos personales</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Nombre" value={`${profile?.first_name || ""} ${profile?.last_name || ""}`} />
          <Info label="Email" value={profile?.email || "—"} />
          <Info label="RUT" value={profile?.rut || "—"} />
          <Info label="Teléfono" value={profile?.phone || "—"} />
        </div>
        <p className="text-xs text-gray-400 mt-3">Para cambiar estos datos contacta al admin.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Datos bancarios para honorarios</h2>
          {confirmed ? (
            <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
              ✓ Confirmados {new Date(profile!.bank_account_confirmed_at!).toLocaleDateString("es-CL")}
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-700">⚠ Sin confirmar</span>
          )}
        </div>

        <fieldset disabled={confirmed} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <F label="Banco"             value={form.bank_name || ""}            onChange={(v: string) => set("bank_name", v)} />
          <F label="Tipo de cuenta"    value={form.bank_account_type || ""}    onChange={(v: string) => set("bank_account_type", v)} placeholder="Corriente / Vista / Ahorro" />
          <F label="N° cuenta"         value={form.bank_account_number || ""}  onChange={(v: string) => set("bank_account_number", v)} />
          <F label="Nombre del titular" value={form.bank_account_name || ""}   onChange={(v: string) => set("bank_account_name", v)} />
        </fieldset>

        {msg && <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">{msg}</div>}

        <div className="mt-4 flex flex-wrap gap-2">
          {!confirmed ? (
            <>
              <button onClick={saveDraft} disabled={saving}
                className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded">
                Guardar borrador
              </button>
              <button onClick={confirmData} disabled={saving}
                className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-semibold px-4 py-2 rounded">
                Confirmar datos bancarios
              </button>
            </>
          ) : (
            <button onClick={unconfirm} disabled={saving}
              className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded">
              Quitar confirmación para editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

function F({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-50"/>
    </div>
  );
}
