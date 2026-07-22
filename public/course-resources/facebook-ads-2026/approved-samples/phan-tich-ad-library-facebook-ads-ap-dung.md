# Phân Tích Meta Ad Library - Khóa Học Facebook Ads Và Fanpage Nguyễn Thế Anh

Ngày nghiên cứu: 2026-07-06  
Agent chính: Agent - Business Assistant  
Skill dùng: market-research, competitor-analysis  
Ngành hàng: khóa học Facebook Ads / ebook Facebook Ads / tài liệu tự học quảng cáo  
Fanpage: https://www.facebook.com/ntheanh.marketing  
File research memory: `06_Nghien_cuu_thi_truong/RESEARCH_MEMORY_INDEX.md`

## 1. Trạng Thái Dữ Liệu

| Mục | Trạng thái |
|---|---|
| Meta Ad Library bằng HTTP request | Không đọc được, Meta trả `403 Forbidden` |
| Meta Ad Library bằng Chrome | Mở được trang Ads Library nhưng Chrome automation bị một extension popup chặn đọc DOM/card |
| Meta Ad Library bằng Codex Browser | Đọc được card quảng cáo, result count, Library ID, ngày bắt đầu chạy, page, CTA và excerpt |
| Nguồn public search | Đọc được các public snippet từ Facebook, Google và website liên quan |
| Số lượng ads active | Đã xác nhận được cho một số keyword trọng tâm; chưa quét xong toàn bộ 22 keyword vì Ads Library tải chậm theo batch lớn |
| Ngày bắt đầu chạy từng ads | Đã xác nhận được cho các ads mẫu trong các keyword đã quét |
| Objective kỹ thuật thật | Không có quyền Ads Manager của đối thủ nên không kết luận objective kỹ thuật |
| Mục tiêu phễu | Có thể suy luận từ hook, CTA, sản phẩm, destination nếu xem được card hoặc snippet |

Kết luận dữ liệu: bản này đã áp dụng chuẩn 20 key, kiểm đúng ngành, kiểm chính sách và đã dùng Codex Browser để đọc được dữ liệu Ad Library thật cho các keyword trọng tâm. Các keyword chưa quét xong cần chạy tiếp theo batch nhỏ để tránh timeout.

## 2. Link Search Chính Đã Dùng

| Nhóm | Query/Page | Link |
|---|---|---|
| Fanpage | Nguyễn Thế Anh | https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&is_targeted_country=false&media_type=all&search_type=keyword_unordered&q=Nguy%E1%BB%85n%20Th%E1%BA%BF%20Anh |
| Fanpage | ntheanh.marketing | https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&is_targeted_country=false&media_type=all&search_type=keyword_unordered&q=ntheanh.marketing |
| Page ID cần xác nhận | 61553890715057 | https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&is_targeted_country=false&media_type=all&search_type=page&view_all_page_id=61553890715057 |
| Ngành hàng | khóa học facebook ads | https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&is_targeted_country=false&media_type=all&search_type=keyword_unordered&q=kh%C3%B3a%20h%E1%BB%8Dc%20facebook%20ads |

## 3. Keyword Relevance Log - 22 Key

Ghi chú: các keyword từ #1 đến #7 đã đọc được trực tiếp từ Meta Ad Library bằng Codex Browser. Các keyword còn lại là danh sách cần quét tiếp theo batch nhỏ.

