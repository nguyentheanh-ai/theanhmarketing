-- Read-only course projection; resources preserve both existing source tables.
WITH lesson_documents AS (
  SELECT l.module_id, to_jsonb(l) || jsonb_build_object('lesson_resources',
    coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM public.lesson_resources r WHERE r.lesson_id=l.id),'[]'::jsonb)
    || coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM public.course_resources r WHERE r.lesson_id=l.id),'[]'::jsonb)
  ) AS document
  FROM public.lessons l
  JOIN public.course_modules m ON m.id=l.module_id
  JOIN public.courses c ON c.id=m.course_id
  WHERE c.slug='facebook-ads-2026'
), module_documents AS (
  SELECT m.course_id, to_jsonb(m) || jsonb_build_object('lessons',
    coalesce((SELECT jsonb_agg(l.document) FROM lesson_documents l WHERE l.module_id=m.id),'[]'::jsonb)
  ) AS document
  FROM public.course_modules m
  JOIN public.courses c ON c.id=m.course_id
  WHERE c.slug='facebook-ads-2026'
)
SELECT jsonb_build_object('snapshotAt',clock_timestamp(),'source',
  to_jsonb(c) || jsonb_build_object('course_modules',
    coalesce((SELECT jsonb_agg(m.document) FROM module_documents m WHERE m.course_id=c.id),'[]'::jsonb)
  )
) AS payload
FROM public.courses c WHERE c.slug='facebook-ads-2026';
