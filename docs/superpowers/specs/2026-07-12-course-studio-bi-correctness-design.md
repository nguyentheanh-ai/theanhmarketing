# Course Studio, BI Dashboard và Data Correctness

Ngày: 2026-07-12  
Project: `theanh-main`  
Quyết định giao diện được duyệt: **A — Course Studio mở trong tab mới**

## 1. Kết quả cần đạt

Release này phải giải quyết đồng thời bốn vấn đề vận hành:

1. Chỉnh một khóa học trong không gian LMS riêng, không bị CRM sidebar/topbar chiếm chỗ.
2. Báo cáo trở thành dashboard BI dùng dữ liệu thật, có độ phân giải thời gian phù hợp và định nghĩa KPI rõ ràng.
3. Bộ lọc đơn hàng và KPI lead phải đúng dữ liệu, đúng khoảng thời gian và không tính từ riêng trang hiện tại.
4. Có thể sắp xếp thứ tự khóa học bằng `sort_order` hiện có, không thêm schema hoặc dependency khi chưa cần.

Không thêm tính năng email, automation, chart hoặc KPI nếu backend tương ứng chưa hoạt động và chưa kiểm chứng được.

## 2. Course Studio mở tab mới

### 2.1 Route và navigation

- Course Hub tiếp tục ở `/admin/crm-v2/courses` trong CRM shell.
- Editor chuyển sang route độc lập `/admin/course-studio/[courseSlug]`.
- Route mới kế thừa `app/admin/layout.tsx` để giữ `noindex` và dynamic rendering, nhưng không kế thừa `app/admin/crm-v2/layout.tsx`; vì vậy không render `CrmShell`.
- Route mới phải gọi `requireAdminAuth` với owner role và kiểm tra CRM feature gate tương đương route cũ.
- Nút `Mở Course Studio` trên Course Hub dùng tab mới. Link vẫn là URL bình thường để copy, bookmark, refresh và deep-link được.
- Route cũ `/admin/crm-v2/courses/[courseSlug]` chỉ làm compatibility redirect sang route mới, bảo toàn `step` hợp lệ.
- Header của Studio có `Về Course Hub`, tên khóa, trạng thái publish, trạng thái lưu và preview. Không cố đóng tab bằng script.

### 2.2 Progressive disclosure

- Rail bước: Tổng quan, Nội dung bán hàng, Curriculum, Media & tài liệu, Học viên & quyền học, Analytics, Kiểm tra & xuất bản.
- Các bước đi tự do; `step` nằm trong URL và chỉ bước đang chọn được render.
- Curriculum chỉ hiển thị cây module/bài học compact.
- Thêm/sửa module và bài học mở modal tập trung; không show đồng thời tất cả form trên một màn hình.
- Modal có URL/state tối thiểu, đóng bằng nút, Escape và click vùng nền khi không có thay đổi chưa lưu.
- Nếu form đã thay đổi, đóng modal phải cảnh báo mất dữ liệu.

### 2.3 Sắp xếp khóa học

- Course Hub có reorder mode riêng, không để drag handle luôn xuất hiện gây thao tác nhầm.
- Desktop hỗ trợ kéo thả hoặc nút lên/xuống; keyboard phải có nút lên/xuống khả dụng.
- Chỉ cập nhật các row bị đổi vị trí bằng `public.courses.sort_order` hiện có.
- Lỗi lưu phải rollback UI về snapshot server và báo rõ khóa nào chưa được sắp xếp.
- Không thay đổi slug, enrollment hoặc nội dung khóa khi reorder.

## 3. BI Dashboard

### 3.1 Một nguồn dữ liệu theo khoảng thời gian

- Toàn bộ KPI và chart nhận cùng một normalized range: `today`, `yesterday`, `7d`, `30d`, `90d`, hoặc custom.
- Mốc ngày dùng `Asia/Ho_Chi_Minh`.
- `today` và `yesterday`: bucket theo giờ.
- `7d` và `30d`: bucket theo ngày.
- `90d`: bucket theo tuần.
- Không dựng số demo và không dùng sparkline hard-code.

### 3.2 KPI có định nghĩa cố định

- **Doanh thu**: tổng giá trị đơn `paid` trong range.
- **Đơn đã thanh toán**: số đơn `paid` trong range.
- **Giá trị đơn trung bình**: doanh thu chia đơn paid.
- **Lead mới**: lead được tạo trong chính range đang xem. Nhãn phải là `Lead mới trong kỳ`; riêng range today mới dùng `Lead mới hôm nay`.
- **Tỷ lệ thanh toán**: đơn paid chia toàn bộ đơn được tạo trong range.
- **Tỷ lệ Lead → Paid**: số contact/lead duy nhất có đơn paid chia số lead duy nhất trong range; nếu không map được contact đáng tin cậy thì hiển thị unavailable, không suy diễn.
- **Chờ thanh toán**: số lượng và tổng giá trị pending trong range.
- **ROAS/CAC/CTR/CPC/CPM**: chỉ hiển thị khi Meta API trả dữ liệu thật cho đúng account và range.

### 3.3 Hệ biểu đồ