| # | Keyword | Nhóm keyword | Số ads thấy được | Độ đúng ngành | Lý do giữ/loại | Dùng phân tích? | Key thay thế nếu loại |
|---:|---|---|---:|---|---|---|---|
| 1 | khóa học facebook ads | Sản phẩm | ~590 results | Đúng ngành | Top ads là khóa học/chuyên viên Digital Marketing, Facebook/Google/TikTok Ads, AI marketing; có Eqvn.net và lớp quảng cáo Biên Hòa | Có |  |
| 2 | ebook facebook ads | Sản phẩm thay thế | ~46 results | Sai ngành/gần ngành yếu | Top results bị nhiễu mạnh sang AI Ads Maker, digital product, content tiếng nước ngoài; không phản ánh rõ ebook Facebook Ads tại Việt Nam | Không dùng làm pattern chính | tài liệu facebook ads, checklist chạy facebook ads |
| 3 | chạy facebook ads không ra đơn | Nỗi đau | ~540 results | Gần ngành | Có ads đúng pain chạy ads/đốt tiền, nhưng cũng lẫn vận hành TMĐT/dịch vụ ads; dùng để đọc pain, không dùng làm số liệu ngành khóa học thuần | Có điều kiện | quảng cáo facebook tốn tiền không hiệu quả |
| 4 | tin nhắn rẻ không ra đơn | Nỗi đau | ~18,000 results | Sai ngành | Top results lạc sang hàng tiêu dùng/gia dụng/giá rẻ; query này nhiễu vì chứa "rẻ", "đơn" | Không | lead rác facebook ads, tin nhắn quảng cáo không chốt được |
| 5 | tự chạy quảng cáo facebook | Giải pháp | ~17,000 results | Sai ngành/gần ngành yếu | Top results lạc sang sức khỏe, pha chế, bán hàng; query quá rộng | Không dùng làm pattern chính | tự học chạy facebook ads, khóa học tự chạy facebook ads |
| 6 | facebook ads cho chủ shop | Đối tượng | ~260 results | Đúng ngành/gần ngành | Top results có EQVN, KakaOnline, khóa Digital Marketing và vận hành bán hàng; đúng hướng chủ shop nhưng vẫn cần lọc | Có |
| 7 | facebook ads 2026 | Xu hướng | ~770 results | Sai ngành/gần ngành yếu | Top results lạc sang World Cup 2026, AI voice, game; query quá rộng nếu không kèm "khóa học" | Không dùng làm pattern chính | khóa học facebook ads 2026 |
| 8 | AI marketing facebook ads | Công cụ | chưa xác nhận | Gần ngành | Gần với hướng AI/Agent, nhưng có thể lẫn tool/agency | Có điều kiện | AI chạy quảng cáo facebook |
| 9 | học chạy quảng cáo facebook | Sản phẩm | chưa xác nhận | Đúng ngành | Query phổ thông cho người mới học ads | Có |  |
| 10 | khóa học quảng cáo facebook cho người mới | Sản phẩm | chưa xác nhận | Đúng ngành | Rõ persona người mới | Có |  |
| 11 | quảng cáo facebook tốn tiền không hiệu quả | Nỗi đau | chưa xác nhận | Đúng ngành | Đúng pain lãng phí ngân sách | Có |  |
| 12 | facebook ads không có khách hàng | Nỗi đau | chưa xác nhận | Đúng ngành | Đúng pain thiếu khách/không ra lead/không ra đơn | Có |  |
| 13 | tối ưu quảng cáo facebook | Giải pháp | chưa xác nhận | Đúng ngành | Đúng nhu cầu tối ưu campaign | Có |  |
| 14 | đọc chỉ số facebook ads | Giải pháp | chưa xác nhận | Đúng ngành | Đúng angle data/report, phù hợp ebook/hệ thống | Có |  |
| 15 | target facebook ads | Giải pháp | chưa xác nhận | Gần ngành | Có thể lẫn hướng dẫn miễn phí; vẫn liên quan target/tệp | Có điều kiện | tạo tệp khách hàng facebook ads |
| 16 | facebook ads cho chủ doanh nghiệp | Đối tượng | chưa xác nhận | Đúng ngành | Đúng persona có khả năng mua cao | Có |  |
| 17 | facebook ads cho người kinh doanh online | Đối tượng | chưa xác nhận | Đúng ngành | Đúng nhóm bán hàng online/chủ shop | Có |  |
| 18 | tài liệu facebook ads | Offer | chưa xác nhận | Đúng ngành | Đúng phân khúc tài liệu/ebook/template | Có |  |
| 19 | checklist facebook ads | Offer | chưa xác nhận | Gần ngành | Gần với lead magnet/tài liệu ngắn; cần lọc nhiễu | Có điều kiện | checklist chạy facebook ads |
| 20 | facebook ads master | Đối thủ/thay thế | chưa xác nhận | Đúng ngành | Trùng tên/kiểu định vị khóa học master | Có |  |
| 21 | đăng ký học facebook ads | Phễu/CTA | chưa xác nhận | Đúng ngành | Query có intent conversion/đăng ký | Có |  |
| 22 | tư vấn facebook ads | Phễu/CTA | chưa xác nhận | Gần ngành | Có thể lẫn dịch vụ agency/tư vấn ads, dùng để đọc CTA Messenger | Có điều kiện | tư vấn khóa học facebook ads |

