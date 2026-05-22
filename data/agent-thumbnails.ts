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

export function getAgentThumbnail(index: number) {
  return agentThumbnails[index % agentThumbnails.length] ?? agentThumbnails[0];
}
