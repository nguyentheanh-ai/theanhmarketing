import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getDatabaseHealth } from "@/services/databaseHealthService";

export default async function AdminDatabasePage() {
  const health = await getDatabaseHealth();

  return (
    <ProtectedAdminShell nextPath="/admin/database">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Supabase</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Kiểm tra database.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Trang này kiểm tra kết nối Supabase và các bảng cần có cho website.
          Nếu bảng chưa tồn tại, public website vẫn fallback về mock data.
        </p>

        <SoftCard className="mt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#c77b20]">Trạng thái</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                {health.ok ? "Supabase đã sẵn sàng." : "Supabase chưa sẵn sàng."}
              </h2>
            </div>
            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                health.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {health.hasEnv ? "ENV đã có" : "Thiếu ENV"}
            </span>
          </div>
          {!health.ok ? (
            <p className="mt-4 max-w-3xl leading-8 text-black/60">
              Hãy chạy SQL trong file `docs/DATABASE_SETUP.md` bằng Supabase SQL
              Editor, sau đó tải lại trang này.
            </p>
          ) : null}
        </SoftCard>

        <section className="mt-5 grid gap-4">
          {health.tables.map((table) => (
            <SoftCard key={table.table}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-black">{table.table}</p>
                  <p className="mt-2 text-sm leading-6 text-black/55">
                    {table.ok
                      ? `Bảng hoạt động. Số dòng: ${table.count ?? 0}.`
                      : table.error}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                    table.ok
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {table.ok ? "OK" : "Cần setup"}
                </span>
              </div>
            </SoftCard>
          ))}
        </section>
      </div>
    </ProtectedAdminShell>
  );
}
