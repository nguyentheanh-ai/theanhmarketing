export type FallbackStudent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  progress: number;
  status: string;
  note: string;
};

export type FallbackOrder = {
  id: string;
  student: string;
  course: string;
  amount: string;
  status: string;
  date: string;
};

export type FallbackLead = {
  name: string;
  phone: string;
  need: string;
  source: string;
  status: string;
};

export const fallbackStudents: FallbackStudent[] = [];

export const fallbackOrders: FallbackOrder[] = [];

export const fallbackLeads: FallbackLead[] = [];

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
  { label: "Lead / học viên", value: "Theo dữ liệu thật", detail: "Đồng bộ từ form và checkout" },
  { label: "Pipeline", value: "CRM", detail: "Theo trạng thái chăm sóc" },
  { label: "Doanh thu", value: "Theo Sepay", detail: "Đồng bộ từ đơn thật" },
  { label: "Tỷ lệ hoàn thành", value: "Theo học viên", detail: "Không dùng dữ liệu mẫu" },
];