Tổng kết keyword đã quét trực tiếp:

- 2 key dùng tốt ngay: `khóa học facebook ads`, `facebook ads cho chủ shop`.
- 1 key dùng có điều kiện để đọc pain: `chạy facebook ads không ra đơn`.
- 4 key bị nhiễu mạnh hoặc sai ngành ở top results: `ebook facebook ads`, `tin nhắn rẻ không ra đơn`, `tự chạy quảng cáo facebook`, `facebook ads 2026`.
- Bài học quan trọng: không được nhìn keyword có vẻ đúng rồi kết luận. Phải xem card hiển thị có đúng lĩnh vực không.

## 4. Kiểm Chính Sách Theo Fanpage/Ngành

Nguồn chính sách đã kiểm:

- https://transparency.meta.com/policies/ad-standards/
- https://www.facebook.com/business/help/488043719226449

| Mục | Nhận định |
|---|---|
| Ngành có nhạy cảm/hạn chế không? | Giáo dục/đào tạo quảng cáo không phải nhóm bị cấm, nhưng có rủi ro nếu cam kết kết quả, thu nhập, ra đơn, tăng doanh thu quá chắc |
| Rủi ro thuộc tính cá nhân | Tránh mở bài kiểu "Bạn đang chạy sai", "Bạn thất bại vì..." nếu ám chỉ trực tiếp tình trạng cá nhân quá mạnh |
| Rủi ro cam kết kết quả | Các cụm như "ra đơn sau 7 ngày", "hết đốt tiền", "biến Facebook thành cỗ máy kéo khách ổn định" cần viết thận trọng, có điều kiện và không cam kết chắc chắn |
| Rủi ro claim tài chính/thu nhập | Không hứa doanh thu, lợi nhuận hoặc kết quả tài chính cụ thể nếu không có điều kiện rõ |
| Rủi ro landing page/CTA | Landing page phải mô tả đúng sản phẩm, giá, quyền truy cập, hoàn tiền/cam kết nếu có |
| Cách viết an toàn hơn | Dùng "giúp anh/chị có hệ thống để kiểm tra, setup và tối ưu đúng hơn" thay vì "học xong ra đơn" |
| Mức chắc chắn | Suy luận chính sách dựa trên ngành và snippet; cần kiểm từng creative/landing page cụ thể |

## 5. Public Signal Quan Sát Được Từ Fanpage Nguyễn Thế Anh

