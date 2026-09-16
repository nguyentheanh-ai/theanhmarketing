# Sửa kiểm tra mã số thuế và vị trí nút thanh toán


## 16/09/2026 — Sửa thông tin hóa đơn: đã kiểm tra, chuẩn bị deploy

Anh yêu cầu bỏ kiểm tra định dạng mã số thuế vì hộ kinh doanh/doanh nghiệp khác nhau và đã cho phép deploy. Shared `lib/orders/invoice.ts` bỏ regex 10 chữ số/chi nhánh; vẫn bắt buộc MST không rỗng sau làm sạch, giữ số 0 đầu và chuỗi văn bản (giới hạn kỹ thuật 200 ký tự). Tên/địa chỉ/email hóa đơn vẫn kiểm như cũ. Hai API dùng chung helper; không đổi DB/SePay/email/access/giá/coupon/tracking.

Form Bộ Kit đặt một nút thanh toán cuối form, sau hóa đơn và thông báo lỗi role=alert. Giữ countdown3-2-1, chống gửi trùng, HOCVIEN20=792.000đ. Vite bundle index-CmdFTkr4.js, CSS byte-identical. Candidate worktrees/invoice-checkout-20260916 từ canonical d6263ae; bản nguồn Vite được đối chiếu baseline trước đồng bộ.

100/100 kiểm tra liên quan đạt (66invoice/coupon/form/landing/payment +34payment/email); TypeScript, scoped ESLint(0lỗi/1cảnh báo img sẵn có), Vite build, Next Webpack108routes và diff check đạt. Không tạo đơn/email/giao dịch thật. Không chạy lại full-suite/full-lint ngoài phạm vi đã có lỗi được ghi trong HOCVIEN20; chưa browser visual QA/Safari vật lý. Chỉ báo live sau khi xác minh production READY và asset đúng. Rollback hiện tại dpl_G6ALtFK2i3SKenzCaUKHqV9pfmwv.
