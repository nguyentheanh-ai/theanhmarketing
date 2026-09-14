import { requireAgentLibraryAccess } from "@/lib/agent-library-access";
import { DOWNLOAD_SLUGS, getAgentDownloadUrl } from "@/lib/agent-library-files";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"};
export async function GET(request: Request, {params}: {params: Promise<{agent: string}>}) {
  const {agent} = await params;
  if (!DOWNLOAD_SLUGS.includes(agent)) return Response.json({message: "Không tìm thấy tài liệu."}, {status: 404, headers});
  try {
    const access = await requireAgentLibraryAccess();
    if (!access.ok) return Response.json({message: access.status === 401 ? "Bạn cần đăng nhập để tải tài liệu." : "Tài khoản chưa có quyền tải bộ Agent."}, {status: access.status, headers});
    const url = await getAgentDownloadUrl(agent);
    if (!url) return Response.json({message: "Không tìm thấy tài liệu."}, {status: 404, headers});
    if (new URL(request.url).searchParams.get("format") === "json") return Response.json({url}, {headers});
    return new Response(null, {status: 302, headers: {...headers, Location: url}});
  } catch {
    return Response.json({message: "Chưa tải được tài liệu. Vui lòng thử lại sau."}, {status: 503, headers});
  }
}
