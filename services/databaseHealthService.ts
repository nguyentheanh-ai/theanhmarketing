import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DatabaseTableHealth = {
  table: string;
  ok: boolean;
  count: number | null;
  sampleRows: number;
  error: string | null;
};

export type DatabaseHealth = {
  hasEnv: boolean;
  ok: boolean;
  tables: DatabaseTableHealth[];
};

const requiredTables = [
  "courses",
  "course_modules",
  "lessons",
  "lesson_resources",
  "lesson_comments",
  "resources",
  "leads",
  "testimonials",
  "blog_posts",
  "site_settings",
];

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      hasEnv: false,
      ok: false,
      tables: requiredTables.map((table) => ({
        table,
        ok: false,
        count: null,
        sampleRows: 0,
        error: "Missing Supabase environment variables",
      })),
    };
  }

  const tables = await Promise.all(
    requiredTables.map(async (table) => {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .limit(1);

      return {
        table,
        ok: !error,
        count: count ?? null,
        sampleRows: data?.length ?? 0,
        error: error?.message ?? null,
      };
    }),
  );

  return {
    hasEnv: true,
    ok: tables.every((table) => table.ok),
    tables,
  };
}
