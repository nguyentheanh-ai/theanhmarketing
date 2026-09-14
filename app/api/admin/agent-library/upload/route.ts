import catalog from "@/data/agent-library-packages.json";
import resources from "@/data/agent-library-resources.json";
import { getCurrentAuth } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"private, no-store", "Vary":"Cookie", "Referrer-Policy":"no-referrer"};
export async function POST(request: Request) {
  const {user, adminRole} = await getCurrentAuth();
  if (!user) return Response.json({message:"Cần đăng nhập."},{status:401,headers});
  if (adminRole !== "owner") return Response.json({message:"Chỉ chủ tài khoản được tải gói lên."},{status:403,headers});
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({message:"Nguồn yêu cầu không hợp lệ."},{status:403,headers});
  const body = await request.json().catch(()=>null);
  const entry = [...catalog.agents,...resources.resources].find(item=>item.slug===body?.slug);
  if (!entry) return Response.json({message:"Agent không hợp lệ."},{status:400,headers});
  if (body.action !== "upload" && body.action !== "verify") return Response.json({message:"Thao tác không hợp lệ."},{status:400,headers});
  try {
    const client = createSupabaseAdminClient();
    if (!client) throw new Error("Unavailable");
    const bucketName = "agent-library-private";
    let bucket = await client.storage.getBucket(bucketName);
    if (bucket.error && String((bucket.error as {status?:number;statusCode?:string}).statusCode ?? (bucket.error as {status?:number}).status) === "404") {
      const created = await client.storage.createBucket(bucketName,{public:false,fileSizeLimit:52428800,allowedMimeTypes:["application/zip","application/x-zip-compressed","text/plain"]});
      if (created.error) throw created.error;
      bucket = await client.storage.getBucket(bucketName);
    }
    if (bucket.error || !bucket.data || bucket.data.public !== false) throw new Error("Private bucket required");
    const objectPath = `${entry.version}/${entry.filename}`;
    if (body.action === "verify") {
      const signed = await client.storage.from(bucketName).createSignedUrl(objectPath,120);
      if (signed.error || !signed.data?.signedUrl) throw new Error("Missing");
      return Response.json({url:signed.data.signedUrl},{headers});
    }
    if (body.action !== "upload") return Response.json({message:"Thao tác không hợp lệ."},{status:400,headers});
    const signed = await client.storage.from(bucketName).createSignedUploadUrl(objectPath,{upsert:false});
    if (signed.error || !signed.data?.signedUrl) throw new Error("Unavailable");
    return Response.json({url:signed.data.signedUrl},{headers});
  } catch { return Response.json({message:"Chưa thao tác được kho riêng. Kiểm tra gói hoặc thử lại."},{status:503,headers}); }
}
