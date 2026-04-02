import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createZoomMeeting, deleteZoomMeeting } from "@/lib/zoom";

// POST: Create Zoom meeting for an activity
export async function POST(request: Request) {
  try {
    const { activity_id, topic, start_time, duration_minutes } = await request.json();

    if (!activity_id || !topic || !start_time) {
      return NextResponse.json({ error: "activity_id, topic y start_time requeridos" }, { status: 400 });
    }

    const meeting = await createZoomMeeting({
      topic,
      start_time,
      duration: duration_minutes || 60,
    });

    const { data, error } = await supabaseAdmin
      .from("zoom_meetings")
      .upsert({
        activity_id,
        zoom_meeting_id: String(meeting.id),
        topic,
        start_time,
        duration_minutes: duration_minutes || 60,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password,
        status: "scheduled",
      }, { onConflict: "activity_id" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ meeting: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al crear reunion Zoom" }, { status: 500 });
  }
}

// DELETE: Delete Zoom meeting
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("activity_id");
    if (!activityId) return NextResponse.json({ error: "activity_id requerido" }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("zoom_meetings")
      .select("zoom_meeting_id")
      .eq("activity_id", activityId)
      .single();

    if (existing?.zoom_meeting_id) {
      await deleteZoomMeeting(existing.zoom_meeting_id).catch(() => {});
    }

    await supabaseAdmin.from("zoom_meetings").delete().eq("activity_id", activityId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
