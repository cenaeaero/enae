import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import {
  sendStudentCredentials,
  sendAdminRegistrationNotification,
} from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      courseId,
      courseTitle,
      courseCode,
      sessionDates,
      title,
      firstName,
      lastName,
      email,
      ageGroup,
      jobTitle,
      organization,
      organizationType,
      supervisorName,
      supervisorEmail,
      address,
      city,
      state,
      postalCode,
      country,
      phone,
      secondaryPhone,
      billingName,
      billingAddress,
      billingCity,
      billingCountry,
      howFound,
      comments,
    } = body;

    // 0. Resolve course UUID first — needed to check duplicate registrations
    let resolvedCourseId = courseId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    if (!isUuid) {
      // Try matching by code first, then by title
      let courseMatch = null;
      if (courseCode) {
        const { data } = await supabaseAdmin
          .from("courses")
          .select("id")
          .eq("code", courseCode)
          .single();
        courseMatch = data;
      }
      if (!courseMatch && courseTitle) {
        const { data } = await supabaseAdmin
          .from("courses")
          .select("id")
          .eq("title", courseTitle)
          .single();
        courseMatch = data;
      }
      if (courseMatch) {
        resolvedCourseId = courseMatch.id;
      } else {
        return NextResponse.json(
          { error: "Curso no encontrado en la base de datos." },
          { status: 400 }
        );
      }
    }

    // 1. Check if student already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", email)
      .single();

    if (existingProfile?.user_id) {
      // Student already has an account — check if already registered for this course
      const { data: existingReg } = await supabaseAdmin
        .from("registrations")
        .select("id")
        .eq("email", email)
        .eq("course_id", resolvedCourseId)
        .single();

      if (existingReg) {
        return NextResponse.json({
          existingStudent: true,
          alreadyCourseRegistered: true,
          message:
            "Ya estas registrado en este curso. Ingresa al portal de alumnos para ver tu inscripcion.",
        });
      }

      return NextResponse.json({
        existingStudent: true,
        message:
          "Ya tienes una cuenta en ENAE. Ingresa al portal de alumnos para adquirir este curso desde la seccion Cursos Disponibles.",
      });
    }

    // 2. New student — create auth user with temporary password
    const password = crypto.randomBytes(4).toString("hex"); // 8 char hex

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `${firstName} ${lastName}`,
        },
      });

    let userId = authData?.user?.id;

    if (authError) {
      if (authError.message.includes("already been registered")) {
        // Auth user exists but no profile — get their ID (edge case)
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        if (existingUser) {
          userId = existingUser.id;
          // Update password only for users without a profile (orphaned auth)
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
          });
        }
      } else {
        return NextResponse.json(
          { error: "Error al crear usuario: " + authError.message },
          { status: 400 }
        );
      }
    }

    // 3. Create profile with must_change_password = true
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          title,
          first_name: firstName,
          last_name: lastName,
          email,
          job_title: jobTitle,
          organization,
          organization_type: organizationType,
          supervisor_name: supervisorName,
          supervisor_email: supervisorEmail,
          address,
          city,
          state,
          postal_code: postalCode,
          country: country || "Chile",
          phone,
          secondary_phone: secondaryPhone,
          role: "student",
          must_change_password: true,
        },
        { onConflict: "email" }
      );

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // 4. Resolve session UUID
    let resolvedSessionId = null;
    if (sessionDates && resolvedCourseId) {
      const { data: sessionMatch } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("course_id", resolvedCourseId)
        .eq("dates", sessionDates)
        .single();
      if (sessionMatch) {
        resolvedSessionId = sessionMatch.id;
      } else {
        // Fallback: get first active session for this course
        const { data: firstSession } = await supabaseAdmin
          .from("sessions")
          .select("id")
          .eq("course_id", resolvedCourseId)
          .eq("is_active", true)
          .limit(1)
          .single();
        if (firstSession) resolvedSessionId = firstSession.id;
      }
    }

    // 5. Create registration
    const { data: registration, error: regError } = await supabaseAdmin
      .from("registrations")
      .insert({
        course_id: resolvedCourseId,
        session_id: resolvedSessionId,
        first_name: firstName,
        last_name: lastName,
        email,
        title,
        age_group: ageGroup,
        job_title: jobTitle,
        organization,
        organization_type: organizationType,
        supervisor_name: supervisorName,
        supervisor_email: supervisorEmail,
        address,
        city,
        state,
        postal_code: postalCode,
        country: country || "Chile",
        phone,
        billing_name: billingName,
        billing_address: billingAddress,
        billing_city: billingCity,
        billing_country: billingCountry,
        how_found: howFound,
        comments,
        status: "pending",
      })
      .select()
      .single();

    if (regError) {
      return NextResponse.json(
        { error: "Error al crear registro: " + regError.message },
        { status: 400 }
      );
    }

    // 6. Get course name for emails
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", resolvedCourseId)
      .single();

    const courseName = course?.title || "Curso ENAE";
    const studentName = `${firstName} ${lastName}`;

    // 7. Send emails (don't fail the request if email fails)
    try {
      await sendStudentCredentials(email, password, studentName, courseName);
    } catch (e) {
      console.error("Failed to send student email:", e);
    }

    try {
      await sendAdminRegistrationNotification(studentName, email, courseName);
    } catch (e) {
      console.error("Failed to send admin email:", e);
    }

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
