# Facebook Ads Reference Downloads Design

## Goal

Add the approved “Tài liệu mẫu tham khảo” library to the real `facebook-ads-2026` learning room. It must appear immediately below the lesson video and above the lesson title/progress actions without changing the existing video, lesson order, access, progress, navigation, payment, email, or tracking flows.

## Project Boundary

- Project: `theanh-main`
- Allowed root: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`
- Source assets: customer-safe samples audited from `E:\Hệ thống quảng cáo`
- Forbidden: every other application, real Ads reports, CRM/customer data, internal strategy folders, Agent/skill source, release archives, duplicated assets, and temporary screenshots containing account information.

## User Experience

The library renders on every lesson page of `facebook-ads-2026`, directly under the video. It contains three cards:

1. `Bộ nghiên cứu đối thủ Facebook Ads`
2. `Bộ kế hoạch chiến dịch mẫu`
3. `Bộ hình ảnh AI tham khảo`

Each card has a real preview image, a short description, format labels, and a same-origin ZIP download button. The section includes a visible disclaimer that the files are examples, budgets and metrics are illustrative, Meta Ad Library data can change, competitor creatives must not be copied, and AI visuals are illustrative.

No library is shown for other courses.

## Architecture

- `data/course-reference-packs.ts` owns the typed course-to-pack configuration and exposes a lookup by course slug.
- `components/course/course-reference-library.tsx` owns the responsive dark-theme card UI and download links.
- `app/learn/[course]/[lesson]/page.tsx` resolves the current course packs and passes them to the learning room.
- `components/course/learning-room.tsx` renders the library immediately after the video container.
- `public/course-resources/facebook-ads-2026/` stores three ZIPs and three preview images. Public URLs are stable, same-origin, and require no new API route or database change.

The existing `currentLesson.resources` block remains unchanged for lesson-specific resources.

## Download Contents

### Research pack

- Audited five-sheet competitor research workbook.
- Blank Meta Ad Library competitor-analysis template.
- README with source/date/disclaimer guidance.

### Planning pack

- 18-part Facebook Ads plan board.
- Content plan CSV.
- Ads plan Markdown.
- Design/media brief Markdown.
- README stating that budgets and KPIs are assumptions, not guarantees.

### AI visual pack

- Two generic AI-generated marketing-system visuals without people, customer data, account IDs, or performance claims.
- README marking the files as AI illustrations.

## Safety and Error Handling

- Missing packs resolve to an empty array, so other courses and the learning room continue rendering normally.
- Download URLs are static same-origin paths; a missing asset returns a standard 404 without affecting lesson playback.
- No email, phone, password, token, Ads account ID, customer KPI, or private source path is embedded in the UI or package contents.
- The ZIP filenames use ASCII slugs for reliable browser downloads.

## Responsive Design

- Desktop: three equal cards below the video.
- Tablet/mobile: cards stack in one column.
- Previews use fixed aspect ratios to prevent layout shift.
- The section follows the existing dark AI OS visual language and preserves current mobile actions.

## Verification

- Contract tests prove only `facebook-ads-2026` receives the three packs.
- Layout test proves the library is rendered after the video and before lesson controls.
- Asset test proves every configured preview and ZIP exists under `public` and rejects unsafe project paths.
- Run targeted tests first, then full Node tests, TypeScript, ESLint, diff check, and Next production build.
- Browser QA checks the authenticated lesson layout on desktop and mobile, download responses, video playback, progress actions, next/previous navigation, and the unchanged protected-route behavior.

