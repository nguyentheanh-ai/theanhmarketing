# Service import và module alias trong test cô lập

Applicability: theanh-main, tests/support-booking-schedule.test.mjs, loader transpile TypeScript với danh sách alias rõ ràng.
Observation: thêm import lib/orders/coupon vào orderService làm test checkout báo Cannot find module @/lib/orders/coupon, trước khi thực thi business logic.
Cause: VERIFIED, loader không dùng alias resolver của Next.
Correction: map alias mới tới module coupon thật qua load(), không stub bỏ kiểm tra giá.
Verification: test checkout và100focused tests đạt sau chỉnh alias; production build đạt.
Limits: chỉ áp dụng loader cô lập có danh sách aliases. Không tự thêm mocks cho lỗi runtime production hoặc che lỗi nghiệp vụ.
