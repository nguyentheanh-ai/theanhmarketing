import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const failures = [];
const layout = read("app/layout.tsx");

if (layout.includes('canonical: "/"')) {
  failures.push('app/layout.tsx: không được canonical tất cả route về "/"');
}

const sectionHeading = read("components/ui/section-heading.tsx");

if (!sectionHeading.includes('as?: "h1" | "h2"') || !sectionHeading.includes('as: Heading = "h2"')) {
  failures.push("components/ui/section-heading.tsx: SectionHeading cần hỗ trợ chọn H1/H2 có chủ đích");
}

for (const file of ["app/gioi-thieu/page.tsx", "app/blog/page.tsx", "app/lien-he/page.tsx"]) {
  if (!read(file).includes('as="h1"')) {
    failures.push(`${file}: hero SectionHeading cần render H1`);
  }
}

if (failures.length > 0) {
  console.error("Site quality verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Site quality verification passed.");
