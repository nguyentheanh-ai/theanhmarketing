import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy-page";

export const metadata: Metadata = { title: "Chính sách giao nhận sản phẩm số", description: "Chính sách giao nhận, bàn giao và hỗ trợ Đội ngũ nhân sự AI." };

export default function DigitalDeliveryPolicyPage() {
  return <PolicyPage title="Chính sách giao nhận sản phẩm số" description="Thông tin về thời điểm, hình thức bàn giao và hỗ trợ sau khi anh/chị hoàn tất khoản thanh toán theo đơn." sections={[
    { title: "Thời điểm và hình thức bàn giao", paragraphs: ["Đơn đặt cọc trước ngày mở bán dùng để giữ mức tổng giá preorder. Sau khi mở bán và anh/chị hoàn tất phần thanh toán còn lại, The Anh Marketing gửi hướng dẫn nhận bộ cài, video hướng dẫn và SOP theo email hoặc kênh đã đăng ký.", "Thông tin bàn giao có thể gồm liên kết tài nguyên số, tài khoản/khu học viên hoặc hướng dẫn truy cập phù hợp với phiên bản sản phẩm tại thời điểm giao. Anh/chị cần kiểm tra cả Spam/Promotions nếu chưa thấy email chính."] },
    { title: "Phạm vi hỗ trợ", paragraphs: ["Hỗ trợ tập trung vào việc kiểm tra quyền truy cập, hướng dẫn nhận tài nguyên và giải đáp các bước bắt đầu theo tài liệu bàn giao. Anh/chị cần cung cấp đúng email, số điện thoại và thông tin doanh nghiệp cần thiết để việc bàn giao không bị chậm.", "Các cập nhật, thời hạn hỗ trợ hoặc thay đổi định dạng bàn giao sẽ được thông báo theo kênh chính thức khi có thay đổi. Không tự ý chia sẻ liên kết hoặc thông tin truy cập cho bên ngoài doanh nghiệp được cấp quyền."] },
    { title: "Sự cố giao nhận", paragraphs: ["Nếu chưa nhận được hướng dẫn sau khi đơn đủ điều kiện bàn giao, anh/chị liên hệ The Anh Marketing kèm mã đơn hàng và email đã đăng ký. Đội ngũ sẽ kiểm tra trạng thái đơn, quyền truy cập và gửi lại theo quy trình hỗ trợ.", "Khoản đặt cọc không hoàn lại theo Điều khoản mua hàng; việc hỗ trợ giao nhận nhằm khắc phục lỗi truy cập hoặc thiếu thông tin, không thay đổi điều kiện thanh toán còn lại."] },
  ]} />;
}
