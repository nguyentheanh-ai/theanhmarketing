import TeamPageClient from "@/components/crm-v2/team-page-client";
import { listCrmV2TeamMembers, normalizeCrmListQuery } from "@/lib/crm-v2/data";

export const metadata = {
  title: "Team & Phân quyền",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2TeamPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const membersResult = await listCrmV2TeamMembers(query);

  // TeamPageClient renders TeamActionButtons for grant/revoke permission actions.
  return <TeamPageClient query={query} membersResult={membersResult} />;
}
