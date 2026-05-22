"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company } from "@/components/CompanyPicker";

export default function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/empresas${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setCompanies(data.companies || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return companies;
    const f = q.toLowerCase();
    return companies.filter((c) =>
      [c.name, c.legal_name, c.rut, c.email].some((v) => v && v.toLowerCase().includes(f))
    );
  }, [companies, q]);

  // Stats: cuántas con RUT pendiente
  const pendingRut = companies.filter((c) => !c.rut).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Empresas</h1>
          <p className="text-sm text-gray-500">
            Maestro de empresas con RUT, contacto y datos legales. Se vinculan a inscripciones y casos de facturación.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          + Nueva empresa
        </button>
      </div>

      {pendingRut > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          <strong>{pendingRut}</strong> empresa{pendingRut > 1 ? "s" : ""} sin RUT (migradas automáticamente). Completa sus datos haciendo click en cada fila.
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar por nombre, RUT, email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 w-full sm:max-w-md py-2 px-3 border border-gray-300 rounded-lg text-sm"
      />

      {loading ? (
        <p className="text-center py-12 text-gray-400">Cargando…</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Razón social</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setEditing(c)}>
                  <td className="px-4 py-3 font-semibold text-[#003366]">{c.name}</td>
                  <td className={`px-4 py-3 ${!c.rut ? "text-amber-600 font-medium" : ""}`}>
                    {c.rut || "Pendiente"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.legal_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.contact_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || c.contact_email || "—"}</td>
                  <td className="px-4 py-3">
                    {(c as any).is_active === false ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Inactiva</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Activa</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <CompanyForm
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function CompanyForm({ initial, onClose, onSaved }: { initial: Company | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(initial || { country: "Chile" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isNew = !initial;

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/empresas", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? form : { id: initial!.id, ...form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#003366]">{isNew ? "Nueva empresa" : `Editar · ${initial!.name}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <F label="Nombre comercial *" value={form.name||""}        onChange={(v: string)=>set("name",v)} />
            <F label="Razón social"        value={form.legal_name||""}  onChange={(v: string)=>set("legal_name",v)} />
            <F label="RUT *"               value={form.rut||""}         onChange={(v: string)=>set("rut",v)} placeholder="76.123.456-7" />
            <F label="Email"               value={form.email||""}       onChange={(v: string)=>set("email",v)} type="email" />
            <F label="Teléfono"            value={form.phone||""}       onChange={(v: string)=>set("phone",v)} />
            <F label="Sitio web"           value={form.website||""}     onChange={(v: string)=>set("website",v)} />
            <F label="Dirección"           value={form.address||""}     onChange={(v: string)=>set("address",v)} cls="sm:col-span-2"/>
            <F label="Ciudad"              value={form.city||""}        onChange={(v: string)=>set("city",v)} />
            <F label="Región"              value={form.region||""}      onChange={(v: string)=>set("region",v)} />
            <F label="País"                value={form.country||"Chile"} onChange={(v: string)=>set("country",v)} />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Contacto principal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Nombre"   value={form.contact_name||""}  onChange={(v: string)=>set("contact_name",v)} />
              <F label="Email"    value={form.contact_email||""} onChange={(v: string)=>set("contact_email",v)} type="email" />
              <F label="Teléfono" value={form.contact_phone||""} onChange={(v: string)=>set("contact_phone",v)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
            <textarea rows={2} value={form.notes||""} onChange={(e)=>set("notes",e.target.value)} className="w-full py-2 px-3 border border-gray-300 rounded text-sm"/>
          </div>
          {!isNew && initial && <SupervisorsBlock companyId={initial.id} />}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
            {saving ? "Guardando…" : isNew ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SupervisorsBlock({ companyId }: { companyId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [addingSlot, setAddingSlot] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/company-supervisors?company_id=${companyId}`).then((r) => r.json());
    setList(res.supervisors || []);
  }
  useEffect(() => { load(); }, [companyId]);

  async function assign(slot: number) {
    setErr("");
    if (!email.trim()) { setErr("Email requerido"); return; }
    const profRes = await fetch(`/api/admin/perfiles-buscar?email=${encodeURIComponent(email.trim())}`).then((r) => r.json()).catch(() => null);
    if (!profRes?.profile?.id) { setErr("No existe un perfil con ese email. Crea el perfil primero."); return; }
    const res = await fetch("/api/admin/company-supervisors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, profile_id: profRes.profile.id, slot }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Error"); return; }
    setEmail(""); setAddingSlot(null); load();
  }

  async function remove(id: string) {
    if (!confirm("¿Quitar supervisor?")) return;
    await fetch(`/api/admin/company-supervisors?id=${id}`, { method: "DELETE" });
    load();
  }

  const bySlot: Record<number, any> = {};
  for (const s of list) bySlot[s.slot] = s;

  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="text-xs font-medium text-gray-500 mb-2">Supervisores (máx. 3)</p>
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <div className="space-y-2">
        {[1, 2, 3].map((slot) => {
          const s = bySlot[slot];
          if (s) {
            return (
              <div key={slot} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <div className="text-sm">
                  <span className="text-xs text-gray-400">Slot {slot}:</span>{" "}
                  <span className="font-semibold text-[#003366]">{s.profiles?.first_name} {s.profiles?.last_name}</span>{" "}
                  <span className="text-xs text-gray-500">({s.profiles?.email})</span>
                </div>
                <div className="flex gap-3 items-center shrink-0">
                  <a href={`/supervisor?as_company=${companyId}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#0072CE] hover:underline">Ver como supervisor</a>
                  <button onClick={() => remove(s.id)} className="text-xs text-red-600 hover:underline">Quitar</button>
                </div>
              </div>
            );
          }
          if (addingSlot === slot) {
            return (
              <div key={slot} className="flex gap-2 items-center">
                <input type="email" placeholder="email@empresa.cl"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"/>
                <button onClick={() => assign(slot)} className="text-xs bg-[#0072CE] text-white px-3 py-1.5 rounded">Asignar</button>
                <button onClick={() => { setAddingSlot(null); setEmail(""); }} className="text-xs text-gray-500">×</button>
              </div>
            );
          }
          return (
            <button key={slot} onClick={() => setAddingSlot(slot)}
              className="block w-full text-xs text-left border border-dashed border-gray-300 rounded px-3 py-2 text-gray-500 hover:bg-gray-50">
              + Asignar supervisor slot {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type="text", cls="", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; cls?: string; placeholder?: string;
}) {
  return (
    <div className={cls}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"/>
    </div>
  );
}
