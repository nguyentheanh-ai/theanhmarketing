# Admin Foundation and CRM Consolidation Design

Ngày: 2026-07-11  
Project: `theanh-main`  
Canonical foundation: CRM v2  
Visual direction: Executive Operating System

## 1. Quyết định

CRM v2 trở thành nền admin duy nhất vì đã có data layer, API action, functional audit, contract tests và nhiều chức năng thật hơn admin cũ. Solo Command Center hiện tại không tiếp tục là entry point vì phiên authenticated đã tái hiện thời gian chuyển route vượt 30 giây và giao diện đang trộn quá nhiều nguồn/biểu đồ trước khi hiển thị.

Không xây admin thứ ba. Không xóa code cũ ngay. Hợp nhất bằng route, shell, navigation và component foundation trước; chỉ archive code cũ sau khi có bằng chứng tương đương và rollback.

## 2. Mục tiêu

- Một entry point admin.
- Một sidebar/navigation.
- Một visual system có tương phản rõ.
- Một nguồn dữ liệu và action contract cho mỗi nghiệp vụ.
- Dashboard tải nhanh, chỉ hiển thị dữ liệu thật và hành động hoạt động.
- CRM, LMS và các module sau dùng chung shell/tokens/components.
- Các route cũ vẫn an toàn qua redirect hoặc compatibility page.

## 3. Bằng chứng audit

### Dashboard hiện tại

- `/admin/dashboard` dùng Solo Command Center và tải đồng thời orders, leads, courses, enrollments và activity.
- Các nguồn có pagination/aggregate riêng, sau đó render nhiều chart client-side.
- Chuyển authenticated từ CRM v2 sang dashboard vượt quá 30 giây trong audit browser ngày 2026-07-11.
- Visual hierarchy dùng nhiều surface gần màu nhau, card bo lớn và text phụ nhạt.

### CRM v2

- Có các route/API thật cho leads, orders, students/LMS, reports, email, automation, activity, segments, team và integrations.
- Có functional audit và contract tests fail-closed cho production.
- Demo data bị chặn trong production.
- Data layer đã được tối ưu trước đây; tài liệu ghi nhận TTFB khoảng 0.4–0.7 giây cho các route chính sau khi bỏ duplicate fetch.
- LMS manager CRM v2 đã có CRUD/API thật và tốt hơn editor `/admin/khoa-hoc` cũ.

### Trùng lặp

- `/admin/leads` và `/admin/crm-v2/leads`.
- `/admin/don-hang` và `/admin/crm-v2/orders`.
- `/admin/hoc-vien` và `/admin/crm-v2/students`.
- `/admin/khoa-hoc` và `/admin/crm-v2/students?view=courses`.
- `/admin/bao-cao` và `/admin/crm-v2/reports`.
- `AdminShell` và `CrmShell`.

## 4. Canonical route map

| Nghiệp vụ | Canonical route | Compatibility route |
| --- | --- | --- |
| Tổng quan | `/admin/crm-v2` | `/admin`, `/admin/dashboard` redirect |
| Khách hàng/Lead | `/admin/crm-v2/leads` | `/admin/leads` redirect |
| Đơn hàng | `/admin/crm-v2/orders` | `/admin/don-hang` redirect |
| Học viên | `/admin/crm-v2/students` | `/admin/hoc-vien` redirect |
| Khóa học | `/admin/crm-v2/students?view=courses` | `/admin/khoa-hoc` redirect |
| Báo cáo | `/admin/crm-v2/reports` | `/admin/bao-cao` redirect |
| Hoạt động | `/admin/crm-v2/activity` | `/admin/viec-can-xu-ly` giữ compatibility cho đến khi task queue tương đương |
| Email | `/admin/crm-v2/email` | `/admin/remarketing` chỉ redirect sau khi email template parity được test |
| Automation | `/admin/crm-v2/automation` | Không tạo route thứ hai |
| Cài đặt | `/admin/cai-dat` + advanced CRM links | Giữ route hiện tại |

Editor role đi thẳng vào canonical course route. Owner đi vào canonical dashboard.

## 5. Shared Admin Operating Shell

Tạo một shell dùng chung dựa trên CRM v2 shell, đổi thành ngôn ngữ Executive Operating System.

### Navigation chính

1. Tổng quan.
2. Khách hàng.
3. Đơn hàng.
4. Học viên.
5. Khóa học.
6. Email.
7. Automation.
8. Báo cáo.
9. Cài đặt.

Activity xuất hiện dưới dạng shortcut/badge tại Tổng quan thay vì một mục lớn nếu không cần. Segments, Team và Integrations chuyển vào nhóm `Nâng cao` để giảm nhiễu cho mô hình một người.

### Visual rules

- Canvas `#f4f6f9` hoặc neutral tương đương.
- Primary text slate gần đen; body text tối thiểu WCAG 4.5:1.
- Card trắng, border rõ, shadow nhẹ; không dùng surface và text cùng tông nhạt.
- Cobalt chỉ dùng cho active navigation, CTA chính và trạng thái quan trọng.
- Radius vừa phải; bảng/list compact hơn hero/KPI.
- Một primary CTA cho mỗi vùng.
- Loading, empty, error và disabled state có message rõ.

