# LMS Course Workspace Redesign

Ngày: 2026-07-11  
Project: `theanh-main`  
Route chính: `/admin/khoa-hoc`

## 1. Mục tiêu

Thay màn quản lý khóa học hiện tại bằng một LMS Course Workspace hiện đại, dễ vận hành cho mô hình kinh doanh một người. Giao diện lấy hướng thiết kế **Executive Operating System** đã được duyệt và học các pattern hữu ích từ Tutor LMS, nhưng không sao chép giao diện WordPress hoặc đưa vào các tính năng chưa cần thiết.

Kết quả cần đạt:

- Nhìn được toàn bộ khóa học, trạng thái, học viên, tiến độ và việc cần xử lý từ một Course Hub.
- Tạo và chỉnh sửa khóa học theo các bước có thứ tự rõ ràng nhưng được chuyển tự do, không bắt buộc hoàn thành tuần tự.
- Chỉnh curriculum nhanh bằng cấu trúc `Khóa học → Module → Bài học`.
- Tự lưu theo từng phần, không xóa và tạo lại toàn bộ module/bài học mỗi lần lưu.
- Theo dõi học viên, quyền học, tiến độ, doanh thu và hoạt động theo từng khóa.
- Chỉ hiển thị dữ liệu và hành động thật; không tạo KPI hoặc nút không có backend hoạt động.

## 2. Phạm vi đã duyệt

Bao gồm:

- Course Hub.
- Course Builder theo từng bước.
- Curriculum Builder.
- Lesson Editor cho video, nội dung, thời lượng, quyền xem thử và tài liệu đính kèm.
- Quản lý học viên và quyền học theo khóa.
- Analytics theo khóa dựa trên dữ liệu hiện có.
- Draft, autosave, preview và publish checklist.
- Giữ các chức năng import/export hiện có trong khu vực nâng cao nếu chúng vẫn an toàn và có nhu cầu thực tế.

Không bao gồm trong giai đoạn này:

- Quiz.
- Assignment và chấm điểm.
- Chứng chỉ.
- Review/rating.
- Instructor marketplace.
- AI tạo khóa học tự động.
- Content Bank đầy đủ kiểu Tutor LMS.

Các mục ngoài phạm vi chỉ được chuẩn bị ranh giới kiến trúc để có thể bổ sung sau, không tạo UI giả.

## 3. Nghiên cứu tham chiếu

Các pattern lấy từ Tutor LMS:

- Course list có trạng thái Published/Draft, tìm kiếm, lọc và thao tác theo từng khóa.
- Curriculum trực quan theo topic/module, lesson và tài liệu.
- Kéo thả để sắp xếp curriculum.
- Lesson editor tách khỏi course metadata.
- Analytics đi từ tổng quan đến từng khóa và từng học viên.
- Publish flow có kiểm tra dữ liệu cần thiết.

Các điểm không lấy:

- Cấu trúc menu và visual style của WordPress.
- Quá nhiều setting và add-on trên cùng một màn hình.
- Luồng bắt buộc tuần tự làm chậm việc sửa một bài học cũ.

## 4. Giai đoạn tiên quyết: Admin Foundation, Dashboard và CRM

Không triển khai LMS ngay trên Admin Shell hiện tại. Trước LMS phải hoàn thành một chương trình nền tảng riêng để chốt dashboard và hợp nhất hướng vận hành admin.

### 4.1 Audit bắt buộc

- Đo thời gian tải và thời gian tương tác của Dashboard chính bằng browser và Vercel runtime evidence.
- Liệt kê mọi KPI, biểu đồ, CTA và shortcut; phân loại `Hoạt động thật`, `Lỗi`, `Placeholder/ảo`, `Không còn cần`.
- Lập ma trận chức năng giữa admin cũ và `/admin/crm-v2` theo route, dữ liệu, hành động, quyền, test và mức độ sử dụng thực tế.
- Xác định module nào của CRM v2 đã tốt hơn và module nào của admin cũ vẫn phải giữ.
- Truy vết nguồn dữ liệu của từng màn hình; không công nhận một tính năng chỉ vì UI tồn tại.

### 4.2 Quyết định kiến trúc

- CRM v2 là ứng viên nền chính vì hiện có nhiều chức năng hoạt động hơn, nhưng quyết định cuối phải dựa trên ma trận audit.
- Chỉ có một Admin Shell, một navigation model, một design-token system và một nguồn component dùng chung.
- Chỉ có một entry point rõ cho mỗi nghiệp vụ; không để hai menu cùng dẫn đến hai phiên bản cạnh tranh.
- Route cũ được giữ làm compatibility route hoặc redirect có kiểm soát cho đến khi chức năng tương đương đã được xác minh.
- Không xóa code admin cũ trong giai đoạn audit hoặc chuyển tiếp.

### 4.3 Dashboard chuẩn làm nền

Dashboard được hoàn thiện trước LMS theo hướng **Executive Operating System** đã duyệt:

