import { after, NextResponse } from "next/server";
import { sendMetaLeadEvent } from "@/lib/meta/conversions-api";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { createLeadAdmin } from "@/services/leadService";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      message?: string;
      source?: string;
      attribution?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmId?: string;
        utmTerm?: string;
        campaignId?: string;
        campaignName?: string;
        adsetId?: string;
        adId?: string;
        adName?: string;
        fbclid?: string;
        fbc?: string;
        fbp?: string;
        landingPage?: string;
      };
    };

    const name = cleanText(body.name, 120);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const message = cleanText(body.message, 1000);
    const source = cleanText(body.source, 80) || "Website";
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
    const ipAddress =
      request.headers.get("cf-connecting-ip") ?? forwardedFor.split(",")[0]?.trim() ?? "";
    const userAgent = request.headers.get("user-agent") ?? "";

    if (!name || !phone || !email || !isValidPhone(phone) || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên, số điện thoại hoặc email hợp lệ." },
        { status: 400 },
      );
    }

    const result = await createLeadAdmin({ name, phone, email, message, source, attribution: body.attribution });

    if (!result.ok || !result.lead?.id) {
      return NextResponse.json({ ok: false, message: result.error ?? "Chưa lưu được lead." }, { status: 500 });
    }

    invalidateAdminModules(["leads", "students"]);

    after(async () => {
      try {
        const metaLead = await sendMetaLeadEvent({
          eventId: result.lead.id,
          leadId: result.lead.id,
          studentName: name,
          email,
          phone,
          courseTitle: source,
          pageUrl: cleanText(body.attribution?.landingPage, 500),
          landingPage: cleanText(body.attribution?.landingPage, 500),
          utmSource: cleanText(body.attribution?.utmSource, 120),
          utmMedium: cleanText(body.attribution?.utmMedium, 120),
          utmCampaign: cleanText(body.attribution?.utmCampaign, 160),
          utmContent: cleanText(body.attribution?.utmContent, 160),
          utmId: cleanText(body.attribution?.utmId, 160),
          utmTerm: cleanText(body.attribution?.utmTerm, 160),
          campaignId: cleanText(body.attribution?.campaignId, 120),
          campaignName: cleanText(body.attribution?.campaignName, 200),
          adsetId: cleanText(body.attribution?.adsetId, 120),
          adId: cleanText(body.attribution?.adId, 120),
          adName: cleanText(body.attribution?.adName, 200),
          fbclid: cleanText(body.attribution?.fbclid, 220),
          fbp: cleanText(body.attribution?.fbp, 180),
          fbc: cleanText(body.attribution?.fbc, 220),
          ipAddress,
          userAgent,
        });

        if (!metaLead.ok && !metaLead.skipped) {
          console.warn("[leads] Meta Lead event failed:", {
            reason: metaLead.reason,
            status: metaLead.status,
          });
        }
      } catch (metaError) {
        console.warn("[leads] Meta Lead event failed:", metaError);
      }
    });

    return NextResponse.json({
      ok: true,
      lead: result.lead,
      sheetSync: result.sheetSync,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không lưu được lead." },
      { status: 500 },
    );
  }
}
