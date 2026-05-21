"use client";

import { useEffect, useRef, useState } from "react";

export type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  rut: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
};

type Props = {
  value: Company | null;
  onChange: (c: Company | null) => void;
  placeholder?: string;
  required?: boolean;
};

export default function CompanyPicker({ value, onChange, placeholder = "Buscar empresa…", required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/empresas${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const data = await res.json();
      setCompanies(data.companies || []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  function pick(c: Company) {
    onChange(c);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      {value ? (
        <div className="flex items-center justify-between gap-2 py-2 px-3 border border-gray-300 rounded text-sm bg-white">
          <div className="min-w-0">
            <p className="font-semibold text-[#003366] truncate">{value.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {value.rut || "Sin RUT"}{value.legal_name ? ` · ${value.legal_name}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-500 hover:text-red-600 shrink-0"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            required={required}
            className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
          />
          {open && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {loading && <p className="p-3 text-xs text-gray-400">Buscando…</p>}
              {!loading && companies.length === 0 && (
                <p className="p-3 text-xs text-gray-400">
                  No hay coincidencias. Crea una empresa nueva ↓
                </p>
              )}
              {!loading && companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  className="block w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50"
                >
                  <p className="text-sm font-semibold text-[#003366]">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.rut || "Sin RUT"}{c.legal_name ? ` · ${c.legal_name}` : ""}
                  </p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setOpen(false); setShowCreate(true); }}
                className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 text-sm font-medium text-[#0072CE]"
              >
                + Crear empresa nueva
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateCompanyModal
          initialName={query}
          onClose={() => setShowCreate(false)}
          onCreated={(c) => { setShowCreate(false); pick(c); }}
        />
      )}
    </div>
  );
}

function CreateCompanyModal({
  initialName, onClose, onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (c: Company) => void;
}) {
  const [form, setForm] = useState<any>({ name: initialName, country: "Chile" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error al crear empresa"); return; }
    onCreated(data.company);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#003366]">Nueva empresa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <F label="Nombre comercial *" value={form.name||""}        onChange={(v)=>set("name",v)} />
            <F label="Razón social"        value={form.legal_name||""}  onChange={(v)=>set("legal_name",v)} />
            <F label="RUT *"               value={form.rut||""}         onChange={(v)=>set("rut",v)} placeholder="76.123.456-7" />
            <F label="Email"               value={form.email||""}       onChange={(v)=>set("email",v)} type="email" />
            <F label="Teléfono"            value={form.phone||""}       onChange={(v)=>set("phone",v)} />
            <F label="Sitio web"           value={form.website||""}     onChange={(v)=>set("website",v)} />
            <F label="Dirección"           value={form.address||""}     onChange={(v)=>set("address",v)} cls="sm:col-span-2"/>
            <F label="Ciudad"              value={form.city||""}        onChange={(v)=>set("city",v)} />
            <F label="Región"              value={form.region||""}      onChange={(v)=>set("region",v)} />
            <F label="País"                value={form.country||"Chile"} onChange={(v)=>set("country",v)} />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Contacto principal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Nombre"   value={form.contact_name||""}  onChange={(v)=>set("contact_name",v)} />
              <F label="Email"    value={form.contact_email||""} onChange={(v)=>set("contact_email",v)} type="email" />
              <F label="Teléfono" value={form.contact_phone||""} onChange={(v)=>set("contact_phone",v)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
            <textarea rows={2} value={form.notes||""} onChange={(e)=>set("notes",e.target.value)} className="w-full py-2 px-3 border border-gray-300 rounded text-sm"/>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
            {saving ? "Creando…" : "Crear empresa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type="text", cls="", placeholder }: any) {
  return (
    <div className={cls}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"/>
    </div>
  );
}
