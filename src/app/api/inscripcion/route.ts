import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendStudentCredentials } from "@/lib/email";
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
        const password = crypto.randomBytes(4).toString("hex");

        // Create or get auth user
        let userId: string | undefined;
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
              await supabaseAdmin.auth.admin.updateUserById(existing.id, {
                password,
              });
            }
          } else {
            results.push({ email, success: false, error: authError.message });
            continue;
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

        // Create registration
        await supabaseAdmin.from("registrations").insert({
          course_id: courseId,
          session_id: sessionId || null,
          first_name: firstName,
          last_name: lastName,
          email,
          organization: company || null,
          company: company || null,
          theoretical_start: theoreticalStart || null,
          practical_end: practicalEnd || null,
          status: "confirmed",
          grade_status: "pending",
        });

        // Get course name for email
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .single();

        // Send credentials
        try {
          await sendStudentCredentials(
            email,
            password,
            `${firstName} ${lastName}`,
            course?.title || "Curso ENAE"
          );
        } catch {
          // Don't fail if email fails
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
