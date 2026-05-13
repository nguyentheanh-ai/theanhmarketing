# Design Rules

## Design Philosophy

The current design is approved and should be preserved.

The product should feel like a:

- Minimal education platform
- Premium personal-brand academy
- Editorial content hub
- Calm and modern learning system

It should not feel like:

- A loud course funnel
- MMO landing page
- Crypto/agency hype page
- Brutalist poster UI
- Template marketplace site

## Typography

### Font

Primary font:

- Be Vietnam Pro

Defined in:

- `app/layout.tsx`
- `app/globals.css`

### Heading Style

Headings are:

- Large
- Bold/black weight
- Tight letter spacing
- Tight line height
- Editorial and confident

Common heading classes:

- `text-4xl sm:text-6xl`
- `text-5xl sm:text-7xl`
- `font-black`
- `tracking-[-0.05em]`
- `leading-[0.95]`

Do not make headings overly decorative.

### Body Text

Body copy should be:

- Comfortable
- Medium contrast
- Spacious line height

Common classes:

- `text-black/60`
- `text-black/65`
- `text-black/70`
- `leading-8`
- `leading-9`

## Spacing

### Page Width

Most sections use:

- `max-w-6xl`
- `mx-auto`
- `px-5 sm:px-8`

### Section Spacing

Public sections usually use:

- `py-20`
- `py-24`
- top hero: `pt-36` or higher due to fixed header

Do not compress sections too much. The spacious rhythm is part of the premium
feel.

### Card Spacing

Cards generally use:

- `rounded-3xl`
- `p-6`
- large cards: `p-8 sm:p-12`
- `gap-5`

## Color System

### Primary Backgrounds

- Site background: `#fbfaf7`
- Alternate cream block: `#f2eadf`
- Soft card background: `#ffffff`
- Admin background: `#f6f4ef`

### Text

- Primary: `#0b0b0c` / black
- Secondary: `text-black/60`, `text-black/65`, `text-black/70`
- Muted labels: `text-black/40`, `text-black/45`, `text-black/50`

### Accent

- Warm accent: `#c77b20`
- Hero underline/light accent: `#ffd39d`

Use accent sparingly for eyebrow labels, status labels, small highlights.

### Buttons

Primary:

- Black background
- White text
- Rounded full
- Subtle shadow
- Smooth hover

Secondary:

- White background
- Thin black alpha border
- Black text
- Rounded full
- Subtle shadow

Danger/admin delete:

- Red tint background
- Red border
- Red text
- Used only in admin destructive actions

## Component Rules

### Buttons

Use `ButtonLink` for link-style buttons.

Typical style:

- `rounded-full`
- `min-h-12`
- `px-6`
- `font-bold`
- smooth hover/active motion

Do not use square CTA buttons on public pages.

### Cards

Use `SoftCard`.

Rules:

- White background
- Rounded corners
- Very soft shadow
- No thick borders on public pages
- Admin pages can use thin borders inside tables/forms

### Inputs

Inputs should use:

- Rounded 2xl
- Thin border `border-black/10`
- Minimum height `min-h-12`
- Clear placeholder
- No heavy outlines

### Navbar

Public header:

- Fixed top
- Semi-transparent cream
- Backdrop blur
- Logo left
- Menu center on desktop
- CTA/auth right
- Horizontal scroll nav on mobile

Admin header:

- Sidebar on desktop
- Sticky horizontal nav on mobile

## Responsive Rules

### Desktop

- Use two-column layouts where helpful.
- Course detail page uses main content + right price card.
- Price card can be sticky on desktop.
- Admin uses sidebar.

### Tablet

- Avoid overly dense tables.
- Cards should wrap or stack.
- Navigation should remain usable.

### Mobile

- Single-column layouts.
- CTAs stack vertically.
- Cards full width.
- Course price card appears below media.
- Admin uses sticky mobile nav.
- Avoid fixed-width tables unless wrapped in `overflow-x-auto`.

## Animation Rules

Animations should be:

- Subtle
- Smooth
- Premium
- Short

Current animation patterns:

- Header drop
- Section fade-up
- Hero stagger
- Soft card hover
- CTA active scale
- Light floating media placeholder

Do not add:

- Excessive parallax
- Neon/glow effects
- Loud scroll animations
- Distracting loop animations

Respect `prefers-reduced-motion`.

## Hard No

Do not:

- Redesign the whole site without explicit approval.
- Add loud gradients.
- Add MMO-style scarcity blocks.
- Use heavy black borders/brutalism.
- Make UI overly colorful.
- Add many decorative blobs/orbs.
- Replace the current premium minimal visual language.
- Hide important content behind animation.

## Public Course Detail Style

Course detail should feel like an academy product page, not a landing page.

It should include:

- Hero
- Course name
- Short description
- Preview media
- Course facts
- Price card
- Tabs
- Overview
- Benefits
- Curriculum
- Instructor
- Reviews
- Related courses

But it should remain calm and integrated with the platform.
