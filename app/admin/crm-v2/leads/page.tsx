import LeadsPageClient from "@/components/crm-v2/leads-page-client";
import { getCrmV2LeadStageSummary, listCrmV2UnifiedCustomers, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import type { CrmListQuery, CrmUnifiedCustomerRow } from "@/lib/crm-v2/types";
import { getCourses } from "@/services/courseService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads & Pipeline",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2LeadsPage({ searchParams }: PageProps) {
  const query: CrmListQuery = normalizeCrmListQuery(await searchParams);
  const [leads, stageRows, courses] = await Promise.all([listCrmV2UnifiedCustomers(query), getCrmV2LeadStageSummary(), getCourses()]);
  const rows: CrmUnifiedCustomerRow[] = leads.rows;
  const courseOptions = courses
    .filter((course) => course.slug && course.title)
    .map((course) => ({
      label: course.title,
      value: course.slug,
    }));

  return (
    <LeadsPageClient
      courseOptions={courseOptions}
      query={query}
      rows={rows}
      page={leads.page}
      pageSize={leads.pageSize}
      total={leads.total}
      pageCount={leads.pageCount}
      stageRows={stageRows}
    />
  );
}