## 6. Canonical Dashboard

Dashboard dùng `getCrmV2Dashboard(query)` làm nguồn chính, không dùng `getSoloCommandCenterModel()` cho entry point.

### Nội dung

- Header: khoảng ngày, refresh, tạo học viên.
- KPI thật: doanh thu paid, đơn paid, lead mới, học viên mới.
- Revenue trend từ paid public orders.
- Funnel từ lead → chờ thanh toán → paid → enrollment.
- Việc cần xử lý từ task/activity thật; không tạo text action không có destination.
- Hoạt động gần đây từ event sources đã hợp nhất.
- Khóa học top chỉ hiển thị khi có dữ liệu doanh thu thật.

### Không hiển thị

- Email open/click nếu tracking/event source không đủ.
- Workflow status nếu không có workflow thật.
- Campaign card không có action destination.
- KPI suy đoán, demo, placeholder hoặc fallback số 0 giả.

### Performance budget

- Server route target: TTFB dưới 1.5 giây production ở điều kiện bình thường.
- Không duplicate dashboard fetch.
- Không chạy unbounded query.
- Chart client bundle chỉ tải khi viewport/module cần.
- Không block dashboard vì một nguồn phụ lỗi.
- Dashboard phải render skeleton/partial state thay vì trắng màn hình.

## 7. Hợp nhất chức năng

### Giữ và ưu tiên

- CRM v2 unified leads/customer pipeline.
- CRM v2 orders và payment recovery actions.
- CRM v2 students và LMS APIs.
- CRM v2 email workspace với confirmation guard.
- CRM v2 reports dùng live range query.
- CRM v2 automation có API/action thật.
- Owner permission safeguards.

### Giữ tạm để kiểm tra parity

- Solo provisioning queue và ambiguous-email review.
- Legacy student creation wizard nếu CRM v2 chưa cung cấp cùng guardrails.
- Legacy `/admin/viec-can-xu-ly` cho đến khi task queue được đưa vào canonical dashboard.
- Legacy settings/CMS routes không trùng CRM.

### Ẩn khỏi navigation chính

- Module không phục vụ vận hành hằng ngày.
- Nút chỉ gọi mock-safe/no-op.
- Action thiếu backend, thiếu destination hoặc chỉ có placeholder response.
- Team/integrations/segments khi không có nhu cầu trực tiếp; vẫn truy cập trong Advanced nếu đã verified.

## 8. LMS sau consolidation

Không dùng `components/admin/course-editor.tsx` làm entry point. `/admin/khoa-hoc` redirect sang CRM v2 LMS.

LMS Course Workspace sẽ refactor `components/crm-v2/lms-management-client.tsx` và API hiện có theo spec LMS đã duyệt:

- Course Hub.
- Các bước chuyển tự do.
- Curriculum hai cột.
- Autosave theo đối tượng.
- Students/progress/analytics thật.
- Publish checklist.

Không tạo schema hoặc API LMS song song.

## 9. Error handling và rollback

- Redirects được kiểm tra auth và role.
- Khi CRM v2 feature flag off, compatibility routes phải fail rõ hoặc dùng rollback route đã định; không rơi vào 404.
- Không xóa legacy page/component trong release đầu.
- Mỗi API action giữ fail-closed production behavior.
- Lỗi nguồn phụ không làm dashboard mất toàn bộ dữ liệu.
- Có rollback bằng backup branch và deployment trước đó.

## 10. Testing

### Contract tests

- Canonical route redirects.
- CRM v2 production demo guard.
- Navigation chỉ chứa verified destinations.
- Dashboard không import Solo Command Center model.
- Old routes không 404.
- Editor/owner routing.

### Functional tests

- Dashboard live data and range.
- Lead/order/student/LMS actions.
- Email confirmation and suppression guards.
- Provisioning queue parity trước khi bỏ compatibility page.
- LMS create/edit/reorder/publish.

### Browser tests

- Authenticated owner desktop/mobile.
- No page overflow.
- Contrast and readable text.
- Every visible CTA navigates or performs a verified action.
- Performance timing for Dashboard, Leads, Orders, Students and Courses.
- No console/runtime errors.

### Production gates

- Protected-route preflight.
- Full Node tests, CRM tests, TypeScript, lint and build.
- Vercel deploy through central guard.
- Authenticated smoke after deploy.
- Runtime log review.

## 11. Delivery sequence

1. Add route/navigation contract tests.
2. Make CRM v2 canonical entry and compatibility redirects.
3. Redesign shared CRM shell as Admin Operating Shell.
4. Redesign CRM dashboard with real-data-only modules and performance budget.
5. Merge provisioning/task shortcuts without losing safety flows.
6. Refactor CRM v2 LMS using the approved LMS spec.
7. Remove fake/non-operational controls from visible UI.
8. Run full verification and deploy.

Legacy code deletion is a later cleanup release, not part of this rollout.
