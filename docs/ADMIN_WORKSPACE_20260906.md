# Không gian quản trị mới

Trạng thái: đã phát hành. Kiểm tra bản dựng và các hành vi mới đạt; bằng chứng triển khai và đối chiếu sau phát hành được giữ trong bảng theo dõi riêng.

Tổng quan và báo cáo dùng cùng bộ lọc ngày/sản phẩm, số tiền đã thanh toán, xu hướng, bảng sản phẩm và phễu của cùng nhóm đơn. Chi phí quảng cáo tải riêng; không dùng sự thiếu dữ liệu Ads để chặn báo cáo doanh thu. Đơn nhiều sản phẩm phân bổ bảo toàn tổng tiền; sản phẩm tặng không nhận doanh thu âm. Chi tiết và định nghĩa mở bằng cửa sổ.

Khách hàng/học viên dùng một danh sách, hồ sơ có thông tin, quyền học, đơn hàng, hoạt động và tài khoản. Thao tác cần xác nhận và phản hồi từ máy chủ; cập nhật quyền hoặc mật khẩu thành công nhưng email lỗi được phân biệt. Editor giữ phạm vi học viên trước đây; owner quản lý khách hàng tiềm năng và thao tác tài khoản. Route cũ chuyển về hồ sơ hợp nhất.

Khóa học dùng danh sách tìm/lọc, cây chương–bài và các cửa sổ sửa riêng. Bản nháp giữ nguyên khi lưu lỗi. Parent của bài/tài liệu được đối chiếu, tài liệu sửa tại đúng nguồn, archive giữ nội dung và tiến độ. Xem thêm `ADMIN_COURSE_WORKSPACE_20260906.md`.

Lịch hỗ trợ có tháng/tuần/ngày, hiển thị buổi đã đăng ký ngay trên lịch và mở chi tiết khi chọn. Ghi chú ngày bận vẫn dùng API hiện có. Sidebar chỉ có sáu mục chính; công cụ khác nằm trong các nhóm Cài đặt.

Bản sửa không có migration, backfill hay thay đổi public checkout/student app riêng. Các bộ kiểm thử mới: admin-analytics-workspace, admin-customer-workspace, admin-customer-identity, admin-course-workspace, support-calendar. Kiểm chứng source/test/build không thay thế nghiệm thu thao tác bằng tài khoản thật. Bằng chứng phát hành chi tiết được giữ trong workspace riêng.
