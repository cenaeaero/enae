"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { chileCities } from "@/data/chile-cities";

type Registration = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  rut?: string;
  phone?: string;
  organization?: string;
  organization_type?: string;
  job_title?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status: string;
  created_at: string;
  course_title?: string;
  course_code?: string;
};

type DgacProcedure = {
  id: string;
  procedure_type: string;
  folio_number: string | null;
  dgac_credential_number: string | null;
  registro_sipa: boolean;
  solicitud_credencial: boolean;
  apendice_c: boolean;
  pago_tasa: boolean;
  coordinacion_examen: boolean;
  exam_datetime: string | null;
  exam_unit_city: string | null;
};

type HistoryEntry = {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
};

const fieldLabels: Record<string, string> = {
  procedure_type: "Tipo de tramite",
  folio_number: "N° de Folio",
  dgac_credential_number: "N° Credencial DGAC",
  registro_sipa: "Registro SIPA",
  solicitud_credencial: "Solicitud de credencial",
  apendice_c: "Apendice C, Certificado ENAE y CI",
  pago_tasa: "Pago Tasa Aeronautica",
  coordinacion_examen: "Coordinacion Examen DGAC",
  exam_datetime: "Fecha y Hora del Examen",
  exam_unit_city: "Unidad y Ciudad",
};

const procedureLabels: Record<string, string> = {
  nueva: "Credencial Nueva",
  renovacion: "Renovacion de Credencial",
  actualizacion: "Actualizacion de Credencial",
};

