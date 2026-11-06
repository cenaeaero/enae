// Lugares de práctica — tipos y reglas compartidas (admin, instructor, alumno).

export type PracticeAuthorization = {
  id?: string;
  site_id?: string;
  authority: string;
  reference: string | null;
  document_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  lead_days: number | null;
  notes: string | null;
};

export type PracticeSite = {
  id: string;
  code: string | null;
  name: string;
  site_type: "aerodromo" | "zona_vuelo" | "faena" | "sede_teorica" | "otro";
  status: "activo" | "suspendido";
  address: string | null;
  comuna: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  kml_url: string | null;
  fir: string | null;
  airspace_class: string | null;
  nearest_aerodrome: string | null;
  nearest_aerodrome_km: number | null;
  restricted_zones: string | null;
  max_height_agl_m: number | null;
  max_radius_m: number | null;
  operation_types: string[] | null;
  max_mtom_kg: number | null;
  max_simultaneous_rpa: number | null;
  capacity_students: number | null;
  availability: string | null;
  services: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  meeting_point: string | null;
  nearest_medical_center: string | null;
  emergency_phone: string | null;
  emergency_plan: string | null;
  access_instructions: string | null;
  course_ids: string[] | null;
  notes: string | null;
  practice_site_authorizations?: PracticeAuthorization[];
};

export const SITE_TYPE_LABELS: Record<string, string> = {
  aerodromo: "Aeródromo",
  zona_vuelo: "Zona de vuelo",
  faena: "Faena / instalación de cliente",
  sede_teorica: "Sede teórica",
  otro: "Otro",
};

// Campos editables (lista blanca para los endpoints)
export const SITE_FIELDS = [
  "code", "name", "site_type", "status", "address", "comuna", "city", "region",
  "latitude", "longitude", "maps_url", "kml_url", "fir", "airspace_class",
  "nearest_aerodrome", "nearest_aerodrome_km", "restricted_zones",
  "max_height_agl_m", "max_radius_m", "operation_types", "max_mtom_kg", "max_simultaneous_rpa",
  "capacity_students", "availability", "services", "contact_name", "contact_phone", "contact_email",
  "meeting_point", "nearest_medical_center", "emergency_phone", "emergency_plan",
  "access_instructions", "course_ids", "notes",
] as const;

export function mapsUrlFor(site: Pick<PracticeSite, "maps_url" | "latitude" | "longitude">): string | null {
  if (site.maps_url) return site.maps_url;
  if (site.latitude != null && site.longitude != null) {
    return `https://www.google.com/maps?q=${site.latitude},${site.longitude}`;
  }
  return null;
}

