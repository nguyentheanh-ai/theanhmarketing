# Meta Ads Audit Checklist Workbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo một file Excel tương tác để khách tự audit Meta Ads, chọn trạng thái, xem tổng hợp lỗi và lập kế hoạch sửa trong 7 ngày.

**Architecture:** Một builder JavaScript dùng `@oai/artifact-tool` tạo ba sheet `HƯỚNG DẪN`, `CHECKLIST` và `KẾ HOẠCH 7 NGÀY`. Dữ liệu checklist là nội dung tĩnh đã rà soát; trạng thái, điểm và bảng tổng hợp dùng data validation, công thức và conditional formatting để người dùng có thể sửa trực tiếp.

**Tech Stack:** JavaScript ESM, `@oai/artifact-tool`, Excel `.xlsx`.

---

### Task 1: Chuẩn hóa nội dung audit

**Files:**
- Modify: `docs/superpowers/specs/2026-08-31-meta-ads-audit-checklist-design.md`
- Create: `tmp/meta-ads-audit-workbook/build-meta-ads-audit.mjs`

- [x] **Step 1:** Đối chiếu thuật ngữ Business Portfolio, Dataset/Pixel, Conversions API, `event_id`, campaign objective và Advantage+ placements từ tài liệu chính thức Meta.
- [x] **Step 2:** Khóa danh sách tiêu chí theo năm nhóm và gắn mã, mức P0/P1/P2, bằng chứng cần xem, hành động đề xuất.
- [x] **Step 3:** Kiểm tra nội dung không chứa benchmark áp dụng máy móc, dữ liệu khách hàng, bí mật hoặc lời hứa kết quả.

### Task 2: Tạo workbook tương tác

**Files:**
- Create: `tmp/meta-ads-audit-workbook/build-meta-ads-audit.mjs`
- Create: `outputs/01a052b3-971f-7e02-9446-8d5ab4a17c1e/checklist-audit-tai-khoan-quang-cao-meta.xlsx`

- [x] **Step 1:** Tạo sheet hướng dẫn với thông tin phiên audit, thang trạng thái và URL nguồn chính thức.
- [x] **Step 2:** Tạo sheet checklist với bảng có filter, freeze pane, dropdown trạng thái, ô ghi chú/người phụ trách/hạn xử lý và định dạng có điều kiện.
- [x] **Step 3:** Tạo công thức tổng hợp số mục đã kiểm tra, số mục đạt, số mục cần sửa, lỗi P0 và điểm hoàn thành.
- [x] **Step 4:** Tạo sheet kế hoạch 7 ngày với 21 dòng hành động, dropdown trạng thái và định dạng ngày.
- [x] **Step 5:** Xuất đúng một file `.xlsx` vào thư mục output của phiên.

### Task 3: Kiểm tra và bàn giao

**Files:**
- Verify: `outputs/01a052b3-971f-7e02-9446-8d5ab4a17c1e/checklist-audit-tai-khoan-quang-cao-meta.xlsx`

- [x] **Step 1:** Inspect vùng tổng hợp và các hàng đại diện, xác nhận giá trị và công thức đúng.
- [x] **Step 2:** Quét toàn workbook để không còn lỗi `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` hoặc `#N/A`.
- [x] **Step 3:** Render cả ba sheet, xem ảnh ở kích thước đọc bình thường và sửa mọi lỗi cắt chữ, tràn cột hoặc màu khó đọc.
- [x] **Step 4:** Export lại file cuối và gửi chủ dự án duyệt; không upload website.
