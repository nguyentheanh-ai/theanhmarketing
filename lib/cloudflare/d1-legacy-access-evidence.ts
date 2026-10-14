// Server-only evidence. SQL and TypeScript use the same fields as course-access.
// Equality of this JSON pins a permission calculation to its source rows; it is
// not a credential and must never be accepted from a client request.
export function d1LegacyAccessEvidenceSql() {
  return `json_object(
    'orders',json((SELECT json_group_array(json_object('email',normalized_email,'status',status,
      'courseSlug',course_slug,'courseTitle',course_title,'paymentPlan',payment_plan,'orderItems',json(order_items_json)))
      FROM (SELECT * FROM d1_access_orders WHERE normalized_email=?2 AND status='paid' ORDER BY id))),
    'leads',json((SELECT json_group_array(json_object('email',normalized_email,'source',source,'createdAt',created_at))
      FROM (SELECT * FROM d1_access_overrides WHERE normalized_email=?2 AND deleted_at IS NULL
        AND source LIKE 'admin-access-%' ORDER BY id)))
  )`;
}

export type LegacyAccessProof = { evidenceJson: string; allowedSlugs: string[] };
