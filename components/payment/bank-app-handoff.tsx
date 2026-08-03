"use client";

import {
  buildVietQrBankAppUrl,
  type VietQrBankApp,
} from "@/lib/payments/bank-app-handoff";

type BankAppHandoffProps = {
  requested: boolean;
  apps: VietQrBankApp[];
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  amount: number;
  transferContent: string;
  returnUrl: string;
};

export function BankAppHandoff({
  requested,
  apps,
  bankCode,
  bankAccountNumber,
  bankAccountName,
  amount,
  transferContent,
  returnUrl,
}: BankAppHandoffProps) {
  if (!requested) return null;

  const links = apps.flatMap((app) => {
    try {
      return [{
        ...app,
        href: buildVietQrBankAppUrl({
          appId: app.appId,
          bankCode,
          bankAccountNumber,
          bankAccountName,
          amount,
          transferContent,
          returnUrl,
        }),
      }];
    } catch {
      return [];
    }
  });

  return (
    <section className="mt-5 rounded-[26px] border-2 border-blue-200 bg-gradient-to-br from-blue-600 to-cyan-500 p-5 text-white shadow-[0_18px_50px_rgba(0,97,255,0.22)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
        Thanh toán trên điện thoại
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">
        Chọn app ngân hàng bạn đang dùng
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-blue-50">
        Chạm vào app để chuyển sang màn hình thanh toán. Hãy kiểm tra lại người nhận,
        số tiền và nội dung trước khi xác nhận trong ứng dụng ngân hàng.
      </p>

      {links.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((app) => (
            <a
              className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-50"
              href={app.href}
              key={app.appId}
            >
              {app.appName}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-white/12 px-4 py-3 text-sm font-bold text-white">
          Thiết bị này chưa có danh sách app tương thích.
        </p>
      )}

      <p className="mt-4 text-xs font-bold leading-5 text-blue-50">
        Không mở được app? Mã VietQR và nút copy thông tin chuyển khoản vẫn ở ngay bên dưới.
      </p>
    </section>
  );
}
