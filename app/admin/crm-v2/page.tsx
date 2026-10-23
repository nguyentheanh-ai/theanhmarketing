import { requireAdminAuth } from "@/lib/auth/session";
import { Suspense } from "react";
import { AnalyticsPage } from "@/components/crm-v2/analytics-page";
import { ProductPulse } from "@/components/crm-v2/product-pulse";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminAuth("/admin/crm-v2", ["owner"]);
  return <div className="space-y-4"><Suspense fallback={null}><ProductPulse /></Suspense><AnalyticsPage params={await searchParams} report={false} /></div>;
}