| Tín hiệu public | Nguồn/snippet | Ý nghĩa marketing |
|---|---|---|
| Facebook Ads Master 2026 không dạy mẹo vặt, xây tư duy chạy quảng cáo theo hệ thống | Public snippet từ Facebook video fanpage | Định vị khác với mẹo vặt/chiêu trò; nhấn hệ thống |
| Chạy Facebook Ads mãi không ra đơn, đốt tiền mỗi ngày | Public snippet từ Facebook video fanpage | Pain lớn: chủ doanh nghiệp/chủ shop đang mất tiền nhưng chưa biết lỗi nằm ở đâu |
| CPM cao, giá tin nhắn đắt, không scale được, không biết lỗi ở content/target | Public snippet từ Facebook video fanpage | Angle rất rõ cho content/report/ads setup |
| Đã có hơn 327+ chủ doanh nghiệp đăng ký | Public snippet từ Facebook video fanpage | Social proof có thể dùng nếu số liệu còn đúng |
| Tặng ngay Agent tạo kế hoạch quảng cáo | Public snippet từ Facebook video fanpage | Offer bonus khác biệt: AI/Agent đi kèm khóa học |
| Có nội dung AI, đóng gói chuyên môn, tạo sản phẩm số | Public snippet fanpage | Fanpage không chỉ bán Facebook Ads, mà đang mở rộng sang AI Growth/Productization |

## 6. Tổng Quan Số Lượng Và Chiến Lược Chạy

| Mục | Nhận định |
|---|---|
| Tổng số quảng cáo quan sát được | Các keyword đã quét có count từ ~46 đến ~18,000 results; riêng key chính `khóa học facebook ads` có ~590 results |
| Số quảng cáo active | Các kết quả đang ở filter Active ads |
| Số quảng cáo inactive nếu có | Chưa xác nhận |
| Số page/đối thủ nổi bật | Eqvn.net, Dạy quảng cáo FB Ads - Google - Tiktok tại Biên Hòa, Nam Keeng, KakaOnline VN, Ads Marketing Việt Nam |
| Chiến lược chạy đang thấy qua card | Khóa học tổng hợp Digital Marketing tích hợp AI, lớp quảng cáo thực chiến, agency/dịch vụ ads, offer nhắn tin tư vấn |
| Mẫu chạy lâu đáng chú ý | `Dạy quảng cáo FB Ads - Google - Tiktok tại Biên Hòa` chạy từ 24 Jan 2024; `Eqvn.net` có mẫu từ 6 Nov 2025; `Ads Marketing Việt Nam` từ 30 Jun 2025 |
| Mẫu mới bắt đầu test | `Google Ads` bị lạc ngành nhưng mới 1 Jul 2026; một số mẫu EQVN bắt đầu Jan/Feb/May 2026 |

Nhận định chiến lược tạm thời: nếu các snippet này cũng đang được dùng trong ads, chiến lược phù hợp nhất là kéo khách từ pain "đốt tiền không ra đơn" sang giải pháp "hệ thống Facebook Ads + AI/Agent + tài liệu/khóa học".

## 7. Evidence Từng Quảng Cáo / Nội Dung Quan Sát Được

