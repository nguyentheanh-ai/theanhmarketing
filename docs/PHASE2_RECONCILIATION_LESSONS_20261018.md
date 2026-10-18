# Bài học giai đoạn 2 — phạm vi có kiểm chứng

## VERIFIED — Keychain có thể bị phiên sandbox che mất

Áp dụng: công cụ backup tenant này trên macOS; không suy rộng sang mọi lỗi credential. `backup-secrets.py check pat` trong sandbox báo chưa có secret, nhưng kiểm tra có quyền thực thi bên ngoài sandbox đọc được cùng mục và SELECT1 `read_only=true` qua Management API đạt. Không tạo token mới, không thay permission hoặc ACL. Khi lỗi giống vậy, phân biệt không đọc được với thực sự không tồn tại; chỉ dùng cơ chế cấp quyền công cụ được phép, không sửa bảo mật để vượt lỗi. Không ghi giá trị secret.

## VERIFIED — SQLite WAL mode=ro cần companion files hợp lệ

Áp dụng: fixture SQLite3.54 ở máy này. Chỉ `PRAGMA journal_mode=WAL` rồi mở reader mode=ro gây `unable to open database file` khi chưa có WAL/SHM. Bài test được sửa để writer đọc khởi tạo companion files trước reader; sau đó reader giữ snapshot trong lúc writer thay đổi dữ liệu và test đạt. Không sửa query_only hoặc quyền file để vượt lỗi; không dùng immutable=1 để giả định một DB đang thay đổi là bất biến. Export thực phải là tệp hoàn chỉnh và có nguồn snapshot rõ ràng.

## VERIFIED — Rà SDK phải theo dõi alias client và tách Storage

Áp dụng: mã A/B hiện hành. Chỉ dò tên receiver supabase/client bỏ sót `db=getSupabaseAdmin()!`, dẫn đến thiếu RPC nhận automation/cấp workspace B. Bộ quét AST bổ sung alias factory/import/parameter và regression test; tìm được các RPC thật. Storage.from(bucket) phải tách khỏi database.from(table). Đây vẫn là heuristic, không chứng minh runtime độc lập hoặc bao phủ fetch/SQL động/barrel/destructuring.

## VERIFIED — PK INCLUDE không phải toàn bộ khóa định danh

Áp dụng: exporter catalog PostgreSQL17. Reviewer chỉ ra pg_index.indkey gồm cả cột INCLUDE. Đã dùng unnest WITH ORDINALITY và giới hạn ord<=indnkeyatts; kiểm SQL thật trên hai project và giữ schema PK khi xuất đạt. Không suy ra mọi cách đọc index khác đều sai.

## VERIFIED — Mirror có cột redacted không thể làm bản final

Áp dụng: snapshot ứng dụng18/10,139bảng/40.274hàng. Tám bảng có cột bị lược bỏ, gồm orders. Importer/delta chặn chúng;131bảng còn lại roundtrip cục bộ đạt. Không dùng số dòng/checksum của dữ liệu đã lược bỏ để tuyên bố Auth/thanh toán/rollback production hoàn tất. Secret có thể còn nhúng trong JSON/value nên toàn bộ snapshot chỉ ở image mã hóa. Không có dữ liệu khách hoặc giá trị secret trong bài học này.

## VERIFIED — Probe từ archive kín cần giữ ranh giới kết luận

Áp dụng: probe Auth/B/legacy18/10, chỉ SQLite RAM. QA không chạy phải ghi NOT_RUN, không biến false thành FAIL/PASS; kiểm freshness phải nhận đúng lỗi authority thay vì mọi exception. Đã sửa và chạy QA A thật đạt. Tài khoản/credential roundtrip không chứng minh owner ENV, B profile, JWT hay phiên Worker; cần kiểm riêng từng quyền. Không đưa snapshot cũ thành fresh bằng timestamp heartbeat. Probe B dùng snapshot mới ≤5phút và backend đang phát hành;275profile/3membership đọc lại đúng, cross-workspace bị chặn. Đây chưa là chứng nhận production.

## VERIFIED — Timestamp PostgreSQL phải giữ offset và microsecond

Áp dụng: Auth PG text từ hai project hiện hành. `+00` cần chuẩn hóa `+00:00`, giữ microsecond revision; từ chối ngày rollover/24:00. Riêng auth.sessions.refreshed_at không timezone được producer Supabase ghi UTC (mã chính thức sessions.go); adapter kiểm đúng kiểu/cột trước thêm offset. Không suy rộng UTC cho ngày ứng dụng khác. Test fixture và toàn bộ1.101phiên/3.885token trong archive thật đã qua core validator/readback; không chứng minh live rolling adoption.

## VERIFIED — So cùng object đã làm tròn có thể báo đúng giả

