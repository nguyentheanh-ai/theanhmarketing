import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy-page";

export const metadata: Metadata = { title: "Chính sách bảo mật", description: "Chính sách bảo mật thông tin khách hàng của The Anh Marketing." };

export default function PrivacyPolicyPage() {
  return <PolicyPage title="Chính sách bảo mật" description="The Anh Marketing sử dụng thông tin khách hàng để tạo đơn, xác nhận thanh toán, giao sản phẩm và hỗ trợ sau mua trong phạm vi cần thiết." sections={[
    { title: "Thông tin được thu thập", paragraphs: ["Khi anh/chị đăng ký hoặc đặt cọc, hệ thống có thể nhận họ tên, email, số điện thoại/Zalo, thông tin xuất hóa đơn, mã đơn hàng và dữ liệu nguồn truy cập như UTM, fbclid, fbp hoặc fbc.", "Thông tin thanh toán được đối chiếu theo mã đơn và giao dịch chuyển khoản. The Anh Marketing không yêu cầu anh/chị gửi mật khẩu tài khoản ngân hàng qua form landing page."] },
    { title: "Mục đích sử dụng", paragraphs: ["Thông tin được dùng để tạo và quản lý đơn, gửi hướng dẫn thanh toán/giao nhận, xác nhận khoản cọc, thông báo phần thanh toán còn lại, xử lý yêu cầu xuất hóa đơn và hỗ trợ khách hàng.", "Dữ liệu marketing được dùng để đo lường nguồn truy cập và hiệu quả funnel trong phạm vi cần thiết, không thay đổi nội dung đơn hàng hoặc số tiền phải thanh toán."] },
    { title: "Lưu trữ và quyền của anh/chị", paragraphs: ["Thông tin được lưu trong các hệ thống vận hành liên quan đến đơn hàng, email, CRM và giao nhận. The Anh Marketing áp dụng quyền truy cập theo vai trò và không công khai thông tin cá nhân của khách hàng.", "Anh/chị có thể yêu cầu kiểm tra, chỉnh sửa hoặc hỏi về việc sử dụng thông tin bằng cách liên hệ qua thông tin trên website. Một số dữ liệu giao dịch có thể cần được giữ lại để đối soát, kế toán và xử lý khiếu nại."] },
  ]} />;
}
