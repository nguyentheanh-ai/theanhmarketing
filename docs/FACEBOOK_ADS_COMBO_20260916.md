# Combo Facebook Ads + Ebook không thời hạn


## 16/09/2026 — Combo Facebook Ads + Ebook giảm 20% không thời hạn

Theo ảnh và yêu cầu của anh: thêm thông điệp giảm 20% vào đầu landing Facebook Ads Master 2026 và mục chọn combo; giá 878.400đ từ 1.098.000đ. Không sử dụng dòng “Ưu đãi có hạn” trong ảnh. Hai HTML source/published được đồng bộ. Gói mới `zoom-kit-ebook-20` không có điều kiện ngày, phân bổ 639.200đ khóa học +239.200đ Ebook; gói sự kiện cũ giữ điều kiện hết hạn. Giá khóa học riêng 799.000đ, luồng SePay/email/quyền học/tracking giữ nguyên.

Đã kiểm tra: doctor/remote đạt, 39 kiểm tra landing/payment +3 kiểm tra hành vi combo đạt; TypeScript/lint đạt, Next Webpack build đạt. Không tạo đơn/gửi email thật; chưa kiểm tra trình duyệt và chưa phát hành production. Anh đã xác nhận “làm đi”; bản nguồn được duyệt phát hành. Đang chuẩn bị commit/push và preflight, chưa xác nhận live.

## File thay đổi
- public/ladipage/facebook-ads-2026.html
- public/academy/facebook-ads-master-2026.html
- services/orderService.ts
- tests/facebook-ads-landing.test.mjs
- tests/facebook-ads-combo-evergreen.test.mjs

## Tiếp theo
Anh đã xác nhận phát hành. Kiểm tra lại diff, preflight đúng release root, phát hành và đọc lại landing production. Không suy bản dựng local là bản live.


## 16/09/2026 — Đã phát hành combo giảm 20% không thời hạn

Anh xác nhận “làm đi”. Runtime `3e1bfc5243c116f90f64b46c769edb49e6623b42` đã push canonical, preflight đúng root/remote đạt; preview `dpl_AaBQ8SGr4m5M5hbRzXHaRLXpxR5b` READY, production `dpl_8Shd2rMCgijqmUDN2tvRBHVA7Bh5` READY. API xác nhận www/apex trỏ đúng commit. Landing `/academy/facebook-ads-master-2026` trên www/apex và bản `/ladipage/facebook-ads-2026.html` trả 200, byte-identical với source; có thông điệp giảm 20%, combo 878.400đ từ 1.098.000đ, mã `zoom-kit-ebook-20`, không có hạn ưu đãi cũ.

Kiểm chứng: 39 kiểm tra landing/payment +3 hành vi combo, TypeScript, lint, Next Webpack build 108 routes đã đạt trước phát hành; remote production build READY. Không có dòng lỗi/fatal trong truy vấn 15 phút của đúng deployment ngay sau kiểm tra live. Bốn landing còn lại đều HTTP 200; HTML tĩnh Ebook/AI giữ SHA-256. HTML route Agent Kit/Codex có hash khác giữa bản dựng; source route/bundle không thay đổi trong diff so với production trước. Không tuyên bố hash HTML động giữ nguyên.

Không tạo đơn, thanh toán, gửi email hoặc thử đăng nhập thật; chưa có kiểm tra giao diện qua trình duyệt. Giá/quyền combo được kiểm tra bằng hành vi mã nguồn và provenance bản production, không phải bằng giao dịch thật. Rollback trước phát hành: `dpl_J6qPmAKrAjxSRbkXXjxr2Bwox7Dm`. Trạng thái DONE; các dòng WAITING_OWNER/đang phát hành phía trước đã được thay thế.