function daysBetween(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Estado de las autorizaciones del lugar a una fecha de referencia (hoy por defecto).
export type AuthState = "sin_autorizaciones" | "vigente" | "por_vencer" | "vencida";
export function authorizationState(site: PracticeSite, refDate?: string): { state: AuthState; detail: string } {
  const auths = site.practice_site_authorizations || [];
  if (auths.length === 0) return { state: "sin_autorizaciones", detail: "Sin autorizaciones registradas" };
  const ref = refDate || todayISO();
  let worst: AuthState = "vigente";
  const notes: string[] = [];
  for (const a of auths) {
    if (!a.valid_until) continue;
    const d = daysBetween(ref, a.valid_until);
    if (d < 0) { worst = "vencida"; notes.push(`${a.authority} vencida el ${a.valid_until}`); }
    else if (d <= 30 && worst !== "vencida") { worst = "por_vencer"; notes.push(`${a.authority} vence el ${a.valid_until}`); }
  }
  return { state: worst, detail: notes.join(" · ") || "Autorizaciones vigentes" };
}

// Advertencias al programar una clase en un lugar para una fecha dada.
// opts.skipLead: omitir la regla de antelación (útil para clases ya programadas, donde
// la antelación se evaluó al momento de programar).
export function scheduleWarnings(site: PracticeSite, date: string | null, courseId?: string | null, opts?: { skipLead?: boolean }): string[] {
  const w: string[] = [];
  if (site.status === "suspendido") w.push("El lugar está SUSPENDIDO.");
  if (courseId && site.course_ids && site.course_ids.length > 0 && !site.course_ids.includes(courseId)) {
    w.push("El lugar no está habilitado para este curso.");
  }
  const auths = site.practice_site_authorizations || [];
  if (auths.length === 0) w.push("El lugar no tiene autorizaciones registradas.");
  if (date) {
    const lead = Math.max(0, ...auths.map((a) => a.lead_days || 0));
    const daysAhead = daysBetween(todayISO(), date);
    if (!opts?.skipLead && lead > 0 && daysAhead < lead) {
      w.push(`Requiere coordinar con ${lead} día(s) de antelación; la clase es en ${daysAhead} día(s).`);
    }
    for (const a of auths) {
      if (a.valid_until && a.valid_until < date) w.push(`Autorización ${a.authority} vence el ${a.valid_until}, antes de la clase.`);
      if (a.valid_from && a.valid_from > date) w.push(`Autorización ${a.authority} rige desde el ${a.valid_from}, después de la clase.`);
    }
  }
  return w;
}

// ---------------------------------------------------------------------------
// Resúmenes para correos y portal
// ---------------------------------------------------------------------------

// Lo que ve el ALUMNO (sin datos operacionales internos)
export type StudentSiteInfo = {
  name: string;
  access_instructions: string | null;
  meeting_point: string | null;
  services: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  emergency_phone: string | null;
  nearest_medical_center: string | null;
};

export function studentSiteInfo(s: PracticeSite | null | undefined): StudentSiteInfo | null {
  if (!s) return null;
  const info: StudentSiteInfo = {
    name: s.name,
    access_instructions: s.access_instructions,
    meeting_point: s.meeting_point,
    services: s.services,
    contact_name: s.contact_name,
    contact_phone: s.contact_phone,
    emergency_phone: s.emergency_phone,
    nearest_medical_center: s.nearest_medical_center,
  };
  const hasAny = Object.entries(info).some(([k, v]) => k !== "name" && !!v);
  return hasAny ? info : null;
}

// Lo que ve el INSTRUCTOR: ficha operacional completa del lugar
export function operationalLines(s: PracticeSite): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const push = (label: string, v: unknown) => { if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) out.push({ label, value: String(v) }); };
  push("Espacio aéreo", [s.fir, s.airspace_class ? `clase ${s.airspace_class}` : null].filter(Boolean).join(" · ") || null);
  push("Aeródromo más cercano", s.nearest_aerodrome ? `${s.nearest_aerodrome}${s.nearest_aerodrome_km != null ? ` (${s.nearest_aerodrome_km} km)` : ""}` : null);
  push("Zonas restringidas/peligrosas", s.restricted_zones);
  push("Límites", [
    s.max_height_agl_m != null ? `${s.max_height_agl_m} m AGL` : null,
    s.max_radius_m != null ? `radio ${s.max_radius_m} m` : null,
    (s.operation_types || []).join("/") || null,
    s.max_mtom_kg != null ? `MTOM ${s.max_mtom_kg} kg` : null,
    s.max_simultaneous_rpa != null ? `${s.max_simultaneous_rpa} RPA simultáneos` : null,
  ].filter(Boolean).join(" · ") || null);
  push("Autorizaciones", (s.practice_site_authorizations || []).map((a) =>
    `${a.authority}${a.reference ? ` ${a.reference}` : ""}${a.valid_until ? ` (vence ${a.valid_until})` : ""}${a.lead_days ? ` · coordinar con ${a.lead_days} día(s)` : ""}`).join("; ") || "Sin autorizaciones registradas");
  push("Contacto del lugar", [s.contact_name, s.contact_phone].filter(Boolean).join(" · ") || null);
  push("Punto de reunión", s.meeting_point);
  push("Emergencias", [s.emergency_phone, s.nearest_medical_center].filter(Boolean).join(" · ") || null);
  push("Plan de emergencia", s.emergency_plan);
  return out;
}