| Page | Ad Library ID | Trạng thái | Ngày bắt đầu | Số ngày chạy | Format | Hook | Offer/sản phẩm/book | Proof | CTA | Đích đến | Mục tiêu phễu | Độ chắc chắn objective | Ghi chú chiến lược |
|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|
| Eqvn.net | 2139942799875014 | Active | 9 Jan 2026 | 178 | Card Ad Library | Lộ trình khóa học Chuyên viên Digital Marketing tại EQVN, tích hợp AI và cập nhật mới nhất | Khóa học Chuyên viên Digital Marketing | Business, Education | Send message | Messenger | Message/Lead/Sales | suy luận | Mẫu chạy lâu, định vị khóa tổng hợp + AI |
| Dạy quảng cáo FB Ads - Google - Tiktok tại Biên Hòa | 733217391850418 | Active | 24 Jan 2024 | 894 | Card Ad Library | Thành thạo chạy quảng cáo FB sau 9 buổi học; AI, chính sách, target, content, tài khoản | Khóa học quảng cáo FB/Google/TikTok | Học thực chiến, cầm tay chỉ việc, hỗ trợ trọn đời | Send message | Messenger | Message/Sales | suy luận | Mẫu chạy rất lâu, nhưng claim "chi phí thấp nhất", "kháng tài khoản" cần kiểm policy |
| Eqvn.net | 1837361230235684 | Active | 14 Jan 2026 | 173 | Card Ad Library | Khóa học Chuyên viên Digital Marketing, cập nhật 2026 và tích hợp AI | Khóa học Digital Marketing | Business, Education | Send message | Messenger | Message/Lead/Sales | suy luận | Lặp lại offer AI + 2026 |
| Eqvn.net | 1533386790932880 | Active | 6 Nov 2025 | 242 | Card Ad Library | Học 1 khóa - làm chủ 9 công cụ Digital Marketing | Khóa học 9 công cụ Digital Marketing | Giảng viên agency, chứng nhận, group support | Send message | https://eqvn.net/khoa-hoc-digital-marketing | Consideration/Sales | suy luận | Landing page + Messenger, khá đúng phễu bán khóa học |
| Nam Keeng | 913051318144824 | Active | 27 Feb 2026 | 129 | Card Ad Library | Cùng là chạy ads, có người 3 đơn/ngày - có người 300 đơn/ngày | Lớp học viên thực chiến / thuê vận hành đa kênh | Case từ 10-15 đơn lên 400 đơn/ngày | Send message | Messenger | Message/Sales | suy luận | Hook mạnh nhưng có rủi ro claim kết quả rất cao |
| Ads Marketing Việt Nam | 3936308413316968 | Active | 30 Jun 2025 | 371 | Card Ad Library | Nhận quảng cáo 150K, không ra đơn không lấy phí dịch vụ | Dịch vụ quảng cáo | Cam kết không ra đơn không lấy phí | Send message | Messenger | Lead/Sales | suy luận | Dịch vụ agency, không phải khóa học; dùng để hiểu cạnh tranh dịch vụ |
| KakaOnline VN | 2483680542049428 | Active | 5 Feb 2026 | 151 | Card Ad Library | Vận hành chuẩn chỉnh từ A-Z, tăng trưởng bền vững | Dịch vụ vận hành TMĐT | Tăng trưởng vận hành, KOC, affiliate | Không rõ | Không rõ | Lead/Sales | suy luận | Gần ngành vận hành bán hàng, không phải khóa học ads |
| Nguyễn Thế Anh | chưa xem được | chưa xác nhận | chưa xác nhận | chưa xác nhận | Video public/snippet | Quảng cáo không hiệu quả chưa chắc là do Facebook | Facebook Ads Master 2026 | Chuyên môn hệ thống | chưa xác nhận | chưa xác nhận | Consideration/Sales | suy luận | Định vị hệ thống, không mẹo vặt |
| Nguyễn Thế Anh | chưa xem được | chưa xác nhận | Apr 2026 trong snippet public | chưa xác nhận | Video public/snippet | Chạy Facebook Ads mãi không ra đơn, đốt tiền mỗi ngày | Facebook Ads Master 2026 | Pain + giải pháp khóa học | chưa xác nhận | chưa xác nhận | Awareness/Consideration | suy luận | Pain mạnh, hợp ads đầu phễu |
| Nguyễn Thế Anh | chưa xem được | chưa xác nhận | May 23, 2026 trong snippet public | chưa xác nhận | Video public/snippet | Dành cho anh/chị chủ doanh nghiệp đang thiếu khách | Facebook Ads Master 2026 | 327+ chủ doanh nghiệp đăng ký | chưa xác nhận | chưa xác nhận | Consideration/Sales | suy luận | Proof + persona chủ doanh nghiệp |
| Nguyễn Thế Anh | chưa xem được | chưa xác nhận | chưa xác nhận | chưa xác nhận | Video public/snippet | Chủ doanh nghiệp cứ tập trung phát triển sản phẩm, marketing để hệ thống xử lý | Facebook Ads Master 2026 + Agent kế hoạch quảng cáo | Bonus Agent | chưa xác nhận | chưa xác nhận | Sales/Lead | suy luận | AI/Agent bonus để khác biệt |
| Duy Nguyen MKT | không phải Ad Library | public page/website | 2022 bài website | không áp dụng | Website/course page | Khóa học tự chạy quảng cáo Facebook Ads dành cho người mới | Khóa học 1 kèm 1 | Lợi ích sau khóa học | liên hệ/đăng ký | website | Consideration/Sales | suy luận | Đối thủ truyền thống: học 1-1 |
| Duong Tung Marketing | không phải Ad Library | public website | 2025/2026 snippet | không áp dụng | Website/course page | Facebook Ads cho chủ shop, hết hàng mỗi ngày | Khóa học Facebook Ads cho chủ shop | Ra đơn/mỗi ngày là claim cần thận trọng | đăng ký/tư vấn | website | Sales | suy luận | Định vị mạnh vào chủ shop và kết quả |
| Vinalink Academy | không phải Ad Library | public website | 2025/2026 snippet | không áp dụng | Blog/course content | Tự chạy quảng cáo Facebook chỉ với 6 bước | Khóa học Facebook Marketing | Học nền tảng/chỉ số | đọc bài/khóa học | website | Consideration | suy luận | Góc giáo dục nền tảng |
| MarketingAI/Adsplus/tài liệu | không phải Ad Library | public website | 2026 snippet | không áp dụng | Ebook/tài liệu | Download bộ tài liệu Facebook Ads | Tài liệu/ebook miễn phí | Nhiều tài liệu | tải tài liệu | website/form | Lead magnet | suy luận | Đối thủ/thay thế miễn phí |

