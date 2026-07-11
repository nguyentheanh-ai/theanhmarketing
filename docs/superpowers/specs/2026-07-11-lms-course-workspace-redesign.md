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

## 4. Kiến trúc trải nghiệm

### 4.1 Course Hub

`/admin/khoa-hoc` trở thành màn hình trung tâm với:

- Tìm kiếm khóa học.
- Bộ lọc: Tất cả, Đang bán, Bản nháp, Lưu trữ.
- Chỉ số thật: tổng khóa, tổng học viên có quyền, khóa cần xử lý.
- Danh sách/card khóa học gồm ảnh, tên, trạng thái, số module, số bài, số học viên và tỷ lệ hoàn thành nếu dữ liệu đủ.
- Hành động chính: `Tạo khóa học`.
- Hành động theo khóa: Mở builder, xem trang học viên, nhân bản nếu backend được hỗ trợ, lưu trữ.

Không hiển thị doanh thu, tỷ lệ hoàn thành hoặc cảnh báo nếu truy vấn tương ứng không tồn tại hoặc chưa được xác minh.

### 4.2 Course Workspace

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

### 4.3 Curriculum Builder

Curriculum dùng bố cục hai cột:

- Trái: danh sách module và bài học, có thu gọn/mở rộng và kéo thả.
- Phải: editor của module hoặc bài học đang chọn.

Hành động được hỗ trợ:

- Thêm, đổi tên, sắp xếp và xóa module.
- Thêm, nhân bản, sắp xếp và xóa bài học khi backend hỗ trợ an toàn.
- Chỉnh tiêu đề, video URL/embed, thời lượng, nội dung, quyền xem thử và tài liệu.
- Preview bài học mà không rời builder.

Xóa module hoặc bài học phải có xác nhận cụ thể và không được gây mất dữ liệu ngoài đối tượng được chọn.

## 5. Visual system

Hướng **Executive Operating System**:

- Canvas trung tính sáng; card trắng hoặc surface rõ ràng.
- Text chính dùng slate rất đậm, text phụ đủ tương phản; không dùng chữ và nền cùng tông nhạt.
- Xanh cobalt là màu hành động và trạng thái chủ đạo, không phủ toàn bộ card.
- Border nhẹ, shadow tiết chế, bo góc vừa phải; giảm kiểu `rounded-3xl` trên mọi thành phần.
- Mật độ giống phần mềm quản trị: compact ở bảng/list, rộng hơn ở khu vực ra quyết định.
- Một khu vực chỉ có tối đa một primary CTA.
- Trạng thái không chỉ phân biệt bằng màu; luôn có nhãn hoặc icon.
- Body text nhỏ phải đạt tối thiểu WCAG 4.5:1.

## 6. Thành phần kỹ thuật

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

## 7. Dữ liệu và lưu thay đổi

### 7.1 Đọc dữ liệu

- Supabase là nguồn chính.
- Không dùng fallback giả cho màn admin nếu dữ liệu thật lỗi.
- Mỗi khu vực có trạng thái loading, empty và error riêng.
- Không để lỗi analytics làm khóa Course Builder.

### 7.2 Ghi dữ liệu

- Lưu course metadata riêng.
- Module, lesson và resource dùng create/update/delete theo đối tượng thay đổi.
- Không xóa toàn bộ `course_modules` rồi tạo lại khi chỉ sửa một trường.
- Sắp xếp dùng `sort_order` và cập nhật tối thiểu các row bị ảnh hưởng.
- Autosave có debounce, trạng thái `Đang lưu`, `Đã lưu`, `Lỗi lưu` và nút thử lại.
- Dữ liệu đang nhập không bị xóa khỏi UI khi request thất bại.
- Publish là hành động riêng, có checklist và xác nhận.

### 7.3 An toàn đồng thời

Vì hiện tại chủ yếu một người vận hành, không xây collaborative editing phức tạp. Tuy nhiên update phải dùng `updated_at` hoặc cơ chế tương đương để phát hiện dữ liệu đã thay đổi ở nơi khác trước khi ghi đè.

## 8. Error handling

- Lỗi theo từng phần, không biến toàn màn hình thành lỗi chung.
- Message cho người dùng bằng tiếng Việt, nêu rõ đối tượng và hành động thất bại.
- Log server chỉ ghi source/action/error code cần thiết, không ghi secret hoặc nội dung nhạy cảm.
- Upload lỗi không làm mất URL cũ.
- Reorder lỗi phải rollback thứ tự trên UI hoặc tải lại thứ tự từ server.
- Publish lỗi giữ nguyên draft và hiển thị checklist chưa đạt.

## 9. Kiểm thử và tiêu chí hoàn thành

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

## 10. Trình tự triển khai

1. Thiết lập design tokens và shell Executive Operating System cho khu vực LMS.
2. Tách Course Hub khỏi editor cũ.
3. Tạo Course Workspace và điều hướng bước tự do.
4. Chuyển metadata, sales và media sang các bước riêng.
5. Thay curriculum save-all bằng cập nhật theo đối tượng.
6. Thêm autosave, error recovery và publish checklist.
7. Kết nối học viên/tiến độ và analytics thật.
8. Browser QA, full gate và deploy production có kiểm soát.

## 11. Công việc kế tiếp ngoài spec này

Sau khi LMS hoàn tất và ổn định:

1. Audit Dashboard chính để đo lag, xác định dữ liệu hoặc hành động ảo và loại bỏ/fix từng mục.
2. Audit song song admin cũ và `/admin/crm-v2`.
3. Lấy CRM v2 làm nền hợp nhất vì chức năng thực tế hiện tốt hơn.
4. Lập mapping route, chức năng và dữ liệu trước khi chuyển người dùng từ admin cũ.
5. Không xóa admin cũ cho đến khi mọi chức năng cần giữ đã có bằng chứng tương đương trong CRM v2 và có kế hoạch rollback.

Dashboard performance repair và CRM consolidation là hai spec riêng, không được gộp vào implementation plan của LMS.
