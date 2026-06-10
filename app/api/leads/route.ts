import { NextResponse } from "next/server";
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