## 8. Pattern Chính

| Pattern | Dấu hiệu | Ý nghĩa |
|---|---|---|
| Pain "đốt tiền không ra đơn" | Xuất hiện trong snippet fanpage và nhiều kết quả ngành | Đây là pain mạnh nhất để kéo attention |
| Pain "tin nhắn rẻ nhưng không chốt" | Keyword trực tiếp bị nhiễu nặng, nhưng insight vẫn đúng từ bối cảnh Messenger ads | Không dùng keyword này để research Ad Library; đổi sang `lead rác facebook ads`, `tin nhắn quảng cáo không chốt được` |
| Sản phẩm khóa học | Key `khóa học facebook ads` ra ~590 results, top có EQVN, lớp quảng cáo Biên Hòa, Nam Keeng | Thị trường quen mua khóa học, nhưng dễ so sánh với video miễn phí |
| Sản phẩm tài liệu/ebook | Key `ebook facebook ads` chỉ ~46 results nhưng bị nhiễu nước ngoài/AI tool | Ebook 399K cần định vị rõ là tài liệu tra cứu online, không phải ebook PDF chung chung |
| Tệp chủ shop/chủ doanh nghiệp | Key `facebook ads cho chủ shop` ra ~260 results, khá đúng ngành/gần ngành | Đây là tệp ưu tiên hơn người học vặt |
| Proof xã hội | 327+ chủ doanh nghiệp đăng ký | Có thể tăng trust nếu số liệu thật và cập nhật |
| AI/Agent bonus | Agent tạo kế hoạch quảng cáo | Khoảng khác biệt tốt so với khóa học ads truyền thống |

## 9. Phân Tích CTA Và Mục Tiêu Phễu

| CTA/Đích đến | Mục tiêu phễu suy luận | Độ chắc chắn | Ý nghĩa |
|---|---|---|---|
| Nhắn tin/tư vấn | Message lead / Sales qua Messenger | Suy luận | Phù hợp khi giá thấp-trung bình hoặc cần tư vấn khóa học |
| Đăng ký học | Sales/Lead | Suy luận | Phù hợp landing page có checkout/form rõ |
| Xem thêm | Consideration/Traffic | Suy luận | Phù hợp kéo về landing page giải thích offer |
| Tải tài liệu/ebook miễn phí | Lead magnet | Suy luận | Đối thủ thay thế miễn phí, tạo áp lực cho ebook trả phí |
| Xem video | Awareness/Video view | Suy luận | Dùng để tạo warm audience trước khi remarketing |

