export function cleanLessonTitle(title: string) {
  return title.replace(/^bài\s+\d+\s*[-:–]\s*/i, "").trim();
}
