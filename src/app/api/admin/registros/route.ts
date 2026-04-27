import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function verifyAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) return null;
  let { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile && user.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("role, id")
      .eq("email", user.email)
      .limit(1);
    if (byEmail?.[0]) {
      profile = byEmail[0];
      await supabaseAdmin.from("profiles").update({ user_id: user.id }).eq("id", byEmail[0].id);
    }
  }
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Fetch all registrations using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, company, organization, delivery_mode, status, created_at, course_id, courses(title)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching registrations:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (err: any) {
    console.error("Admin registros error:", err?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "id y status requeridos" }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "completed", "rejected", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("registrations")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating registration:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin registros PATCH error:", err?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    // Get registration to find related data
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("email, course_id")
      .eq("id", id)
      .single();

    if (!reg) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    // Delete related records
    await supabaseAdmin.from("student_grades").delete().eq("registration_id", id);
    await supabaseAdmin.from("exam_attempts").delete().eq("registration_id", id);
    await supabaseAdmin.from("activity_progress").delete().eq("registration_id", id);
    await supabaseAdmin.from("survey_responses").delete().eq("registration_id", id);
    await supabaseAdmin.from("diplomas").delete().eq("registration_id", id);
    await supabaseAdmin.from("dgac_procedures").delete().eq("registration_id", id);

    // Delete the registration
    const { error } = await supabaseAdmin
      .from("registrations")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin registros DELETE error:", err?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { action, email, password } = await request.json();

    if (action === "reset_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "email y password requeridos" }, { status: 400 });
      }

      // Find the auth user by email
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) {
        return NextResponse.json({ error: listErr.message }, { status: 500 });
      }

      const authUser = users?.find((u: any) => u.email === email);
      if (!authUser) {
        return NextResponse.json({ error: "Usuario no encontrado en auth" }, { status: 404 });
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
      });

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "get_progress") {
      const { registration_id, course_id } = await request.json();
      // This is handled in the frontend via direct Supabase queries
      return NextResponse.json({ error: "Use direct queries" }, { status: 400 });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin registros PUT error:", err?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