## 10. Khoảng Trống Thị Trường

| Khoảng trống | Bằng chứng từ dữ liệu public | Cơ hội cho sản phẩm của anh |
|---|---|---|
| Nhiều khóa học nói "học chạy ads", ít định vị như tài liệu thao tác khi đang làm thật | Các kết quả ngành thường là khóa học, tutorial, tài liệu tải | Định vị ebook/bộ kit là hệ thống tra cứu và triển khai, không phải đọc cho biết |
| Nhiều nội dung nói ra đơn/tự chạy, ít nói sâu về chất lượng lead | Có nhiều pain không ra đơn/tin nhắn rẻ nhưng chưa chắc hiệu quả | Tạo angle "tin nhắn rẻ chưa chắc rẻ nếu sale không chốt được" |
| Ít mẫu nói cho người đang thuê ads nhưng muốn kiểm soát | Phần lớn hướng tới tự chạy/người mới/chủ shop | Tạo angle "không cần tự chạy hết, nhưng phải hiểu đủ để biết tiền ads đang đi đâu" |
| Tài liệu miễn phí nhiều nhưng rời rạc | Có nhiều kết quả tải tài liệu/ebook miễn phí | Đánh vào "miễn phí thì nhiều, nhưng lúc cần làm thật vẫn phải đi tìm lại" |
| AI thường bị nói chung chung | Nhiều nội dung AI marketing dễ dừng ở prompt/tool | Dùng Agent thật: report -> đề xuất -> tạo campaign theo đề xuất |

## 11. Gợi Ý Quảng Cáo Có Thể Test

| Ý tưởng | Tệp phù hợp | Hook | Offer/CTA | Format | Vì sao nên test |
|---|---|---|---|---|---|
| Tài liệu tra cứu khi đang setup ads | Người mới/chủ shop tự chạy | Chỉ muốn tạo tệp khách hàng mà phải xem lại video 40 phút? | Ebook Facebook Ads 2026 - 399K / Xem demo | Video màn hình + caption | Khác biệt với khóa học video dài |
| Tin nhắn rẻ nhưng lead rác | Chủ shop chạy Messenger | Tin nhắn 3-4K chưa chắc là quảng cáo đang hiệu quả | Ebook/Kit hướng dẫn đọc chất lượng lead / Nhắn tin | Talking head + bảng ví dụ | Đánh đúng pain hiện trường |
| Không biết lỗi nằm ở content, target hay chỉ số | Chủ doanh nghiệp đang đốt tiền ads | Quảng cáo không ra đơn chưa chắc do Facebook | Facebook Ads Master/Kit / Xem chi tiết | Video giáo dục ngắn | Kéo từ pain sang hệ thống |
| Đang thuê ads nhưng không hiểu báo cáo | Chủ doanh nghiệp thuê freelancer/agency | Không cần tự chạy hết, nhưng cần biết tiền ads đang đi đâu | Ebook/Kit / Đăng ký | Carousel checklist | Tệp có khả năng chi trả tốt |
| AI Agent tạo kế hoạch quảng cáo | Người quan tâm AI marketing/chủ doanh nghiệp | Đừng chỉ học ads, hãy có hệ thống để AI hỗ trợ triển khai | Marketing Kit 1.299K / Xem demo | Demo workflow | Khác biệt hóa với khóa học ads truyền thống |
| 399K nhỏ hơn một ngày chạy sai | Chủ shop/SME đang chạy ngân sách nhỏ | Một ngày chạy sai có thể mất hơn 399K | Ebook 399K / Mua ngay | Ảnh offer + proof | Neo giá với chi phí mất do sai |

