import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanText } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { addLeadNote, getLeadNotes } from "@/services/leadNoteService";

async function requireOwner() {
  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole, user } = await getCurrentAuth();
    if (!canAccessAdminRole(adminRole, ["owner"])) return { ok: false as const, email: null };
    return { ok: true as const, email: user?.email ?? null };
  }

  return { ok: true as const, email: null };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit({ key: rateLimitKey(request, "admin:leads:notes"), limit: 120, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ ok: false, message: "Bạn không có quyền xem ghi chú." }, { status: 403 });
  const { id } = await params;
  return NextResponse.json({ ok: true, notes: await getLeadNotes(id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit({ key: rateLimitKey(request, "admin:leads:notes:add"), limit: 60, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ ok: false, message: "Bạn không có quyền thêm ghi chú." }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as { content?: string };
  const content = cleanText(body.content, 3000);

  if (!id || content.length < 2) {
    return NextResponse.json({ ok: false, message: "Ghi chú không hợp lệ." }, { status: 400 });
  }

  const result = await addLeadNote({ leadId: id, content, actorEmail: owner.email });
  if (!result.ok) return NextResponse.json({ ok: false, message: result.error }, { status: 500 });

  invalidateAdminModules(["leads", "activities"]);
  return NextResponse.json({ ok: true, note: result.note, updatedAt: result.updatedAt });
}