- Chỉ hiển thị dữ liệu thật và hành động có backend hoạt động.
- Ưu tiên việc cần xử lý, doanh thu, học viên, đơn hàng, lead và sức khỏe vận hành.
- Loại bỏ hoặc ẩn toàn bộ KPI, chart và CTA chưa có nguồn thật.
- Sửa lag dựa trên profiling, query count, payload size, render cost và cache behavior; không tối ưu bằng cảm giác.
- Shell, typography, contrast, spacing, card, table, filter, empty/error/loading state của Dashboard trở thành design foundation cho CRM và LMS.

### 4.4 Điều kiện mở khóa LMS

Chỉ bắt đầu implementation plan của LMS khi đã có:

- Audit report Dashboard.
- Feature/route matrix admin cũ và CRM v2.
- Quyết định canonical admin architecture.
- Dashboard design spec đã duyệt.
- Shared Admin Shell và design tokens đã triển khai, kiểm thử và ổn định.
- Kế hoạch compatibility/rollback cho các route admin cũ.

Admin Foundation và Dashboard/CRM consolidation phải có spec và implementation plan riêng. LMS giữ spec riêng nhưng bắt buộc xây trên foundation đã chốt.

## 5. Kiến trúc trải nghiệm

### 5.1 Course Hub

`/admin/khoa-hoc` trở thành màn hình trung tâm với:

- Tìm kiếm khóa học.
- Bộ lọc: Tất cả, Đang bán, Bản nháp, Lưu trữ.
- Chỉ số thật: tổng khóa, tổng học viên có quyền, khóa cần xử lý.
- Danh sách/card khóa học gồm ảnh, tên, trạng thái, số module, số bài, số học viên và tỷ lệ hoàn thành nếu dữ liệu đủ.
- Hành động chính: `Tạo khóa học`.
- Hành động theo khóa: Mở builder, xem trang học viên, nhân bản nếu backend được hỗ trợ, lưu trữ.

Không hiển thị doanh thu, tỷ lệ hoàn thành hoặc cảnh báo nếu truy vấn tương ứng không tồn tại hoặc chưa được xác minh.

### 5.2 Course Workspace

Khi tạo hoặc mở một khóa, giao diện có thanh bước:

1. Tổng quan.
2. Nội dung bán hàng.
3. Curriculum.
4. Media & tài liệu.
5. Học viên & quyền học.
6. Analytics.
7. Kiểm tra & xuất bản.

Quy tắc điều hướng:

- Các bước có thứ tự hướng dẫn nhưng đều bấm được tự do.
- Không bước nào khóa bước khác.
- Hệ thống ghi nhớ bước gần nhất của khóa trong URL hoặc state điều hướng ổn định.
- Mỗi bước có trạng thái `Chưa làm`, `Đang làm`, `Đủ điều kiện` dựa trên dữ liệu thật.
- Chỉ hành động `Xuất bản` kiểm tra các trường bắt buộc.

### 5.3 Curriculum Builder

Curriculum dùng bố cục hai cột:

- Trái: danh sách module và bài học, có thu gọn/mở rộng và kéo thả.
- Phải: editor của module hoặc bài học đang chọn.

Hành động được hỗ trợ:

- Thêm, đổi tên, sắp xếp và xóa module.
- Thêm, nhân bản, sắp xếp và xóa bài học khi backend hỗ trợ an toàn.
- Chỉnh tiêu đề, video URL/embed, thời lượng, nội dung, quyền xem thử và tài liệu.
- Preview bài học mà không rời builder.

Xóa module hoặc bài học phải có xác nhận cụ thể và không được gây mất dữ liệu ngoài đối tượng được chọn.

## 6. Visual system

Hướng **Executive Operating System**:

- Canvas trung tính sáng; card trắng hoặc surface rõ ràng.
- Text chính dùng slate rất đậm, text phụ đủ tương phản; không dùng chữ và nền cùng tông nhạt.
- Xanh cobalt là màu hành động và trạng thái chủ đạo, không phủ toàn bộ card.
- Border nhẹ, shadow tiết chế, bo góc vừa phải; giảm kiểu `rounded-3xl` trên mọi thành phần.
- Mật độ giống phần mềm quản trị: compact ở bảng/list, rộng hơn ở khu vực ra quyết định.
- Một khu vực chỉ có tối đa một primary CTA.
- Trạng thái không chỉ phân biệt bằng màu; luôn có nhãn hoặc icon.
- Body text nhỏ phải đạt tối thiểu WCAG 4.5:1.

## 7. Thành phần kỹ thuật

Tách `components/admin/course-editor.tsx` hiện tại thành các đơn vị có trách nhiệm rõ:

