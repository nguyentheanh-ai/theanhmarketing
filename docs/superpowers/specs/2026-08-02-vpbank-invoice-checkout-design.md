# Thiết kế chuyển tài khoản nhận tiền và yêu cầu xuất hóa đơn

Ngày: 2026-08-02  
App: `main-site` / `theanhmarketing.com`  
Source triển khai: `deploy/website-production-20260802`

## Mục tiêu

1. Chuyển toàn bộ checkout đang hoạt động sang tài khoản VPBank mới:
   - Ngân hàng: VPBank
   - Số tài khoản: `2070519999`
   - Chủ tài khoản: `GREEZHUB CO LTD`
2. Cho khách chọn yêu cầu xuất hóa đơn ngay tại form tạo đơn.
3. Lưu thông tin hóa đơn cùng đơn hàng để đội vận hành có thể lọc, kiểm tra và xử lý sau khi thanh toán.
4. Không hiển thị tên nhà cung cấp đối soát thanh toán trên giao diện hoặc email gửi khách. Tên kỹ thuật hiện có trong route, biến môi trường và code nội bộ được giữ nguyên để tránh tạo flow thanh toán thứ hai.

## Phạm vi

### Bao gồm

- Các form công khai và luồng đăng nhập/giỏ hàng đang tạo đơn qua `/api/orders` hoặc `/api/orders/from-session`.
- Trang `/thanh-toan/[code]` và trạng thái thanh toán mà khách nhìn thấy.
- Email chờ thanh toán có QR/thông tin chuyển khoản.
- Cấu hình ngân hàng dùng để tạo QR, hiển thị thông tin chuyển khoản và kiểm tra tài khoản nhận trong webhook.
- Schema `public.orders`, service tạo/đọc đơn, public-order sanitizer, test và tài liệu vận hành liên quan.

### Không bao gồm

- Tự động phát hành hóa đơn điện tử qua API.
- Thay đổi webhook URL, khóa xác thực webhook, logic mã đơn, đối soát số tiền hoặc idempotency.
- Sửa flow cấp tài khoản học viên, quyền khóa học, email xác nhận thanh toán hoặc Meta tracking ngoài phần copy tên nhà cung cấp.
- Tạo bảng order hoặc payment flow mới.

## Phương án đã chọn

### Chọn: cột hóa đơn riêng trên `public.orders`

Thêm các cột nullable:

- `invoice_requested boolean not null default false`
- `invoice_tax_code text`
- `invoice_company_name text`
- `invoice_company_address text`
- `invoice_email text`

Lý do chọn:

- CRM và vận hành có thể lọc trực tiếp đơn cần hóa đơn.
- Dễ export, kiểm tra dữ liệu thiếu và tích hợp eInvoice sau này.
- Không phải parse ghi chú hoặc JSON không có contract rõ ràng.

### Phương án không chọn

1. `invoice_details jsonb`: ít cột hơn nhưng khó lọc, validate và export ổn định.
2. Ghi thông tin vào lead/order note: triển khai nhanh nhưng dễ mất cấu trúc, khó bảo vệ dữ liệu và không phù hợp làm nguồn vận hành.

## Thiết kế giao diện

### Form tạo đơn

Ngay dưới CTA chính của từng form, thêm một checkbox nhỏ, căn giữa:

> Tôi cần xuất hóa đơn

Checkbox không cạnh tranh thị giác với CTA và không dùng card/border nổi bật. Mặc định checkbox tắt. Khi bật, hiển thị bốn trường bắt buộc ngay bên dưới:

1. Mã số thuế
2. Email nhận hóa đơn
3. Tên doanh nghiệp
4. Địa chỉ doanh nghiệp

Khi tắt lại checkbox, các trường không còn bắt buộc và giá trị không được gửi lên server. Form giữ phong cách input, bo góc, khoảng cách và responsive hiện có của từng landing; không tái thiết kế landing page.

Không thêm cột tóm tắt đơn hàng hoặc một block USP dùng chung bên cạnh form. Tiêu đề, mô tả, USP, sản phẩm khách nhận được, quà tặng và CTA tiếp tục do chính landing page tương ứng sở hữu; không hard-code copy dùng chung kiểu `Đăng ký và tạo QR thanh toán`. Phần dùng chung mới chỉ là checkbox và bốn trường hóa đơn nằm trong form đăng ký hiện có.

