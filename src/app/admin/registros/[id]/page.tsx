"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { chileCities } from "@/data/chile-cities";

type ProfileData = {
  first_name: string;
  last_name: string;
  email: string;
  rut: string;
  phone: string;
  secondary_phone: string;
  organization: string;
  organization_type: string;
  job_title: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  supervisor_name: string;
  supervisor_email: string;
  folio_enae: string;
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

const emptyProfile: ProfileData = {
  first_name: "", last_name: "", email: "", rut: "", phone: "",
  secondary_phone: "", organization: "", organization_type: "",
  job_title: "", address: "", city: "", state: "", postal_code: "",
  country: "", supervisor_name: "", supervisor_email: "", folio_enae: "",
};

export default function RegistroDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [regStatus, setRegStatus] = useState("");
  const [regDate, setRegDate] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileData>(emptyProfile);
  const [savingProfile, setSavingProfile] = useState(false);

  const [procedure, setProcedure] = useState<DgacProcedure | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("nueva");
  const [dgacError, setDgacError] = useState("");

  const loadData = useCallback(async () => {
    // Load registration
    const { data: regData } = await supabase
      .from("registrations")
      .select("*, courses(title, code)")
      .eq("id", id)
      .single();

    if (regData) {
      setRegStatus(regData.status);
      setRegDate(regData.created_at);
      setCourseTitle(regData.courses?.title || "");
      setCourseCode(regData.courses?.code || "");

      // Try to get full profile data
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", regData.email)
        .single();

      const p: ProfileData = {
        first_name: prof?.first_name || regData.first_name || "",
        last_name: prof?.last_name || regData.last_name || "",
        email: prof?.email || regData.email || "",
        rut: prof?.rut || "",
        phone: prof?.phone || regData.phone || "",
        secondary_phone: prof?.secondary_phone || "",
        organization: prof?.organization || regData.organization || "",
        organization_type: prof?.organization_type || regData.organization_type || "",
        job_title: prof?.job_title || regData.job_title || "",
        address: prof?.address || regData.address || "",
        city: prof?.city || regData.city || "",
        state: prof?.state || regData.state || "",
        postal_code: prof?.postal_code || regData.postal_code || "",
        country: prof?.country || regData.country || "",
        supervisor_name: prof?.supervisor_name || regData.supervisor_name || "",
        supervisor_email: prof?.supervisor_email || regData.supervisor_email || "",
        folio_enae: (prof as any)?.folio_enae || "",
      };
      setProfile(p);
      setEditForm(p);
      if (prof) setProfileId(prof.id);
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
    } catch (err) {
      console.error("Error loading DGAC:", err);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveProfile() {
    setSavingProfile(true);
    // Update profile table
    if (profileId) {
      await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          rut: editForm.rut,
          phone: editForm.phone,
          secondary_phone: editForm.secondary_phone,
          organization: editForm.organization,
          organization_type: editForm.organization_type,
          job_title: editForm.job_title,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          postal_code: editForm.postal_code,
          country: editForm.country,
          supervisor_name: editForm.supervisor_name,
          supervisor_email: editForm.supervisor_email,
          folio_enae: editForm.folio_enae,
        })
        .eq("id", profileId);
    }

    // Also update registration record
    await supabase
      .from("registrations")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        organization: editForm.organization,
        organization_type: editForm.organization_type,
        job_title: editForm.job_title,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        postal_code: editForm.postal_code,
        country: editForm.country,
        supervisor_name: editForm.supervisor_name,
        supervisor_email: editForm.supervisor_email,
      })
      .eq("id", id);

    setProfile(editForm);
    setEditing(false);
    setSavingProfile(false);
  }

  async function createProcedure() {
    setSaving("create");
    setDgacError("");
    try {
      const res = await fetch("/api/admin/dgac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: id, procedure_type: selectedType }),
      });
      const json = await res.json();
      if (res.ok && json.procedure) {
        setProcedure(json.procedure);
        await loadData();
      } else {
        setDgacError(json.error || "Error al crear tramite");
      }
    } catch (err) {
      setDgacError("Error de conexion al crear tramite");
    }
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
        const hRes = await fetch(`/api/admin/dgac?registration_id=${id}`);
        if (hRes.ok) {
          const json = await hRes.json();
          setHistory(json.history || []);
        }
      }
    } catch (err) {
      console.error("Error updating DGAC field:", err);
    }
    setSaving(null);
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("es-CL", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>;

  if (!profile.email) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Registro no encontrado</p>
        <Link href="/admin/registros" className="text-[#0072CE] hover:underline text-sm">← Volver a Registros</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/registros" className="text-sm text-[#0072CE] hover:underline mb-4 inline-block">← Volver a Registros</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#003366]">{profile.first_name} {profile.last_name}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Curso:</span>
          <span className="font-medium text-gray-700">{courseTitle}</span>
          {courseCode && <span className="text-gray-400">({courseCode})</span>}
        </div>
      </div>

      {/* Editable Personal Data */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Datos Personales</h2>
          {!editing ? (
            <button onClick={() => { setEditForm(profile); setEditing(true); }} className="text-xs text-[#0072CE] hover:underline">Editar</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
              <button onClick={saveProfile} disabled={savingProfile} className="text-xs bg-[#0072CE] text-white px-3 py-1 rounded hover:bg-[#005fa3] disabled:opacity-50">
                {savingProfile ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReadField label="Nombre" value={`${profile.first_name} ${profile.last_name}`} />
            <ReadField label="Email" value={profile.email} />
            <ReadField label="RUT / DNI" value={profile.rut} />
            <ReadField label="Telefono" value={profile.phone} />
            <ReadField label="Telefono Secundario" value={profile.secondary_phone} />
            <ReadField label="Organizacion" value={profile.organization} />
            <ReadField label="Tipo Organizacion" value={profile.organization_type} />
            <ReadField label="Cargo" value={profile.job_title} />
            <ReadField label="Direccion" value={profile.address} />
            <ReadField label="Ciudad" value={profile.city} />
            <ReadField label="Region" value={profile.state} />
            <ReadField label="Codigo Postal" value={profile.postal_code} />
            <ReadField label="Pais" value={profile.country} />
            <ReadField label="Supervisor" value={profile.supervisor_name} />
            <ReadField label="Email Supervisor" value={profile.supervisor_email} />
            <ReadField label="Folio ENAE" value={profile.folio_enae} />
            <ReadField label="Estado Registro" value={regStatus} />
            <ReadField label="Fecha Registro" value={formatDateTime(regDate)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditField label="Nombre" value={editForm.first_name} onChange={(v) => setEditForm({ ...editForm, first_name: v })} />
            <EditField label="Apellido" value={editForm.last_name} onChange={(v) => setEditForm({ ...editForm, last_name: v })} />
            <EditField label="Email" value={editForm.email} disabled />
            <EditField label="RUT / DNI" value={editForm.rut} onChange={(v) => setEditForm({ ...editForm, rut: v })} />
            <EditField label="Telefono" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
            <EditField label="Telefono Secundario" value={editForm.secondary_phone} onChange={(v) => setEditForm({ ...editForm, secondary_phone: v })} />
            <EditField label="Organizacion" value={editForm.organization} onChange={(v) => setEditForm({ ...editForm, organization: v })} />
            <EditField label="Tipo Organizacion" value={editForm.organization_type} onChange={(v) => setEditForm({ ...editForm, organization_type: v })} />
            <EditField label="Cargo" value={editForm.job_title} onChange={(v) => setEditForm({ ...editForm, job_title: v })} />
            <EditField label="Direccion" value={editForm.address} onChange={(v) => setEditForm({ ...editForm, address: v })} />
            <EditField label="Ciudad" value={editForm.city} onChange={(v) => setEditForm({ ...editForm, city: v })} />
            <EditField label="Region" value={editForm.state} onChange={(v) => setEditForm({ ...editForm, state: v })} />
            <EditField label="Codigo Postal" value={editForm.postal_code} onChange={(v) => setEditForm({ ...editForm, postal_code: v })} />
            <EditField label="Pais" value={editForm.country} onChange={(v) => setEditForm({ ...editForm, country: v })} />
            <EditField label="Supervisor" value={editForm.supervisor_name} onChange={(v) => setEditForm({ ...editForm, supervisor_name: v })} />
            <EditField label="Email Supervisor" value={editForm.supervisor_email} onChange={(v) => setEditForm({ ...editForm, supervisor_email: v })} />
            <EditField label="Folio ENAE" value={editForm.folio_enae} onChange={(v) => setEditForm({ ...editForm, folio_enae: v })} />
          </div>
        )}
      </div>

      {/* DGAC Procedures */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Tramites DGAC</h2>

        {dgacError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{dgacError}</div>
        )}

        {!procedure ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">Selecciona el tipo de tramite para crear el checklist:</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {(["nueva", "renovacion", "actualizacion"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedType === t ? "bg-[#003366] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">N° Credencial DGAC</label>
                <input
                  type="text"
                  value={procedure.dgac_credential_number || ""}
                  onChange={(e) => setProcedure((p) => p ? { ...p, dgac_credential_number: e.target.value } : null)}
                  onBlur={(e) => updateField("dgac_credential_number", e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
                  placeholder="Ingrese N° de credencial"
                />
              </div>
              <div>
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
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
                  placeholder="000000"
                />
              </div>
            </div>

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
                <ToggleField label="1. Coordinacion Examen DGAC" value={procedure.coordinacion_examen} saving={saving === "coordinacion_examen"} onChange={(v) => updateField("coordinacion_examen", v)} />
              )}
              {procedure.procedure_type === "actualizacion" && (
                <ToggleField label="1. Apendice C, Certificado de ENAE y Cedula de Identidad" value={procedure.apendice_c} saving={saving === "apendice_c"} onChange={(v) => updateField("apendice_c", v)} />
              )}
            </div>

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
                <span className="text-xs text-gray-400 whitespace-nowrap min-w-[130px]">{formatDateTime(h.changed_at)}</span>
                <span className="text-gray-700">
                  <span className="font-medium">{fieldLabels[h.field_name] || h.field_name}</span>{": "}
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

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function EditField({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0072CE] disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

function ToggleField({ label, value, saving, onChange }: { label: string; value: boolean; saving: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(true)} disabled={saving} className={`px-3 py-1 rounded text-xs font-medium transition ${value ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"} disabled:opacity-50`}>SI</button>
        <button onClick={() => onChange(false)} disabled={saving} className={`px-3 py-1 rounded text-xs font-medium transition ${!value ? "bg-red-500 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"} disabled:opacity-50`}>NO</button>
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
