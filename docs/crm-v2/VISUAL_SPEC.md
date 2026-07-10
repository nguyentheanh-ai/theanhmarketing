# CRM v2 Visual Spec

Source mockups:

- `docs/crm-v2/mockups/*.png`
- Original folder: `E:\002\CRM 002`

CRM v2 is an operational admin system, not a landing page. Every screen must keep the same light shell, fixed left sidebar, compact topbar, dense KPI cards, filter bars, data tables, status badges, and right insight panels where useful. Tables must not force page-level horizontal overflow; wide data scrolls inside the table wrapper.

## Shared Shell

- Sidebar: fixed desktop width around 240px, white surface, compact active state.
- Main background: cool light gray `#f6f8fb`.
- Panels/cards: white, 1px soft border, radius 8px.
- Topbar: global search, date range control, refresh/export/action buttons, avatar.
- Typography: compact admin scale; no hero-size text inside dashboards/tables.
- Data density: KPI cards and tables must be easy to scan at 1440-1620px desktop.
- Accent system:
  - Blue: primary actions, active navigation, lead pipeline.
  - Green: paid/success/active.
  - Orange: pending/attention.
  - Purple: workflow/email intelligence.
  - Red: bounced/failed/disqualified.

## 01 Outline CRM Chuyên Sâu

Mockup: `01-outline-crm-chuyen-sau.png`

- Title: `Outline CRM chuyên sâu`.
- Purpose: business-facing map of CRM operations for admins.
- Keep module cards for the 12 CRM domains.
- Do not show implementation-only labels such as migration, schema, private schema, read-model, RPC, legacy map, or internal safety blueprint.
- Right panel should show operational priorities, not engineering checklist text.

## 02 Tổng Quan CRM

Mockup: `02-tong-quan-crm.png`

- Title: `Tổng quan CRM`.
- KPI row: lead mới hôm nay, MQL, đã thanh toán, doanh thu theo range, doanh thu từ email, automation đang chạy.
- Charts/widgets: phễu chuyển đổi, doanh thu theo ngày, nguồn lead, hiệu quả remarketing, task cần chú ý.
- Date range control must change KPI and chart data server-side.

## 03 Leads & Pipeline

Mockup: `03-leads-pipeline.png`

- Title: `Leads & Pipeline`.
- Stage cards: Mới, Chưa liên hệ, Đang tư vấn, Quan tâm cao, Chờ thanh toán, Đã thanh toán, Không phù hợp.
- Filter bar: nguồn, khóa học, owner, lead score, tag, email, ngày tạo, hành động gần nhất.
- Bulk action stays directly above the table.
- Table must show: tên/contact, SĐT, nguồn, khóa học quan tâm, lead score, sale phụ trách, stage, email, lần chạm gần nhất, next action, giá trị tiềm năng.
- Dedupe view: one visible row per contact; stage should reflect the strongest active lead/order state.

## 04 Hồ Sơ Liên Hệ 360°

Mockup: `04-ho-so-lien-he-360.png`

- Title: `Hồ sơ liên hệ 360°`.
- Left profile: avatar, name, email, phone, source, owner, score, lifecycle, tags, interested courses, quick actions.
- Center tabs: Tổng quan, Timeline, Ghi chú, Đơn hàng, Email, Automation, Task.
- Timeline reads from `crm_events`.
- Right insight panel: conversion likelihood, email engagement, running workflows, upcoming tasks, recent orders, recommendations.

## 05 Phân Khúc & Tag

Mockup: `05-phan-khuc-tag.png`

- Title: `Phân khúc & Tag`.
- Summary cards: tổng phân khúc, smart list, tag đang dùng, audience đồng bộ.
- Table: tên phân khúc, điều kiện chính, quy mô, mục tiêu remarketing, kênh, cập nhật gần nhất, trạng thái.
- Right panel: AND/OR rule builder and server-side estimated audience preview.
- Segment rules are versioned JSON.

## 06 Remarketing Email

Mockup: `06-remarketing-email.png`

- Title: `Remarketing Email`.
- KPI cards: email đã gửi, open rate, click rate, doanh thu từ email, follow-up chưa mở, A/B test.
- Tabs: Chiến dịch, Broadcast, Drip, Template, A/B Test, Lịch gửi.
- Campaign table: tên, phân khúc nhận, loại, trạng thái, thời gian gửi, open/click/conversion/revenue, owner, hành động.
- Right preview panel shows template preview and suppression/config state.
- Real send requires confirmation and configured provider.

## 07 Automation Workflow

Mockup: `07-automation-workflow.png`

- Title: `Automation Workflow`.
- Main area uses React Flow canvas.
- Node types: Trigger Form, Trigger Event, Trigger Tag, Condition, Split, Send Email, Add/Remove Tag, Update Stage, Notify Internal, Webhook, Delay, Wait Until, Goal.
- Top controls: Test workflow, Lưu nháp, Publish, Lịch sử phiên bản.
- Browser edits the graph only; server/background worker handles long-running execution.
- Published versions are immutable.

## 08 Đơn Hàng & Thanh Toán

Mockup: `08-don-hang-thanh-toan.png`

- Title: `Đơn hàng & Thanh toán`.
- KPI cards: đơn hàng mới, chờ thanh toán, đã thanh toán, tỷ lệ thành công, doanh thu thuần, hoàn tiền.
- Filter bar: khóa học, trạng thái thanh toán, cổng thanh toán, sale owner, mã giảm giá, nguồn, ngày tạo.
- Table: mã đơn, khách hàng, khóa học/sản phẩm, giá trị, giảm giá, thanh toán, trạng thái, nguồn, owner, ngày tạo, hạn thanh toán, hành động.
- Right panel only sits beside the table at very wide widths; normal desktop prioritizes readable table width.

## 09 Học Viên & Khóa Học

Mockup: `09-hoc-vien-khoa-hoc.png`

- Title: `Học viên & Khóa học`.
- KPI cards: đang học, mới kích hoạt, inactive, completion rate, upsell opportunity, NPS/đánh giá.
- Filter bar: khóa học, trạng thái học, tiến độ, owner CSKH, nguy cơ rời bỏ, gói sản phẩm.
- Table: học viên, khóa học, trạng thái học, tiến độ, lần học gần nhất, tương tác, upsell, owner CSKH, email chăm sóc, hành động.
- Right panel: progress, completed modules, certificate, support tickets, retention recommendations.

## 10 Báo Cáo & Attribution

Mockup: `10-bao-cao-attribution.png`

- Title: `Báo cáo & Attribution`.
- KPI cards: tổng doanh thu, doanh thu từ email, lead-to-paid CR, CAC ước tính, ROI theo kênh, LTV trung bình.
- Charts: doanh thu theo ngày, phễu nguồn, doanh thu theo nguồn, workflow/email performance, deliverability, top khóa học, sales owner.
- Attribution table: kênh/nguồn, leads, MQL, paid, CR, doanh thu, CAC, ROI, doanh thu email, ghi chú.

## 11 Team & Phân Quyền

No dedicated mockup was supplied. Extend the shared CRM shell and outline visual language.

- Title: `Team & Phân quyền`.
- Show members, roles, permissions, workload, SLA, and audit summary.
- CRM v2 role/audit actions must not overwrite legacy admin roles unless a future approved migration changes ownership.

## 12 Tích Hợp

No dedicated mockup was supplied. Extend the shared CRM shell and outline visual language.

- Title: `Tích hợp`.
- Show integration accounts, webhook health, email provider, ads destinations, configured/missing state, and recent webhook events.
- Never show secrets.
- Missing env must render as `chưa cấu hình`, not as connected.
