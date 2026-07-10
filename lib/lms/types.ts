export type LmsPublishStatus = "draft" | "published" | "archived";
export type LmsVisibility = "public" | "private" | "enrolled";
export type LmsEnrollmentStatus = "active" | "paused" | "completed" | "revoked";
export type LmsLessonType = "video" | "text" | "file" | "link" | "live";

export type LmsResource = {
  id: string;
  courseId: string | null;
  moduleId: string | null;
  lessonId: string | null;
  title: string;
  type: string;
  url: string;
  storagePath: string | null;
  description: string;
  position: number;
  createdAt: string;
  updatedAt: string | null;
};

export type LmsLesson = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  lessonType: LmsLessonType;
  duration: string;
  youtubeUrl: string;
  embedUrl: string;
  accessType: "free_preview" | "enrolled_only" | "locked";
  position: number;
  status: LmsPublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  resources: LmsResource[];
};

export type LmsModule = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  position: number;
  status: LmsPublishStatus;
  createdAt: string;
  updatedAt: string | null;
  lessons: LmsLesson[];
};

export type LmsEnrollment = {
  id: string;
  contactId: string | null;
  userId: string | null;
  courseId: string | null;
  courseSlug: string;
  courseTitle: string;
  studentName: string;
  email: string;
  phone: string;
  status: LmsEnrollmentStatus;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string | null;
  enrolledAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type LmsCourseStats = {
  modules: number;
  lessons: number;
  publishedLessons: number;
  activeStudents: number;
  pausedStudents: number;
  completedStudents: number;
  revokedStudents: number;
};

export type LmsCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnailImage: string;
  bannerImage: string;
  previewVideoUrl: string;
  status: LmsPublishStatus;
  visibility: LmsVisibility;
  publicStatus: string;
  createdAt: string;
  updatedAt: string | null;
  modules: LmsModule[];
  resources: LmsResource[];
  enrollments: LmsEnrollment[];
  stats: LmsCourseStats;
};

export type AdminLmsSnapshot = {
  ok: boolean;
  message?: string;
  generatedAt: string;
  courses: LmsCourse[];
  selectedCourseSlug: string;
  selectedCourse: LmsCourse | null;
  enrollments: LmsEnrollment[];
};

export type StudentLmsAccess = {
  ownedSlugs: string[];
  progressBySlug: Record<string, number>;
  completedLessonIds: string[];
  enrollmentIdsBySlug: Record<string, string>;
};
