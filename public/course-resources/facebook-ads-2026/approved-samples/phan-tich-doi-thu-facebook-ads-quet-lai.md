# Phân Tích Đối Thủ Meta Ad Library - Khóa Học / Ebook Facebook Ads

Ngày tạo: 2026-07-06  
Agent chính: Agent - Business Assistant  
Skill áp dụng trong bộ kit: `competitor-and-market-map` + `competitor-analysis`  
Nguồn: Meta Ad Library, quét bằng Codex Browser  
Sản phẩm tham chiếu: Ebook / tài liệu online "Tất tần tật về Facebook Ads 2026"  
Giá sản phẩm tham chiếu: 399.000đ  

## 0. Kết Luận Sửa Logic

Bản này sửa lại đúng theo yêu cầu: keyword không phải là kết quả nghiên cứu cuối cùng. Keyword chỉ là cửa vào để tìm ra các fanpage / đối thủ đang quảng cáo trong ngành.

Quy trình đúng:

1. Tìm nhiều keyword liên quan đến ngành.
2. Lọc kết quả để lấy fanpage / thương hiệu / đối thủ thật.
3. Loại quảng cáo sai ngành, nhiễu hoặc không liên quan.
4. Vào từng đối thủ đủ liên quan để phân tích số lượng ads, thời gian chạy, CTA, angle, phễu và khoảng trống thị trường.
5. Lưu kết quả để Agent Marketing, Agent Ads Setup và Agent Ads Report dùng lại.

Lưu ý trạng thái: bản thử lại này đã quét thật 6 keyword trọng tâm và 3 hướng fanpage. Khi chạy production cho khách, Agent phải quét tối thiểu 20 keyword theo batch nhỏ, lưu sau từng batch để tránh lỗi timeout.

## 1. Keyword Scan Log

| Keyword | Kết quả nhìn thấy | Mức liên quan | Xử lý |
|---|---:|---|---|
| `khóa học facebook ads` | khoảng 590 kết quả | Cao | Giữ lại. Ra nhiều đối thủ trực tiếp như EQVN, lớp quảng cáo Biên Hòa, Nam Keeng. |
| `facebook ads cho chủ shop` | khoảng 260 kết quả | Khá cao | Giữ lại. Có EQVN, KakaOnline, Haravan và các bên liên quan đến bán hàng / TMĐT. |
| `facebook ads master` | khoảng 350 kết quả | Trung bình | Chỉ dùng tham khảo. Có kết quả quốc tế và nhiều nhiễu game / free course. |
| `học chạy quảng cáo facebook` | khoảng 5.500 kết quả | Thấp | Loại khỏi nhóm keyword chính vì nhiễu nặng: spa, bệnh viện, hút hầm cầu, IELTS, pha chế. |
| `khóa học quảng cáo facebook cho người mới` | khoảng 5.700 kết quả | Thấp | Loại khỏi nhóm keyword chính vì kết quả quá rộng, nhiều ngành không liên quan. |
| `quảng cáo facebook tốn tiền không hiệu quả` | khoảng 6.700 kết quả | Thấp | Loại khỏi nhóm keyword chính. Đây là insight tốt để viết content, nhưng không tốt để tìm đối thủ. |

### 1.1. Kiểm fanpage Nguyễn Thế Anh

| Cách tìm | Kết quả | Nhận định |
|---|---|---|
| Tìm `Nguyễn Thế Anh` | khoảng 50.000 kết quả | Quá nhiễu, không dùng làm route chính. |
| Tìm `ntheanh.marketing` | không trích xuất được card ads rõ ràng trong phiên này | Có thể không có ads active hiển thị theo route này, hoặc Ad Library không trả đúng page qua search text. |
| Mở theo page ID `61553890715057` | không trích xuất được card ads rõ ràng trong phiên này | Cần kiểm thêm thủ công nếu cần xác nhận tuyệt đối. Không kết luận chắc chắn là page không chạy ads. |

## 2. Competitor Map

