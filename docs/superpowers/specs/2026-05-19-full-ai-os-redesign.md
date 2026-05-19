# Full AI OS Redesign Spec

## Source Of Truth

Use `C:/Users/12c1t/Downloads/stitch.zip` as the visual source of truth. Do not invent unrelated layouts. Missing logic can stay as static/audit-ready UI for now, while existing logic must keep working unchanged.

## Source Screenshot Mapping

- Home: `hero_ai_os_vision_section_*`, `interactive_ecosystem_map_*`, `proof_content_hub_*`, `final_cinematic_cta_footer`, plus current full-page homepage references.
- Course catalog: `ai_product_module_catalog_*`, `khoa_hoc.jpg_*`.
- Course detail: `ai_module_detail_page`.
- Resource/blog/knowledge: `ai_documentation_knowledge_hub`, `ai_workflow_library`, `tai_lieu.jpg_*`.
- Student area: `hoc_vien.jpg_*`, `content_os_dashboard_interface`.
- Admin area: `content_os_dashboard_interface`, `partner_growth_dashboard`.
- 404: `cinematic_404_system_page`.

## Scope

Apply the dark cinematic “AI Operating System” interface from `stitch.zip` across the whole app:

- Public routes: home, courses, course detail, resources, blog, students, about, contact, cart, payment, auth, 404.
- Student routes: dashboard and lesson room.
- Admin routes: keep the CRM structure and convert it to the same dark/neon visual language.

## Guardrails

- Do not change Supabase data reads/writes, auth guards, order creation, SePay webhook logic, cart behavior, student access calculation, admin CRUD behavior, or database schema.
- Existing students must keep accounts because auth/session code remains untouched.
- Existing course slugs, lesson URLs, cart payloads, checkout URLs, and admin routes must remain stable.
- Design changes are presentation-only unless a new page is needed to represent a reference screen.

## Visual Direction

- Dark background with subtle grid/radial light, blue/cyan glow, glass panels, compact high-contrast cards.
- Header/footer become dark translucent system chrome.
- Product modules use card layouts inspired by the AI product catalog.
- Resources/blog use “workflow library” and “knowledge hub” layouts.
- Student dashboard and admin become app-like panels inspired by the Content OS dashboard.
- Course detail uses module/detail styling while preserving existing purchase, cart, lesson, and curriculum logic.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run verify:routes`
- Browser QA for desktop and mobile on public, student, admin, auth, cart, payment, and learn routes.
