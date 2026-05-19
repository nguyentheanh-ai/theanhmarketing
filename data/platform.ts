export const fallbackStudents = [
  {
    id: "STU-CRM-001",
    name: "Lead từ form đăng ký",
    email: "theanhmarketing@gmail.com",
    phone: "0367 928 921",
    course: "Facebook Ads 2026",
    progress: 38,
    status: "Cần tư vấn",
    note: "Được ghi nhận từ form public khi Supabase chưa có dữ liệu thật.",
  },
  {
    id: "STU-CRM-002",
    name: "Lead workshop Growth System",
    email: "theanhmarketing@gmail.com",
    phone: "0367 928 921",
    course: "AI Growth System Foundation",
    progress: 72,
    status: "Đang chăm sóc",
    note: "Ưu tiên tư vấn điểm nghẽn content, ads, funnel và CRM.",
  },
  {
    id: "STU-CRM-003",
    name: "Học viên đã thanh toán",
    email: "theanhmarketing@gmail.com",
    phone: "0367 928 921",
    course: "Facebook Ads 2026",
    progress: 12,
    status: "Đã mở quyền",
    note: "Dòng dự phòng mô phỏng trạng thái cấp quyền khi chưa kết nối dữ liệu đơn thật.",
  },
];

export const fallbackOrders = [
  {
    id: "ORD-FBADS-2026",
    student: "Học viên Facebook Ads 2026",
    course: "Facebook Ads 2026",
    amount: "799.000đ",
    status: "Chờ dữ liệu Sepay",
    date: "19/05/2026",
  },
  {
    id: "ORD-GROWTH-FOUNDATION",
    student: "Lead AI Growth System",
    course: "AI Growth System Foundation",
    amount: "Đang cập nhật",
    status: "Cần tư vấn",
    date: "19/05/2026",
  },
];

export const fallbackLeads = [
  {
    name: "Lead Facebook Ads 2026",
    phone: "0367 928 921",
    need: "Tư vấn AI Ads Engine",
    source: "Trang khóa học",
    status: "Cần gọi lại",
  },
  {
    name: "Lead AI Growth Toolkit",
    phone: "0367 928 921",
    need: "AI Growth Toolkit",
    source: "Thư viện toolkit",
    status: "Đã gửi toolkit",
  },
  {
    name: "Lead Workshop",
    phone: "0367 928 921",
    need: "Chẩn đoán Growth System",
    source: "Workshop",
    status: "Mới",
  },
];

export const studentLessons = [
  {
    title: "AI Ads Foundation và tư duy funnel",
    duration: "28 phút",
    status: "Hoàn thành",
  },
  {
    title: "Chuẩn bị fanpage, pixel, tracking và CRM signal",
    duration: "34 phút",
    status: "Đang học",
  },
  {
    title: "Cấu trúc chiến dịch và ngân sách test theo funnel",
    duration: "41 phút",
    status: "Chưa học",
  },
  {
    title: "Đọc dữ liệu, lọc lead và tối ưu chi phí",
    duration: "46 phút",
    status: "Chưa học",
  },
];

export const adminMetrics = [
  { label: "Lead/ học viên", value: "10.000+", detail: "+128 lead mới" },
  { label: "Pipeline", value: "500+", detail: "2 đơn cần xử lý" },
  { label: "Doanh thu", value: "Theo Sepay", detail: "Đồng bộ từ đơn thật" },
  { label: "Tỷ lệ hoàn thành", value: "64%", detail: "Theo tiến độ mẫu" },
];