| Đối thủ / page | Loại đối thủ | Bằng chứng từ Ad Library | Mức ưu tiên | Ghi chú chiến lược |
|---|---|---|---|---|
| Eqvn.net | Trực tiếp / mạnh | Facebook page URL: `https://www.facebook.com/eqvn.net/`. Nhiều ads xuất hiện ở các keyword chính. Ads bắt đầu từ 31/10/2025, 06/11/2025, 14/01/2026, 27/02/2026, 22/05/2026. | Rất cao | Đang bán hướng khóa học Digital Marketing rộng, tích hợp AI, 9 công cụ, CTA Messenger + website. |
| Dạy quảng cáo FB Ads - Google - Tiktok tại Biên Hòa | Trực tiếp / địa phương | Library ID `733217391850418`, bắt đầu 24/01/2024, CTA Send message. | Cao | Định vị cầm tay chỉ việc, thành thạo sau 9 buổi, nhiều claim mạnh. |
| Nam Keeng | Trực tiếp / cá nhân | Library ID `913051318144824`, bắt đầu 27/02/2026, CTA Send message. | Cao | Dùng câu chuyện kết quả đơn hàng rất mạnh: 3 đơn/ngày so với 300 đơn/ngày. Rủi ro claim cao. |
| KakaOnline VN | Gián tiếp / TMĐT | Library ID `2483680542049428`, bắt đầu 05/02/2026. | Trung bình | Không bán khóa FB Ads trực diện, nhưng đánh vào chủ shop, vận hành TMĐT, chốt đơn thấp. |
| Haravan | Gián tiếp / nền tảng SME | Library ID `1385159810131561`, bắt đầu 03/06/2026. | Trung bình | Dùng angle AI bán hàng / trợ lý tự động cho chủ shop. Là tín hiệu thị trường về AI trong vận hành. |
| Ads Marketing Việt Nam | Gián tiếp / dịch vụ ads | Library ID từng ghi nhận: `3936308413316968`, bắt đầu 30/06/2025. | Trung bình | Dịch vụ chạy ads giá thấp / cam kết mạnh, cạnh tranh với nhóm khách không muốn tự học. |
| Max Business School | Gián tiếp / quốc tế | Library ID `1540050851126285`, `1054095590522818`, bắt đầu 23/06/2026. | Thấp | Tham khảo phễu free course, không phải đối thủ Việt Nam chính. |
| Care Mentorship Mindanao - MMIO | Gián tiếp / quốc tế | Library ID `1462274661743093`, `1920915542088064`, `1340655980751824`, chạy từ 09-10/2025. | Thấp | Có workshop Facebook Ads + AI, dùng làm benchmark nội dung quốc tế. |

## 3. Phân Tích Từng Đối Thủ

### 3.1. Eqvn.net

**Vai trò trong thị trường:** đối thủ trực tiếp mạnh nhất trong batch đã quét.  

**Facebook page URL:** `https://www.facebook.com/eqvn.net/`

**Số lượng ads quan sát được:** ít nhất 7 mẫu khác nhau xuất hiện trong các keyword liên quan.  

**Thời gian chạy:** có ads bắt đầu từ 31/10/2025, 06/11/2025, 14/01/2026, 27/02/2026, 22/05/2026. Điều này cho thấy họ không chỉ test ngắn hạn mà có hệ thống campaign kéo dài nhiều tháng.

**CTA / mục tiêu phễu:**

- CTA phổ biến: Send message.
- Có ads gắn link website `eqvn.net/khoa-hoc-digital-marketing`.
- Phễu đang dùng: Messenger để tư vấn + website để giải thích khóa học.

**Angle chính:**

- Khóa học Digital Marketing cập nhật 2026.
- Tích hợp AI.
- Làm chủ 9 công cụ Digital Marketing.
- Không chỉ học từng công cụ rời rạc mà kết nối thành hệ thống.
- AI không tự tối ưu thay con người nếu không biết giao việc đúng.

**Nhận định về book / offer:**

Eqvn bán một chương trình học rộng. Điểm mạnh là cảm giác bài bản, nhiều công cụ, có thương hiệu đào tạo. Điểm yếu là có thể tạo cảm giác lớn, nặng, không dành cho người chỉ cần xử lý Facebook Ads ngay.

**Khoảng trống cho Ebook Facebook Ads 2026:**

Không nên đánh trực diện "đầy đủ hơn EQVN". Nên đánh vào sự gọn và đúng lúc:

- Không cần học 9 công cụ nếu vấn đề hiện tại là Facebook Ads đang đốt tiền.
- Khi cần tạo tệp, đọc chỉ số, setup Pixel, test, scale, remarketing thì mở đúng phần đó.
- Tài liệu online tra cứu nhanh phù hợp với người đang triển khai thật.

### 3.2. Dạy quảng cáo FB Ads - Google - Tiktok tại Biên Hòa

**Vai trò trong thị trường:** đối thủ trực tiếp ở nhóm khóa học thực hành địa phương.

