# Build Cloudflare cần cổng cục bộ — VERIFIED trong feature CRM Sales care

Áp dụng: bản dựng vinext/Cloudflare Vite với workerd, macOS sandbox của phiên19/10/2026.
Quan sát: scripts/build-cloudflare-production.sh dừng `listen EPERM: operation not permitted 127.0.0.1`, chưa build ứng dụng.
Nguyên nhân xác minh trong phạm vi này: sandbox chặn cổng nội bộ của runtime build; không có bằng chứng lỗi ứng dụng.
Sửa: chạy đúng script với sandbox escalation được duyệt cho build; không đổi binding/quyền/secret hoặc dùng lệnh deploy.
Xác minh: build hoàn tất, verifier production PASS/9nativegateOFF/attachDomainsfalse.
Giới hạn: chỉ áp dụng khi lỗi thực là listen EPERM ở bước build; không dùng cho lỗi TypeScript, build artifact sai hoặc preflight/deployment thất bại.
