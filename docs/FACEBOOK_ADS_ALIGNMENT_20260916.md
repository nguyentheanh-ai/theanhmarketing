# Sửa căn chỉnh và tương phản Facebook Ads


## 16/09/2026 — Sửa tương phản ưu đãi và căn chỉnh Facebook Ads

Anh phản hồi banner tối/khó đọc và hai CTA không đều. Đổi banner từ `.selected-plan-note` (chữ #2c160b cho form sáng) sang `.hero-combo-offer` riêng cho hero tối: badge vàng, nội dung sáng, giá vàng nổi bật. Hai CTA cùng chiều rộng/chiều cao bằng CSS grid; tiêu đề học phí/FAQ căn giữa; các phần hai cột chuyển căn giữa khi xếp một cột; nhãn mô hình canh giữa theo chiều dọc. Giữ mã combo/giá/form/tracking.

Đã xem ảnh Chrome headless với font thật, 12 section desktop và 4 viewport 1440/820/390/320. Không tràn ngang; CTA lần lượt cùng kích thước 631.66×56, 310×74.78, 346×72.78, 284×74.78px. 42 kiểm tra liên quan và diff check đạt. Chưa phát hành lần sửa giao diện này. Có task khác đang sửa Agent Kit trong cùng release root, không đưa các file đó vào commit này.


## 16/09/2026 — Thanh ghim Facebook Ads theo mẫu

Anh yêu cầu thanh ghim dạng nền tối, thông tin khóa học/giá bên trái và CTA vàng bên phải; giá gốc do anh cung cấp 2.590.000đ. Đã hiển thị giá khóa học hiện tại 799.000đ, nhãn giảm làm tròn 69%, nút Đăng ký ngay; mobile tách thông tin và CTA thành hai hàng gọn. Giữ mục lục, ẩn thanh khi form xuất hiện, giá combo 878.400đ và luồng checkout/tracking. Cùng bản căn chỉnh 6f13878 trước đó.

Anh đã yêu cầu xong thì đưa lên website, không hỏi lại. Đã xem screenshot thanh ghim 1440/390/320 và đo 4 viewport 1440/820/390/320 không tràn ngang; 42 kiểm tra liên quan đạt. Đang chuẩn bị phát hành, chưa xác nhận live.


## 16/09/2026 — LIVE: căn chỉnh và thanh ghim Facebook Ads

Anh đã duyệt bản chung tại task Facebook Ads. Preflight root/remote b919fc4 PASS. Production dpl_6eVQv8woSw3tcJowaHApxFCJsMcw READY; API www xác nhận đúng b919fc4. www/apex HTTP200 và byte-match source. Thanh ghim giá gốc 2.590.000đ, giá khóa 799.000đ, nhãn -69%, Đăng ký ngay; căn chỉnh6f13878 đã live.

Đã xem screenshot mobile live; mục lục mở/đóng, CTA cuộn ô họ tên vào viewport và thanh ghim ẩn khi form hiện PASS. Truy vấn error/fatal15phút của đúng deployment không có kết quả. Không tạo đơn/gửi email/giao dịch thật. DONE thay thế các ghi chú BLOCKED/WAITING_OWNER trước. Agent Kit do task riêng kiểm tra sau cùng lượt phát hành.
