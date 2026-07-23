// Zoom Server-to-Server OAuth integration

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID!;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getZoomAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom OAuth failed: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

export async function createZoomMeeting(options: {
  topic: string;
  start_time: string; // ISO 8601
  duration: number; // minutes
}): Promise<{
  id: number;
  join_url: string;
  start_url: string;
  password: string;
}> {
  const token = await getZoomAccessToken();

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: options.topic,
      type: 2, // Scheduled meeting
      start_time: options.start_time,
      duration: options.duration,
      timezone: "America/Santiago",
      settings: {
        join_before_host: true,
        waiting_room: false,
        auto_recording: "none",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom create meeting failed: ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    join_url: data.join_url,
    start_url: data.start_url,
    password: data.password || "",
  };
}

// Extrae el ID de reunión desde una URL de Zoom (…/j/1234567890?pwd=…) o
// devuelve el valor si ya es un ID numérico. null si no se reconoce.
export function extractZoomMeetingId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();
  if (/^\d{9,12}$/.test(s)) return s;
  const m = s.match(/\/j\/(\d{9,12})/) || s.match(/[?&]confno=(\d{9,12})/) || s.match(/(\d{9,12})/);
  return m ? m[1] : null;
}

// Preasigna salas de grupos (breakout rooms) en una reunión Zoom ya creada.
// rooms: [{ name, participants: [emails] }]. Requiere que la cuenta Zoom
// tenga habilitada la función de breakout con preasignación por API.
export async function setBreakoutRooms(
  meetingId: string,
  rooms: { name: string; participants: string[] }[],
): Promise<void> {
  const token = await getZoomAccessToken();
  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      settings: {
        breakout_room: {
          enable: true,
          rooms: rooms.map((r) => ({ name: r.name, participants: r.participants })),
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom breakout rooms failed: ${err}`);
  }
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  const token = await getZoomAccessToken();

  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Zoom delete meeting failed: ${err}`);
  }
}
