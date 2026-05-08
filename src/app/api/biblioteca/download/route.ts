import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

const BUCKET = "biblioteca";

// GET ?document_id=... → returns a short-lived signed URL.
// El alumno debe estar inscrito (registration confirmed/completed) en el curso
// al que pertenece el documento. Los administradores pueden descargar cualquiera.
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");
    if (!documentId) return NextResponse.json({ error: "document_id requerido" }, { status: 400 });

    const { data: doc } = await supabaseAdmin
      .from("course_documents")
      .select("id, course_id, file_url, file_name, is_active")
      .eq("id", documentId)
      .maybeSingle();

    if (!doc || !doc.is_active) {
      return NextResponse.json({ error: "Documento no disponible" }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      // Verify enrollment in this course (any registration in confirmed/completed)
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("id")
        .eq("email", user.email)
        .eq("course_id", doc.course_id)
        .in("status", ["confirmed", "completed"])
        .limit(1)
        .maybeSingle();
      if (!reg) {
        return NextResponse.json({ error: "No estás inscrito en este curso" }, { status: 403 });
      }
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_url, 300, { download: doc.file_name || true });

    if (signedError || !signed) {
      return NextResponse.json({ error: signedError?.message || "Error firmando URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err: any) {
    console.error("[biblioteca/download] error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
