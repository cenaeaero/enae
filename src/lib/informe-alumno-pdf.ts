import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  rut: string | null;
  phone: string | null;
  organization: string | null;
  organization_type: string | null;
  job_title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  folio_enae: string | null;
};

type RegistrationFull = {
  id: string;
  course_id: string;
  course_title: string;
  course_code: string | null;
  status: string;
  is_alumni: boolean | null;
  created_at: string;
  delivery_mode: string | null;
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
  accessCount: number;
  lastAccess: string | null;
  grades: { name: string; weight: number; score: number | null }[];
  finalScore: number | null;
};

type StudentReport = {
  profile: Partial<ProfileRow> & { email: string; first_name: string; last_name: string };
  registrations: RegistrationFull[];
};

const PAGE = 1000;

async function fetchAllPaged<T>(query: () => any): Promise<T[]> {
  const result: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    result.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return result;
}

export async function buildStudentReports(registrationIds: string[]): Promise<StudentReport[]> {
  if (registrationIds.length === 0) return [];

  // 1. Get registrations with course
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, email, first_name, last_name, course_id, status, is_alumni, created_at, delivery_mode, courses(title, code)")
    .in("id", registrationIds);

  if (!regs || regs.length === 0) return [];

  // 2. Get unique emails to fetch profiles
  const emails = Array.from(new Set(regs.map((r: any) => r.email).filter(Boolean)));
  const profilesByEmail: Record<string, ProfileRow> = {};
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500);
    const { data: profs } = await supabase
      .from("profiles")
      .select("*")
      .in("email", chunk);
    (profs || []).forEach((p: any) => {
      profilesByEmail[p.email.toLowerCase()] = p;
    });
  }

  // 3. Fetch course modules + activities for total counts
  const courseIds = Array.from(new Set(regs.map((r: any) => r.course_id).filter(Boolean)));
  const activitiesPerCourse: Record<string, number> = {};
  if (courseIds.length > 0) {
    const { data: modules } = await supabase
      .from("course_modules")
      .select("id, course_id")
      .in("course_id", courseIds)
      .limit(10000);
    const modulesByCourse: Record<string, string[]> = {};
    (modules || []).forEach((m: any) => {
      if (!modulesByCourse[m.course_id]) modulesByCourse[m.course_id] = [];
      modulesByCourse[m.course_id].push(m.id);
    });
    const allModuleIds = (modules || []).map((m: any) => m.id);
    if (allModuleIds.length > 0) {
      const { data: activities } = await supabase
        .from("module_activities")
        .select("id, module_id")
        .in("module_id", allModuleIds)
        .limit(50000);
      const activitiesByModule: Record<string, number> = {};
      (activities || []).forEach((a: any) => {
        activitiesByModule[a.module_id] = (activitiesByModule[a.module_id] || 0) + 1;
      });
      for (const [cid, mids] of Object.entries(modulesByCourse)) {
        activitiesPerCourse[cid] = mids.reduce((s, mid) => s + (activitiesByModule[mid] || 0), 0);
      }
    }
  }

  // 4. Fetch progress for these registrations (paginated, completed only)
  const regIds = regs.map((r: any) => r.id);
  const completedByReg: Record<string, number> = {};
  let from = 0;
  while (true) {
    const { data: page } = await supabase
      .from("activity_progress")
      .select("registration_id")
      .in("registration_id", regIds)
      .eq("status", "completed")
      .range(from, from + PAGE - 1);
    if (!page || page.length === 0) break;
    page.forEach((p: any) => {
      completedByReg[p.registration_id] = (completedByReg[p.registration_id] || 0) + 1;
    });
    if (page.length < PAGE) break;
    from += PAGE;
  }

  // 5. Fetch access logs (paginated)
  const accessByReg: Record<string, { count: number; last: string | null }> = {};
  let aFrom = 0;
  while (true) {
    const { data: page } = await supabase
      .from("course_access_log")
      .select("registration_id, accessed_at")
      .in("registration_id", regIds)
      .order("accessed_at", { ascending: false })
      .range(aFrom, aFrom + PAGE - 1);
    if (!page || page.length === 0) break;
    page.forEach((a: any) => {
      if (!accessByReg[a.registration_id]) accessByReg[a.registration_id] = { count: 0, last: a.accessed_at };
      accessByReg[a.registration_id].count += 1;
    });
    if (page.length < PAGE) break;
    aFrom += PAGE;
  }

  // 6. Fetch grades (grade items + student grades)
  const { data: gradeItems } = await supabase
    .from("grade_items")
    .select("id, course_id, name, weight, sort_order")
    .in("course_id", courseIds)
    .order("sort_order")
    .limit(10000);

  const gradeItemIds = (gradeItems || []).map((g: any) => g.id);
  const studentGradesByReg: Record<string, Record<string, number>> = {};
  if (gradeItemIds.length > 0 && regIds.length > 0) {
    let gFrom = 0;
    while (true) {
      const { data: page } = await supabase
        .from("student_grades")
        .select("registration_id, grade_item_id, score")
        .in("registration_id", regIds)
        .in("grade_item_id", gradeItemIds)
        .range(gFrom, gFrom + PAGE - 1);
      if (!page || page.length === 0) break;
      page.forEach((sg: any) => {
        if (!studentGradesByReg[sg.registration_id]) studentGradesByReg[sg.registration_id] = {};
        studentGradesByReg[sg.registration_id][sg.grade_item_id] = sg.score;
      });
      if (page.length < PAGE) break;
      gFrom += PAGE;
    }
  }

  // 7. Build per-student report
  const studentMap: Record<string, StudentReport> = {};
  for (const r of regs as any[]) {
    const email = r.email?.toLowerCase() || "";
    const profile = profilesByEmail[email] || null;

    const totalActivities = activitiesPerCourse[r.course_id] || 0;
    const completed = completedByReg[r.id] || 0;
    const isPresencial = r.delivery_mode === "presencial";
    const progressPercent = isPresencial ? 100 : (totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0);
    const access = accessByReg[r.id] || { count: 0, last: null };

    const courseGradeItems = (gradeItems || []).filter((g: any) => g.course_id === r.course_id);
    const grades = courseGradeItems.map((g: any) => ({
      name: g.name,
      weight: Number(g.weight) || 0,
      score: studentGradesByReg[r.id]?.[g.id] ?? null,
    }));

    // Calculate weighted final score
    let totalWeight = 0;
    let weightedSum = 0;
    grades.forEach((g) => {
      if (g.score !== null) {
        weightedSum += (g.score * g.weight);
        totalWeight += g.weight;
      }
    });
    const finalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;

    const reg: RegistrationFull = {
      id: r.id,
      course_id: r.course_id,
      course_title: r.courses?.title || "",
      course_code: r.courses?.code || null,
      status: r.status,
      is_alumni: r.is_alumni,
      created_at: r.created_at,
      delivery_mode: r.delivery_mode,
      totalActivities,
      completedActivities: completed,
      progressPercent,
      accessCount: access.count,
      lastAccess: access.last,
      grades,
      finalScore,
    };

    if (!studentMap[email]) {
      studentMap[email] = {
        profile: profile || {
          email: r.email,
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          rut: null,
        } as any,
        registrations: [],
      };
    }
    studentMap[email].registrations.push(reg);
  }

  return Object.values(studentMap);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

