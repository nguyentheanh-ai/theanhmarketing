# Ebook Premium Mobile And Navigation Design

## Scope

Update only `/academy/ebook-facebook-ads-2026-premium` and its canonical source/published HTML pair. Preserve the 399,000 VND offer, order form, checkout API, Meta Pixel/CAPI identifiers, UTM/fbclid/fbc/fbp capture, asset URLs and reader route.

## Approved layout

- Keep the header inside the first hero section and remove sticky behavior, so it scrolls away with section 1.
- Replace the temporary `TA` text mark with the existing `/brand/ta-logo.svg` asset.
- Center section content consistently. On mobile, cap content to the available viewport width with equal gutters and no horizontal overflow.
- On viewports up to 980px, render the Ebook visual before the hero text. On desktop, keep the existing two-column copy-left / book-right composition.
- Add a compact section menu button and a seven-dot progress rail for the existing anchors: `top`, `problem`, `inside`, `sample`, `content`, `price`, `faq`. The menu reuses those anchors and closes after navigation.
- Rename public preview actions to `Đọc thử Ebook`; the reader URL and tracking event names remain unchanged.

## Interaction and accessibility

- The section menu toggle exposes `aria-expanded` and `aria-controls`; Escape and outside click close the menu.
- Progress dots are labeled anchor links. The active/reached state follows the current section through `IntersectionObserver` with a scroll fallback and respects reduced motion.
- The progress rail is hidden below 340px to avoid covering content. The mobile purchase CTA remains the only fixed purchase layer.

## Verification

- TDD regression verifies source/published sync, real logo, non-sticky header, mobile visual ordering, seven menu links/dots, progress controller and exact preview CTA copy.
- Browser QA covers 390px mobile and desktop, section navigation, no horizontal overflow, hero image ordering, CTA destination and console errors.