export default function RegistroDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [reg, setReg] = useState<Registration | null>(null);
  const [procedure, setProcedure] = useState<DgacProcedure | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("nueva");

  const loadData = useCallback(async () => {
    // Load registration with profile data
    const { data: regData } = await supabase
      .from("registrations")
      .select("*, courses(title, code)")
      .eq("id", id)
      .single();

    if (regData) {
      // Also try to get profile data for RUT
      const { data: profile } = await supabase
        .from("profiles")
        .select("rut, phone, secondary_phone")
        .eq("email", regData.email)
        .single();

      setReg({
        id: regData.id,
        first_name: regData.first_name,
        last_name: regData.last_name,
        email: regData.email,
        rut: profile?.rut || regData.rut,
        phone: profile?.phone || regData.phone,
        organization: regData.organization,
        organization_type: regData.organization_type,
        job_title: regData.job_title,
        address: regData.address,
        city: regData.city,
        state: regData.state,
        postal_code: regData.postal_code,
        country: regData.country,
        status: regData.status,
        created_at: regData.created_at,
        course_title: regData.courses?.title,
        course_code: regData.courses?.code,
      });
    }

    // Load DGAC procedure
    try {
      const res = await fetch(`/api/admin/dgac?registration_id=${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.procedure) {
          setProcedure(json.procedure);
          setSelectedType(json.procedure.procedure_type);
        }
        setHistory(json.history || []);
      }
    } catch {}

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createProcedure() {
    setSaving("create");
    try {
      const res = await fetch("/api/admin/dgac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: id, procedure_type: selectedType }),
      });
      if (res.ok) {
        const json = await res.json();
        setProcedure(json.procedure);
        await loadData();
      }
    } catch {}
    setSaving(null);
  }

  async function updateField(field: string, value: any) {
    if (!procedure) return;
    setSaving(field);
    try {
      const res = await fetch("/api/admin/dgac", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: procedure.id, field, value }),
      });
      if (res.ok) {
        setProcedure((prev) => (prev ? { ...prev, [field]: value } : null));
        // Reload history
        const hRes = await fetch(`/api/admin/dgac?registration_id=${id}`);
        if (hRes.ok) {
          const json = await hRes.json();
          setHistory(json.history || []);
        }
      }
    } catch {}
    setSaving(null);
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Cargando...</div>;
  }

  if (!reg) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Registro no encontrado</p>
        <Link href="/admin/registros" className="text-[#0072CE] hover:underline text-sm">
          ← Volver a Registros
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/registros" className="text-sm text-[#0072CE] hover:underline mb-4 inline-block">
        ← Volver a Registros
      </Link>

      <h1 className="text-2xl font-bold text-[#003366] mb-6">
        {reg.first_name} {reg.last_name}
      </h1>

      {/* Personal Data */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Datos Personales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Nombre" value={`${reg.first_name} ${reg.last_name}`} />
          <Field label="Email" value={reg.email} />
          <Field label="RUT" value={reg.rut} />
          <Field label="Telefono" value={reg.phone} />
          <Field label="Organizacion" value={reg.organization} />
          <Field label="Tipo Organizacion" value={reg.organization_type} />
          <Field label="Cargo" value={reg.job_title} />
          <Field label="Direccion" value={reg.address} />
          <Field label="Ciudad" value={reg.city} />
          <Field label="Region" value={reg.state} />
          <Field label="Pais" value={reg.country} />
          <Field label="Curso" value={reg.course_title} />
          <Field label="Codigo Curso" value={reg.course_code} />
          <Field label="Estado" value={reg.status} />
          <Field label="Fecha Registro" value={formatDateTime(reg.created_at)} />
        </div>
      </div>

      {/* DGAC Procedures */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Tramites DGAC</h2>

        {!procedure ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">Selecciona el tipo de tramite para crear el checklist:</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {(["nueva", "renovacion", "actualizacion"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedType === t
                      ? "bg-[#003366] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {procedureLabels[t]}
                </button>
              ))}
            </div>
            <button
              onClick={createProcedure}
              disabled={saving === "create"}
              className="bg-[#0072CE] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {saving === "create" ? "Creando..." : "Crear Tramite"}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-xs font-medium px-3 py-1 rounded bg-[#003366] text-white">
                {procedureLabels[procedure.procedure_type]}
              </span>
            </div>

            {/* Nº Credencial DGAC - shown for all types */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 mb-1">N° Credencial DGAC</label>
              <input
                type="text"
                value={procedure.dgac_credential_number || ""}
                onChange={(e) => setProcedure((p) => p ? { ...p, dgac_credential_number: e.target.value } : null)}
                onBlur={(e) => updateField("dgac_credential_number", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
                placeholder="Ingrese N° de credencial"
              />
            </div>

            {/* Folio Number - shown for all types */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 mb-1">N° de Folio</label>
              <input
                type="text"
                maxLength={6}
                value={procedure.folio_number || ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setProcedure((p) => p ? { ...p, folio_number: v } : null);
                }}
                onBlur={(e) => updateField("folio_number", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
                placeholder="000000"
              />
            </div>

            {/* Checklist items based on procedure type */}
            <div className="space-y-3">
              {procedure.procedure_type === "nueva" && (
                <>
                  <ToggleField label="1. Registro SIPA" value={procedure.registro_sipa} saving={saving === "registro_sipa"} onChange={(v) => updateField("registro_sipa", v)} />
                  <ToggleField label="2. Solicitud de credencial" value={procedure.solicitud_credencial} saving={saving === "solicitud_credencial"} onChange={(v) => updateField("solicitud_credencial", v)} />
                  <ToggleField label="3. Apendice C, Certificado de ENAE y Cedula de Identidad" value={procedure.apendice_c} saving={saving === "apendice_c"} onChange={(v) => updateField("apendice_c", v)} />
                  <ToggleField label="4. Pago Tasa Aeronautica" value={procedure.pago_tasa} saving={saving === "pago_tasa"} onChange={(v) => updateField("pago_tasa", v)} />
                  <ToggleField label="5. Coordinacion Examen DGAC" value={procedure.coordinacion_examen} saving={saving === "coordinacion_examen"} onChange={(v) => updateField("coordinacion_examen", v)} />
                </>
              )}

              {procedure.procedure_type === "renovacion" && (
                <>
                  <ToggleField label="1. Coordinacion Examen DGAC" value={procedure.coordinacion_examen} saving={saving === "coordinacion_examen"} onChange={(v) => updateField("coordinacion_examen", v)} />
                </>
              )}

              {procedure.procedure_type === "actualizacion" && (
                <>
                  <ToggleField label="1. Apendice C, Certificado de ENAE y Cedula de Identidad" value={procedure.apendice_c} saving={saving === "apendice_c"} onChange={(v) => updateField("apendice_c", v)} />
                </>
              )}
            </div>

            {/* Exam datetime and city - for nueva and renovacion */}
            {(procedure.procedure_type === "nueva" || procedure.procedure_type === "renovacion") && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {procedure.procedure_type === "nueva" ? "6." : "2."} Fecha y Hora del Examen
                  </label>
                  <input
                    type="datetime-local"
                    value={procedure.exam_datetime ? procedure.exam_datetime.slice(0, 16) : ""}
                    onChange={(e) => setProcedure((p) => p ? { ...p, exam_datetime: e.target.value } : null)}
                    onBlur={(e) => updateField("exam_datetime", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {procedure.procedure_type === "nueva" ? "7." : "3."} Unidad y Ciudad
                  </label>
                  <select
                    value={procedure.exam_unit_city || ""}
                    onChange={(e) => {
                      setProcedure((p) => p ? { ...p, exam_unit_city: e.target.value } : null);
                      updateField("exam_unit_city", e.target.value);
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0072CE] bg-white"
                  >
                    <option value="">Seleccionar ciudad...</option>
                    {chileCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History log */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Historial de Cambios</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-2">
                <span className="text-xs text-gray-400 whitespace-nowrap min-w-[130px]">
                  {formatDateTime(h.changed_at)}
                </span>
                <span className="text-gray-700">
                  <span className="font-medium">{fieldLabels[h.field_name] || h.field_name}</span>
                  {": "}
                  {h.old_value && <span className="text-red-400 line-through mr-1">{formatHistoryValue(h.field_name, h.old_value)}</span>}
                  <span className="text-green-600">{formatHistoryValue(h.field_name, h.new_value)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function ToggleField({
  label,
  value,
  saving,
  onChange,
}: {
  label: string;
  value: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(true)}
          disabled={saving}
          className={`px-3 py-1 rounded text-xs font-medium transition ${
            value
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-500 hover:bg-gray-300"
          } disabled:opacity-50`}
        >
          SI
        </button>
        <button
          onClick={() => onChange(false)}
          disabled={saving}
          className={`px-3 py-1 rounded text-xs font-medium transition ${
            !value
              ? "bg-red-500 text-white"
              : "bg-gray-200 text-gray-500 hover:bg-gray-300"
          } disabled:opacity-50`}
        >
          NO
        </button>
      </div>
    </div>
  );
}

function formatHistoryValue(field: string, value: string | null): string {
  if (!value) return "—";
  if (value === "true") return "SI";
  if (value === "false") return "NO";
  if (field === "procedure_type") {
    const labels: Record<string, string> = { nueva: "Credencial Nueva", renovacion: "Renovacion", actualizacion: "Actualizacion" };
    return labels[value] || value;
  }
  return value;
}
