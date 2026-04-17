import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendStudentCredentials, sendReturningStudentWelcome } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { students, courseId, sessionId, theoreticalStart, practicalEnd } =
      await request.json();

    if (!students || !courseId) {
      return NextResponse.json(
        { error: "students y courseId son requeridos" },
        { status: 400 }
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const student of students) {
      try {
        const { firstName, lastName, email, rut, company } = student;
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

        // Upsert profile
        await supabaseAdmin.from("profiles").upsert(
          {
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            email,
            rut: rut || null,
            organization: company || null,
            role: "student",
          },
          { onConflict: "email" }
        );

        // Create registration — try with date columns, fallback without them
        const baseReg: Record<string, any> = {
          course_id: courseId,
          session_id: sessionId || null,
          first_name: firstName,
          last_name: lastName,
          email,
          organization: company || null,
          phone: student.phone || null,
          address: student.address || null,
          status: "confirmed",
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
          console.log("Date columns not found, retrying without them...");
          regResult = await supabaseAdmin.from("registrations").insert(baseReg);
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

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