export function generateInformePDF(students: StudentReport[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;

  students.forEach((s, idx) => {
    if (idx > 0) doc.addPage();

    let y = margin;

    // Header band
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pw, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME ACADÉMICO ENAE", pw / 2, 12, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Escuela de Navegación Aérea  |  AOC 1521 DGAC", pw / 2, 19, { align: "center" });
    doc.setFontSize(7);
    doc.text(`Generado: ${new Date().toLocaleString("es-CL")}`, pw / 2, 24, { align: "center" });

    y = 36;

    // Student name
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    const fullName = `${s.profile.first_name || ""} ${s.profile.last_name || ""}`.trim() || s.profile.email;
    doc.text(fullName, margin, y);
    y += 6;

    // Personal data table
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const fields: { label: string; value: string }[] = [
      { label: "Email", value: s.profile.email || "—" },
      { label: "RUT / NIT", value: s.profile.rut || "—" },
      { label: "Empresa", value: s.profile.organization || "—" },
      { label: "Cargo", value: s.profile.job_title || "—" },
      { label: "Teléfono", value: s.profile.phone || "—" },
      { label: "Ciudad", value: [s.profile.city, s.profile.state, s.profile.country].filter(Boolean).join(", ") || "—" },
    ];

    const colWidth = (pw - 2 * margin) / 2;
    fields.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * colWidth;
      const ry = y + row * 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7);
      doc.text(f.label.toUpperCase(), x, ry);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);
      const txt = doc.splitTextToSize(f.value, colWidth - 4)[0] || "—";
      doc.text(txt, x, ry + 4);
    });
    y += Math.ceil(fields.length / 2) * 8 + 4;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 6;

    // Section title
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Cursos inscritos (${s.registrations.length})`, margin, y);
    y += 6;

    // Per-course details
    s.registrations.forEach((r, ridx) => {
      // Add page break if needed
      if (y > ph - 60) {
        doc.addPage();
        y = margin;
      }

      // Course header
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, pw - 2 * margin, 8, "F");
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const codePart = r.course_code ? ` (${r.course_code})` : "";
      const titleText = doc.splitTextToSize(`${ridx + 1}. ${r.course_title}${codePart}`, pw - 2 * margin - 4)[0];
      doc.text(titleText, margin + 2, y + 5.5);
      y += 10;

      // Course meta
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const statusLabel = r.is_alumni ? "Egresado" : (STATUS_LABELS[r.status] || r.status);
      const meta = `Estado: ${statusLabel}   |   Inscripción: ${formatDate(r.created_at)}   |   Modalidad: ${r.delivery_mode === "presencial" ? "Presencial" : "Online"}`;
      doc.text(meta, margin + 2, y);
      y += 5;

      // Progress + access
      const progressLine = `Avance: ${r.progressPercent}% (${r.completedActivities}/${r.totalActivities} actividades)   |   Ingresos al curso: ${r.accessCount}   |   Último acceso: ${formatDateTime(r.lastAccess)}`;
      const splitProg = doc.splitTextToSize(progressLine, pw - 2 * margin - 4);
      doc.text(splitProg, margin + 2, y);
      y += splitProg.length * 4 + 2;

      // Grades table
      if (r.grades.length > 0) {
        // Table header
        doc.setFillColor(230, 235, 245);
        doc.rect(margin + 2, y, pw - 2 * margin - 4, 6, "F");
        doc.setTextColor(0, 51, 102);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Evaluación", margin + 4, y + 4);
        doc.text("Peso", margin + 110, y + 4);
        doc.text("Nota", margin + 130, y + 4);
        doc.text("Estado", margin + 150, y + 4);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        r.grades.forEach((g) => {
          if (y > ph - 20) {
            doc.addPage();
            y = margin;
          }
          const nameTxt = doc.splitTextToSize(g.name, 100)[0] || g.name;
          doc.setTextColor(40, 40, 40);
          doc.text(nameTxt, margin + 4, y + 4);
          doc.text(`${g.weight}%`, margin + 110, y + 4);
          if (g.score !== null) {
            doc.text(`${g.score}%`, margin + 130, y + 4);
            const passed = g.score >= 80;
            doc.setTextColor(passed ? 0 : 180, passed ? 130 : 30, passed ? 0 : 30);
            doc.text(passed ? "Aprobado" : "Reprobado", margin + 150, y + 4);
          } else {
            doc.setTextColor(150, 150, 150);
            doc.text("—", margin + 130, y + 4);
            doc.text("Pendiente", margin + 150, y + 4);
          }
          doc.setTextColor(40, 40, 40);
          doc.setDrawColor(240, 240, 240);
          doc.line(margin + 2, y + 5.5, pw - margin - 2, y + 5.5);
          y += 6;
        });

        // Final score
        if (r.finalScore !== null) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 51, 102);
          doc.setFontSize(9);
          doc.text(`Nota Final Ponderada: ${r.finalScore}%`, margin + 4, y + 5);
          y += 8;
        }
      } else {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text("Sin evaluaciones configuradas para este curso.", margin + 4, y + 4);
        y += 6;
      }

      y += 4;
    });

    // Footer
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.line(margin, ph - 12, pw - margin, ph - 12);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("Documento generado automáticamente por ENAE TPEMS  |  www.enae.cl", pw / 2, ph - 7, { align: "center" });
  });

  return doc;
}
