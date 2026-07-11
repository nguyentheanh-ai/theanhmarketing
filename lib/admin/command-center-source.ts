import type { CommandCenterRange } from "@/lib/admin/solo-command-center";

export const COMMAND_CENTER_PAGE_SIZE = 500;
export const MAX_COMMAND_CENTER_SOURCE_ROWS = 10_000;

export type CommandCenterAnalysisWindow = {
  analysisFrom: string;
  analysisToExclusive: string;
  stalePendingBefore: string;
};

export type CommandCenterProviderContext = {
  range: CommandCenterRange;
  window: CommandCenterAnalysisWindow;
};

function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("Invalid command-center date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("Invalid command-center date");
  }
  return date;
}

function addDateKeyDays(value: string, days: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCommandCenterAnalysisWindow(
  range: CommandCenterRange,
  generatedAt = new Date(),
): CommandCenterAnalysisWindow {
  const from = parseDateKey(range.from);
  const to = parseDateKey(range.to);
  const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (inclusiveDays < 1) throw new RangeError("Invalid command-center range");
  const generatedTime = generatedAt.getTime();
  if (!Number.isFinite(generatedTime)) throw new RangeError("Invalid command-center generated time");

  return {
    analysisFrom: `${addDateKeyDays(range.from, -inclusiveDays)}T00:00:00+07:00`,
    analysisToExclusive: `${addDateKeyDays(range.to, 1)}T00:00:00+07:00`,
    stalePendingBefore: new Date(generatedTime - 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function collectCommandCenterPages<T>({
  fetchPage,
  getId,
  pageSize = COMMAND_CENTER_PAGE_SIZE,
  maxRows = MAX_COMMAND_CENTER_SOURCE_ROWS,
}: {
  fetchPage: (page: { offset: number; limit: number }) => Promise<{ rows: T[]; hasMore: boolean }>;
  getId: (row: T) => string;
  pageSize?: number;
  maxRows?: number;
}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maxRows) || maxRows < 1) {
    throw new RangeError("Invalid command-center pagination bounds");
  }

  const byId = new Map<string, T>();
  let offset = 0;
  let fetchedRows = 0;

  while (true) {
    const limit = Math.min(pageSize, maxRows - fetchedRows);
    if (limit < 1) throw new Error("Command center source is incomplete at the safety cap");
    const page = await fetchPage({ offset, limit });
    if (!page || !Array.isArray(page.rows) || typeof page.hasMore !== "boolean") {
      throw new Error("Command center source returned an invalid page");
    }
    fetchedRows += page.rows.length;
    if (fetchedRows > maxRows) throw new Error("Command center source is incomplete at the safety cap");
    for (const row of page.rows) {
      const id = getId(row);
      if (!id) throw new Error("Command center source row has no stable id");
      if (!byId.has(id)) byId.set(id, row);
    }
    if (!page.hasMore) return [...byId.values()];
    if (page.rows.length === 0 || fetchedRows >= maxRows) {
      throw new Error("Command center source is incomplete at the safety cap");
    }
    offset += page.rows.length;
  }
}
