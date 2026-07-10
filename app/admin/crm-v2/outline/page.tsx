import { ChartCard, IconButton, InsightRow, PageHeader, RightInsightPanel, ShieldCheck, StatusBadge } from "@/components/crm-v2";

const modules = [
  {
    title: "Tổng quan CRM",
    description: "Theo dõi lead mới, doanh thu, chiến dịch cần chú ý và các việc sale cần xử lý trong ngày.",
    status: "Bảng điều hành",
  },
  {
    title: "Leads & Pipeline",
    description: "Quản lý từng cơ hội bán hàng theo giai đoạn, nguồn lead, khóa học quan tâm và sale phụ trách.",
    status: "Pipeline bán hàng",
  },
  {
    title: "Hồ sơ liên hệ 360°",
    description: "Xem toàn bộ lịch sử tương tác, đơn hàng, email, việc cần làm và ghi chú chăm sóc của từng khách hàng.",
    status: "Chân dung khách hàng",
  },
  {
    title: "Phân khúc & Tag",
    description: "Nhóm khách theo hành vi, nhu cầu, mức độ quan tâm và nhãn chăm sóc để remarketing đúng người.",
    status: "Danh sách thông minh",
  },
  {
    title: "Remarketing Email",
    description: "Theo dõi chiến dịch, mẫu email, lịch gửi, tỉ lệ mở/click và nhóm không được nhận email marketing.",
    status: "Nuôi dưỡng lead",
  },
  {
    title: "Automation Workflow",
    description: "Thiết kế luồng chăm sóc tự động cho form, tag, email, giai đoạn tư vấn, việc cần làm và mục tiêu chuyển đổi.",
    status: "Luồng tự động",
  },
  {
    title: "Đơn hàng & Thanh toán",
    description: "Theo dõi đơn chờ thanh toán, đơn đã thanh toán, nhắc thanh toán, mã giảm giá và doanh thu.",
    status: "Doanh thu",
  },
  {
    title: "Học viên & Khóa học",
    description: "Quản lý học viên đang học, tiến độ, mức độ tương tác, yêu cầu hỗ trợ và cơ hội upsell.",
    status: "Chăm sóc học viên",
  },
  {
    title: "Báo cáo & Attribution",
    description: "Đo hiệu quả nguồn lead, doanh thu theo kênh, phễu chuyển đổi, email và hiệu suất sale.",
    status: "Báo cáo tăng trưởng",
  },
  {
    title: "Team & Phân quyền",
    description: "Phân vai trò quản trị viên, sale, CSKH, marketing và theo dõi các thao tác quan trọng trong CRM.",
    status: "Quyền truy cập",
  },
  {
    title: "Tích hợp",
    description: "Kết nối email, quảng cáo và các kênh dữ liệu phục vụ chăm sóc khách hàng.",
    status: "Kết nối hệ thống",
  },
  {
    title: "Vận hành dữ liệu",
    description: "Đảm bảo dữ liệu khách hàng cũ được giữ nguyên, số liệu được đối chiếu trước khi dùng chính thức.",
    status: "Kiểm soát dữ liệu",
  },
];

export default function CrmV2OutlinePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Bản đồ vận hành"
        title="Outline CRM chuyên sâu"
        actions={<IconButton href="/admin/crm-v2/outline#operations" label="Nguyên tắc vận hành"><ShieldCheck className="h-4 w-4" /></IconButton>}
      />
      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module, index) => (
            <ChartCard key={module.title} title={`${String(index + 1).padStart(2, "0")} · ${module.title}`}>
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>{module.description}</p>
                <StatusBadge tone={index < 9 ? "blue" : index < 11 ? "purple" : "green"}>{module.status}</StatusBadge>
              </div>
            </ChartCard>
          ))}
        </div>
        <RightInsightPanel title="Ưu tiên vận hành">
          <span id="operations" className="sr-only">Nguyên tắc vận hành CRM v2</span>
          <InsightRow label="CRM hiện tại" value="Giữ nguyên" tone="green" />
          <InsightRow label="Dữ liệu khách hàng" value="Không ghi đè" tone="blue" />
          <InsightRow label="Sale & CSKH" value="Không gián đoạn" tone="orange" />
          <InsightRow label="Báo cáo" value="Đối chiếu số liệu" tone="purple" />
          <InsightRow label="Khi dùng chính thức" value="Có kiểm tra trước" tone="green" />
        </RightInsightPanel>
      </div>
    </div>
  );
}
