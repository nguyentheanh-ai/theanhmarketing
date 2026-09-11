import catalog from "@/data/agent-library-packages.json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const AGENT_SLUGS = ["business-assistant", "market-customer-research", "marketing", "content", "design", "video", "web-landing", "ads-setup", "ads-report", "facebook-publisher"] as const;
export async function getAgentDownloadUrl(slug: string) {
  if (!(AGENT_SLUGS as readonly string[]).includes(slug)) return null;
  const entry = catalog.agents.find(agent => agent.slug === `${slug}-agent`);
  if (!entry || !/^[a-zA-Z0-9._-]+\.zip$/.test(entry.filename) || !/^[a-zA-Z0-9._-]+$/.test(entry.version)) throw new Error("Package unavailable");
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Storage unavailable");
  const bucket = await client.storage.getBucket("agent-library-private");
  if (bucket.error || !bucket.data || bucket.data.public !== false) throw new Error("Private storage unavailable");
  const {data, error} = await client.storage.from("agent-library-private").createSignedUrl(`${entry.version}/${entry.filename}`, 120, {download: entry.filename});
  if (error || !data?.signedUrl) throw new Error("Package unavailable");
  return data.signedUrl;
}
