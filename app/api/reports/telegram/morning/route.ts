import { handleTelegramBusinessReportRequest } from "../_shared";

export const runtime = "nodejs";

export function GET(request: Request) {
  return handleTelegramBusinessReportRequest(request, "morning");
}

export function POST(request: Request) {
  return handleTelegramBusinessReportRequest(request, "morning");
}
