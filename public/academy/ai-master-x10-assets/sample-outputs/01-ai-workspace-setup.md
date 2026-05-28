# 01 - AI Workspace Setup

## Mục tiêu
Tạo một workspace AI cho sản phẩm tri thức để ChatGPT, Gemini/Gem, GPT riêng hoặc agent không phải đoán lại bối cảnh mỗi lần làm việc.

## Khi nào dùng
- Khi đã có thị trường, khách hàng mục tiêu, offer hoặc cấu trúc khóa học nháp.
- Khi muốn dùng AI để viết content, landing page, script bài giảng, slide, workbook và kịch bản bán hàng nhất quán.
- Khi đang bị tình trạng hỏi AI từng câu rời rạc, output mỗi lần một kiểu.

## Đầu vào cần chuẩn bị
- `market-insight.md`: chân dung khách hàng, pain point, mong muốn, phản đối.
- `business-map.md`: khách hàng, vấn đề, kết quả, sản phẩm phễu, sản phẩm chính, sản phẩm cao hơn, kênh bán, giao hàng, chăm sóc.
- `offer.md`: lời hứa, đối tượng, thời gian, phương pháp, bonus, bằng chứng, cam kết giảm rủi ro.
- `course-structure.md`: chương, bài, đầu ra từng bài, bài tập và tài liệu đi kèm.
- `brand-voice.md`: giọng thương hiệu, từ nên dùng, từ không dùng, ví dụ câu nói mẫu.
- `sales-script.md`: kịch bản tư vấn, FAQ, objection library.

## Quy trình setup
1. Tạo một folder/project riêng cho sản phẩm, ví dụ `AI Master X10 - Beta Launch`.
2. Đưa 6 file nền vào workspace theo đúng tên ở phần đầu vào.
3. Viết project instruction:
   - Luôn viết cho người học là chuyên gia, coach, freelancer hoặc chủ kinh doanh nhỏ.
   - Không bịa testimonial, doanh thu, ảnh học viên hoặc cam kết kết quả.
   - Mỗi output phải có mục tiêu, đầu vào, bước làm, đầu ra và checklist.
   - Ưu tiên Attract, Grow, Scale: content kéo khách, offer/landing tạo chuyển đổi, CRM/follow-up để scale.
4. Tạo ít nhất 6 assistant/prompt vai trò:
   - Research Agent: phân tích insight, đối thủ, thị trường.
   - Offer Agent: viết lời hứa, bonus, FAQ, giảm rủi ro.
   - Content Agent: tạo pillar, hook, CTA, lịch đăng.
   - Lesson Agent: viết script bài giảng, slide outline, workbook.
   - Landing Agent: viết landing page outline, section copy, checklist test.
   - CRM Agent: tạo pipeline, follow-up, objection handling.
5. Lưu prompt mẫu cho từng agent vào một file riêng hoặc trong project instruction.
6. Test workspace bằng một yêu cầu thật: `Hãy tạo 10 angle content cho offer hiện tại, mỗi angle có pain, hook, CTA và mục tiêu funnel.`
7. Nếu AI trả lời chung chung, bổ sung thêm insight, ví dụ thật hoặc quy tắc giọng văn vào file nền.

## Prompt mẫu
```text
Bạn là [vai trò agent]. Hãy dùng toàn bộ context trong workspace để tạo output cho sản phẩm tri thức này.

Yêu cầu:
- Không viết chung chung.
- Không bịa bằng chứng.
- Mỗi đề xuất phải gắn với offer, khách hàng mục tiêu và mục tiêu funnel.
- Output gồm: mục tiêu, bản nháp, checklist kiểm tra, bước tiếp theo.

Nhiệm vụ hôm nay: [mô tả nhiệm vụ].
```

## Đầu ra cần có
- Một AI Project Workspace có đủ file context nền.
- 6 assistant/prompt vai trò có thể dùng lại.
- Một output test đầu tiên đã được AI tạo dựa trên đúng context.

## Checklist hoàn thành
- [ ] Workspace có đủ 6 file nền.
- [ ] Project instruction đã ghi rõ đối tượng, offer, giọng văn và quy tắc không bịa proof.
- [ ] Có ít nhất 6 assistant/prompt vai trò.
- [ ] Đã test một nhiệm vụ thật và output bám đúng sản phẩm.
- [ ] File/prompt được đặt tên rõ để học viên dùng lại.
