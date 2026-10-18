# Giai đoạn 2 — bỏ phụ thuộc Supabase

## Trạng thái hiện tại

**IN PROGRESS.** Nhánh riêng `codex/cloudflare-native-phase2-20261018`, tách từ A `538889f`; không thay mã hoặc nguồn ghi production. A bao gồm `/learn`; B là App riêng. Hosting Cloudflare đã LIVE theo bàn giao, nhưng database/Auth/Storage vẫn dùng Supabase và B còn cầu tương thích Vercel. Chưa có điều kiện hủy Supabase hoặc Vercel.

Đã thêm công cụ xuất snapshot nhất quán, đối soát và diễn tập đồng bộ chênh lệch cục bộ, công cụ rà phụ thuộc mã nguồn, SQL đọc catalog hiện hành. Đã xuất bản chụp mới 139 bảng/40.274 hàng vào image AES-256 và kiểm checksum toàn bộ; khôi phục mirror cục bộ 131 bảng không có cột bị lược bỏ đạt. Đây là dữ liệu ứng dụng chuẩn bị migration; chưa nối vào runtime hay đồng bộ production.

## Dữ liệu đã đọc lại

Nguồn: `reports/cloudflare-phase2-20261018/source-catalog.json`, truy vấn chỉ đọc lúc 11:07 UTC ngày 18/10/2026. Không xuất hàng dữ liệu khách hàng, password hash hoặc secret qua connector.

| Thành phần | A | B |
| --- | ---: | ---: |
| Bảng public | 43 | 58 |
| Bảng crm_v2 | 38 | 0 |
| Chính sách RLS | 95 | 66 |
| Function public/crm_v2 | 55 | 14 |
| Trigger nghiệp vụ | 9 | 31 |
| Tài khoản Auth | 447 | 276 |
| Bucket riêng tư | 3 | 1 |
| Metadata file Storage | 508 | 0 |

Tất cả 139 bảng ứng dụng đều bật RLS và có khóa chính ở lần đọc này. Tổng Auth 723 tài khoản; số identity theo provider không phải số người dùng độc lập. Metadata 508 file không chứng minh byte dữ liệu hoặc quyền R2 đã đối soát.

Bản sao D1 ngày 15/10 từng ghi A442/B271 tài khoản: **không dùng bản sao đó như dữ liệu production hiện hành**. Không suy ra số hàng thay đổi trong từng bảng từ chênh lệch số tài khoản.

## Mã vừa hoàn thiện

### 18/10 — Quyền admin và báo cáo đơn hàng native

`d1-admin-order-report.ts` + `d1-admin-role-prototype.sql` bổ sung backend báo cáo **public.orders không lọc**, không thay thế danh sách đơn `crm_v2.orders` có bộ lọc. Giữ cách dùng paid_at/created_at, ngày Việt Nam, khóa khách email/điện thoại/order và `buildCrmOrderSummary` hiện có. Chặn bộ lọc chưa hỗ trợ, khoảng ngày không hợp lệ/quá366ngày, dữ liệu vượt10.000hàng và tổng VND vượt số nguyên an toàn; không trả báo cáo thiếu hàng như thành công.

Mỗi phép đọc kiểm cùng một SQL: opaque session/hash/project, revoked/expiry/version, xác nhận email/status/ban/password-change, protected role + revision nguồn và freshness Auth/orders. Protected role được nhập riêng từ `app_metadata`, không từ `user_metadata` hoặc cột role đã trộn owner ENV. Protected editor ưu tiên trước owner ENV; owner fallback lấy danh sách backend hiện tại. Role/revision thiếu hoặc thay đổi thì từ chối. Đây vẫn là mirror, chưa là quyền admin native sau cutover hoặc cơ chế sửa role.

Probe archive thật:1.049đơn/447Authuser;3subject admin qua18phép so sánh (6khoảng ngày),444subject khác bị chặn. Oracle thực thi hàm đếm khách và predicate ngày lấy bằng AST từ repository, dùng selector nguồn cục bộ; **không thực thi RPC/API production**. Phiên trong phép thử là witness tổng hợp trong RAM, không chứng minh đăng nhập mật khẩu admin. Owner ENV bổ sung chưa đối soát. Báo cáo `sealed-admin-orders-a.json` chỉ số đếm, không chứa doanh thu/khách hàng.

Adapter HTTP `d1-admin-order-http.ts` chặn đổi subject/query trùng, cross-origin/cross-site, cookie trùng và phương thức khác GET; response `private, no-store`. **Chưa được gắn router hoặc giao diện staging/production**, không tạo đường quản trị mới đang truy cập được. Actual workerd+D1 cục bộ qua5nhóm HTTP với fixture;0fetch ngoài; Node5kiểm role/race/ngày/giới hạn/import đạt. Reviewer độc lập không thấy lỗi chặn trong core; transport/probe được kiểm tiếp trước checkpoint.

Đã đọc metadata RPC thật `student_lms_enrollments_scoped(uuid,text,text)` bằng Management API `read_only=true`: body SQL token khớp migration, SQL/STABLE/SECURITY INVOKER, search_path rỗng, anon/authenticated không EXECUTE, service_role được EXECUTE.2Python test đạt. Không đọc hàng khách, không gọi RPC, không in body/secret. `source-lms-rpc-contract.json` ghi rõ `sourceRpcExecuted:false`; kết quả này bổ sung bằng chứng định nghĩa, không thay thế kiểm kết quả runtime/RLS.

