import { stat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const asset = new URL("../dist/client/doi-ngu-nhan-su-ai/media/proof/editor-ai-jun-08-2026.mp4", import.meta.url);
const source = new URL("../public/doi-ngu-nhan-su-ai/media/proof/editor-ai-jun-08-2026.mp4", import.meta.url);
const sourceSize = (await stat(source)).size;
const generatedSize = (await stat(asset)).size;
if (sourceSize !== generatedSize || sourceSize <= 25 * 1024 * 1024) {
  throw new Error("Refusing to prune a changed or unexpectedly small public video");
}
await unlink(asset);
console.log(`Excluded oversized generated staging asset: ${fileURLToPath(asset)}`);
