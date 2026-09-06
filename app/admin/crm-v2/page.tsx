import { requireAdminAuth } from "@/lib/auth/session";
import { AnalyticsPage } from "@/components/crm-v2/analytics-page";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminAuth("/admin/crm-v2", ["owner"]);
  return <AnalyticsPage params={await searchParams} report={false} />;
}
