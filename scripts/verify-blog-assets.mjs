import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const files = [
  "app/blog/page.tsx",
  "components/content/blog-card.tsx",
  "components/content/blog-list.tsx",
  "app/globals.css",
  "data/agent-thumbnails.ts",
];

for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");

  if (file === "components/content/blog-list.tsx" && !source.includes("ai-shell")) {
    failures.push("Blog category filters are not wrapped in the site container");
  }

  if (file === "app/globals.css" && !source.includes("thumbnail-mirror-sweep")) {
    failures.push("Missing mirror shine animation");
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
