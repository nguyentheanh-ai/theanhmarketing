import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { recordStudentPresence } from "@/lib/cloudflare/student-presence";

const headers = { "Cache-Control": "private, no-store" };

// Heartbeat from open student pages (about once a minute while visible).
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403, headers });
  const { user } = await getCurrentAuth();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401, headers });
  const body = (await request.json().catch(() => ({}))) as { path?: unknown };
  const metadata = (user.user_metadata ?? {}) as { full_name?: unknown };
  try {
    const recorded = await recordStudentPresence({ userId: user.id, email: user.email, name: typeof metadata.full_name === "string" ? metadata.full_name : null, path: body.path });
    return NextResponse.json({ ok: true, recorded }, { headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
