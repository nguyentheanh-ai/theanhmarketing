# Sửa kiểm tra mã số thuế và vị trí nút thanh toán


## 16/09/2026 — Sửa thông tin hóa đơn: đã kiểm tra, chuẩn bị deploy

Anh yêu cầu bỏ kiểm tra định dạng mã số thuế vì hộ kinh doanh/doanh nghiệp khác nhau và đã cho phép deploy. Shared `lib/orders/invoice.ts` bỏ regex 10 chữ số/chi nhánh; vẫn bắt buộc MST không rỗng sau làm sạch, giữ số 0 đầu và chuỗi văn bản (giới hạn kỹ thuật 200 ký tự). Tên/địa chỉ/email hóa đơn vẫn kiểm như cũ. Hai API dùng chung helper; không đổi DB/SePay/email/access/giá/coupon/tracking.

Form Bộ Kit đặt một nút thanh toán cuối form, sau hóa đơn và thông báo lỗi role=alert. Giữ countdown3-2-1, chống gửi trùng, HOCVIEN20=792.000đ. Vite bundle index-CmdFTkr4.js, CSS byte-identical. Candidate worktrees/invoice-checkout-20260916 từ canonical d6263ae; bản nguồn Vite được đối chiếu baseline trước đồng bộ.

100/100 kiểm tra liên quan đạt (66invoice/coupon/form/landing/payment +34payment/email); TypeScript, scoped ESLint(0lỗi/1cảnh báo img sẵn có), Vite build, Next Webpack108routes và diff check đạt. Không tạo đơn/email/giao dịch thật. Không chạy lại full-suite/full-lint ngoài phạm vi đã có lỗi được ghi trong HOCVIEN20; chưa browser visual QA/Safari vật lý. Chỉ báo live sau khi xác minh production READY và asset đúng. Rollback hiện tại dpl_G6ALtFK2i3SKenzCaUKHqV9pfmwv.


## 16/09/2026 — Sửa mã số thuế và nút thanh toán ĐÃ LIVE

DONE theo yêu cầu “phần này không check nữa” và “Deloy đi”. Runtime81459c590302a510d37de9e96fd14499f3c42bcb; preview dpl_9XKpdznKoaaU2od5isozFLVyfN23 READY; production dpl_Bnt7rGWoY4wQAxoBffiVD64nbSsp READY và gán www/apex. Exact release-root/remote preflight đạt. Rollback dpl_G6ALtFK2i3SKenzCaUKHqV9pfmwv. Không còn chờ duyệt hoặc deploy.

Bỏ regex định dạng MST ở shared invoice helper, vẫn bắt buộc MST không rỗng sau cleanText (giới hạn kỹ thuật200ký tự). Tên/địa chỉ/email giữ kiểm tra cũ. Nút thanh toán Bộ Kit ở cuối form sau hóa đơn; thông báo lỗi role=alert ngay trước nút. Giữ HOCVIEN20/792.000đ, countdown3-2-1 và mọi contract thanh toán/email/tracking/quyền. Form gốc Vite được đồng bộ sau baseline+backup.

100tests liên quan, TypeScript, scoped lint0errors/1existingimgwarning, Vite và Next108routes đạt. Live bundle index-CmdFTkr4.js byte-match SHA2561069e7e173ed072cb80a6b3df9c13dadda1786b7beb9921669489c5dee9cdb92. Ba POST kiểm validation cố ý không có courseSlug/courseSlugs: mã12chữ số và văn bản qua invoice rồi dừng400ở kiểm khóa học; MST trống trả400nhắc nhập. Đã kiểm thứ tự return trước createPaymentOrder; không tạo đơn, giao dịch, email hoặc marketing event thật. Không coi phép thử này là giao dịch trọn luồng.

16route status/destination giữ nguyên;4landing tĩnh ngoài scope giữSHA256;5source landing bảo vệ không đổi. Query error/fatal đúng production15phút đến08:41:19UTC không có kết quả. Chưa browser visual QA/Safari vật lý; thứ tựform được kiểm qua React harness, bundle live đúng; full-suite/full-lint ngoài scope không chạy lại các lỗi đã biết. Evidence reports/invoice-checkout-20260916 gồm tests/payment-regression/typecheck/lint/build,source-verification,live-verification,live-smoke-before/after,deployment,promote,production-ready. Context đã đọc: registry/rules/policy, ACTIVE_TASKS/protocol/context/state/features/payment/email, repoAGENTS/CURRENT_STATE/FEATURE_MAP/handoff/design/SePay; code đúng main-site. Các trạng thái chờ ở phía trên đã được thay thế.

Auto-review lần đầu từ chối lệnh gộp merge/push vì chưa chứng minh đích remote tin cậy. Sau readback origin=expected_remote registry, allowed branch/upstream và Vercel live sử dụng đúng repo, push đúng1commit đã được chấp thuận. Không bypass, không force push hoặc đổi đích.