Không deploy/chuyển nguồn ghi, không đổi secret, không sửa production. Import role chỉ là kế hoạch INSERT ban đầu, phải đi cùng transaction Auth của cùng snapshot; chưa có role delta/native authority. Tiếp tục CRM CRUD, toàn bộ admin, Google OAuth, Storage, đồng bộ và rollback trước khi đề xuất bỏ Supabase.

### 18/10 — Bản chụp đầy đủ trường, Auth và phân quyền B

Đã bổ sung `export-sealed-source-snapshot.py` và `sealed-source-snapshot.mjs`. Export một SELECT/MVCC riêng từng project, gồm app + `auth` + metadata `storage`, không NULL cột nhạy cảm. Dữ liệu chỉ đi qua bộ nhớ tiến trình và stdin bắt giữ; mỗi hàng được AES-256-GCM với nonce riêng, AAD gắn project/snapshot/catalog/khóa hàng đã HMAC. HKDF tách khóa theo project/mục đích; manifest và giá trị được xác thực. Toàn bộ SQLite chỉ chứa ciphertext và HMAC, vẫn nằm trong image AES-256 hiện có; không thêm secret production. Đã đọc lại file, xác minh mọi hàng trước khi đưa vào importer. Không in password hash, bearer hoặc thông tin khách hàng.

| Bản chụp kín 18/10 UTC | A | B |
| --- | ---: | ---: |
| Thời điểm đầu | 11:32:10 | 11:33:41 |
| Bảng gồm app/Auth/Storage metadata | 116 | 93 |
| Hàng đầu | 40.269 | 8.756 |
| Bảng Auth | 27 | 27 |
| Bảng metadata Storage | 8 | 8 |
| Thời điểm thứ hai | 11:41:55 | 11:40:52 |
| Hàng thứ hai | 40.270 | 8.756 |

209 bảng/49.025 hàng ở lượt đầu, 49.026 hàng lượt sau. A thêm1hàng `public.activity_logs`, không có sửa/xóa; B không đổi. Schema và toàn bộ hàng của hai cặp snapshot đều được xác thực trước so sánh. Đây là đối soát hai thời điểm thật, **chưa apply delta vào runtime hoặc chứng minh source fence/rollback giữ ghi mới**. Không chứa byte file Storage, cấu hình Auth nhà cung cấp/JWT signing key hoặc toàn bộ định nghĩa RLS/function/trigger; không gọi đây là backup logic hoàn chỉnh.

Các probe mới chỉ dùng SQLite RAM, không HTTP/network hay ghi D1 remote:

