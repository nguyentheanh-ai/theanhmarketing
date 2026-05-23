import { AdminPageHeader, AdminPanel, EmptyState, StatusBadge, TextLink } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { formatAdminDate } from "@/lib/admin/crm-dashboard";
import {
  buildRemarketingDashboardModel,
  formatVndCompact,
  type RemarketingContact,
} from "@/lib/admin/remarketing-dashboard";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";

function cleanPhoneForLink(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0")) {
    return `84${digits.slice(1)}`;
  }

  return digits;
}

function contactLinks(contact: RemarketingContact) {
  const phone = cleanPhoneForLink(contact.phone);

  return [
    contact.phone ? { label: "Gọi", href: `tel:${contact.phone}` } : null,
    phone ? { label: "Zalo", href: `https://zalo.me/${phone}` } : null,
    contact.email ? { label: "Email", href: `mailto:${contact.email}` } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
}

function shortText(value: string, maxLength = 150) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

export default async function AdminRemarketingPage() {
  const [orders, leads] = await Promise.all([
    getPaymentOrders({ includeFallback: false }),
    getLeads({ includeFallback: false }),
  ]);
  const model = buildRemarketingDashboardModel({ orders, leads });

  return (
    <ProtectedAdminShell nextPath="/admin/remarketing">
      <div className="mx-auto max-w-[1500px]">
        <AdminPageHeader
          eyebrow="Remarketing CRM"
          title="Dashboard remarketing khách hàng"
          description="Gom dữ liệu từ đơn hàng, lead và checkout để biết ai cần nhắc thanh toán, ai cần tư vấn lại, ai có thể upsell lên gói hỗ trợ hoặc khóa nâng cao."
          action={<ButtonLink href="/admin/don-hang">Mở đơn hàng</ButtonLink>}
        />

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((item) => (
            <AdminPanel key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black text-black/55">{item.label}</p>
                <StatusBadge tone={item.tone}>Live</StatusBadge>
              </div>
              <p className="mt-4 text-3xl font-black tracking-[-0.035em]">{item.value}</p>
              <p className="mt-2 text-sm leading-5 text-black/45">{item.detail}</p>
            </AdminPanel>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <AdminPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
                  Phân khúc chăm sóc
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Ưu tiên remarketing</h2>
              </div>
              <TextLink href="/admin/leads">Mở lead</TextLink>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {model.segments.map((segment) => (
                <div key={segment.id} className="rounded-lg border border-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{segment.label}</p>
                      <p className="mt-2 text-sm leading-6 text-black/55">{segment.detail}</p>
                    </div>
                    <StatusBadge tone={segment.tone}>{segment.count}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
              Nguồn khách
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Tệp nên chạy lại</h2>
            <div className="mt-5 grid gap-3">
              {model.topSources.length > 0 ? (
                model.topSources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/10 p-4"
                  >
                    <p className="font-semibold text-black/75">{source.source}</p>
                    <StatusBadge tone="info">{source.count}</StatusBadge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Chưa có nguồn đủ rõ"
                  description="Khi landing page tạo lead mới, UTM/source sẽ được đưa vào đây để phân tích tệp remarketing."
                />
              )}
            </div>
          </AdminPanel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
          <AdminPanel className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
                  Danh sách hành động
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Khách hàng cần remarketing</h2>
              </div>
              <StatusBadge tone="warning">{model.priorityContacts.length} liên hệ ưu tiên</StatusBadge>
            </div>

            <div className="mt-5 overflow-x-auto">
              {model.priorityContacts.length > 0 ? (
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                    <tr>
                      <th className="py-3">Phân khúc</th>
                      <th>Khách hàng</th>
                      <th>Liên hệ</th>
                      <th>Khóa / mã đơn</th>
                      <th>Nguồn</th>
                      <th>Hành động</th>
                      <th>Mới nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.priorityContacts.map((contact) => (
                      <tr key={contact.id} className="border-t border-black/10 align-top">
                        <td className="py-4">
                          <StatusBadge tone={contact.tone}>{contact.segmentLabel}</StatusBadge>
                          {contact.pendingAmount > 0 ? (
                            <p className="mt-2 text-xs font-bold text-amber-700">
                              {formatVndCompact(contact.pendingAmount)}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-[220px]">
                          <p className="font-black">{contact.name}</p>
                          {contact.note ? (
                            <p className="mt-2 text-xs leading-5 text-black/45">{shortText(contact.note)}</p>
                          ) : null}
                        </td>
                        <td>
                          <p className="font-semibold">{contact.phone || "Chưa có SĐT"}</p>
                          <p className="mt-1 text-xs text-black/45">{contact.email || "Chưa có email"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contactLinks(contact).map((link) => (
                              <a
                                key={link.label}
                                className="rounded-md border border-black/10 px-2.5 py-1 text-xs font-black text-black/60 transition hover:border-black/25 hover:text-black"
                                href={link.href}
                                target={link.label === "Zalo" ? "_blank" : undefined}
                                rel={link.label === "Zalo" ? "noreferrer" : undefined}
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="max-w-[260px] text-black/65">
                          {contact.courseTitles.length > 0 ? (
                            <div className="grid gap-1">
                              {contact.courseTitles.slice(0, 2).map((title) => (
                                <p key={title}>{title}</p>
                              ))}
                            </div>
                          ) : (
                            "Chưa rõ nhu cầu"
                          )}
                          {contact.orderCodes.length > 0 ? (
                            <p className="mt-2 text-xs font-black text-black/40">
                              {contact.orderCodes.slice(0, 2).join(", ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-[190px]">
                          <p className="font-semibold text-black/70">
                            {contact.utmSource || contact.sources[0] || "Không rõ nguồn"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-black/42">
                            {contact.utmCampaign || contact.sources.slice(1).join(", ") || "Chưa có campaign"}
                          </p>
                        </td>
                        <td className="max-w-[220px]">
                          <p className="font-black text-black/78">{contact.actionLabel}</p>
                          <p className="mt-2 text-xs leading-5 text-black/50">{contact.actionDetail}</p>
                        </td>
                        <td className="text-black/50">{formatAdminDate(contact.lastActivity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="Chưa có khách để remarketing"
                  description="Khi có đơn hàng hoặc lead mới, dashboard này sẽ tự gom và phân loại tệp chăm sóc."
                />
              )}
            </div>
          </AdminPanel>

          <div className="grid gap-4">
            <AdminPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
                Kịch bản nhắc thanh toán
              </p>
              <h3 className="mt-2 text-lg font-black">Tệp bỏ dở checkout</h3>
              <p className="mt-3 text-sm leading-6 text-black/55">
                Ưu tiên gọi trong ngày, nhắc đúng mã đơn và gửi lại link thanh toán. Nội dung nên xoay quanh việc
                học ngay để tự kiểm soát quảng cáo thay vì tiếp tục đốt ngân sách theo cảm tính.
              </p>
            </AdminPanel>

            <AdminPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
                Kịch bản lead lạnh
              </p>
              <h3 className="mt-2 text-lg font-black">Tệp chưa mua</h3>
              <p className="mt-3 text-sm leading-6 text-black/55">
                Chạy lại bằng nội dung pain point: quảng cáo không ra đơn, inbox im lặng, tài khoản thiếu ổn định,
                không biết đọc chỉ số. CTA nên kéo về video/giá 399K.
              </p>
            </AdminPanel>

            <AdminPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
                Kịch bản upsell
              </p>
              <h3 className="mt-2 text-lg font-black">Tệp đã mua</h3>
              <p className="mt-3 text-sm leading-6 text-black/55">
                Sau khi học gói video, mời nâng cấp gói hỗ trợ 799K để có Zoom lên ads và Agent kit, hoặc điều hướng
                sang AI Master/Performance Marketing khi khách cần scale.
              </p>
            </AdminPanel>
          </div>
        </section>
      </div>
    </ProtectedAdminShell>
  );
}
