# Audit học viên trên production — 26/09/2026

## Trạng thái
Bản tối ưu commit `2a3eb944c5ffc2b9e4fe4e1a34e780df17b5da4f` đã production READY: `dpl_E1ucTHFtVLdaR1T3VKF2bmSaNLDE`, alias www.theanhmarketing.com và theanhmarketing.com. Doctor/preflight canonical PASS. Không gộp task lịch email sáng. 84 tests, lint/TS, build108/108 đã PASS trước release.

## Đo chuyển bài PC
Cùng phiên quản trị, viewport1440x900, bấm Bài tiếp theo từ bài1 sang bài2/3/4; đồng hồ phía công cụ từ click đến heading đích visible, có overhead automation. Trước:2719/2391/2474ms; sau:2202/2392/1854ms. Trung vị2474→2202ms, giảm11.0%; trung bình2528→2149ms, giảm15.0%. Chỉ3 mẫu mỗi bản; không phải FPS, INP, thời gian bắt đầu video hay phép đo học viên thường. Còn khoảng2 giây, chưa đủ bằng chứng kết luận hết lag.

## UI/live
Bản mới hiển thị thư viện thu gọn, khung video inline, bài hiện tại nổi bật. Viewport390x844:23 link bài học trong vùng cuộn ngay dưới video, y357px. 320x740 và768x1024 đều có danh sách; document scrollWidth bằng clientWidth (305/753px trừ thanh cuộn), không tràn ngang. Tại390px bấm Phát video bài4 và quan sát phụ đề tiến triển: có playback trong trình duyệt mô phỏng viewport, chưa kiểm trên iPhone/Android thật. Reset viewport sau QA.
Ba landing tĩnh được kiểm giữ nguyên hash trước/sau. Guest lesson/dashboard/password giữ redirect. Runtime error/fatal query deployment trong1h không có log; không coi là bảo đảm không lỗi.

## Tài khoản kiểm thử
Chủ hệ thống cho phép alias test và số giả lập. Wizard Miễn phí hoàn tất, chỉ cấp facebook-ads-2026 active, không hạn; order_code=null. Auth confirmed, must_change_password=true, không admin_role. Email dispatch sent; Resend last_event=delivered từ sender noreply@theanhmarketing.com. Không đưa mật khẩu hoặc payload thư vào báo cáo. email_logs không chứa bản ghi nhưng provisioning operation có provider message ID: không suy ra chưa gửi từ bảng email_logs rỗng.
Đã đăng xuất phiên quản trị ở tab audit và điền sẵn alias. Chờ chủ hệ thống tự đăng nhập bằng mật khẩu trong thư và nhập/xác nhận/gửi mật khẩu mới theo chính sách handoff của công cụ. Chưa xác nhận inbox, đăng nhập test, đổi mật khẩu, vào khóa và lưu hoàn thành E2E.

## Phát hiện audit còn mở
1. P1 — Source: LessonPage dùng getCurrentAuth, LearnLayout không guard; không kiểm must_change_password như requireStudentAuth ở dashboard. Học viên có quyền có thể đi đường dẫn bài trực tiếp mà không qua bước đổi mật khẩu. ĐÃ TÁI HIỆN LIVE qua phiên Auth học viên test: dashboard307 bắt đổi, cùng lúc bài premium200 trước khi đổi. Không phải vượt quyền khóa học, nhưng bỏ qua yêu cầu đổi mật khẩu.
2. P2 — Source: ChangePasswordForm await recordPasswordChangedActivity trước router.push. Nhật ký chậm làm chờ sau khi Auth đã đổi mật khẩu; catch chỉ xử lý lỗi, không loại thời gian chờ.
3. P2 — Source: getStudentLmsAccess học viên thường còn fetchEnrollmentRows qua crm_v2_lms_enrollments_raw toàn cục rồi lọc phía server. Bản hiện tại đã bỏ nhánh này cho admin; số đo admin không đại diện học viên thường. Cần tối ưu query có phạm vi và đo riêng test.
4. P2 — Source: guest tới /doi-mat-khau?next=<bai-hoc> bị chuyển login với next chỉ /doi-mat-khau, mất đích bài gốc. Reset error query invalid/expired không được page hiển thị rõ, nội dung vẫn nói lần đầu/tạo sau thanh toán dù là reset hoặc cấp miễn phí.
5. P2 — Live: dashboard hiển thị26 bài còn phòng học23 bài. Cần đồng bộ số bài học viên thực sự xem được (có thể khác bộ lọc published); chưa sửa nội dung khóa.
6. P2 — Source: login báo chung sai email/mật khẩu với lỗi Auth provider; có thể hướng dẫn nhầm khi dịch vụ gián đoạn. Chưa gây lỗi provider để thử production.

Đây là danh sách audit, chưa phát hành sửa các mục còn mở. Bước tiếp: sau handoff kiểm tra identity test/1 entitlement, đổi cờ mật khẩu, mở bài premium, lưu tiến độ đúng bài và đo cùng3 chuyển bài bằng học viên thường. Không dùng tài khoản chủ để suy ra quyền học viên đúng.

## Kết quả kiểm thử API hoàn tất sau yêu cầu tự làm của chủ hệ thống

Dùng mật khẩu tạm từ email đã gửi (chỉ trong bộ nhớ), đăng nhập qua Supabase SDK; đúng identity test và must_change_password=true. Dashboard307→đổi mật khẩu, nhưng lesson premium200: xác nhận lỗi guard trên live. Đổi mật khẩu bằng Auth updateUser theo cùng payload ứng dụng, đăng xuất cục bộ, đăng nhập lại bằng mật khẩu mới: PASS, cờ false. Không in/lưu mật khẩu, token hoặc raw email. Không yêu cầu chủ hệ thống tự thao tác nữa.

Dashboard200, ba bài premium200 có embed; admin CRM307 từ chối. POST /api/student/progress cho bài2 completed=true trả200/ok, progress4%, completedLessonIds đúng; GET lại bài2 có Đã hoàn thành. Không sửa tiến độ tài khoản chủ.

HTTP toàn bộ response (SDK cookie jar, không trình duyệt/RSC):3 bài premium4646/4784/6019ms, trung vị4784ms; lưu tiến độ4324ms. Không so trực tiếp với click-to-heading của admin. Bằng chứng học viên thường còn chậm, cần tiếp tục tối ưu enrollment và markLessonCompleted tải global LMS. Không kết luận website đã mượt hoàn toàn.

15/16 checks PASS;1FAIL có chủ đích là guard first-password trên đường bài trực tiếp. Evidence reports/learning-smooth-20260926/test-journey-result.json. Email delivered không chứng minh inbox/mở thư. API kiểm tra login/change/access/progress không thay thế UI thao tác form mật khẩu. UI PC/mobile/playback đã kiểm trên phiên admin trước đó. Audit có kết quả rõ ràng; các lỗi nêu trên chưa được sửa trong commit production hiện tại.
