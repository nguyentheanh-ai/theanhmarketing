export const agentThumbnails = [
  "/blog-thumbnails/agent-01.webp",
  "/blog-thumbnails/agent-02.webp",
  "/blog-thumbnails/agent-03.webp",
  "/blog-thumbnails/agent-04.webp",
  "/blog-thumbnails/agent-05.webp",
  "/blog-thumbnails/agent-06.webp",
  "/blog-thumbnails/agent-07.webp",
  "/blog-thumbnails/agent-08.webp",
  "/blog-thumbnails/agent-09.webp",
  "/blog-thumbnails/agent-10.webp",
];

export const agentThumbnailCards = agentThumbnails.map((thumbnail, index) => ({
  id: `agent-thumbnail-${String(index + 1).padStart(2, "0")}`,
  thumbnail,
  label: `Agent workflow ${String(index + 1).padStart(2, "0")}`,
}));

export function getAgentThumbnail(index: number) {
  return agentThumbnails[index % agentThumbnails.length] ?? agentThumbnails[0];
}
