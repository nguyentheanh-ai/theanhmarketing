import { cms } from "@/data/cms";

type CmsIssue = {
  scope: string;
  message: string;
};

function findDuplicates(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateCmsContent(): CmsIssue[] {
  const issues: CmsIssue[] = [];

  if (!cms.site.url.startsWith("https://")) {
    issues.push({
      scope: "Site",
      message: "Domain production nên dùng HTTPS để canonical/sitemap đúng.",
    });
  }

  if (!cms.site.email.includes("@")) {
    issues.push({
      scope: "Site",
      message: "Email thương hiệu chưa hợp lệ.",
    });
  }

  const courseSlugs = cms.courses.map((course) => course.slug);
  const duplicateCourseSlugs = findDuplicates(courseSlugs);

  if (duplicateCourseSlugs.length > 0) {
    issues.push({
      scope: "Courses",
      message: `Slug khóa học bị trùng: ${duplicateCourseSlugs.join(", ")}.`,
    });
  }

  cms.courses.forEach((course) => {
    if (!course.title || !course.description || !course.price) {
      issues.push({
        scope: course.slug,
        message: "Khóa học cần có title, description và price.",
      });
    }

    if (course.modules.length === 0) {
      issues.push({
        scope: course.slug,
        message: "Khóa học chưa có module nào.",
      });
    }

    course.modules.forEach((module) => {
      if (module.lessons.length === 0) {
        issues.push({
          scope: course.slug,
          message: `Module "${module.title}" chưa có bài học.`,
        });
      }
    });

    course.relatedSlugs.forEach((relatedSlug) => {
      if (!courseSlugs.includes(relatedSlug)) {
        issues.push({
          scope: course.slug,
          message: `Related course không tồn tại: ${relatedSlug}.`,
        });
      }
    });
  });

  const blogSlugs = cms.blogPosts.map((post) => post.slug);
  const duplicateBlogSlugs = findDuplicates(blogSlugs);

  if (duplicateBlogSlugs.length > 0) {
    issues.push({
      scope: "Blog",
      message: `Slug blog bị trùng: ${duplicateBlogSlugs.join(", ")}.`,
    });
  }

  if (!cms.home.hero.primaryCta.href || !cms.home.hero.primaryCta.label) {
    issues.push({
      scope: "Homepage",
      message: "Hero primary CTA cần có label và href.",
    });
  }

  return issues;
}