Riêng bản Facebook Ads dùng hướng copy:

- Tiêu đề: `Đăng ký và nhận khóa học Facebook Ads Master 2026 ngay hôm nay`.
- Mô tả nhắc đúng nội dung khóa học và AI Agent của gói đang bán, không mô tả cơ chế tạo đơn/QR.
- CTA: `Nhận khóa học + AI Agent - 799.000đ`.
- Giữ tùy chọn Ebook mua kèm, selected-plan note và secure note hiện tại; checkbox hóa đơn nằm dưới CTA, nhỏ và căn giữa.

### Trang thanh toán

- Không cho chỉnh sửa dữ liệu hóa đơn sau khi đơn đã được tạo.
- Nếu đơn có yêu cầu hóa đơn, hiển thị một xác nhận ngắn: `Đã ghi nhận yêu cầu xuất hóa đơn`.
- Không render MST, địa chỉ hoặc email hóa đơn trong response polling công khai.
- Thay toàn bộ copy khách nhìn thấy có tên nhà cung cấp đối soát bằng ngôn ngữ trung tính như `hệ thống tự đối soát`, `hệ thống đã xác nhận tiền vào`, `thanh toán chuyển khoản`.

### Email chờ thanh toán

- Giữ QR, ngân hàng, số tài khoản, chủ tài khoản, số tiền và nội dung chuyển khoản.
- Thay alt text và nội dung có tên nhà cung cấp đối soát bằng `QR thanh toán` hoặc `hệ thống tự xác nhận`.
- Không gửi chi tiết hóa đơn trong email chờ thanh toán; đơn đã lưu dữ liệu và trang thanh toán chỉ xác nhận đã ghi nhận yêu cầu.

## Luồng dữ liệu

1. Khách điền họ tên, email, điện thoại.
2. Nếu cần hóa đơn, khách bật checkbox và điền đủ bốn trường.
3. Client gửi `invoiceRequested` và `invoiceDetails` cùng payload tạo đơn.
4. API làm sạch và kiểm tra dữ liệu phía server.
5. `createPaymentOrder()` lưu dữ liệu hóa đơn trong cùng transaction insert đơn.
6. QR và thông tin chuyển khoản lấy từ một cấu hình ngân hàng duy nhất.
7. Webhook tiếp tục xác thực tài khoản nhận, số tiền, mã đơn và idempotency như hiện tại.
8. Khi đã thanh toán, đội vận hành lọc `invoice_requested = true` để xử lý hóa đơn.

## API contract

Payload bổ sung cho hai API tạo đơn:

```ts
type InvoiceInput = {
  requested: boolean;
  taxCode?: string;
  companyName?: string;
  companyAddress?: string;
  email?: string;
};
```

Quy tắc:

- `requested = false`: server bỏ qua toàn bộ trường hóa đơn và lưu các cột chi tiết là `null`.
- `requested = true`: cả bốn trường phải hợp lệ; thiếu một trường trả `400` và không tạo đơn.
- Client không được quyết định số tiền, sản phẩm, trạng thái thanh toán hoặc tài khoản nhận tiền.
- Response polling công khai chỉ được lộ `invoiceRequested`; không lộ MST, tên/địa chỉ doanh nghiệp hoặc email hóa đơn.

## Validation và bảo mật

- MST: trim, chỉ nhận chữ số và dấu gạch nối hợp lệ, giới hạn độ dài; không tự suy đoán hoặc gọi dịch vụ tra cứu thuế trong phạm vi này.
- Tên doanh nghiệp: plain text, giới hạn độ dài.
- Địa chỉ doanh nghiệp: plain text, giới hạn độ dài lớn hơn tên doanh nghiệp.
- Email hóa đơn: chuẩn hóa chữ thường và dùng validation email hiện có.
- Không ghi chi tiết hóa đơn vào console, activity log công khai, Meta payload hoặc URL.
- Public order sanitizer phải xóa toàn bộ chi tiết hóa đơn.
- Dữ liệu hóa đơn chỉ tồn tại trong order server/admin và bản export được kiểm soát.

## Cấu hình tài khoản ngân hàng