Áp dụng: JSON.parse trong đường import/certify Source numeric/JSON. Reviewer dùng fixture sealed tái hiện bigint nested và decimal amount bị đổi nhưng probe cũ vẫn báo khớp do verifier nhận cùng object đã đổi. Chặn numeric literal không decimal-roundtrip bằng precise-json trước importer; native order prepare/decode cũng chặn, probe kiểm thêm amount_vnd đọc lại. Reviewer chạy lại hai repro đều bị từ chối; toàn bộ snapshot thật dùng trong probe sau sửa đạt. Guard từ chối giá trị chưa chuyển được nguyên vẹn, không tự hỗ trợ bigint/decimal mới hoặc chứng minh mọi provider JSON khác đã dùng guard.

## VERIFIED — Quyền dashboard và lesson có phạm vi khác

Áp dụng: Source services/lmsService.ts và app/learn hiện hành. mapCourse dashboard gắn enrollment qua slug ORcourseId; lesson truyền courseSlug vào RPC và courseQuery trước. Reference chỉ resolvedSlug đã tạo false-green với alias cũ. Test native dashboard tái hiện FAIL trước sửa; thêm scope SQL riêng cho lesson, chặn nhánh courseId đối với legacyDerived và EXISTS progress tránh nhân bản. Focused tests/fixture built Worker đạt; đối soát444subject/4.440scope từ archive thật đạt sau sửa. Source RPC thật và owner ENV chưa là bằng chứng của phép kiểm này.

## VERIFIED — Không suy schema từ cột target tương thích

Áp dụng: A public.orders snapshot18/10. Probe đầu yêu cầu deleted_at vì D1 access slice có cột đó, nhưng catalog Source hiện hành không có. Chỉ đọc lại tên cột để xác định nguyên nhân; bỏ yêu cầu trường Source, giữ nullable compatibility column NULL vì Source selector không lọc deleted_at. Không sửa Source hoặc mặc định bỏ mọi trường thiếu; các trường khác vẫn kiểm schema nghiêm. Probe thật sau sửa đạt.

## VERIFIED — Keychain CLI cần kiểm đọc lại toàn bộ giá trị

Áp dụng: macOS/security CLI trong lượt Auth-policy18/10. Giá trị JSON nhập stdin cho add-generic-password -w bị cắt còn128byte trên máy này; parse/readback phát hiện trước khi dùng. Đã chuyển sang chunk base64 tối đa96byte và manifest SHA256/size, tạo riêng v2 không ghi đè entry cũ; fixture lớn/tamper và đọc lại cấu hình thật đạt. Không suy giới hạn128byte cho mọi API Keychain; chỉ dùng cache v2 đã xác minh, không in giá trị.

## VERIFIED — RPC HTTP nhiều lượt chỉ có đối soát hai đầu cửa sổ

Áp dụng: mẫu55lượt RPC read-only A.11bảng chụp trước/sau bằng nhau và expiry không vượt cửa sổ; vẫn không loại trừ update rồi phục hồi giữa các request. Đã đổi receipt thành inputRowsEqualAtWindowEndpoints và transientSourceChangesExcluded=false; sameMvcc/writerFenced=false. Không dùng mẫu này làm final consistency/cutover proof. Management SQL thiếu EXECUTE dừng trước gọi, không đổi quyền.

## VERIFIED — Tiến độ Source có hai mẫu số và thứ tự enrollment chưa xác định

Áp dụng: services/lmsService.ts mapEnrollment/getStudentLmsAccess hiện hành. BySlug được thay bằng RPC playable count, byId fallback vẫn published count gồm bài rỗng. Đã tái hiện fixture50%/33% và giữ cùng phép tính. RPC không ORDER BY nên nhiều enrollment có giá trị khác nhau không có thứ tự ổn định: native từ chối thay vì chọn UUID/updated_at mới; không tự sửa thứ tự Source. Archive444subject và mẫu SourceRPC5subject đạt; chưa chứng minh mọi trạng thái phát sinh hoặc tương thích thứ tự cho trường hợp xung đột.

## VERIFIED — Guard page sau loading boundary có thể redirect bằng stream200

Áp dụng: vinext1.1.0 dashboard QA có loading.tsx. Bỏ guard layout để page tự auth làm guest nhận200 thay307 trong full built workerd test. Đã thêm await kiểm session native ở layout trước children, giữ kiểm lại quyền/version trong data query; rebuild và cùng harness guest307/noidentity/0outbound đạt. Không suy mọi redirect200 là lộ dữ liệu hoặc mọi router khác cần cùng sửa; lần lỗi ban đầu dừng trước assertion nội dung guest, nên không tuyên bố có/không rò rỉ từ lần đó. Production chưa dùng nhánh này.
