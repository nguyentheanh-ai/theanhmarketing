# Lean Solo Admin v3 Design

## Mục tiêu

Thay bản Admin vừa deploy bằng một hệ điều hành gọn cho người kinh doanh solo: chỉ giữ module có dữ liệu và thao tác thật; Course Hub tách khỏi Course Workspace; báo cáo dùng biểu đồ đúng loại và đổi độ phân giải theo thời gian; Ads lấy trực tiếp từ Meta Marketing API.

## Kết quả nghiên cứu

- Tutor LMS tách danh sách khóa khỏi Course Builder. Trong curriculum, topic là container; bài học được mở bằng pop-up riêng, có nội dung, video, thời lượng, tài liệu và trạng thái preview. Không phơi toàn bộ form của mọi bài trên một trang.
- Next.js App Router hỗ trợ nested route và deep-link; route riêng cho editor đơn giản, ổn định và ít state hơn intercepting/parallel modal. Modal chỉ dùng cho thao tác ngắn như tạo khóa, topic và lesson.
- React khuyến nghị lưu state tối thiểu, tránh mirror/duplicate props. Course slug và section nằm trong URL; dữ liệu khóa chỉ đến từ server snapshot.
- Recharts 3.8.1 đã có sẵn và hỗ trợ ResponsiveContainer, AreaChart, BarChart, PieChart. Không thêm dependency biểu đồ.
- Meta production đã có `META_ADS_ACCESS_TOKEN` và `META_ADS_AD_ACCOUNT_ID`. Ads report sẽ fail closed nếu API lỗi; tuyệt đối không dựng số demo.

## Quyết định kiến trúc

### Navigation tối giản

Primary: Tổng quan, Khách hàng, Đơn hàng, Học viên, Khóa học, Báo cáo, Cài đặt.

Advanced chỉ giữ Lịch sử hoạt động. Ẩn Email, Automation, Segments, Team và Integrations khỏi operator navigation. Không xóa API/database của chúng trong release này để tránh mất dữ liệu; chúng không còn được trình bày như chức năng sẵn sàng.

Settings chuyển vào `/admin/crm-v2/settings`, dùng cùng shell. Màn hình chỉ hiển thị trạng thái cấu hình theo tên service, không đọc hoặc in secret.

### LMS progressive disclosure

- `/admin/crm-v2/courses`: Course Hub nhỏ gọn, tìm kiếm, trạng thái, số module/bài/học viên và nút tạo khóa.
- Tạo khóa mở drawer/modal tập trung; sau khi tạo chuyển vào editor.
- `/admin/crm-v2/courses/[courseSlug]`: full-screen Course Workspace.
- Workspace có rail dọc thu gọn; chỉ render section đang chọn. Các section khác không xuất hiện trong DOM.
- Curriculum hiển thị cây topic/lesson; form topic/lesson tiếp tục dùng modal riêng.
- Không có form thêm enrollment thô. Course Students chỉ hiển thị enrollment/progress và dẫn về Student Operations.
- Tạo học viên dùng `StudentCreateDialog` + `StudentProvisioningWizard`, là luồng thật tạo/khôi phục account, cấp quyền và gửi email có journal/idempotency.

### Dashboard và báo cáo

- Revenue: AreaChart.
- Funnel: horizontal BarChart.
- Source mix: donut PieChart.
- Course ranking: horizontal BarChart.
- Ads vs revenue: Composed/Area chart cùng trục thời gian.
- `today`: 24 bucket theo giờ Việt Nam.
- `7d`/`30d`: bucket theo ngày.
- `90d`: bucket theo tuần.

Meta adapter gọi account Insights với spend, impressions, clicks, CTR, CPC và CPM. Với hôm nay, dùng hourly advertiser-time-zone breakdown khi API hỗ trợ. KPI thật: Ads spend, Revenue, ROAS, CAC. Nếu Ads lỗi, panel ghi rõ không khả dụng và không làm hỏng phần doanh thu.

### Taxonomy và tính năng bị loại

- `Ebook Facebook Ads` phải rút gọn thành `Ebook`; kiểm tra Ebook trước Facebook trong mapper.
- Ẩn Email/Automation và mọi operator control không có luồng production đã xác minh.
- Không tạo mail composer mới. Email học viên chỉ đi qua provisioning flow đã có.
- Không thêm chart placeholder, NPS, ticket, campaign hoặc workflow demo.

## Phân rã code

- `components/crm-v2/lms/course-hub.tsx`: danh sách và create drawer.
- `components/crm-v2/lms/course-workspace.tsx`: shell editor và section routing.
- `components/crm-v2/lms/lms-ui.tsx`: UI primitives dùng chung.
- `components/crm-v2/lms-management-client.tsx`: giữ các focused editor section hiện có trong release này nhưng loại Course Hub/global enrollment trùng lặp; file sẽ tiếp tục được tách theo section nếu còn vượt ngưỡng dễ bảo trì sau khi dead code bị xóa.
- `components/crm-v2/dashboard-charts.tsx`: toàn bộ Recharts client components.
- `services/metaAdsReportService.ts`: Meta API adapter, mapping và fail-closed result.

## Acceptance criteria

1. Course Hub và Course Workspace là hai URL khác nhau.
2. Hub không render form editor; workspace không render danh sách/tạo khóa.
3. Chỉ section LMS đang chọn xuất hiện.
4. Không còn raw add enrollment form; tạo học viên dùng provisioning drawer thật.
5. Ebook không hiển thị thành FB Ads.
6. Cài đặt ở trong CRM shell.
7. Primary navigation không có Email/Automation hoặc module giả.
8. Dashboard có area, donut và horizontal bar; today có 24 bucket giờ.
9. Ads chỉ hiển thị dữ liệu Meta thật hoặc unavailable state.
10. Full Node, TypeScript, lint, build, Chromium, preflight và live smoke pass trước deploy.
