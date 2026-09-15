# Sửa căn chỉnh và tương phản Facebook Ads


## 16/09/2026 — Sửa tương phản ưu đãi và căn chỉnh Facebook Ads

Anh phản hồi banner tối/khó đọc và hai CTA không đều. Đổi banner từ `.selected-plan-note` (chữ #2c160b cho form sáng) sang `.hero-combo-offer` riêng cho hero tối: badge vàng, nội dung sáng, giá vàng nổi bật. Hai CTA cùng chiều rộng/chiều cao bằng CSS grid; tiêu đề học phí/FAQ căn giữa; các phần hai cột chuyển căn giữa khi xếp một cột; nhãn mô hình canh giữa theo chiều dọc. Giữ mã combo/giá/form/tracking.

Đã xem ảnh Chrome headless với font thật, 12 section desktop và 4 viewport 1440/820/390/320. Không tràn ngang; CTA lần lượt cùng kích thước 631.66×56, 310×74.78, 346×72.78, 284×74.78px. 42 kiểm tra liên quan và diff check đạt. Chưa phát hành lần sửa giao diện này. Có task khác đang sửa Agent Kit trong cùng release root, không đưa các file đó vào commit này.