**Ad quan sát được:** Library ID `733217391850418`.  
**Ngày bắt đầu:** 24/01/2024.  
**CTA:** Send message.

**Angle chính:**

- Thành thạo chạy quảng cáo Facebook sau 9 buổi học.
- Học cầm tay chỉ việc.
- Cam kết thực hành, cập nhật chính sách mới.
- Có nhắc AI, target, tối ưu chi phí, kháng tài khoản.

**Nhận định:**

Đối thủ này đánh vào người muốn có người chỉ trực tiếp. Đây là nhóm khách có thể chưa phù hợp với ebook nếu họ cần kèm tay 1-1. Tuy nhiên ebook vẫn có thể thắng ở nhóm muốn tài liệu tra cứu rẻ hơn, tự học linh hoạt hơn, không bị phụ thuộc lịch học.

**Rủi ro chính sách / copy:**

Các cụm như "chi phí thấp nhất", "thành thạo sau X buổi", "kháng tài khoản" dễ tạo kỳ vọng mạnh. Agent Marketing nên tránh bắt chước kiểu claim này khi viết cho khách.

### 3.3. Nam Keeng

**Vai trò trong thị trường:** đối thủ cá nhân / thực chiến, dùng câu chuyện tăng trưởng mạnh.

**Ad quan sát được:** Library ID `913051318144824`.  
**Ngày bắt đầu:** 27/02/2026.  
**CTA:** Send message.

**Angle chính:**

- Cùng là chạy ads nhưng kết quả khác nhau rất lớn.
- Có người 3 đơn/ngày, có người 300 đơn/ngày.
- Có case từ 10-15 đơn/ngày lên 400 đơn/ngày.

**Nhận định:**

Đây là kiểu quảng cáo đánh mạnh vào ham muốn tăng đơn. Nó có thể kéo inbox tốt, nhưng rủi ro là khách kỳ vọng kết quả nhanh. Với Ebook Facebook Ads 2026, mình không nên chạy theo hướng "mua ebook là tăng đơn ngay". Nên dùng insight sâu hơn: muốn tăng đơn bền thì phải đọc đúng dữ liệu, đúng tệp, đúng thông điệp, không chỉ chạy theo mẹo.

**Khoảng trống:**

- Đối thủ nói nhiều về kết quả.
- Mình có thể nói về hệ thống tạo ra khả năng kiểm soát kết quả.

### 3.4. KakaOnline VN

**Vai trò trong thị trường:** đối thủ gián tiếp, liên quan đến chủ shop / TMĐT.

**Ad quan sát được:** Library ID `2483680542049428`.  
**Ngày bắt đầu:** 05/02/2026.

**Angle chính:**

- Chủ shop vận hành TMĐT bị tỷ lệ chốt đơn thấp dù có chạy quảng cáo.
- Nhắc tới KOC, Affiliate, hệ thống bán hàng.

**Nhận định:**

Đây không phải đối thủ bán Facebook Ads trực tiếp, nhưng là đối thủ tranh cùng ngân sách học / cải thiện kinh doanh của chủ shop. Họ đánh vào kết quả kinh doanh cuối: chốt đơn thấp, vận hành chưa hiệu quả.

**Gợi ý cho Ebook:**

Content không nên chỉ nói "học Facebook Ads". Nên nối sang ngôn ngữ của chủ shop:

- Có tin nhắn nhưng sale không chốt.
- Có traffic nhưng không biết khách nào đáng chăm.
- Chạy ads mà không biết tệp nào ra tiền thật.

### 3.5. Haravan

**Vai trò trong thị trường:** đối thủ gián tiếp / nền tảng bán hàng cho SME.

**Ad quan sát được:** Library ID `1385159810131561`.  
**Ngày bắt đầu:** 03/06/2026.

**Angle chính:**

- Meta Business AI.
- Trợ lý bán hàng tự động.
- Tăng hiệu quả bán hàng cho chủ shop.

**Nhận định:**

Haravan cho thấy thị trường đang quen dần với thông điệp AI trong vận hành bán hàng. Với bộ Marketing Kit / Ebook / Agent, phần AI không nên nói chung chung. Nên chứng minh AI giúp làm gì cụ thể:

- đọc report,
- gợi ý target,
- tạo content theo voice,
- lưu thay đổi target / offer / media,
- so sánh kết quả để tối ưu lần sau.

## 4. Nhận Định Về Chiến Lược Chạy Của Thị Trường

### 4.1. Messenger vẫn là CTA quan trọng

