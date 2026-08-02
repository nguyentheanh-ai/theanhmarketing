# Account Change Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gom đổi email và đổi mật khẩu vào một khối đóng mặc định, chỉ mở biểu mẫu theo lựa chọn và xác thực mật khẩu hiện tại trước khi đổi mật khẩu.

**Architecture:** Giữ `AccountProfileForm` là client component duy nhất sở hữu trạng thái và Supabase browser client. Thêm trạng thái phân biệt `email`, `password` hoặc đóng; đổi mật khẩu xác thực phiên bằng `signInWithPassword` trước `updateUser`. Không thêm route/API/schema mới.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth, Node test runner, Tailwind CSS.

---

### Task 1: Khóa giao diện và thứ tự xác thực bằng regression test

**Files:**
- Modify: `tests/student-account-portal.test.mjs`

- [x] **Step 1: Thay test ba form luôn mở bằng test disclosure**

Test phải yêu cầu `Đổi thông tin tài khoản`, hai nút lựa chọn, trạng thái `activeChange`, các trường `current_password`, `new_password`, `confirm_password`, và `signInWithPassword` xuất hiện trước `updateUser({ password` trong source.

- [x] **Step 2: Chạy test để xác nhận RED**

Run: `node --test tests/student-account-portal.test.mjs`
Expected: FAIL vì component hiện chưa có disclosure, mật khẩu hiện tại hoặc bước đăng nhập lại.

### Task 2: Triển khai disclosure và đổi mật khẩu an toàn

**Files:**
- Modify: `components/account/account-profile-form.tsx`

- [x] **Step 1: Thêm trạng thái disclosure**

Thêm `type AccountChange = "email" | "password" | null` và `activeChange`. Render card `Đổi thông tin tài khoản`; khi `activeChange === null` chỉ render hai button `Đổi email`, `Đổi mật khẩu`.

- [x] **Step 2: Chỉ render đúng biểu mẫu được chọn**

Biểu mẫu email giữ email hiện tại và email mới. Biểu mẫu mật khẩu có ba trường `current_password`, `new_password`, `confirm_password`. Cả hai có hành động `Quay lại` để đóng panel và xóa trạng thái thông báo liên quan.

- [x] **Step 3: Xác thực mật khẩu hiện tại trước cập nhật**

Trong `updatePassword`, kiểm tra độ dài/khớp/khác mật khẩu cũ; gọi:

```ts
const { error: verificationError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
```

Nếu lỗi, dừng và hiển thị `Mật khẩu hiện tại chưa đúng.`. Chỉ sau khi thành công mới gọi `supabase.auth.updateUser({ password: newPassword, data: ... })`.

- [x] **Step 4: Chạy focused test để xác nhận GREEN**

Run: `node --test tests/student-account-portal.test.mjs`
Expected: toàn bộ test trong file PASS.

### Task 3: Xác minh local và cập nhật bàn giao

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`

- [x] **Step 1: Chạy full verification**

Run: `node --test tests/*.test.mjs`, `tsc --noEmit`, `eslint .`, `next build`, `git diff --check`.
Expected: 0 test failures, 0 TypeScript/build errors; chỉ chấp nhận warning lint cũ đã được ghi nhận.

- [x] **Step 2: QA trình duyệt local**

Xác nhận desktop/mobile mặc định không thấy input email/password, bấm từng lựa chọn chỉ mở một form, có đủ ba trường mật khẩu, không overflow và không có console error. Không submit form thật.

- [x] **Step 3: Cập nhật tài liệu và commit local**

Ghi rõ không đổi schema/order/payment/entitlement, không submit form và chưa deploy. Commit component, test và tài liệu trên nhánh hiện tại.
