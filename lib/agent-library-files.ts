import catalog from "@/data/agent-library-packages.json";
import resources from "@/data/agent-library-resources.json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const AGENT_SLUGS = ["business-assistant", "market-customer-research", "marketing", "content", "design", "video", "web-landing", "ads-setup", "ads-report", "facebook-publisher"] as const;
export const DOWNLOAD_SLUGS: readonly string[] = [...AGENT_SLUGS, ...resources.resources.map(resource => resource.slug)];
export async function getAgentDownloadUrl(slug: string) {
  if (!DOWNLOAD_SLUGS.includes(slug)) return null;
  const entry = resources.resources.find(resource => resource.slug === slug) ?? catalog.agents.find(agent => agent.slug === `${slug}-agent`);
  const filenamePattern = slug === "setup-prompt" ? /^[a-zA-Z0-9._-]+\.txt$/ : /^[a-zA-Z0-9._-]+\.zip$/;
  if (!entry || !filenamePattern.test(entry.filename) || !/^[a-zA-Z0-9._-]+$/.test(entry.version)) throw new Error("Package unavailable");
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Storage unavailable");
  const bucket = await client.storage.getBucket("agent-library-private");
  if (bucket.error || !bucket.data || bucket.data.public !== false) throw new Error("Private storage unavailable");
  const {data, error} = await client.storage.from("agent-library-private").createSignedUrl(`${entry.version}/${entry.filename}`, 120, {download: entry.filename});
  if (error || !data?.signedUrl) throw new Error("Package unavailable");
  return data.signedUrl;
}