Nhiều đối thủ dùng Send message. Điều này phù hợp với sản phẩm giáo dục / tư vấn vì khách thường cần hỏi trước khi mua.

Ứng dụng cho Ebook:

- Giai đoạn test có thể chạy Messenger để đọc câu hỏi thật của khách.
- Không nên chỉ tối ưu tin nhắn rẻ. Phải ghi lại khách hỏi gì, phản đối gì, có mua không.
- Sau khi có dữ liệu, mới đẩy mạnh sales landing page / purchase.

### 4.2. AI đang xuất hiện nhưng còn dễ bị dùng như nhãn dán

EQVN, Haravan và một số đối thủ đã đưa AI vào thông điệp. Tuy nhiên đa số đang nói AI ở mức "tích hợp AI", "AI hỗ trợ", "AI mới nhất".

Khoảng trống:

- Nói rõ AI nằm ở quy trình nào.
- AI giúp khách tiết kiệm bước nào.
- AI lưu dữ liệu gì để lần sau tối ưu tốt hơn.

### 4.3. Thị trường nhiều claim mạnh

Một số ads dùng claim về số đơn, chi phí thấp, thành thạo nhanh. Điều này có thể kéo chú ý nhưng cũng làm khách nghi ngờ.

Hướng an toàn cho sản phẩm của anh:

- Không hứa kết quả chắc chắn.
- Không nói mua ebook là chạy ads thắng.
- Nói đúng vai trò: tài liệu online để tra cứu, làm đúng bước, kiểm soát cách chạy và đọc dữ liệu tốt hơn.

## 5. Khoảng Trống Thị Trường

| Khoảng trống | Đối thủ đang làm | Cơ hội cho Ebook / Kit |
|---|---|---|
| Tài liệu tra cứu khi đang làm thật | Đối thủ bán khóa học, workshop, dịch vụ | Định vị là tài liệu online search được, mở đúng phần cần làm. |
| Facebook Ads chuyên sâu nhưng gọn | EQVN bán Digital Marketing rộng 9 công cụ | Tập trung vào Facebook Ads, target, Pixel, report, testing, scale. |
| AI có quy trình rõ | Nhiều bên chỉ nói có AI | Nói AI dùng để lập plan, viết content theo voice, setup ads, đọc report, lưu dữ liệu tối ưu. |
| Chống tin nhắn rác / lead kém | Nhiều bên vẫn nói tăng đơn / giảm chi phí | Dạy khách phân loại lead, loại trừ tệp rác, đọc chất lượng tin nhắn. |
| Dành cho người đang thuê ads | Đối thủ thường nói với người tự chạy | Angle: không tự chạy vẫn cần hiểu để kiểm soát tiền ads và hỏi đúng câu. |

## 6. Gợi Ý Quảng Cáo Cho Ebook Facebook Ads 2026

### 6.1. Angle 1 - Tra cứu đúng phần cần làm

Hook:

> Chỉ muốn tạo tệp khách hàng mà phải xem lại video 40 phút thì rất mất thời gian.

Thông điệp:

Ebook này không được đóng gói như một tài liệu đọc cho biết. Nó là tài liệu online để khi anh/chị đang setup quảng cáo, cần phần nào thì mở đúng phần đó.

CTA:

Đọc thử ebook

### 6.2. Angle 2 - Chạy ads bằng cảm giác

Hook:

> Thấy tin nhắn rẻ thì mừng, nhưng cuối ngày sale vẫn không chốt được đơn nào.

Thông điệp:

Vấn đề không chỉ nằm ở target hay ngân sách. Rất nhiều chiến dịch đang tối ưu theo tin nhắn rẻ, nhưng lại kéo vào nhóm khách hỏi cho vui, sai nhu cầu hoặc chưa đủ khả năng mua.

CTA:

Xem phần đọc chỉ số và phân loại tệp

### 6.3. Angle 3 - Không tự chạy vẫn cần hiểu ads

Hook:

> Thuê người chạy quảng cáo không có nghĩa là mình được quyền không hiểu báo cáo.

Thông điệp:

Chủ doanh nghiệp không cần tự bấm từng nút, nhưng cần biết campaign đang tối ưu theo mục tiêu nào, tệp nào đang tiêu tiền, nội dung nào kéo khách chất lượng và chỉ số nào cần hỏi lại người chạy.

CTA:

Xem ebook Facebook Ads 2026

### 6.4. Angle 4 - AI nhưng phải gắn với quy trình

Hook:

> AI không cứu được một chiến dịch mà dữ liệu đầu vào đang rác.

