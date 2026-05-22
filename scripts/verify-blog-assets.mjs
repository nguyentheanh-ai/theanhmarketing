import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const files = [
  "app/blog/page.tsx",
  "app/globals.css",
  "app/page.tsx",
  "components/content/agent-thumbnail-gallery.tsx",
  "components/content/blog-card.tsx",
  "components/content/blog-list.tsx",
  "data/agent-thumbnails.ts",
];

for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");

  if (file === "components/content/agent-thumbnail-gallery.tsx") {
    if (!source.includes("marqueeItems = [...agentThumbnailCards, ...agentThumbnailCards]")) {
      failures.push("Agent gallery must duplicate thumbnails for a seamless marquee");
    }

    if (!source.includes("/dang-ky?source=${source}&agent=${agentIndex + 1}")) {
      failures.push("Agent gallery CTAs must point to the registration form");
    }

    if (source.includes("ButtonLink")) {
      failures.push("Agent gallery should make the thumbnail itself clickable, without a separate button");
    }

    if (!source.includes("agent-gallery-image thumbnail-shine")) {
      failures.push("Agent gallery thumbnail image must be the clickable target");
    }
  }

  if (file === "components/content/blog-list.tsx" && !source.includes("AgentThumbnailGallery")) {
    failures.push("Blog page must use the shared agent thumbnail gallery");
  }

  if (file === "app/globals.css" && !source.includes("thumbnail-mirror-sweep")) {
    failures.push("Missing mirror shine animation");
  }

  if (file === "app/globals.css" && !source.includes("agent-gallery-marquee")) {
    failures.push("Missing horizontal marquee animation for the agent gallery");
  }

  if (file === "app/globals.css" && !source.includes("object-fit: contain")) {
    failures.push("Agent gallery images must show the full thumbnail without cropping text");
  }

  if (file === "app/page.tsx") {
    if (!source.includes("AgentThumbnailGallery")) {
      failures.push("Homepage Media Hub is missing the agent thumbnail gallery");
    }

    if (!source.includes('source="home-media-hub"')) {
      failures.push("Homepage Media Hub gallery must route CTA leads with the correct source");
    }
  }

  if (file === "data/agent-thumbnails.ts") {
    const thumbnailReferences = [...source.matchAll(/\/blog-thumbnails\/agent-\d{2}\.webp/g)];
    if (thumbnailReferences.length !== 10) {
      failures.push(`Expected 10 agent thumbnails, found ${thumbnailReferences.length}`);
    }
  }
}

for (let index = 1; index <= 10; index += 1) {
  const fileName = `agent-${String(index).padStart(2, "0")}.webp`;
  const imagePath = path.join(root, "public", "blog-thumbnails", fileName);

  if (!existsSync(imagePath)) {
    failures.push(`Missing blog thumbnail: ${fileName}`);
    continue;
  }

  const size = statSync(imagePath).size;
  if (size > 90_000) {
    failures.push(`Blog thumbnail too large (${size} bytes): ${fileName}`);
  }
}

if (failures.length > 0) {
  console.error("Blog asset verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Blog asset verification passed.");
