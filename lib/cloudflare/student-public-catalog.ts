import {fallbackCourses,getFallbackCourses,isDemoCourse,mapDbCourseToCourse,mergeOfficialCourseMetadata,normalizeCourseText,normalizeCourseTiming,type DbCourse} from '@/lib/courses/course-projection';
import {mapDbResource,type DbResource} from '@/lib/resources/resource-projection';
import {resources as fallbackResources} from '@/data/resources';

// Source courseService summaryOnly deliberately omits private lesson bodies,
// media, descriptions, file links and access metadata. Preserve that projection
// before mapping, including its existing official catalogue fallback policy.
export function publicCourseSummarySource(course:DbCourse):DbCourse{
 return {id:course.id,title:course.title,slug:course.slug,short_description:course.short_description,description:course.description,
  price:course.price,original_price:course.original_price,status:course.status,lms_status:course.lms_status,visibility:course.visibility,
  duration:course.duration,lesson_count:course.lesson_count,level:course.level,updated_at:course.updated_at,banner_image:course.banner_image,
  thumbnail_image:course.thumbnail_image,preview_video_url:course.preview_video_url,cta_text:course.cta_text,sort_order:course.sort_order,
  course_modules:(course.course_modules??[]).map(module=>({
  id:module.id,title:module.title,description:module.description,sort_order:module.sort_order,status:module.status,
  lessons:(module.lessons??[]).map(lesson=>({id:lesson.id,title:lesson.title,duration:lesson.duration,sort_order:lesson.sort_order,status:lesson.status,
   description:null,youtube_url:null,embed_url:null,access_type:null})),
 }))};
}
export function projectStudentPublicCatalog(courses:DbCourse[],resources:DbResource[]){
 const mapped=courses.map(publicCourseSummarySource)
  .map(c=>normalizeCourseText(normalizeCourseTiming(mapDbCourseToCourse(c))))
  .filter(c=>!isDemoCourse(c)).map(mergeOfficialCourseMetadata);
 const slugs=new Set(mapped.map(c=>c.slug));
 return {
  courses:courses.length?[...mapped,...fallbackCourses.filter(c=>!slugs.has(c.slug)).map(normalizeCourseTiming)]:getFallbackCourses(),
  // This is the existing verified empty-Source policy, not an outage fallback.
  resources:resources.length?resources.map(mapDbResource):fallbackResources,
 };
}