Thông điệp:

Muốn dùng AI để làm marketing tốt hơn, trước hết phải có hệ thống: biết khách đến từ tệp nào, offer nào, nội dung nào, media nào và kết quả bán hàng ra sao. Ebook và bộ Agent đi theo hướng đó.

CTA:

Xem bộ tài liệu và Agent hỗ trợ

## 7. Đề Xuất 20 Keyword Khi Chạy Production

Agent không được dừng ở 5-6 keyword nếu đang làm research chính thức cho khách. Cần quét theo batch nhỏ và lưu sau mỗi batch.

| Nhóm | Keyword đề xuất |
|---|---|
| Trực tiếp | khóa học facebook ads, học facebook ads, khóa học quảng cáo facebook, học chạy quảng cáo facebook, facebook ads cho người mới |
| Theo khách hàng | facebook ads cho chủ shop, quảng cáo facebook cho chủ doanh nghiệp, quảng cáo facebook cho bán hàng online, chạy ads ra đơn, tối ưu quảng cáo facebook |
| Theo vấn đề | quảng cáo facebook tốn tiền không ra đơn, tin nhắn rẻ không ra đơn, chạy quảng cáo có inbox nhưng không chốt, target facebook ads, đọc chỉ số facebook ads |
| Theo giải pháp | ebook facebook ads, tài liệu facebook ads, khóa học digital marketing facebook ads, facebook ads master, meta ads course |
| Theo AI | ai facebook ads, ai marketing cho chủ shop, dùng ai chạy quảng cáo, ai đọc report quảng cáo, automation facebook ads |

## 8. Rule Chống Timeout Cho Agent

1. Mỗi batch chỉ quét 3 keyword.
2. Sau mỗi keyword phải lưu raw note: keyword, số lượng kết quả, page nổi bật, Library ID, ngày bắt đầu, CTA, mức liên quan.
3. Sau mỗi batch phải cập nhật file research tạm.
4. Nếu timeout, tiếp tục từ keyword cuối cùng chưa hoàn tất, không chạy lại từ đầu.
5. Không kết luận thị trường nếu chưa có ít nhất 5 đối thủ đủ liên quan hoặc chưa quét đủ 20 keyword trong research production.

## 9. Handoff Cho Các Agent Sau

### Agent - Marketing

Phải dùng nghiên cứu này trước khi lập IMC / content plan cho Ebook Facebook Ads 2026.

Ưu tiên các hướng:

- Cần phần nào, mở đúng phần đó.
- Không thiếu thông tin, thiếu hệ thống tra cứu.
- Tin nhắn rẻ chưa chắc hiệu quả.
- Không tự chạy ads vẫn cần hiểu ads.
- AI phải gắn với dữ liệu và quy trình, không nói AI chung chung.

### Agent - Ads Setup

Khi setup test campaign:

- Không target quá rộng kiểu chỉ `marketing`.
- Nên ưu tiên nhóm chủ shop, bán hàng online, Facebook Ads, quản lý fanpage, kinh doanh nhỏ nếu có target ID thật.
- Messenger phù hợp để đọc câu hỏi thật và phản đối thật.
- Nếu chạy landing page, phải demo rõ ebook là web tra cứu, không phải PDF tĩnh.

### Agent - Ads Report

Khi đọc report:

- Không chỉ nhìn cost per message.
- Phải đối chiếu angle nào tạo khách hỏi đúng nhu cầu.
- Phải đọc content/media/offer theo change log.
- Phải phân biệt inbox tò mò, inbox hỏi giá, inbox có nhu cầu thật và đơn mua thật.

## 10. Kết Luận Dùng Cho Bộ Kit

Thị trường khóa học / tài liệu Facebook Ads đang có nhiều quảng cáo về khóa học, workshop, dịch vụ chạy ads và AI marketing. Nhưng khoảng trống rõ nhất vẫn là một tài liệu online có thể tra cứu nhanh trong lúc triển khai thật.

Vì vậy định vị nên giữ:

> Ebook Tất tần tật về Facebook Ads 2026 không phải ebook đọc cho biết. Đây là tài liệu online để khi anh/chị đang chạy quảng cáo, cần phần nào thì mở đúng phần đó, đọc nhanh và làm theo từng bước.

Bản nghiên cứu này là bản ưu tiên dùng sau bản cũ vì đã sửa lại logic competitor-first: tìm keyword để ra đối thủ, sau đó phân tích đối thủ, không dừng ở phân tích keyword.
