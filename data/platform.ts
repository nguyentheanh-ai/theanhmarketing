export const sampleStudents = [
  {
    id: "STU-1001",
    name: "Minh Anh",
    email: "minhanh@example.com",
    phone: "0901 234 567",
    course: "Facebook Ads 2026",
    progress: 38,
    status: "Đang học",
    note: "Cần hỗ trợ phần đọc dữ liệu và chất lượng lead.",
  },
  {
    id: "STU-1002",
    name: "Quốc Huy",
    email: "quochuy@example.com",
    phone: "0902 345 678",
    course: "Facebook Ads 2026",
    progress: 72,
    status: "Đang học",
    note: "Đã hoàn thành module AI Ads Foundation.",
  },
  {
    id: "STU-1003",
    name: "Thu Trang",
    email: "thutrang@example.com",
    phone: "0903 456 789",
    course: "AI Growth System Foundation",
    progress: 12,
    status: "Mới đăng ký",
    note: "Chờ xác nhận thanh toán.",
  },
];

export const sampleOrders = [
  {
    id: "ORD-2401",
    student: "Minh Anh",
    course: "Facebook Ads 2026",
    amount: "799.000đ",
    status: "Đã thanh toán",
    date: "12/05/2026",
  },
  {
    id: "ORD-2402",
    student: "Thu Trang",
    course: "Marketing Online Nền Tảng",
    amount: "Đang cập nhật",
    status: "Chờ xử lý",
    date: "12/05/2026",
  },
];

export const sampleLeads = [
  {
    name: "Nguyễn Minh Anh",
    phone: "0901 234 567",
    need: "Tư vấn AI Ads Engine",
    source: "Trang chương trình",
    status: "Cần gọi lại",
  },
  {
    name: "Trần Quốc Huy",
    phone: "0902 345 678",
    need: "AI Growth Toolkit",
    source: "Thư viện toolkit",
    status: "Đã gửi toolkit",
  },
  {
    name: "Lê Thu Trang",
    phone: "0903 456 789",
    need: "Chẩn đoán Growth System",
    source: "Trang chủ",
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
  { label: "Doanh thu", value: "399M+", detail: "Mock dashboard" },
  { label: "Tỷ lệ hoàn thành", value: "64%", detail: "Theo tiến độ mẫu" },
];
