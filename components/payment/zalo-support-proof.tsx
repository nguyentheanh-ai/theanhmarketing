const zaloProofs = [
  ["zalo-proof-01-agent-plan.webp", "Phản hồi học viên về Agent lập kế hoạch và lên quảng cáo tự động"],
  ["zalo-proof-02-marketing-advice.webp", "Trao đổi hỗ trợ tối ưu nội dung quảng cáo"],
  ["zalo-proof-03-course-feedback.webp", "Phản hồi sau khi học Facebook Ads Master"],
  ["zalo-proof-04-call-34m09.webp", "Cuộc gọi hỗ trợ thực tế 34 phút 9 giây"],
  ["zalo-proof-05-call-55m50.webp", "Cuộc gọi hỗ trợ thực tế 55 phút 50 giây"],
  ["zalo-proof-06-calls-21m59-46m04.webp", "Các cuộc gọi hỗ trợ thực tế với học viên"],
  ["zalo-proof-07-call-30m59.webp", "Cuộc gọi hỗ trợ thực tế 30 phút 59 giây"],
  ["zalo-proof-08-call-36m10.webp", "Cuộc gọi hỗ trợ thực tế 36 phút 10 giây"],
  ["zalo-proof-09-call-22m51.webp", "Cuộc gọi hỗ trợ thực tế 22 phút 51 giây"],
  ["zalo-proof-10-agent-consultation.webp", "Trao đổi tư vấn cách dùng Agent tối ưu quảng cáo"],
  ["zalo-proof-11-call-23m59.webp", "Cuộc gọi hỗ trợ thực tế 23 phút 59 giây"],
  ["zalo-proof-12-support-schedule.webp", "Trao đổi và sắp xếp lịch hỗ trợ học viên"],
] as const;

export function ZaloSupportProof() {
  return (
    <section className="payment-zalo-proof mt-8 overflow-hidden rounded-[28px] border border-blue-100 bg-white py-7 shadow-[0_20px_70px_rgba(0,97,255,0.1)]">
      <div className="px-5 text-center sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Hỗ trợ thực tế</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Học viên được hỗ trợ thật qua Zalo</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
          Đây là các tin nhắn và thời lượng hỗ trợ thật trong quá trình học và triển khai Facebook Ads.
        </p>
      </div>

      <div className="payment-zalo-marquee mt-6" aria-label="Phản hồi và hỗ trợ Zalo thực tế từ học viên">
        <div className="payment-zalo-track">
          <div className="payment-zalo-sequence">
            {zaloProofs.map(([file, alt]) => (
              <figure className="payment-zalo-card" key={file}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={alt} height="1385" loading="lazy" src={`/ladipage/assets/zalo-support/${file}`} width="640" />
              </figure>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .payment-zalo-marquee { overflow-x: auto; overscroll-behavior-inline: contain; scroll-snap-type: x mandatory; width: 100%; }
        .payment-zalo-track { display: block; width: max-content; }
        .payment-zalo-sequence { align-items: stretch; display: flex; gap: 12px; padding: 0 12px; }
        .payment-zalo-card { aspect-ratio: 15 / 32; background: #e9edf6; border: 1px solid #dbeafe; border-radius: 18px; box-shadow: 0 18px 44px rgba(15,23,42,.16); flex: 0 0 auto; overflow: hidden; scroll-snap-align: start; width: 244px; }
        .payment-zalo-card img { display: block; height: 100%; object-fit: cover; object-position: center; width: 100%; }
        @media (min-width: 768px) { .payment-zalo-card { width: 280px; } }
      `}</style>
    </section>
  );
}
