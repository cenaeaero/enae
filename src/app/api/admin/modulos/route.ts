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

// GET: Load modules + activities for a course
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");
    if (!courseId) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });

    const { data: modules, error } = await supabaseAdmin
      .from("course_modules")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Load activities for each module
    const moduleIds = (modules || []).map((m: any) => m.id);
    let activities: any[] = [];
    if (moduleIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("module_activities")
        .select("*")
        .in("module_id", moduleIds)
        .order("sort_order");
      activities = data || [];
    }

    // Load reading materials for modules
    let materials: any[] = [];
    if (moduleIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("reading_materials")
        .select("*")
        .in("module_id", moduleIds)
        .order("sort_order");
      materials = data || [];
    }

    return NextResponse.json({
      modules: (modules || []).map((m: any) => ({
        ...m,
        module_activities: activities.filter((a: any) => a.module_id === m.id),
        module_materials: materials.filter((mat: any) => mat.module_id === m.id),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Create module
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { course_id, title, objectives, video_entry_id, video_title, sort_order } = body;

    const { data, error } = await supabaseAdmin
      .from("course_modules")
      .insert({ course_id, title, objectives, video_entry_id, video_title, sort_order: sort_order || 0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ module: data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT: Update module
export async function PUT(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await supabaseAdmin.from("course_modules").update(fields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE: Delete module
export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await supabaseAdmin.from("course_modules").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