## 12. Nhận Định Về Book/Ebook

Ebook Facebook Ads 2026 không nên được bán như một "cuốn ebook 500 trang". Cách nói này dễ làm người mua thấy nặng.

Định vị nên là:

```text
Tài liệu online để tra cứu và làm theo khi đang triển khai Facebook Ads thật.
```

Vai trò của ebook trong phễu:

| Vai trò | Ý nghĩa |
|---|---|
| Entry product 399K | Dễ mua, dùng để lọc người thật sự quan tâm Facebook Ads |
| Trust builder | Chứng minh anh có hệ thống và chuyên môn thực chiến |
| Data product | Tạo tệp người mua chất lượng để upsell khóa học/Marketing Kit/Agent |
| Tool hỗ trợ sale | Khi khách hỏi "khác gì miễn phí", demo search/tra cứu trong ebook |

## 13. Rủi Ro Và Lưu Ý Chính Sách

| Rủi ro | Cách viết an toàn hơn |
|---|---|
| "Tự học ra đơn sau 7 ngày" dễ bị hiểu là cam kết kết quả | "Lộ trình 7 ngày để tự kiểm tra và triển khai lại hệ thống quảng cáo" |
| "Biến Facebook thành cỗ máy kéo khách ổn định" có thể bị hiểu quá chắc | "Xây hệ thống quảng cáo có dữ liệu để cải thiện khả năng kéo khách" |
| "Đốt tiền mỗi ngày mà không ra đơn" nếu viết trực tiếp "bạn đang..." có thể chạm thuộc tính cá nhân | "Nhiều chủ doanh nghiệp gặp tình trạng..." |
| "Ra đơn mỗi ngày" là claim kết quả mạnh | "Tập trung vào quy trình giúp tăng khả năng tạo đơn, tùy sản phẩm và cách triển khai" |

## 14. Kết Luận Cho Agent Sau

### Agent Marketing Phải Dùng

- Insight chính: người mua không thiếu thông tin, họ thiếu hệ thống để biết lúc nào làm gì.
- Big idea nên giữ: cần phần nào, mở đúng phần đó.
- Message nên tránh: "500 trang đầy đủ" là chính.
- Message nên ưu tiên: tài liệu tra cứu/thực hành, đọc số liệu, target, content, pixel, testing, scale, remarketing.

### Agent Ads Setup Phải Dùng

- Nếu chạy test ngành Facebook Ads, không target quá rộng `marketing` một mình.
- Nên tách cụm test:
  - Người mới/tự chạy ads.
  - Chủ shop/chủ kinh doanh online.
  - Chủ doanh nghiệp đang chạy/thuê ads.
  - Người quan tâm AI marketing nếu bán Marketing Kit.
- CTA phụ thuộc offer:
  - Ebook 399K: landing page hoặc Messenger đều được.
  - Kit 1.299K: nên có Messenger tư vấn hoặc landing page giải thích đủ.

### Agent Ads Report Phải Dùng

- Không tối ưu theo inbox rẻ đơn thuần.
- Phải đọc chất lượng lead, câu hỏi trong inbox, tỷ lệ mua, CPA.
- Nếu chạy nhiều angle, báo cáo phải nối về angle: pain đốt tiền, ebook tra cứu, chủ doanh nghiệp thuê ads, AI Agent.

## 15. Việc Cần Bổ Sung Khi Chrome Sẵn Sàng

Khi popup extension trong Chrome được đóng và Ad Library đọc được card, bổ sung ngay:

1. Đếm số ads active theo fanpage Nguyễn Thế Anh.
2. Đếm số ads theo từng keyword đúng ngành.
3. Ghi Ad Library ID.
4. Ghi ngày bắt đầu chạy.
5. Tính số ngày đã chạy.
6. Ghi CTA/destination từng card.
7. Phân loại mục tiêu phễu với `objective_confidence`.
8. Cập nhật lại bảng evidence trong file này.
