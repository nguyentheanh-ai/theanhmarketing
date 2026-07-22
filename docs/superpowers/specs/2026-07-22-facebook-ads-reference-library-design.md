# Facebook Ads Reference Library Expansion Design

## Goal

Keep the six existing Master Prompt downloads and the video-script Sheet, then add the approved planning, research, visual, and Google Sheet samples directly below every Facebook Ads 2026 lesson video.

## Scope

The library is split into three compact sections:

1. **Prompt & kịch bản**: six TXT prompt downloads plus the existing 11-scene video-script Sheet copy.
2. **Google Sheet & bảng kế hoạch mẫu**: the two owner-provided Sheets, plan boards, IMC plan, content plan, ads plan, measurement plan, evidence log, assumption/test plan, and design-media brief.
3. **Nghiên cứu & visual mẫu**: the approved Meta Ad Library research workbooks, the latest re-scan and applied analysis, plus five exported research visual PNG files.

All local artifacts are copied unchanged into `public/course-resources/facebook-ads-2026/approved-samples/` and downloaded through same-origin links. Google Sheets are external and open in a new tab. Marketing Kit 1299K posters, Creative Board, SOPs, logs, scratch scripts, and duplicate/outdated research drafts remain excluded because they are not Facebook Ads student reference material.

## UI

The current card grid remains for the six prompts and video-script Sheet. Planning and research additions render in two responsive tables with columns for document title, practical use, format, and one clear action. On small screens each row keeps the title and action visible without horizontal overflow.

## Verification

The automated contract verifies all six prompts remain present, the three external Sheets are present, all approved local resources have public files, the three section titles render, external actions open in a new tab, and local resources have download behavior. Manual production QA confirms the library appears under a logged-in lesson video and every local URL returns 200.