- `probe-sealed-auth-native.mjs`: nhập và đọc lại từng trường danh tính/trạng thái/metadata/hash mã hóa của A447/B276 tài khoản; 709 bcrypt,14 không có mật khẩu. QA A dùng mật khẩu cũ đăng nhập native core, giữ UUID; mật khẩu sai bị từ chối; hết hạn kiểm đúng lỗi freshness. Đồng hồ cố ý replay tại thời điểm snapshot, không tạo chứng nhận freshness live. B chưa thử mật khẩu vì không có mật khẩu QA B đã xác minh; báo `NOT_RUN_NO_VERIFIED_PASSWORD`.
- `probe-sealed-legacy-sessions.mjs`: A1.071phiên/3.794token, B30phiên/91token; toàn bộ hàng và HMAC bearer/quan hệ token cha/trạng thái thu hồi đọc lại khớp. A1phiên không còn token hiện hành vẫn đóng. Không lược bỏ security field chưa hỗ trợ; core từ chối trường/graph không tương thích. Riêng `auth.sessions.refreshed_at` là timestamp không timezone được producer Supabase ghi UTC; chỉ adapter trường này chuẩn hóa UTC, giữ microsecond. [Mã producer chính thức](https://github.com/supabase/auth/blob/master/internal/models/sessions.go). Snapshot trạng thái `pending/restored-backup`, không cấp/chấp nhận phiên Worker, chưa final fence/JWT/rolling adoption.
- `probe-sealed-b-authorization.mjs`: dùng backend B hiện có từ worktree phát hành để kiểm snapshot thật mới ≤5phút. 276Authuser,275profile,3workspace,3membership nhập/đọc lại từng hàng khớp; 275profile active được kiểm lại email/role từ backend dù cookie giả lập role cũ;3membership đúng role/name/UUID;275lượt xin workspace không có membership bị chặn. Không có profile inactive thật nên không tuyên bố kiểm live trường hợp đó; fixture hiện có bao phủ riêng. Không chứng minh xác thực mật mã của cookie/session, toàn bộ B hoặc quyền admin A.
- `rehearse-sealed-source.py` chạy lại các probe/compare từ image đã mount; lấy khóa hiện có trong Keychain, stdin-only, không chuyển tiếp stdout/stderr lỗi chứa dữ liệu riêng.

Bằng chứng tổng hợp: `reports/cloudflare-phase2-20261018/sealed-native-auth-{a,b}.json`, `sealed-legacy-sessions-{a,b}.json`, `sealed-b-authorization.json`, `sealed-source-delta-{a,b}.json`. Không commit SQLite/bản sao khách hàng. Quyền owner A thêm bằng ENV chưa xác minh parity; B dùng profile/membership riêng. Chưa chuyển writer/Auth/Storage production, không tạo/đổi secret, không deploy hay tác động Adplan.

Kiểm hiện hành:81Nodefixture liên quan (gồm các kiểm cũ payment/session/access) +24Python (delta16/exporter5/sealed3) PASS; typecheck Cloudflare và ESLint bốn file runtime đổi PASS. Reviewer đã kiểm seal/Auth/B/legacy và các probe nghiệp vụ;3phát hiện precision/alias đã sửa và chạy lại fixture tái hiện đạt. Các kết quả này không thay thế staging native, toàn bộ RLS/nghiệp vụ, private R2, hiệu năng và quay lui dữ liệu.

### 18/10 — Đối soát nghiệp vụ và sửa candidate native

- Toàn bộ1.049đơn/67cột nhập native order core và đọc lại JSON + số tiền thực thi khớp;0hàng bị loại. Không trùng mã giao dịch/tham chiếu giữa các đơn. Có27đơn paid không giữ bank identity: không tạo giả receipt, không gửi lại giao hàng; không coi chúng đủ bằng chứng xử lý lại webhook.
- Nội dung10khóa/23module/59bài/11resource được ghép bằng UUID và đọc lại từng document;23bài qua bộ lọc xuất bản. URL bắt buộc có bài gốc trong phần xuất bản. Hai nhóm sort_order trùng chỉ ở phần chưa xuất bản; phần phục vụ có0nhóm trùng. Có0link resource ở23bài xuất bản trong snapshot này; chưa kiểm byte file/R2 bằng phép kiểm nội dung này.
- A444subject học viên,3admin đã biết bỏ qua: quyền khóa và tập bài hoàn thành so với predicate dịch vụ Source trong repository khớp, gồm4.440phép kiểm theo courseSlug;444đổi chéo id/email bị từ chối. Nhập/đọc lại193contact/147enrollment/4progress/425đơn paid/47override. **Chưa gọi RPC PostgreSQL thật để làm oracle, chưa kiểm phần trăm tiến độ hoặc quyền owner ENV**; đây là đối soát SQL/native từ archive với logic Source đã đọc, không là chứng nhận đầy đủ hiện trạng production.
- Reviewer tái hiện decimal/bigint bị JSON.parse làm tròn trước so sánh. `lib/cloudflare/precise-json.ts` nay từ chối literal không giữ nguyên giá trị thập phân khi roundtrip; áp dụng trước parse metadata Source, course, learning và native order prepare/decode. Không âm thầm làm tròn hoặc đổi dữ liệu nguồn. Dữ liệu thật nêu trên đã chạy lại sau guard và đạt.
- Reviewer tìm thấy nhánh Source dashboard gắn enrollment theo **course ID hoặc slug**, còn `/learn` lọc resolved slug trong RPC và catalog trước. Đã tái hiện test FAIL rồi sửa `d1-course-access.ts` và composition trong `d1-student-session-access.ts`; phân biệt đúng dashboard/lesson, legacyDerived không được mở thêm course qua ID, progress dùng EXISTS tránh nhân bản. Không đổi quyền production.
- Bổ sung adapter biết catalog `public.orders` hiện hành không có deleted_at; cột tương thích của access slice giữ NULL theo đúng dịch vụ Source, không giả thêm cột ở PostgreSQL. Sửa test-loader để chấp nhận đường dẫn compiler tương đối theo lệnh tài liệu.

Build `zsh scripts/build-cloudflare-production.sh` đạt, từ5biến công khai đúng domain của release A; artifact guard kiểm9cổng tắt/attachDomains=false. Lần sandbox đầu bị EPERM mở127.0.0.1; chạy build với quyền localhost đạt. Không đưa secret runtime production vào môi trường build riêng; cảnh báo thiếu5secret local không chứng minh thiếu secret ở Worker thật. Artifact là **ứng viên từ working tree đang sửa**, không đủ nguồn phát hành để deploy trực tiếp.

Thử actual built vinext/root SSR trên workerd+D1 cục bộ:6nhóm đạt (login, HTML học, hoàn thành+reload, guest cache denial, next UUID, stale form). Payment staging handler trên workerd+D1 cục bộ:7nhóm đạt (idempotency, retry, access/account/email ledger). Tất cả subject/đơn/provider của hai harness là fixture; email/Meta/Telegram/Sheets chặn hoặc cục bộ, không gửi thật. Không có browser/hydration/Safari/hosted native hoặc proof primary trong lần kiểm này. Bằng chứng: `sealed-native-orders-a.json`, `sealed-native-courses-a.json`, `sealed-learning-access-a.json` trong báo cáo phase2 và `reports/cloudflare-d1/native-{full-worker,payment-stage-workers}.json`.

Image backup đã eject sau khi đọc xong. Chưa deploy, chưa tạo secret, chưa chuyển writer/Auth/Storage hoặc hủy dịch vụ cũ.

### 0. Xuất snapshot mới chỉ đọc

`scripts/export-consistent-app-mirror.py` dùng PAT hiện có trong Keychain và Management API với `read_only=true`. Khám phá catalog trước; sau đó **catalog kiểm lại + count + toàn bộ hàng trong một câu SELECT**, kèm `pg_current_snapshot()` và `statement_timestamp()`. Nếu schema thay đổi giữa hai lần đọc hoặc số hàng trả về bị thiếu thì từ chối. Phân biệt cột khóa chính với cột INCLUDE qua `indnkeyatts`.

Chỉ chạy CLI khi image backup cố định đã mount; tạo thư mục mới0700, SQLite0600, không ghi đè. Giới hạn phản hồi256MiB, không retry ghi, không in raw HTTP/SQL error, row hoặc token. Giá trị số chính xác, UUID, JSON/array/bytea/time giữ dạng text PostgreSQL; integer/boolean/real được chuyển kiểu có kiểm tra. Manifest `pg-text-v1` không được ghép delta với export cũ khác biểu diễn.

Cột khớp regex nhạy cảm được NULL ngay trong SQL và ghi rõ trong manifest. **Regex tên cột không bảo đảm loại được secret nhúng trong JSON hoặc cột value/config**, nên mọi byte snapshot vẫn chỉ ở image mã hóa. Không upload các bản sao này lên Git/D1 remote. Auth và byte file Storage không nằm trong snapshot ứng dụng này; không gọi đây là backup toàn bộ Supabase.

Kết quả thật: `reports/cloudflare-phase2-20261018/real-snapshot-rehearsal.json`.

| Bản chụp | A | B |
| --- | ---: | ---: |
| Thời điểm snapshot UTC18/10 | 11:14:25 | 11:15:16 |
| Bảng | 81 | 58 |
| Hàng | 32.392 | 7.882 |
| Bảng có cột bị lược bỏ, chặn apply | 5 | 3 |
| Bảng mirror cục bộ đối soát/khôi phục đạt | 76 | 55 |

Đã đọc lại digest của139bảng khớp manifest, thử copy/khôi phục131bảng còn lại trong image. Đây là **roundtrip của cùng snapshot**, chưa phải bắt kịp hai thời điểm production khác nhau, D1 remote, thử phục hồi đầy đủ Auth/Storage hoặc chứng minh không mất ghi sau cutover. A/B có snapshot riêng, không gộp hoặc cam kết cùng thời điểm chéo hai database. Tám bảng bị chặn gồm `orders`; không được tuyên bố thanh toán đã sẵn sàng chạy D1 vì kết quả này.

### 1. Đối soát và diễn tập delta

`scripts/reconcile-d1-mirror.py` chỉ đọc hai SQLite export ứng dụng; không có API/provider, không hỗ trợ `--remote` hay ghi PostgreSQL. Tách A/B theo project và prefix bảng. Báo cáo chỉ chứa tên bảng, số dòng, số thay đổi, digest và mã chặn; không chứa khóa hàng hay giá trị khách hàng.

- Digest SHA-256 multiset có phân biệt kiểu, NULL, blob, số chính xác lưu dạng text, chuỗi JSON/time nguyên gốc và số lần lặp.
- Khóa chính nhiều cột; phát hiện thêm/sửa/xóa dù tổng số dòng không đổi.
- Chặn schema đổi, bảng thiếu, không có khóa ổn định, khóa NULL/trùng và cột đã bị lược bỏ vì nhạy cảm.
- `prepare-local` chỉ tạo tệp mới quyền0600 trong thư mục riêng tư ngoài Git. Với dữ liệu thật, operator bắt buộc dùng image mã hóa; quyền0600 không thay thế mã hóa.
- `apply-local` chỉ ghi bản diễn tập có marker `offline-only`, không cho dùng source hoặc hardlink của source. Kiểm toàn bộ baseline trước ghi trong `BEGIN IMMEDIATE`; kiểm digest sau cùng và khóa ngoại trước commit.
- Chặn trigger và hoàn tác khi cascade thay đổi bảng ngoài phạm vi. Lỗi một bảng hoàn tác cả lượt.
- Diễn tập delta ngược khôi phục đúng baseline khi không có ghi mới; nếu có đơn mới ở đích thì từ chối rollback thay vì xóa đơn đó. **Đây chưa phải giải pháp bắt kịp ghi mới khi rollback production.**

Giới hạn quan trọng: dùng schema mirror của công cụ cũ, không tái tạo constraint/RLS/function PostgreSQL. Chỉ kiểm trong các bảng được chọn, không chứng nhận toàn bộ database. Hai export đầu vào không tự được coi là snapshot PostgreSQL nhất quán. Manifest cũ chứa số lượng, không có chữ ký chứng nhận nguồn; `readyForCutover` luôn false. Không tạo file SQL chứa dữ liệu để đưa lên Git.

### 2. Rà phụ thuộc Source

`scripts/inventory-supabase-dependencies.mjs` dùng TypeScript AST đọc import/re-export/import động cố định và các lời gọi SDK; có theo dõi biến alias như `db=getSupabaseAdmin()`. Không quét `.env`, không in tham số Auth/payload/URL, bỏ test và type-only import.

Kết quả cuối: `reports/cloudflare-phase2-20261018/supabase-dependencies-final.json`.

| Phép rà tĩnh | A | B |
| --- | ---: | ---: |
| Entrypoint page/layout/route/proxy | 157 | 87 |
| Có đường import tới thành phần phụ thuộc Source | 141 | 59 |
| Module có import/lời gọi Source được phát hiện | 84 | 32 |
| Lời gọi SDK được phát hiện | 549 | 136 |
| Tên bảng/RPC/schema động cần rà thủ công | 6 | 6 |
| Import nội bộ chưa giải quyết | 2 | 0 |

Đây là heuristic và có thể bao gồm nhánh dự phòng đang tắt; không phải số tính năng hỏng hoặc tỷ lệ migration đã hoàn thành. Không thấy tham chiếu tĩnh cũng không chứng minh độc lập khi chạy. Cần audit thêm fetch URL, SQL sinh động, job ngoài app, alias qua barrel/destructuring và hai import A còn thiếu. App B có thêm RPC `ads_os_claim_automation_rules`, `ads_os_ensure_workspace`; không bỏ sót chỉ vì client được đặt tên `db`.

Các file `supabase-dependencies.json`, `-v2.json`, `-v3.json` là đầu ra trung gian của quá trình chỉnh bộ quét; giữ nguyên tại máy, không dùng làm kết quả cuối.

## Kiểm chứng

- Python delta: 16/16 tình huống fixture, gồm drift, delta ngược, khóa nhiều cột, byte/numeric, FK rollback, cascade ngoài phạm vi, tenant, redaction, WAL snapshot cục bộ, sai biểu diễn và manifest digest, không lộ giá trị.
- Python exporter: 5/5 tình huống fixture về SQL chỉ đọc, bảng rộng, giữ kiểu, quyền tệp, schema drift, truncation và redaction. Hai lần thực thi SQL thật A/B cùng kiểm snapshot nêu trên đạt.
- Node: 5/5 tình huống AST, gồm đồ thị có vòng, alias, Storage/Auth, RPC động, proxy, import động và không lộ secret fixture.
- Reviewer độc lập đã chạy delta16/exporter5/Node5 ở các lượt kiểm tương ứng; không thấy lỗi chặn. Reviewer lưu ý PRIMARY KEY INCLUDE và đã sửa truy vấn chỉ lấy `indnkeyatts`; kiểm exporter và SQL A/B thật sau sửa đạt.
- Image backup AES-256 đã được kiểm tra/mount; export SQLite15/10 không còn nên không giả định baseline cũ còn dùng được. Hai snapshot mới và mirror diễn tập được thêm vào thư mục mới, không sửa dump/backup cũ. Đóng image sau khi kết thúc.
- Chưa kiểm D1 remote, delta hai thời điểm thực khác nhau, writer fence, full build/typecheck/lint ứng dụng hoặc trình duyệt trong giai đoạn này: không thay runtime app/dependency/deploy config. Tổng26test cục bộ đạt không thay thế các kiểm chứng còn thiếu này.

## Việc kỹ thuật tiếp theo

1. Đã có bản chụp kín đầy đủ trường/Auth/Storage metadata và đối soát hai thời điểm thật. Tiếp tục parity nghiệp vụ/native importer, cấu hình provider/JWT và rolling session adoption; không coi baseline18/10 là bản final khi production tiếp tục phát sinh dữ liệu.
2. Từ graph hiện hành, hoàn thiện provider D1 cho admin/CRM/orders/LMS của A và quyền/workspace/resources của B. Dùng bảng và RPC thực tế; so từng kết quả/quyền với Source. Không gộp A/B hoặc sửa Adplan.
3. Kiểm staging native không gọi Source cho luồng đã chuyển, gồm Auth/phiên cũ, cấp quyền và tải file riêng tư. Test âm truy cập chéo user/workspace và cache; không dùng tiến độ học viên thật.
4. Thiết kế bắt kịp ghi, source fence và chiều rollback giữ dữ liệu phát sinh. Công cụ offline mới chỉ là phép diễn tập, không thay thế cơ chế này.
5. Chỉ đề xuất chuyển writer sau khi đủ parity, hiệu năng, bảo mật, backup/restore và rollback. Việc đổi writer/Auth/Storage production hoặc hủy dịch vụ cần anh duyệt riêng. Chưa có yêu cầu tạo/đổi secret trong lượt này.

## Cách chạy lại cho kỹ thuật

```sh
python3 scripts/test-reconcile-d1-mirror.py
python3 scripts/test-export-consistent-app-mirror.py
PHASE2_TYPESCRIPT_ROOT=../main node --test tests/cloudflare-phase2-dependency-inventory.test.mjs
```

Operator dùng `compare --project a|b --baseline <copy.sqlite cũ> --current <copy.sqlite mới> --baseline-manifest <manifest cũ> --current-manifest <manifest mới>`; muốn chọn bảng thêm `--tables ...`. Chuẩn bị bản diễn tập bằng `prepare-local --project a|b --baseline ... --target <tệp mới trong image mã hóa>`, sau đó `apply-local` với cùng cặp snapshot/manifest và target. Không chạy trên database đang phục vụ hoặc đưa bản sao dữ liệu vào repository.

### 18/10 — R2, cấu hình Auth và RPC học chỉ đọc

- TESTED: đọc lại toàn bộ508file R2,941.709.415byte, SHA-256/size khớp bản sao mã hóa và metadata Source; index/bucket riêng tư kiểm lại sau lượt đọc. Không tải lại byte từ Source trong lượt này, không chứng minh người học tải thật. Image đã đóng.
- TESTED cục bộ: actual built vinext/workerd/D1 có9nhóm đạt, bổ sung Ebook/PDF Range206, PNG đúng byte, guest/unowned/tampered/index thiếu bị chặn;0fetch ngoài. Fixture không thay browser/Safari/hosted native.
- TESTED mẫu Source RPC thật:5subject×11scope=55lượt đọc, quyền và tập bài hoàn thành khớp native.11bảng đầu vào bằng nhau tại hai đầu cửa sổ12:36:31–12:37:16UTC. Không có expiry vượt cửa sổ; **không loại trừ thay đổi tạm ở giữa**, không phải cùng MVCC hoặc source fence, chưa phần trăm tiến độ/toàn bộ học viên. Phương án Management SQL RPC bị thiếu EXECUTE đã dừng, không GRANT; dùng service-role RAM-only được anh duyệt, không lưu key.
- TESTED cấu hình: đọc Auth A/B và cache phần allowlist nhạy cảm vào Keychain, kiểm đọc lại SHA/JSON. A bật Google, B bật email/Facebook trong cấu hình; B hiện dùng cầu A→B, không suy Facebook đang được App sử dụng. ES256 public JWKS mỗi project1key, TTL3600s/refresh rotation bật. JWT shared secret không trả về. Chưa đổi redirect/provider/Worker secret hoặc chạy OAuth thật.
- Công cụ Python11test và Node reference3test đạt; reviewer không thấy blocker trong chunked Keychain/oracle. Báo cáo chi tiết không PII: `private-storage-a-readback.json`, `source-auth-policy.json`, `source-lms-rpc-window-a.json` trong reports/cloudflare-phase2-20261018. Phiên bản script mới thêm kiểm clock và mô tả đúng giới hạn hai đầu cửa sổ.

IN PROGRESS: dashboard tiến độ, admin/CRM đầy đủ, provider B, rolling Auth/phiên cũ, staging native, source fence/delta và rollback giữ ghi mới. Không deploy, không đổi nguồn ghi/Auth/Storage production, không gửi email hoặc hủy dịch vụ. Supabase và Blue B bridge vẫn cần giữ.

### 18/10 — Tiến độ dashboard native

TESTED backend đọc D1 cùng statement với quyền học/phiên/version/cohort/freshness. Giữ mẫu số playable theo slug; fallback course ID dùng số bài xuất bản theo Source; khóa chưa có bài dùng metadata số hữu hạn, chặn0–100. Source RPC không ORDER BY nhưng dashboard chọn enrollment đầu: candidate từ chối nếu nhiều enrollment có phần trăm khác nhau, không tự chọn thứ tự mới. Đây là gate cần giải quyết trước primary, không đổi Source.

Archive11:41:55UTC:444học viên/3admin bỏ qua,4.440scope,444đổi chéo danh tính bị chặn; phần trăm dashboard/quyền/bài hoàn thành khớp reference repository. Source thật12:44:18–12:45:08UTC:5subject/55RPC đọc khớp thêm phần trăm;11bảng bằng nhau tại hai đầu cửa sổ, không có fence/cùngMVCC, không loại trừ thay đổi tạm ở giữa. Không ghi tiến độ/đăng nhập Source.

HTTP candidate `/api/cloudflare-student/dashboard-progress` trả đúng field, no-store/Vary Cookie, không nhận user/email/course từ query; guest/cross-site/stale bị chặn. Native router chỉ staging QA, không production.18Node focused +5nhóm actual workerd/D1 cục bộ PASS; typecheck/scopedlint PASS. Hạng mục mới là phép đọc/backend, **chưa nối trang dashboard/UI hoặc deploy**. Receipt `sealed-dashboard-progress-a.json`, `source-lms-rpc-progress-window-a.json`, `native-dashboard-progress-workers.json`. Supabase còn writer/Auth/Storage; IN PROGRESS toàn migration.

### 18/10 — Dashboard native, danh mục và nhật ký QA

Nhánh QA `/dashboard` đã dùng D1 cho quyền, phần trăm tiến độ, tên hồ sơ, danh mục khóa/tài liệu; truyền provider và witness đúng cho đăng xuất. Danh mục công khai giữ cùng mapper/quy tắc Source, loại nội dung/video/file của bài học trước khi lưu snapshot. Anonymous API thật12:50:28–12:50:29UTC:10course/1resource; kết quả native khớp actual `getCourses(summaryOnly:true)` và mapper resource Source. Snapshot pending phải đọc lại đúng nội dung/hash trước publish; bản cũ/cùng thời gian khác nội dung không thay bản mới, thiếu/stale/corrupt không fallback.

Nhật ký dashboard QA ghi riêng D1 bằng session/cohort đã kiểm và kiểm lại trong INSERT, chống trùng15phút. Chỉ bật khi QA progress write gate=qa; chưa import lịch sử activity hoặc chứng nhận ledger production. Mặc định các gate vẫn OFF. Hai nhánh Source hiện hành giữ nguyên; resource mapper được tách thuần dùng chung, không đổi query/cache.

Actual built vinext/workerd/D1/R2 cục bộ **12nhóm PASS**,0outbound: login→lesson→complete→dashboard50%→guest307→activity thực sự có1row dù lặp→next UUID→Ebook quyền/Range/PNG→stale form. Harness chỉ fixture, không browser/hydration/Safari hoặc hosted/nativeprimary. Phát hiện guest dashboard redirect sau loading boundary trả200; đã đưa await Auth guard lên layout và chạy lại xác minh307, không lấy đọc mã làm bằng chứng. Native data query vẫn kiểm lại phiên/quyền cùng statement.

Build đúng `scripts/build-cloudflare-production.sh` PASS/9nativegateOFF/attachDomains=false, artifact từ working tree feature đang sửa. Chưa deploy/gắn domain/đổi writer/Auth/Storage. Typecheck/scopedlint PASS;25Node core tests PASS và15test hồi quy public/portal liên quan PASS sau cập nhật test-loader cho nhánh native và test hành vi workbook mapper. Reviewer không thấy blocker ở catalog/publication/activity/UI/guard; actual runtime là bằng chứng riêng.

Còn `/tai-khoan`, một số route dashboard khác, admin/CRM, App B đầy đủ, hosted OAuth/phiên cũ, fence/delta/rollback giữ ghi mới; không coi mọi link dashboard đã native. Supabase/Blue B bridge vẫn cần giữ. Receipt: `source-public-student-catalog-a.json`, `reports/cloudflare-d1/native-full-worker.json`.

## 18/10/2026 — Tài khoản A native, cập nhật tên/điện thoại QA

**IN PROGRESS.** `/tai-khoan` staging QA lấy profile và khóa học từ cùng reader D1 đã kiểm quyền, logout/form mang witness theo tài khoản/family/version; không Source fallback. Form native cập nhật tên/điện thoại qua POSTbackendD1; đổi mật khẩu gọi endpoint native hiện có, giữ operationID khiretry và bắt đăng nhập lại sau thành công. Native đổi email chưa được port: dừng trước Source, không giả đã gửi thư. SourceproductionOFFpath giữ nguyên.

Gate mới `CF_NATIVE_QA_PROFILE_WRITES=disabled` mặc định; artifact checker bắt buộc cả10nativegatesOFF. Profilewrite cần Origin/CSRF,opaque session,cohort,Authmirrorverified,limiter và **Auth Context key+witness bắt buộc**. JSONchỉcho2fields,giữmetadata khác/UUID/credential/role/sessionversion. CAS trướcupdate và guardedreceipt cùngatomicbatch rollback nếu quyền/authority mất; formA+cookieB hoặc familymới trả409.

35tests Node scoped/hồi quy PASS (7SQL/HTTPprofile,4forminteraction,password/sourceaccount/artifact),CloudflareTypeScript/scopedESLint PASS; buildproduction bằng đúng `scripts/build-cloudflare-production.sh` PASS,10gatesOFF/noattach. ActualvinextWorkerD1/R2local **15nhómPASS,0outbound** gồm tài khoản–lưu profile–refreshdashboard/account–guest307–stalewitness/progress/Ebook. Receipt `reports/cloudflare-d1/native-full-worker.json`; fixture tổng hợp,khôngbrowser/hydration/hosted/productionwrite. Reviewer tìm lỗi thiếuwitness rồi7tests xác nhậnfix; không suy ra quyền cutover.

Còn nativeemailchange,adminCRMCRUD/fullRLS,providerreal/sessionadoption,finaldelta/fence/reverserollback và hostedQA trước bỏSupabase. Không tạo/đổi secret,DNS,Sourcewriter,email hay dịch vụcũ.

### 18/10 — Chuẩn bị phát hành staging đã được anh duyệt

Đăng ký riêng hai root phase2-main/phase2-app chỉ targetWorkerstaging, đồng bộ GitHub khôngforce và preflightSHA đạt. Artifactstaging riêng cũng đã chạy actualWorkerlocal15nhómA/8nhómB,0outbound; chưaupload tại checkpointnày. SourceRPCoracleQA trước đây dùngSQLrole không cóEXECUTE; candidate mới dùng service_role hiệncó chỉRAM/RESTread, kiểmbodySTABLEvàsecurityinvokertrước, sođủinput liênquan tại2đầucửa sổ/expiry.4testswindowPASS; chưa chạyreadAPIởcheckpointnày. KhôngGRANT,khônggọiLoginSource,khôngclaimsameMVCC/finalfence.

### 18/10 — Staging đã triển khai, đối soát QA mới

Hai Worker staging đã nhận candidate: A version `1eca732c-c908-4ac9-99c4-63d6f1294a95` từ `3b49dfa`, B version `8d30c058-dbee-4f20-ba0b-f15d564ae738` từ `4bc1340`. Đây là staging, không domain/cron production. Artifact riêng staging A15/B8 nhóm actualWorker local đạt; không lấy bản build staging làm production artifact.

Source QA thay đổi từ snapshot cũ: thêm quyền/tài liệu, tiến độ completed và dấu thời gian Auth. Đã giữ counter3 cùng2 global-logout đã chứng minh, chỉ đồng bộ cursor Auth khi bảo mật/credential/metadata khớp. B append tài liệu Source QA mới, không sửa/xóa tài liệu nền. A refresh đúng khóa Facebook với CAS đầy đủ, giữ quyền cũ, append quyền QA mới; không sửa Source. Oracle RPC thật + fullfield staging đọc lại đạt1enrollment/1progress/2ownedproducts. Hai đầu cửa sổ Source bằng nhau, chưa loại trừ thay đổi thoáng qua hoặc finalfence.

Catalog công khai13:45UTC nhập/publish/đọc lại D1 staging khớp actual Source service10course/1resource, không lessonprivatepayload. Marketing/brand snapshot mới đọc lại đủ trường; thiếu brand Source dùng đúng mapper default hiện hành. Trạng thái hostedQA còn IN PROGRESS; chưa suy ra native Auth/writer/Storage production hoặc bỏ Supabase/Vercel.

## 18/10 — kiểm thử HTTP staging và sửa trang tài khoản

- A → App B riêng: đăng nhập, chống replay, workspace, tạo/đọc/xóa tài liệu QA, logout đã qua kiểm thử hosted HTTP; dữ liệu tài liệu có sẵn giữ nguyên.
- A: bài học bắt buộc, dashboard, Ebook PDF/PNG riêng tư và Range đã qua hosted HTTP. Tiến độ QA ban đầu đã hoàn thành: thử bỏ hoàn thành rồi hoàn thành lại; CAS khôi phục đầy đủ bản gốc sau thử.
- Phát hiện `/dashboard` và `/tai-khoan` thiếu route refresh và header bảo vệ ở ranh giới Worker. Test RED: thiếu Cache-Control, phiên hết hạn trả 303. Sửa đúng hai đường dẫn; 16 unit PASS, workerd/D1 kiểm phiên hết hạn PASS, bản vinext thực 15 nhóm PASS và không có fetch ra ngoài.
- Kiểm thử hồ sơ lần đầu dừng trước thao tác ghi; trạng thái QA được xác nhận không đổi, gates đóng và phiên QA thu hồi. Đang thử lại sau bản sửa.
- Không phải bằng chứng browser hydration/Safari hay đủ điều kiện chuyển nguồn ghi. Supabase production vẫn writer/Auth/Storage; native chỉ QA staging.

### 14:19 UTC — hoàn tất lượt QA hosted và thu hồi quyền tạm

- Hồ sơ hosted HTTP 7 kiểm tra PASS: login family, witness SSR, thiếu witness409/sai Origin403, cập nhật tên/điện thoại+SSR, refresh giữ dữ liệu, biểu mẫu family cũ409, logout/cookie cũ bị từ chối. Lượt thất bại trước đã được khôi phục; nguyên nhân chưa chứng minh, không coi một lần chạy lại đạt là bằng chứng sửa nguyên nhân. Bổ sung stage/type/numeric assertion diagnostics và giữ response lỗi trước cleanup để lần sau không nhầm409 của logout với lỗi chính.
- CAS restore nguyên bản hồ sơ/progress QA đạt; bốn driver chuyển HTTP_TESTED sau xác minh Access ngoài đã thu hồi. Hai policy/token45phút bị thu hồi lúc14:18:39UTC; owner policy nguyên vẹn. Hai Secret QA đã gỡ, A6/B3 Secret cũ còn nguyên; A10gateOFF, Bnativeoff/cohort[], active sessions/families0. Image mã hóa không mount.
- Đọc lại production14:19:20UTC: A920ab23f, B94854193 vẫn100%; không deploy/chuyển nguồn production. Receipt chung: ../reports/cloudflare-phase2-20261018/native-hosted-final-readback.json và access-qa-phase2-cleanup.json.
- Browser nội bộ mới kiểm guest desktop/mobile viewport; authenticated hydration/Safari phase2, signup/recovery/Google live, admin/CRM, toàn App B và fence/reverse rollback còn phải hoàn tất trước quyết định bỏ Supabase.

### Chốt chống ghi nhầm Source từ native QA

Audit RegisterForm xác nhận nhánh signup D1 tiếp tục POST /api/leads và /api/orders hiện còn Source. Giữ email QA OFF. Thêm ranh giới sau native handlers trước app.fetch: đúng staging A, native Auth/email/payment mode hoạt động hoặc sai cấu hình thì chặn mọi API cũ (kể cả GET job), callback Auth cũ và server action/non-GET. Chuẩn hóa path mã hóa/slash/backslash; production/default-OFF giữ nguyên. Đây là containment503, không thay cho port checkout. Không chứng minh cách ly mọi SDK network từ browser.

RED actual vinext cũ nhận400 từ legacy handler thay vì chặn503; bản mới20focused PASS, TypeScript/buildcfstaging PASS, actual vinext16nhóm/D1/R2 PASS0outbound. Reviewer không thấy blocker. Bằng chứng native-full-worker.json; tiếp theo port pipeline signup/lead/order/invoice/idempotency trước khi bật đăng ký/email QA.

### Checkout D1 — giá backend dùng chung, chưa mount/deploy

Khối pricing chuyển nguyên từ orderService sang lib/orders/payment-package.ts, Source import lại; JS sau loại type khớp chính xác bản gốc. readD1CheckoutQuote chỉ đọc danh mục verified/fresh, không nhận amount từ client, không tạo lead/đơn hoặc gửi provider. INSERT tương lai phải kiểm publication/authority trong cùng transaction; quote không phải write lease.

Reviewer tái hiện hai bypass legacy: courseSlugs bỏ guard hết hạn preorder và consultation shortcut bỏ qua giỏ override unknown. Core D1 đã chuẩn hóa lựa chọn hiệu lực và chặn; hai hồi quy RED→GREEN. Source production giữ hành vi cũ. Tổng16 test SQLite/golden, TS, scoped lint, cfstaging build PASS. Reviewer6 test quote PASS, không blocker. Receipt: reports/cloudflare-d1/native-checkout-quote-preparation.json. Tiếp tục atomic lead/contact/order/invoice/idempotency rồi Auth/signup/recovery/provider.
