type Page<T> = { data: T[] | null; error: { message: string } | null; count?: number | null };
/** Stable id order + counted pages; never silently accept a capped PostgREST result. */
export async function readAllAdminRows<T>(query: (from: number, to: number) => PromiseLike<Page<T>>, source: string): Promise<T[]> {
  const rows: T[] = [];
  let expected: number | undefined;
  while (rows.length < 100_000) {
    const result = await query(rows.length, rows.length + 499);
    if (result.error || !result.data) throw new Error(`Không đọc được ${source}: ${result.error?.message ?? "nguồn chưa sẵn sàng"}`);
    if (result.count == null) throw new Error(`Không xác nhận được tổng số ${source}.`);
    if (expected !== undefined && expected !== result.count) throw new Error(`${source} vừa thay đổi. Vui lòng tải lại.`);
    expected = result.count;
    rows.push(...result.data);
    if (rows.length === expected) return rows;
    if (rows.length > expected || result.data.length === 0) throw new Error(`Dữ liệu ${source} trả về không đầy đủ.`);
  }
  throw new Error(`Số lượng ${source} vượt giới hạn đọc an toàn.`);
}
