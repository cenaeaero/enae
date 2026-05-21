import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendStudentCredentials, sendReturningStudentWelcome } from "@/lib/email";
import { normalizeOrganization } from "@/lib/organization";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const {
      students,
      courseId,
      sessionId,
      theoreticalStart,
      practicalEnd,
      deliveryMode,
      billing,
    } = await request.json();
    const mode: "online" | "presencial" =
      deliveryMode === "presencial" ? "presencial" : "online";

    if (!students || !courseId) {
      return NextResponse.json(
        { error: "students y courseId son requeridos" },
        { status: 400 }
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const student of students) {
      try {
        const { firstName, lastName, email, rut, company: rawCompany } = student;
        const company = normalizeOrganization(rawCompany);
        let isReturningStudent = false;

        // Check if already registered in this course (prevent duplicates)
        const { data: existingReg } = await supabaseAdmin
          .from("registrations")
          .select("id")
          .eq("course_id", courseId)
          .eq("email", email)
          .in("status", ["confirmed", "completed"])
          .maybeSingle();

        if (existingReg) {
          results.push({ email, success: false, error: "Ya está inscrito en este curso" });
          continue;
        }

        // Check if student already exists
        let userId: string | undefined;
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", email)
          .single();

        if (existingProfile?.user_id) {
          // Returning student — DO NOT reset password
          userId = existingProfile.user_id;
          isReturningStudent = true;
        } else {
          // New student — create auth user with temporary password
          const password = crypto.randomBytes(4).toString("hex");

          const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { full_name: `${firstName} ${lastName}` },
            });

          userId = authData?.user?.id;

          if (authError) {
            if (authError.message.includes("already been registered")) {
              const { data: users } =
                await supabaseAdmin.auth.admin.listUsers();
              const existing = users?.users?.find(
                (u: any) => u.email === email
              );
              if (existing) {
                userId = existing.id;
                isReturningStudent = true;
              }
            } else {
              results.push({ email, success: false, error: authError.message });
              continue;
            }
          }

          // Only send credentials email for NEW students
          if (!isReturningStudent) {
            const { data: courseData } = await supabaseAdmin
              .from("courses")
              .select("title")
              .eq("id", courseId)
              .single();

            try {
              await sendStudentCredentials(
                email,
                password,
                `${firstName} ${lastName}`,
                courseData?.title || "Curso ENAE"
              );
            } catch {}
          }
        }

        // Si vino una empresa del wizard, prevalece sobre la del CSV/fila
        const effectiveCompany = billing?.company_name
          ? normalizeOrganization(billing.company_name)
          : company;
        const effectiveCompanyId = billing?.company_id || null;

        // Upsert profile with all available fields
        const profilePayload: Record<string, any> = {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          rut: rut || null,
          organization: effectiveCompany || null,
          company_id: effectiveCompanyId,
          organization_type: student.organizationType || null,
          job_title: student.jobTitle || null,
          phone: student.phone || null,
          secondary_phone: student.secondaryPhone || null,
          address: student.address || null,
          city: student.city || null,
          state: student.state || null,
          postal_code: student.postalCode || null,
          country: student.country || null,
          supervisor_name: student.supervisorName || null,
          supervisor_email: student.supervisorEmail || null,
          role: "student",
        };
        await supabaseAdmin.from("profiles").upsert(profilePayload, { onConflict: "email" });

        // Create registration — try with date columns, fallback without them
        const baseReg: Record<string, any> = {
          course_id: courseId,
          session_id: sessionId || null,
          company_id: effectiveCompanyId,
          first_name: firstName,
          last_name: lastName,
          email,
          organization: effectiveCompany || null,
          company: effectiveCompany || null,
          organization_type: student.organizationType || null,
          job_title: student.jobTitle || null,
          phone: student.phone || null,
          address: student.address || null,
          city: student.city || null,
          state: student.state || null,
          postal_code: student.postalCode || null,
          country: student.country || null,
          supervisor_name: student.supervisorName || null,
          supervisor_email: student.supervisorEmail || null,
          status: mode === "presencial" ? "completed" : "confirmed",
          delivery_mode: mode,
          source: "admin",
        };

        // Try with theoretical_start/practical_end first
        let regResult = await supabaseAdmin.from("registrations").insert({
          ...baseReg,
          theoretical_start: theoreticalStart || null,
          practical_end: practicalEnd || null,
        });

        // If columns don't exist, retry without them
        if (regResult.error && regResult.error.message.includes("schema cache")) {
          console.log("Optional columns not found, retrying with minimal payload...");
          const { delivery_mode: _dm, ...fallback } = baseReg;
          regResult = await supabaseAdmin.from("registrations").insert(fallback);
        }

        if (regResult.error) {
          console.error("Registration insert error:", regResult.error.message);
          results.push({ email, success: false, error: "Error al crear registro: " + regResult.error.message });
          continue;
        }

        // Send welcome-back email for returning students
        if (isReturningStudent) {
          const { data: courseData } = await supabaseAdmin
            .from("courses")
            .select("title")
            .eq("id", courseId)
            .single();

          try {
            await sendReturningStudentWelcome(
              email,
              `${firstName} ${lastName}`,
              courseData?.title || "Curso ENAE"
            );
          } catch {}
        }

        results.push({ email, success: true });
      } catch (err: any) {
        results.push({
          email: student.email,
          success: false,
          error: err?.message,
        });
      }
    }

    // ============================================================
    // Vincular alumnos al billing_case (caso B2B)
    // Modos:
    //  - billing.billing_case_id  → caso existente
    //  - billing.new_quotation_*  → crear caso nuevo
    //  - billing.loose=true       → caso especial con quotation_number=9999
    //  - sin billing              → comportamiento legacy: agrupa por company
    // ============================================================
    try {
      const regIds: string[] = [];
      for (const student of students) {
        const { data: reg } = await supabaseAdmin
          .from("registrations")
          .select("id")
          .eq("email", student.email)
          .eq("course_id", courseId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (reg?.id) regIds.push(reg.id);
      }

      if (regIds.length > 0 && billing) {
        let caseId: string | null = null;

        // Campos opcionales extras (O/C, factura, pago)
        const extras: Record<string, any> = {};
        if (billing.oc_number) { extras.oc_number = billing.oc_number; extras.oc_received_at = new Date().toISOString(); }
        if (billing.invoice_number) extras.invoice_number = billing.invoice_number;
        if (billing.invoice_date)   extras.invoice_date = billing.invoice_date;
        if (billing.invoice_amount != null) extras.invoice_amount = billing.invoice_amount;
        if (billing.payment_received_at) extras.payment_received_at = new Date(billing.payment_received_at).toISOString();
        if (billing.payment_amount != null) extras.payment_amount = billing.payment_amount;

        if (billing.billing_case_id) {
          caseId = billing.billing_case_id;
        } else if (billing.loose && billing.company_id) {
          // Cotización 9999 para alumnos sueltos: una por empresa+sesión
          const { data: existing } = await supabaseAdmin
            .from("billing_cases")
            .select("id")
            .eq("company_id", billing.company_id)
            .eq("quotation_number", "9999")
            .eq("session_id", sessionId || "")
            .maybeSingle();
          if (existing) {
            caseId = existing.id;
          } else {
            const { data: nc } = await supabaseAdmin
              .from("billing_cases")
              .insert({
                company: billing.company_name,
                company_id: billing.company_id,
                course_id: courseId,
                session_id: sessionId || null,
                quotation_number: "9999",
                status: "quoted",
                notes: "Alumnos sueltos",
              })
              .select("id").maybeSingle();
            caseId = nc?.id || null;
          }
        } else if (billing.new_quotation_number && billing.company_id) {
          const { data: nc } = await supabaseAdmin
            .from("billing_cases")
            .insert({
              company: billing.company_name,
              company_id: billing.company_id,
              course_id: courseId,
              session_id: sessionId || null,
              quotation_number: billing.new_quotation_number,
              quotation_amount: billing.new_quotation_amount,
              quotation_date: new Date().toISOString().split("T")[0],
              status: "quoted",
            })
            .select("id").maybeSingle();
          caseId = nc?.id || null;
        }

        if (caseId) {
          // Aplica extras (O/C, factura, pago) si los hay
          if (Object.keys(extras).length > 0) {
            await supabaseAdmin.from("billing_cases").update(extras).eq("id", caseId);
          }
          await supabaseAdmin
            .from("billing_case_registrations")
            .upsert(
              regIds.map((rid) => ({ billing_case_id: caseId!, registration_id: rid })),
              { onConflict: "billing_case_id,registration_id", ignoreDuplicates: true }
            );
        }
      }
    } catch (e) {
      console.error("billing link failed:", e);
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
