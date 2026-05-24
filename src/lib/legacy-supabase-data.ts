import "server-only";

import { emptyAdminDataset } from "./empty-dataset";
import {
  buildAdminDatasetFromLegacy,
  type LegacyActivityLogRow,
  type LegacyAutomationFlowRow,
  type LegacyClickEventRow,
  type LegacyCourseRow,
  type LegacyLeadRow,
  type LegacyOrderRow,
} from "./legacy-data-mapper";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase/admin";

async function safeSelect<T>(label: string, query: () => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>) {
  try {
    const { data, error } = await query();

    if (error) {
      console.warn(`[admin-data] Skipping ${label}: ${error.message ?? "unknown Supabase error"}`);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.warn(`[admin-data] Skipping ${label}:`, error instanceof Error ? error.message : "unknown error");
    return [];
  }
}

async function getCourses() {
  const supabase = getSupabaseAdminClient();
  const nested = await safeSelect<LegacyCourseRow>("courses nested modules", () =>
    supabase
      .from("courses")
      .select("id,slug,title,price,status,lesson_count,course_modules(lessons(id))")
      .limit(500),
  );

  if (nested.length > 0) {
    return nested;
  }

  return safeSelect<LegacyCourseRow>("courses", () =>
    supabase.from("courses").select("id,slug,title,price,status,lesson_count").limit(500),
  );
}

export async function loadAdminDataset() {
  if (!hasSupabaseAdminEnv()) {
    return emptyAdminDataset;
  }

  const supabase = getSupabaseAdminClient();
  const [courses, leads, orders, clickEvents, activityLogs, automationFlows] = await Promise.all([
    getCourses(),
    safeSelect<LegacyLeadRow>("leads", () =>
      supabase.from("leads").select("id,name,phone,email,message,source,created_at").order("created_at", { ascending: false }).limit(500),
    ),
    safeSelect<LegacyOrderRow>("orders", () =>
      supabase
        .from("orders")
        .select("id,order_code,student_name,email,phone,course_slug,course_title,amount,status,payment_method,created_at,paid_at,order_items")
        .order("created_at", { ascending: false })
        .limit(500),
    ),
    safeSelect<LegacyClickEventRow>("click_events", () =>
      supabase.from("click_events").select("*").order("created_at", { ascending: false }).limit(1000),
    ),
    safeSelect<LegacyActivityLogRow>("activity_logs", () =>
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
    ),
    safeSelect<LegacyAutomationFlowRow>("automation_flows", () =>
      supabase.from("automation_flows").select("*").order("created_at", { ascending: false }).limit(100),
    ),
  ]);

  return buildAdminDatasetFromLegacy({
    courses,
    leads,
    orders,
    clickEvents,
    activityLogs,
    automationFlows,
  });
}
