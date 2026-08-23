import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy-page";

export const metadata: Metadata = { title: "Điều khoản mua hàng", description: "Điều khoản đặt cọc và mua Đội ngũ nhân sự AI dành cho doanh nghiệp." };

export default function PurchaseTermsPage() {
  return <PolicyPage title="Điều khoản mua hàng" description="Các điều khoản dưới đây áp dụng cho đơn đặt cọc Đội ngũ nhân sự AI trên landing page academy/bo-kit-agent-doanh-nghiep." sections={[
    { title: "Sản phẩm và quyền sử dụng", paragraphs: ["Sản phẩm là Đội ngũ nhân sự AI, gồm bộ 8 Nhân viên AI dành cho doanh nghiệp, nội dung tự đào tạo theo dữ liệu riêng, SOP vận hành quảng cáo chuyên nghiệp và tài liệu/video hướng dẫn theo nội dung công bố trên landing page.", "Một doanh nghiệp được dùng nội bộ, không giới hạn số thành viên trong doanh nghiệp đó. Không được chia sẻ lại, bán lại hoặc phân phối bộ cài cho doanh nghiệp khác nếu không có thỏa thuận riêng."] },
    { title: "Giá, đặt cọc và thanh toán còn lại", paragraphs: ["Giá chính thức là 999.000đ. Tổng giá preorder là 799.000đ nếu anh/chị đặt cọc trước ngày mở bán theo thông tin hiển thị tại thời điểm đặt đơn. Khoản đặt cọc trước ngày mở bán là 399.000đ và được trừ vào tổng giá preorder.", "Phần còn lại là 400.000đ, thanh toán khi mở bán theo lịch hiển thị trên landing page hoặc thông báo chính thức của The Anh Marketing. Giá đã bao gồm VAT theo thông tin công bố trên landing page.", "Khoản cọc không hoàn lại. Nếu anh/chị không hoàn tất phần thanh toán còn lại, quyền nhận đủ bộ cài/bàn giao có thể chưa được kích hoạt cho đến khi hoàn tất nghĩa vụ thanh toán; các trường hợp cần xử lý riêng sẽ được trao đổi qua kênh hỗ trợ."] },
    { title: "Trách nhiệm và giới hạn", paragraphs: ["Nhân viên AI hỗ trợ tạo bản nháp, tài liệu, kiểm tra và đề xuất theo dữ liệu anh/chị cung cấp. Anh/chị vẫn kiểm tra nội dung, con số, quyền sử dụng tài sản và quyết định cuối cùng trước khi triển khai.", "Sản phẩm không cam kết doanh thu, số đơn, ROAS hoặc kết quả cụ thể cho mọi doanh nghiệp. Kết quả phụ thuộc vào dữ liệu, offer, ngân sách, tài khoản, chất lượng triển khai và quyết định của người dùng."] },
  ]} />;
}