- `CourseHub` — danh sách, tìm kiếm và lọc.
- `CourseWorkspaceShell` — header, bước, trạng thái lưu và preview.
- `CourseOverviewStep` — metadata chính.
- `CourseSalesStep` — mô tả, giá, CTA và trạng thái bán.
- `CurriculumBuilder` — cây module/bài học và sắp xếp.
- `LessonEditor` — nội dung bài học và tài liệu.
- `CourseMediaStep` — thumbnail, banner và preview video.
- `CourseStudentsStep` — enrollment, quyền học và tiến độ.
- `CourseAnalyticsStep` — số liệu có nguồn thật.
- `CoursePublishReview` — checklist và publish/archive.

Các component giao tiếp qua type và action rõ ràng; không dùng một state object khổng lồ cho toàn bộ màn hình.

## 8. Dữ liệu và lưu thay đổi

### 8.1 Đọc dữ liệu

- Supabase là nguồn chính.
- Không dùng fallback giả cho màn admin nếu dữ liệu thật lỗi.
- Mỗi khu vực có trạng thái loading, empty và error riêng.
- Không để lỗi analytics làm khóa Course Builder.

### 8.2 Ghi dữ liệu

- Lưu course metadata riêng.
- Module, lesson và resource dùng create/update/delete theo đối tượng thay đổi.
- Không xóa toàn bộ `course_modules` rồi tạo lại khi chỉ sửa một trường.
- Sắp xếp dùng `sort_order` và cập nhật tối thiểu các row bị ảnh hưởng.
- Autosave có debounce, trạng thái `Đang lưu`, `Đã lưu`, `Lỗi lưu` và nút thử lại.
- Dữ liệu đang nhập không bị xóa khỏi UI khi request thất bại.
- Publish là hành động riêng, có checklist và xác nhận.

### 8.3 An toàn đồng thời

Vì hiện tại chủ yếu một người vận hành, không xây collaborative editing phức tạp. Tuy nhiên update phải dùng `updated_at` hoặc cơ chế tương đương để phát hiện dữ liệu đã thay đổi ở nơi khác trước khi ghi đè.

## 9. Error handling

- Lỗi theo từng phần, không biến toàn màn hình thành lỗi chung.
- Message cho người dùng bằng tiếng Việt, nêu rõ đối tượng và hành động thất bại.
- Log server chỉ ghi source/action/error code cần thiết, không ghi secret hoặc nội dung nhạy cảm.
- Upload lỗi không làm mất URL cũ.
- Reorder lỗi phải rollback thứ tự trên UI hoặc tải lại thứ tự từ server.
- Publish lỗi giữ nguyên draft và hiển thị checklist chưa đạt.

## 10. Kiểm thử và tiêu chí hoàn thành

### Automated

- Unit test cho publish checklist và trạng thái từng bước.
- Unit test cho cập nhật tối thiểu module/lesson/resource.
- Unit test cho reorder và rollback.
- Integration test cho create/edit/archive course.
- Integration test cho autosave lỗi và retry.
- Test quyền owner/editor hiện có.
- Lint, TypeScript, test suite và production build.

### Browser verification

- Course Hub hiển thị dữ liệu thật.
- Tạo draft mới và quay lại đúng bước gần nhất.
- Chuyển bước tự do.
- Thêm/sửa/sắp xếp module và bài học không làm mất dữ liệu khác.
- Upload media và tài liệu có trạng thái rõ.
- Preview đúng nội dung.
- Học viên và analytics theo khóa khớp nguồn dữ liệu.
- Không có text mờ, box cùng màu hoặc CTA không hoạt động.
- Desktop và mobile không vỡ layout.

### Production safety

- Không deploy từ folder khác source of truth.
- Chạy website preflight và full gate.
- Smoke toàn bộ route protected theo Website Deploy Contract.
- Không push Git nếu chưa được yêu cầu.

## 11. Trình tự chương trình

### Chương trình 1 — Admin Foundation

1. Audit Dashboard chính.
2. Audit admin cũ và `/admin/crm-v2`.
3. Chốt canonical admin architecture và route/function mapping.
4. Viết và duyệt Dashboard/CRM foundation spec.
5. Triển khai Shared Admin Shell, design tokens và Dashboard thật.
6. Hợp nhất navigation và entry point; giữ compatibility route có rollback.
7. Browser QA, performance verification, full gate và deploy có kiểm soát.

### Chương trình 2 — LMS Course Workspace

1. Tách Course Hub khỏi editor cũ trên Shared Admin Shell đã chốt.
2. Tạo Course Workspace và điều hướng bước tự do.
3. Chuyển metadata, sales và media sang các bước riêng.
4. Thay curriculum save-all bằng cập nhật theo đối tượng.
5. Thêm autosave, error recovery và publish checklist.
6. Kết nối học viên/tiến độ và analytics thật.
7. Browser QA, full gate và deploy production có kiểm soát.

### Chương trình 3 — Các module admin còn lại

Sau khi Dashboard foundation và LMS ổn định, học viên, đơn hàng, lead, báo cáo và cài đặt được chuẩn hóa lần lượt trên cùng shell, tokens, table/filter patterns và quy tắc chỉ dùng dữ liệu/hành động thật.
