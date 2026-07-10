import AutomationPageClient from "@/components/crm-v2/automation-page-client";
import { listCrmV2AutomationWorkflows, normalizeCrmListQuery } from "@/lib/crm-v2/data";

export const metadata = {
  title: "Automation Workflow",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2AutomationPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const workflowsResult = await listCrmV2AutomationWorkflows(query);

  // AutomationPageClient renders Automation Workflow with WorkflowBuilder and WorkflowRecipePanel.
  return <AutomationPageClient query={query} workflowsResult={workflowsResult} />;
}
