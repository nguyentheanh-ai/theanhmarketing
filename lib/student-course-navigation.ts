import { AGENT_KIT_SLUG } from "@/lib/agent-kit-preorder";
import { FACEBOOK_EBOOK_COURSE_SLUG, FACEBOOK_EBOOK_READER_HREF } from "@/lib/ebook/facebook-ebook";

// Navigation only: destination pages retain their authentication/access checks.
export function getStudentCourseHref(course: { slug: string }) {
  if (course.slug === AGENT_KIT_SLUG) {
    return `/learn/${AGENT_KIT_SLUG}/agents`;
  }
  if (course.slug === FACEBOOK_EBOOK_COURSE_SLUG) {
    return FACEBOOK_EBOOK_READER_HREF;
  }
  return `/learn/${course.slug}`;
}