- Revenue trend: Area/Line chart; theo giờ cho hôm nay.
- Revenue cumulative: đường doanh thu lũy kế trong kỳ, có so sánh kỳ trước khi đủ dữ liệu.
- Funnel: horizontal bar cho Lead → MQL/quan tâm → Pending → Paid.
- Order status: donut cho paid/pending/failed/refunded.
- Course revenue ranking: horizontal bar.
- Source mix: donut hoặc horizontal bar tùy số nhóm.
- Ads vs revenue: composed chart cùng timeline; panel fail-closed nếu Meta không khả dụng.
- Bảng chi tiết KPI luôn đi kèm chart để đọc được số chính xác và hỗ trợ accessibility.

Không dùng nhiều chart chỉ để lấp chỗ. Mỗi chart phải trả lời một câu hỏi vận hành cụ thể.

## 4. Sửa data correctness

### 4.1 Lead mới

Nguyên nhân đã xác nhận: `getCrmV2Dashboard` đang gán số lead của `dateRange` vào biến/nhãn `newLeadsToday`. Sửa thành metric theo range và tạo truy vấn today riêng chỉ khi thực sự cần KPI cố định hôm nay.

### 4.2 Đơn hàng

Nguyên nhân đã xác nhận:

- RPC chính có nhận `p_date_from`/`p_date_to`, nhưng nhánh Direct Data API không áp dụng date range.
- KPI trong `OrdersPageClient` đang tính từ `ordersResult.rows`, tức tối đa 20/50 dòng của trang hiện tại thay vì toàn bộ tập đã lọc.
- Sparkline hiện có nhiều mảng số hard-code nên tạo cảm giác có dữ liệu dù không phản ánh database.

Thiết kế sửa:

- Direct Data API phải áp dụng cùng ranh giới ngày với RPC.
- Tạo aggregate result riêng cho toàn bộ filter/range; table pagination không được dùng làm nguồn KPI.
- Xóa series hard-code. Chỉ render trend khi aggregate API trả bucket thật.
- Thêm test parity giữa RPC và Direct Data API cho today, 7d và custom range.

## 5. Giảm code và rủi ro

- Không thêm thư viện chart; tiếp tục dùng Recharts đã có.
- Không tạo state object thứ hai mirror server snapshot.
- Range parsing, bucket generation và KPI definitions đặt ở một data module dùng chung cho Dashboard, Reports và Orders.
- Course Studio tái sử dụng section/editor hiện có trước khi tách; chỉ tách component khi có ranh giới trách nhiệm thật.
- Loại bỏ dead UI và hard-coded series sau khi test chứng minh không còn consumer.
- Không đổi schema cho reorder course vì `sort_order` đã tồn tại.
- Không đổi email, Auth, payment, enrollment hoặc dữ liệu học viên trong release giao diện/báo cáo này.

## 6. Kiểm thử và nghiệm thu

### Automated

- Test route/auth/redirect của Course Studio.
- Test tab target và URL `step`.
- Test chỉ section được chọn render.
- Test modal lesson/module mở, lưu, lỗi, cancel và unsaved guard.
- Test reorder course thành công, rollback và keyboard controls.
- Test timezone/range bucket cho today, yesterday, 7d, 30d, 90d và custom.
- Test KPI aggregate không phụ thuộc page size.
- Test nhãn lead theo range.
- Test Ads unavailable không làm hỏng revenue report.
- TypeScript, lint, Node test suite, production build và Playwright Chromium.

### Browser/live verification

- Course Hub mở Studio trong tab mới và không có CRM chrome.
- Refresh/deep-link từng bước không mất trạng thái đã lưu.
- Thao tác curriculum không phơi tất cả form cùng lúc.
- Reorder course giữ đúng thứ tự sau reload.
- Orders today/7d/custom thay đổi cả table total và aggregate KPI đúng nguồn.
- Dashboard today hiển thị 24 bucket giờ; khoảng dài đổi đúng độ phân giải.
- `Lead mới hôm nay` không còn hiển thị số 30 ngày.
- Không còn text mờ, box cùng màu, CTA giả hoặc chart hard-code.

Không deploy production trước khi preflight, full gate và authenticated smoke đều pass.

## 7. Review code và audit sau implementation

Sau khi phần trên hoàn tất và verification pass:

1. Review diff và toàn bộ module Admin/CRM/LMS bị ảnh hưởng: correctness, security, performance, accessibility, duplication và dead code.
2. Audit website chính `theanhmarketing.com`: route, Core Web Vitals/runtime evidence, bundle/client boundaries, data fetching, cache, hình ảnh/font, conversion flow và visual consistency.
3. Audit website học viên `app.theanhmarketing.com`: xác định canonical repository từ registry trước; kiểm tra login, course list, lesson player, progress, mobile, loading/error state và tốc độ chuyển bài.
4. Không sửa website học viên nếu đó là repository độc lập cho đến khi snapshot/branch, source contract và deploy identity của repository đó đã được xác minh.
5. Viết audit report gồm bằng chứng, mức độ P0–P3, quick wins, đề xuất kiến trúc ít code hơn và mockup giao diện cho các quyết định visual cần anh chọn.

Audit không được tự ý thay đổi production, domain, Auth, payment hoặc data model.
