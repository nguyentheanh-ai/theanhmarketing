type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const token = typeof params.token === "string" ? params.token : "";
  const done = params.done === "1";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
      <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">The Anh Marketing</p>
        <h1 className="mt-3 text-3xl font-black">Hủy nhận email marketing</h1>
        {done ? (
          <p className="mt-4 leading-7 text-slate-600">Yêu cầu đã được ghi nhận. Anh/chị sẽ không nhận các email marketing tiếp theo.</p>
        ) : token ? (
          <>
            <p className="mt-4 leading-7 text-slate-600">Xác nhận nếu anh/chị không muốn nhận thêm email marketing từ chúng tôi.</p>
            <form action="/api/email/unsubscribe" method="post" className="mt-6">
              <input name="token" type="hidden" value={token} />
              <button className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white" type="submit">Xác nhận hủy nhận email</button>
            </form>
          </>
        ) : (
          <p className="mt-4 leading-7 text-slate-600">Liên kết unsubscribe không hợp lệ hoặc đã bị thiếu token.</p>
        )}
      </section>
    </main>
  );
}