- Cập nhật ba biến production hiện có: bank code, bank account number và bank account name.
- Không hard-code tài khoản mới vào component, email hoặc service.
- Cùng một config phải cấp dữ liệu cho QR, block chuyển khoản, email chờ thanh toán và webhook account matching.
- Trước khi deploy, kiểm tra tài khoản VPBank mới đã hoạt động trong dashboard thanh toán và webhook vẫn trỏ tới endpoint production hiện tại.
- Không ghi khóa webhook hoặc secret vào source, docs, test fixture hay log.

## Tương thích và migration

- Đơn cũ nhận `invoice_requested = false`; các cột chi tiết là `null`.
- Insert fallback cũ không được âm thầm làm mất yêu cầu hóa đơn. Nếu schema production chưa có migration mà khách yêu cầu hóa đơn, API phải fail closed thay vì tạo đơn không có dữ liệu hóa đơn.
- Đơn không yêu cầu hóa đơn tiếp tục tương thích với flow cũ.
- Không sửa dữ liệu đơn lịch sử.

## Bề mặt cần cập nhật

- React checkout forms: Agent Kit, đăng ký/giỏ hàng và cart checkout cho tài khoản đã đăng nhập.
- Static landing checkout forms: AI Master, Facebook Ads, Ebook và Ebook Premium; source `/public/ladipage` và published `/public/academy` phải giữ đồng bộ theo guard hiện có.
- Mỗi landing giữ nguyên tiêu đề, mô tả, USP, offer và CTA riêng; không tạo copy hoặc component tóm tắt sản phẩm dùng chung trong form.
- `/api/orders`, `/api/orders/from-session`, `services/orderService.ts`.
- `/thanh-toan/[code]`, payment status poller và pending-payment email.
- Migration Supabase, docs cấu hình ngân hàng và regression tests.

## Xử lý lỗi

- Thiếu/sai thông tin hóa đơn: giữ khách tại form, chỉ rõ trường cần sửa, không tạo đơn.
- Schema chưa sẵn sàng: đơn có yêu cầu hóa đơn fail closed với thông báo thử lại/liên hệ hỗ trợ; đơn thường vẫn theo flow hiện hữu.
- Thiếu cấu hình ngân hàng: giữ behavior fail/empty state hiện có nhưng copy khách hàng không nhắc tên nhà cung cấp đối soát.
- Webhook không khớp account/amount/order: giữ nguyên fail-closed hiện tại.

## Kiểm thử chấp nhận

1. Checkbox tắt: payload và đơn cũ hoạt động như trước.
2. Checkbox bật: bốn trường hiện, bắt buộc và responsive trên desktop/mobile.
3. Bật rồi tắt: dữ liệu hóa đơn không được gửi/lưu.
4. API từ chối `invoiceRequested=true` khi thiếu từng trường hoặc email sai.
5. API làm sạch input và lưu đúng năm cột.
6. Public polling không lộ chi tiết hóa đơn.
7. Trang thanh toán chỉ hiển thị xác nhận đã ghi nhận yêu cầu.
8. QR, thông tin copy và pending email đều hiển thị VPBank `2070519999`, `GREEZHUB CO LTD` từ env fixture.
9. Webhook chỉ chấp nhận đúng account mới trong fixture và giữ nguyên code/amount/idempotency guards.
10. Không còn tên nhà cung cấp đối soát trong copy công khai, trạng thái thanh toán và email khách; định danh kỹ thuật nội bộ vẫn giữ nguyên.
11. Source/published static landing HTML tiếp tục đồng bộ.
12. Focused tests, full Node tests, TypeScript, ESLint, build và mobile browser QA đạt trước deploy.

## Điều kiện triển khai production

- Migration được review và áp dụng trước code nhận payload hóa đơn.
- Production env được cập nhật atomically cho cả ba giá trị ngân hàng.
- Không replay giao dịch thật hoặc tạo đơn/email thật khi chưa có test identity được anh phê duyệt.
- Sau deploy, smoke read-only các landing, trang thanh toán demo, webhook unauthenticated guard và log lỗi.
- Một giao dịch nhỏ kiểm tra tài khoản mới chỉ thực hiện khi anh phê duyệt riêng vì đây là hành động tạo dữ liệu và chuyển tiền thật.
