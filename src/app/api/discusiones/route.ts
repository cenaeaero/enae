import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// GET: Fetch discussion thread + posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("thread_id");
    const activityId = searchParams.get("activity_id");

    let thread: any = null;
    if (threadId) {
      const { data } = await supabaseAdmin.from("discussion_threads").select("*").eq("id", threadId).single();
      thread = data;
    } else if (activityId) {
      const { data } = await supabaseAdmin.from("discussion_threads").select("*").eq("activity_id", activityId).single();
      thread = data;
    }

    if (!thread) return NextResponse.json({ thread: null, posts: [] });

    const { data: posts } = await supabaseAdmin
      .from("discussion_posts")
      .select("*, registrations(first_name, last_name)")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      thread,
      posts: (posts || []).map((p: any) => ({
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        author: `${p.registrations?.first_name || ""} ${p.registrations?.last_name || ""}`.trim(),
        registration_id: p.registration_id,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Add a post to a discussion thread
export async function POST(request: Request) {
  try {
    const { thread_id, registration_id, content } = await request.json();

    if (!thread_id || !registration_id || !content?.trim()) {
      return NextResponse.json({ error: "thread_id, registration_id y content requeridos" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("discussion_posts")
      .insert({ thread_id, registration_id, content: content.trim() })
      .select("*, registrations(first_name, last_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      post: {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        author: `${data.registrations?.first_name || ""} ${data.registrations?.last_name || ""}`.trim(),
        registration_id: data.registration_id,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
