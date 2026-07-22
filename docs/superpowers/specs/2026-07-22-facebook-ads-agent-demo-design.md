# Facebook Ads Agent Demo Section Design

## Scope

Project scope: `theanh-main`
Allowed path: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`
Forbidden paths: every other project, the deploy-locked `02_Website\landing-page` tree, checkout/payment/email/LMS/CRM/tracking flows.

Add one combined proof area to `/academy/facebook-ads-master-2026`, immediately after `#san-pham-thuc-te` and before `#lo-trinh`. It contains an Agent demo block followed by a twelve-image Zalo support-proof carousel. Preserve the current single 799K AI Agent offer and all existing registration behavior.

## Conversion job

Show concrete product evidence that the included AI Agent does more than suggest a plan: it can create Facebook campaign, ad set and ad objects in the connected account, leave them paused for review, and return the created identifiers.

The section must strengthen belief in the 799K package without adding a new offer, new price, new CTA flow or unverified performance claim.

## Approved direction

Use one featured, wide Agent demo followed by a vertical Zalo screenshot carousel. The reference DNA retained is:

- a visually distinct dark proof block;
- a centered eyebrow, headline and short explanatory line;
- real interface evidence as the dominant visual;
- a horizontally moving row of customer screenshots for support proof;
- very little supporting copy so the proof carries the section.

The wide treatment fits the supplied 2116x1080 screen recording and keeps the Agent interface readable. The separate carousel uses seven real, already-designed Zalo screenshots, so it provides multiple support proofs without shrinking the Agent demo.

## Final content

Eyebrow:

`AI AGENT THỰC CHIẾN`

Headline:

`Một câu lệnh. Agent tự động lên toàn bộ quảng cáo.`

Supporting copy:

`Agent tự phân tích yêu cầu, dựng Campaign – Ad set – mẫu quảng cáo, để PAUSED an toàn và trả lại đầy đủ ID để bạn kiểm tra trước khi bật.`

Media label:

`DEMO THỰC TẾ • 6 CHIẾN DỊCH`

Proof items:

1. `Tạo 6 chiến dịch` — `Tự dựng Campaign, Ad set và mẫu quảng cáo.`
2. `PAUSED an toàn` — `Không phát sinh chi tiêu trước khi bạn duyệt.`
3. `Đầy đủ ID` — `Campaign ID, Ad set ID và Ad ID được trả về rõ ràng.`

Closing line:

`Không chỉ lên kế hoạch. Agent trực tiếp triển khai vào tài khoản quảng cáo.`

Zalo support eyebrow:

`HỖ TRỢ THỰC TẾ`

Zalo support headline:

`Không chỉ xem video. Vướng ở đâu, được hỗ trợ triển khai ở đó.`

Zalo support copy:

`Các buổi gọi hỗ trợ thực tế kéo dài từ 21 đến 55 phút khi học viên cần gỡ vướng về nội dung, thiết lập và vận hành quảng cáo.`

Do not add revenue, ROAS, lead, order or conversion claims. Do not mention or restore the removed 399K package.

## Visual design

- Full-width dark graphite block inside the existing landing rhythm; no neon gradient or MMO-style effects.
- Existing Be Vietnam Pro typography.
- Warm accent `#c77b20` only for the eyebrow, media label and small emphasis.
- White headline and muted light supporting text.
- One wide media frame with rounded corners, a subtle border and restrained shadow.
- Three compact proof items below the media, three columns on desktop and one column on mobile.
- A restrained divider separates the Agent demo from the Zalo support proof.
- Twelve tall Zalo screenshots move horizontally in a continuous track, matching the reference section's proof-wall rhythm.
- Desktop shows roughly four cards plus the edge of the next card; mobile shows one card plus a partial next card.
- The carousel pauses on hover/focus and becomes a static horizontal scroll area when reduced motion is requested.
- Maintain the page's existing `container`, section spacing and rounded-card language.
- Respect `prefers-reduced-motion`; the visual proof remains understandable from its poster frame.

## Video and GIF assets

Source: `F:\Dataset final\0722 (6).mp4`

Source facts verified before implementation:

