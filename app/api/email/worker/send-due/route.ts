import { NextResponse } from "next/server";

const disabledResponse = () =>
  NextResponse.json(
    {
      ok: false,
      code: "PAYMENT_REMARKETING_DISABLED",
      message: "Legacy payment remarketing is disabled.",
    },
    { status: 410 },
  );

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}
