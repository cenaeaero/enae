"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  apendice_c_file_url: string | null;
  apendice_c_uploaded_at: string | null;
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

type GradeItem = { id: string; name: string; weight: number };
type StudentGrade = { grade_item_id: string; score: number };
type ExamAttempt = { activity_id: string; score: number };
type ProgressItem = { activity_id: string; status: string; activity_title?: string; module_title?: string };

export default function RegistroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [regStatus, setRegStatus] = useState("");
  const [regDate, setRegDate] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileData>(emptyProfile);
  const [savingProfile, setSavingProfile] = useState(false);

  // New: grades, progress, password, delete
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [courseModules, setCourseModules] = useState<{ id: string; title: string }[]>([]);
  const [courseActivities, setCourseActivities] = useState<{ id: string; module_id: string; type: string }[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingExam, setResettingExam] = useState<string | null>(null);

  const [procedure, setProcedure] = useState<DgacProcedure | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("nueva");
  const [dgacError, setDgacError] = useState("");

  // Access tracking
  const [accessCount, setAccessCount] = useState(0);
  const [lastAccess, setLastAccess] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<{ accessed_at: string }[]>([]);

  // Certificate / Alumni state
  const [instructionCity, setInstructionCity] = useState("");
  const [folioEnae, setFolioEnae] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);
  const [hasDgacCert, setHasDgacCert] = useState(false);
  const [certMsg, setCertMsg] = useState("");
  const [savingCert, setSavingCert] = useState(false);
  const [sendingCert, setSendingCert] = useState(false);
  const [markingAlumni, setMarkingAlumni] = useState(false);
  const [apendiceRequired, setApendiceRequired] = useState(false);
  const [habilitationText, setHabilitationText] = useState("");
  const [apendiceAdminMsg, setApendiceAdminMsg] = useState("");
  const [apendiceAdminUploading, setApendiceAdminUploading] = useState(false);

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
      setCourseId(regData.course_id || "");
      setInstructionCity(regData.instruction_city || "");
      setIsAlumni(regData.is_alumni === true);

      // Folio lives on profiles.folio_enae (hydrated below from prof object)

      // Load whether this course issues the DGAC certificate
      if (regData.course_id) {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("has_dgac_certificate, apendice_c_required, apendice_c_habilitation_text")
          .eq("id", regData.course_id)
          .maybeSingle();
        setHasDgacCert((courseRow as any)?.has_dgac_certificate === true);
        setApendiceRequired((courseRow as any)?.apendice_c_required === true);
        setHabilitationText((courseRow as any)?.apendice_c_habilitation_text || "");
      }

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
      setFolioEnae((prof as any)?.folio_enae || "");
      if (prof) setProfileId(prof.id);
    }

    // Load grades
    if (regData?.course_id) {
      const { data: gi } = await supabase.from("grade_items").select("id, name, weight").eq("course_id", regData.course_id).order("sort_order");
      setGradeItems((gi || []) as GradeItem[]);

      const { data: sg } = await supabase.from("student_grades").select("grade_item_id, score").eq("registration_id", id);
      setStudentGrades((sg || []) as StudentGrade[]);

      // Load exam attempts as fallback for grades
      const { data: ea } = await supabase.from("exam_attempts").select("activity_id, score").eq("registration_id", id).order("completed_at", { ascending: false });
      setExamAttempts((ea || []) as ExamAttempt[]);

      // Load progress
      const { data: modules } = await supabase.from("course_modules").select("id, title").eq("course_id", regData.course_id).order("sort_order");
      setCourseModules((modules || []) as { id: string; title: string }[]);
      const moduleIds = (modules || []).map((m: any) => m.id);
      if (moduleIds.length > 0) {
        const { data: activities } = await supabase.from("module_activities").select("id, title, module_id, type").in("module_id", moduleIds).order("sort_order");
        setCourseActivities((activities || []) as { id: string; module_id: string; type: string }[]);
        setTotalActivities((activities || []).length);

        const { data: prog } = await supabase.from("activity_progress").select("activity_id, status").eq("registration_id", id);
        const progressWithNames = (prog || []).map((p: any) => {
          const act = (activities || []).find((a: any) => a.id === p.activity_id);
          const mod = act ? (modules || []).find((m: any) => m.id === act.module_id) : null;
          return { ...p, activity_title: act?.title || "", module_title: mod?.title || "" };
        });
        setProgress(progressWithNames);
      }
    }

    // Load DGAC procedure directly from Supabase
    const { data: procData } = await supabase
      .from("dgac_procedures")
      .select("*")
      .eq("registration_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (procData) {
      setProcedure(procData as DgacProcedure);
      setSelectedType(procData.procedure_type);

      const { data: histData } = await supabase
        .from("dgac_procedure_history")
        .select("*")
        .eq("procedure_id", procData.id)
        .order("changed_at", { ascending: false });
      setHistory((histData || []) as HistoryEntry[]);
    }

    // Load access logs directly from Supabase
    try {
      const { count } = await supabase
        .from("course_access_log")
        .select("id", { count: "exact", head: true })
        .eq("registration_id", id);
      setAccessCount(count || 0);

      const { data: lastLog } = await supabase
        .from("course_access_log")
        .select("accessed_at")
        .eq("registration_id", id)
        .order("accessed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastAccess(lastLog?.accessed_at || null);

      const { data: logs } = await supabase
        .from("course_access_log")
        .select("accessed_at")
        .eq("registration_id", id)
        .order("accessed_at", { ascending: false })
        .limit(50);
      setRecentLogs(logs || []);
    } catch {}

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
      const { data, error } = await supabase
        .from("dgac_procedures")
        .insert({ registration_id: id, procedure_type: selectedType })
        .select()
        .single();

      if (error) {
        setDgacError(error.message);
      } else if (data) {
        // Log creation in history
        await supabase.from("dgac_procedure_history").insert({
          procedure_id: data.id,
          field_name: "procedure_type",
          old_value: null,
          new_value: selectedType,
        });
        setProcedure(data as DgacProcedure);
        await loadData();
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
      // Get current value for history
      const oldValue = String((procedure as any)[field] ?? "");
      const newValue = String(value ?? "");

      const { error } = await supabase
        .from("dgac_procedures")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", procedure.id);

      if (!error) {
        setProcedure((prev) => (prev ? { ...prev, [field]: value } : null));

        // Log change in history
        await supabase.from("dgac_procedure_history").insert({
          procedure_id: procedure.id,
          field_name: field,
          old_value: oldValue,
          new_value: newValue,
        });

        // Reload history
        const { data: histData } = await supabase
          .from("dgac_procedure_history")
          .select("*")
          .eq("procedure_id", procedure.id)
          .order("changed_at", { ascending: false });
        setHistory((histData || []) as HistoryEntry[]);
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

  async function saveCertSettings() {
    setSavingCert(true);
    setCertMsg("");

    // City lives on registrations, folio_enae on profiles
    const { error: regErr } = await supabase
      .from("registrations")
      .update({ instruction_city: instructionCity || null })
      .eq("id", id);

    const { error: profErr } = profile.email
      ? await supabase
          .from("profiles")
          .update({ folio_enae: folioEnae || null })
          .eq("email", profile.email)
      : { error: null };

    if (regErr) setCertMsg(`Error: ${regErr.message}`);
    else if (profErr) setCertMsg(`Error: ${profErr.message}`);
    else {
      setCertMsg("Guardado.");
      // Keep the profile card in sync
      setProfile({ ...profile, folio_enae: folioEnae });
      setEditForm({ ...editForm, folio_enae: folioEnae });
    }
    setSavingCert(false);
  }

  async function downloadDgacCert() {
    setCertMsg("");
    try {
      const res = await fetch(`/api/certificado-dgac?registration_id=${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const missingList = Array.isArray(data.missing) && data.missing.length > 0
          ? ` Falta(n): ${data.missing.join(", ")}`
          : "";
        setCertMsg(`Error: ${data.error || "No se pudo generar"}.${missingList}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke after a delay so the new tab has time to load
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      setCertMsg(`Error: ${err.message || "Sin conexión"}`);
    }
  }

  async function sendDgacCertByEmail() {
    if (!confirm(`Enviar el certificado DGAC por email a ${profile.email}?`)) return;
    setSendingCert(true);
    setCertMsg("");
    try {
      const res = await fetch("/api/admin/enviar-certificado-dgac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        const missingList = Array.isArray(json.missing) && json.missing.length > 0
          ? ` Falta(n): ${json.missing.join(", ")}`
          : "";
        setCertMsg(`Error: ${json.error || "No se pudo enviar"}.${missingList}`);
      } else setCertMsg(`Certificado enviado a ${json.sent_to}.`);
    } catch (err: any) {
      setCertMsg(`Error: ${err.message || "Sin conexion"}`);
    }
    setSendingCert(false);
  }

  async function markAsAlumni() {
    if (!confirm("Marcar a este alumno como Egresado? Aparecerá en la sección Alumni.")) return;
    setMarkingAlumni(true);
    setCertMsg("");
    const { error } = await supabase
      .from("registrations")
      .update({ is_alumni: true, alumni_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setCertMsg(`Error: ${error.message}`);
    else {
      setIsAlumni(true);
      setCertMsg("Alumno marcado como Egresado.");
    }
    setMarkingAlumni(false);
  }

  async function handleDelete() {
    if (!confirm("¿Estás seguro de eliminar este registro? Se eliminarán todas las notas, progreso, diplomas y trámites asociados. Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/registros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.error) {
        alert("Error: " + json.error);
        setDeleting(false);
      } else {
        router.push("/admin/registros");
      }
    } catch {
      alert("Error de conexión");
      setDeleting(false);
    }
  }

  async function handlePasswordReset() {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSavingPassword(true);
    setPasswordMsg("");
    try {
      const res = await fetch("/api/admin/registros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", email: profile.email, password: newPassword }),
      });
      const json = await res.json();
      if (json.error) {
        setPasswordMsg("Error: " + json.error);
      } else {
        setPasswordMsg("Contraseña actualizada correctamente");
        setNewPassword("");
      }
    } catch {
      setPasswordMsg("Error de conexión");
    }
    setSavingPassword(false);
  }

  async function handleResetExam(activityId: string) {
    if (!confirm("¿Reiniciar el examen de este alumno? Se eliminarán todos los intentos y la calificación asociada.")) return;
    setResettingExam(activityId);
    try {
      const res = await fetch("/api/admin/examenes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: id, activity_id: activityId }),
      });
      const json = await res.json();
      if (json.error) { alert("Error: " + json.error); }
      else { alert(`Examen reiniciado. ${json.attempts_deleted} intento(s) eliminado(s).`); loadData(); }
    } catch { alert("Error al reiniciar examen"); }
    setResettingExam(null);
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Curso:</span>
            <span className="font-medium text-gray-700">{courseTitle}</span>
            {courseCode && <span className="text-gray-400">({courseCode})</span>}
          </div>
          <Link
            href={`/admin/registros/${id}/soporte`}
            className="inline-flex items-center gap-2 bg-[#F57C00] hover:bg-[#E65100] text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            title="Ver el curso del alumno en modo soporte"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver como alumno (Soporte)
          </Link>
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

      {/* Grades & Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Calificaciones y Progreso</h2>

        {/* Access stats + Progress overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* Accesos */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#003366]">{accessCount}</div>
            <div className="text-xs text-gray-500 mt-1">Ingresos al curso</div>
          </div>
          {/* Último acceso */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <div className="text-sm font-semibold text-gray-700">
              {lastAccess
                ? new Date(lastAccess).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
                : "—"}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {lastAccess
                ? new Date(lastAccess).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                : ""}
            </div>
            <div className="text-xs text-gray-500 mt-1">Último acceso</div>
          </div>
          {/* Progreso */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {totalActivities > 0 ? Math.round((progress.filter((p) => p.status === "completed").length / totalActivities) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Avance del curso</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progreso del curso</span>
            <span className="text-xs font-medium text-gray-700">
              {progress.filter((p) => p.status === "completed").length} / {totalActivities} actividades
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-[#0072CE] h-2.5 rounded-full transition-all"
              style={{ width: `${totalActivities > 0 ? (progress.filter((p) => p.status === "completed").length / totalActivities) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Recent access log */}
        {recentLogs.length > 0 && (
          <details className="mb-4">
            <summary className="text-xs text-[#0072CE] cursor-pointer hover:underline">
              Ver historial de accesos ({accessCount})
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {recentLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 py-1 border-b border-gray-50">
                  <span className="text-blue-400">🔵</span>
                  <span>
                    {new Date(log.accessed_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                    {" "}
                    {new Date(log.accessed_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Grades table */}
        {gradeItems.length > 0 ? (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2">Evaluación</th>
                <th className="pb-2 text-center">Peso</th>
                <th className="pb-2 text-center">Nota</th>
                <th className="pb-2 text-center">Estado</th>
                <th className="pb-2 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {gradeItems.map((gi) => {
                const grade = studentGrades.find((sg) => sg.grade_item_id === gi.id);
                // Fallback: get score from exam_attempts via module title matching
                let score: number | null = grade ? grade.score : null;
                if (score === null && courseModules.length > 0) {
                  const mod = courseModules.find((m) => gi.name.toLowerCase().includes(m.title.toLowerCase()));
                  if (mod) {
                    const examActivity = courseActivities.find((a) => a.module_id === mod.id && a.type === "exam");
                    if (examActivity) {
                      const attempt = examAttempts.find((a) => a.activity_id === examActivity.id);
                      if (attempt) score = attempt.score;
                    }
                  }
                }
                // Also try matching any exam attempt directly if only one grade item
                if (score === null && gradeItems.length === 1 && examAttempts.length > 0) {
                  score = examAttempts[0].score;
                }
                // Find exam activity for reset button
                let examActivityId: string | null = null;
                if (courseModules.length > 0) {
                  const mod = courseModules.find((m) => gi.name.toLowerCase().includes(m.title.toLowerCase()));
                  if (mod) {
                    const ea = courseActivities.find((a) => a.module_id === mod.id && a.type === "exam");
                    if (ea) examActivityId = ea.id;
                  }
                }
                // Fallback: if only one grade item, find any exam activity
                if (!examActivityId && gradeItems.length === 1) {
                  const ea = courseActivities.find((a) => a.type === "exam");
                  if (ea) examActivityId = ea.id;
                }

                return (
                  <tr key={gi.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{gi.name}</td>
                    <td className="py-2 text-center text-gray-500">{gi.weight}%</td>
                    <td className="py-2 text-center font-medium">{score !== null ? `${score}%` : "—"}</td>
                    <td className="py-2 text-center">
                      {score !== null ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${score >= 80 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {score >= 80 ? "Aprobado" : "Reprobado"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pendiente</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {examActivityId && (
                        <button
                          onClick={() => handleResetExam(examActivityId!)}
                          disabled={resettingExam === examActivityId}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium disabled:opacity-50"
                        >
                          {resettingExam === examActivityId ? "..." : "Reiniciar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No hay evaluaciones configuradas para este curso</p>
        )}

        {/* Activity progress list */}
        {progress.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-[#0072CE] cursor-pointer hover:underline">
              Ver detalle de actividades completadas ({progress.filter((p) => p.status === "completed").length})
            </summary>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {progress.filter((p) => p.status === "completed").map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 py-1 border-b border-gray-50">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-400">{p.module_title}:</span>
                  <span>{p.activity_title}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Certificaciones del Curso */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Certificaciones del Curso</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Ciudad de Instrucción</label>
            <input
              type="text"
              value={instructionCity}
              onChange={(e) => setInstructionCity(e.target.value)}
              placeholder="Ej: Antofagasta"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-1">Se usa en el Certificado DGAC.</p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">N° Folio</label>
            <input
              type="text"
              value={folioEnae}
              onChange={(e) => setFolioEnae(e.target.value)}
              placeholder="Ej: 642"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-1">Folio del Registro de Certificaciones ENAE.</p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Estado</label>
            <div className="flex items-center gap-2 pt-2">
              <span className={`text-xs px-2 py-1 rounded ${regStatus === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                {regStatus === "completed" ? "Completado" : regStatus}
              </span>
              {isAlumni && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">Egresado</span>
              )}
            </div>
            <button
              onClick={saveCertSettings}
              disabled={savingCert}
              className="mt-2 bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium w-full"
            >
              {savingCert ? "..." : "💾 Guardar Ciudad y Folio"}
            </button>
          </div>
        </div>

        {certMsg && (
          <div className={`text-sm mb-3 ${certMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
            {certMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {hasDgacCert && (
            <>
              <button
                onClick={downloadDgacCert}
                disabled={regStatus !== "completed"}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium"
                title={regStatus !== "completed" ? "Disponible cuando el curso esté completado" : ""}
              >
                📄 Descargar Certificado DGAC
              </button>
              <button
                onClick={sendDgacCertByEmail}
                disabled={regStatus !== "completed" || sendingCert}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium"
              >
                {sendingCert ? "Enviando..." : "✉️ Enviar por Email"}
              </button>
            </>
          )}
          {!isAlumni && (
            <button
              onClick={markAsAlumni}
              disabled={regStatus !== "completed" || markingAlumni}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium"
            >
              {markingAlumni ? "..." : "🎓 Pasar a Egresado"}
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          {hasDgacCert
            ? "Estas acciones están disponibles solo cuando el alumno ha completado el curso al 100%."
            : "Este curso no emite Certificado DGAC. Solo el Curso de Operador UAS Nivel 1 tiene este certificado."}
          {" "}Al pasar a Egresado el alumno aparecerá en la sección <strong>Alumni</strong>.
        </p>
      </div>

      {/* Password Reset & Delete */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Acciones de Cuenta</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Password reset */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Cambiar Contraseña</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (min. 6 caracteres)"
                className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handlePasswordReset}
                disabled={savingPassword || !newPassword}
                className="bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {savingPassword ? "..." : "Cambiar"}
              </button>
            </div>
            {passwordMsg && (
              <p className={`text-xs mt-1 ${passwordMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
                {passwordMsg}
              </p>
            )}
          </div>

          {/* Delete registration */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Eliminar Registro</h3>
            <p className="text-xs text-gray-400 mb-2">Elimina este registro y todos sus datos asociados (notas, progreso, diplomas, trámites).</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              {deleting ? "Eliminando..." : "Eliminar Registro"}
            </button>
          </div>
        </div>
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
            {/* Apéndice C firmado subido por el alumno */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-700">Apéndice C firmado</p>
                  {procedure.apendice_c_file_url ? (
                    <p className="text-xs text-gray-500">
                      Subido {procedure.apendice_c_uploaded_at ? new Date(procedure.apendice_c_uploaded_at).toLocaleString("es-CL") : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Aún no se ha subido el Apéndice C firmado</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {procedure && (
                    <button
                      onClick={async () => {
                        setApendiceAdminMsg("");
                        try {
                          const prepRes = await fetch("/api/apendice-c/prepare", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ registration_id: id }),
                          });
                          const prepJson = await prepRes.json();
                          if (!prepRes.ok) throw new Error(prepJson?.error || "Error preparando codigo");
                          const verificationCode = prepJson.verification_code as string;
                          const verificationUrl = `${window.location.origin}/verify/apendice-c/${verificationCode}`;

                          const { generateApendiceCPDF } = await import("@/lib/apendice-c-pdf");
                          const pdf = await generateApendiceCPDF({
                            student_name: `${profile.first_name} ${profile.last_name}`.trim(),
                            rut: profile.rut || "",
                            profession: profile.job_title || "",
                            address: profile.address || "",
                            city: profile.city || "",
                            date: new Date(),
                            habilitation_text: habilitationText || "",
                            verification_code: verificationCode,
                            verification_url: verificationUrl,
                          });
                          const safe = `${profile.first_name}_${profile.last_name}`.replace(/\s+/g, "_");
                          pdf.save(`Apendice_C_${safe}.pdf`);
                          setApendiceAdminMsg("PDF pre-llenado descargado.");
                        } catch (err: any) {
                          setApendiceAdminMsg("Error generando PDF: " + (err?.message || "desconocido"));
                        }
                      }}
                      className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Descargar pre-llenado
                    </button>
                  )}
                  <label className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition cursor-pointer ${apendiceAdminUploading ? "bg-gray-200 text-gray-400 cursor-wait" : "bg-green-600 hover:bg-green-700 text-white"}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    {apendiceAdminUploading ? "Subiendo..." : "Subir firmado"}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      disabled={apendiceAdminUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setApendiceAdminUploading(true);
                        setApendiceAdminMsg("");
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("registration_id", id);
                          const res = await fetch("/api/apendice-c/upload", { method: "POST", body: fd });
                          const json = await res.json();
                          if (!res.ok) throw new Error(json?.error || "Upload falló");
                          setApendiceAdminMsg("Apéndice C firmado subido correctamente.");
                          await loadData();
                        } catch (err: any) {
                          setApendiceAdminMsg("Error subiendo: " + (err?.message || "desconocido"));
                        } finally {
                          setApendiceAdminUploading(false);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </label>
                  {procedure.apendice_c_file_url && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/apendice-c/download?registration_id=${id}`);
                          const json = await res.json();
                          if (!res.ok) throw new Error(json?.error || "Error");
                          window.open(json.url, "_blank");
                        } catch (err: any) {
                          alert("Error descargando: " + (err?.message || "desconocido"));
                        }
                      }}
                      className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-[#0072CE] hover:bg-[#005BA1] text-white transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Descargar firmado
                    </button>
                  )}
                </div>
              </div>
              {apendiceAdminMsg && (
                <p className={`mt-2 text-xs ${apendiceAdminMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{apendiceAdminMsg}</p>
              )}
            </div>
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