- duration: 16.37 seconds;
- dimensions: 2116x1080;
- frame rate: 30 fps;
- codecs: H.264 video and AAC audio.

Create two customer-facing derivatives without overwriting the source:

1. `public/ladipage/assets/facebook-ads-agent-demo.gif`
   - loop forever;
   - 960px wide, 8 fps, palette optimized;
   - used directly in the landing page so it starts and loops without controls;
   - target at or below 12 MB while keeping interface text readable;
   - use `loading="lazy"` and `decoding="async"` because the section is below the fold.
2. `public/ladipage/assets/facebook-ads-agent-demo-poster.webp`
   - representative final-state frame;
   - used by a `<picture>` source when `prefers-reduced-motion: reduce` is active.

The live section uses the optimized GIF directly. No new text is burned into the recording; section HTML carries the marketing copy so the interface evidence stays authentic.

## Zalo support assets

Source folder: `E:\Kinh doanh\outputs\zalo-call-highlights-2026-07-22`

Use twelve of the thirteen Zalo screenshots supplied by the owner. For the seven screenshots containing substantial completed calls, use the approved highlighted/privacy-masked versions covering eight durations: `34 phút 9 giây`, `55 phút 50 giây`, `21 phút 59 giây`, `46 phút 4 giây`, `30 phút 59 giây`, `36 phút 10 giây`, `22 phút 51 giây` and `23 phút 59 giây`. Use five original screenshots unchanged apart from page optimization for Agent-plan feedback, advertising advice, course feedback, Agent consultation and support scheduling.

Omit `1784708746725_2067496966698355003_1849079016235717667_a1814dc3cf3103050c99a5f65d909d65.jpg` because it is mainly an operational file-delivery exchange and is the weakest support proof in the set.

Create twelve page-optimized WebP derivatives under `public/ladipage/assets/zalo-support/` at 640px width. Preserve the orange highlights and privacy masks on the seven designed images, and preserve the remaining five originals without adding artificial annotations. Keep every source JPG and designed PNG unchanged outside the website repo. Each image receives descriptive alt text based only on its visible support context or call duration; do not expose remote-access credentials in filenames, alt text or page copy.

## Implementation boundaries

Modify only:

- `public/ladipage/facebook-ads-2026.html`;
- `public/academy/facebook-ads-master-2026.html` as an exact byte-identical published copy;
- the two new Agent demo assets under `public/ladipage/assets/`;
- twelve optimized Zalo proof assets under `public/ladipage/assets/zalo-support/`;
- `tests/facebook-ads-landing.test.mjs` for section, content, asset and safety guards;
- project state/log docs required by the workspace.

Do not change JavaScript plan selection, checkout submission, pricing, Meta tracking, navigation, other landing routes, payment, email, customer access or database code.

## Responsive and accessibility behavior

- Desktop: media frame spans the content width; proof items render in three columns.
- Mobile: headline remains at most three lines, media stays within viewport, proof items stack, and no horizontal overflow is introduced.
- The animated GIF has descriptive alt text and loops automatically as an image.
- The poster and surrounding text preserve meaning when reduced motion is requested.
- Zalo carousel duplicates used only for visual continuity are `aria-hidden`; screen readers encounter one accessible set of twelve proofs.
- No flashing, aggressive zoom, marquee or continuous decorative motion.

## Verification

- Source and published HTML remain byte-identical.
- Focused landing tests assert the new section location, exact copy, media attributes and the continued absence of `399K`, `399.000` and `399000`.
- FFprobe/ImageMagick records GIF dimensions, duration, frame count and loop behavior.
- Confirm the GIF size is at or below 12 MB.
- Confirm exactly twelve optimized Zalo images are present; the seven designed images retain their privacy masks and the five remaining originals retain their authentic content.
- Open the poster, GIF contact sheet and every Zalo derivative for visual inspection.
- Run full Node tests, TypeScript, ESLint, production build and protected landing preflight.
- Run local Chromium QA at desktop and mobile widths; confirm no console/page errors or horizontal overflow.
- Production deployment is a separate guarded action and requires the owner's explicit deploy confirmation.
