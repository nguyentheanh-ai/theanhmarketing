import { getConfiguredOwnerEmails } from "@/lib/admin/admin-emails";

export type CourseAccessOrder = {
  email?: string | null;
  status?: string | null;
  courseSlug?: string | null;
  orderItems?: Array<{ slug?: string | null }> | null;
};

export type CourseAccessLead = {
  email?: string | null;
  source?: string | null;
  createdAt?: string | null;
};

type CourseAccessInput = {
  email: string;
  orders: CourseAccessOrder[];
  leads?: CourseAccessLead[];
  allCourseSlugs?: string[];
  isAdmin?: boolean;
};

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function getOrderCourseSlugs(order: CourseAccessOrder) {
  if (order.orderItems?.length) {
    return order.orderItems.map((item) => item.slug?.trim()).filter((slug): slug is string => Boolean(slug));
  }

  return (order.courseSlug ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function getConfiguredAdminEmails() {
  return getConfiguredOwnerEmails();
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return getConfiguredAdminEmails().includes(normalizedEmail);
}

export function parseAccessOverrideSource(source: string | null | undefined) {
  const match = /^admin-access-(grant|revoke):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(source ?? "");

  if (!match) {
    return null;
  }

  return {
    action: match[1] as "grant" | "revoke",
    courseSlug: match[2],
  };
}

export function getCourseAccessSlugs({
  allCourseSlugs = [],
  email,
  isAdmin = false,
  leads = [],
  orders,
}: CourseAccessInput) {
  if (isAdmin || isAdminEmail(email)) {
    return Array.from(new Set(allCourseSlugs.filter(Boolean)));
  }

  const normalizedEmail = normalizeEmail(email);
  const accessibleSlugs = new Set<string>();

  for (const order of orders) {
    if (order.status !== "paid" || normalizeEmail(order.email) !== normalizedEmail) {
      continue;
    }

    for (const slug of getOrderCourseSlugs(order)) {
      accessibleSlugs.add(slug);
    }
  }

  const sortedOverrides = leads
    .filter((lead) => normalizeEmail(lead.email) === normalizedEmail)
    .map((lead, index) => ({ ...lead, index, override: parseAccessOverrideSource(lead.source) }))
    .filter((lead) => lead.override)
    .sort((a, b) => {
      const aTime = Date.parse(a.createdAt ?? "");
      const bTime = Date.parse(b.createdAt ?? "");
      return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime) || a.index - b.index;
    });

  for (const lead of sortedOverrides) {
    const override = lead.override!;

    if (override.action === "grant") {
      accessibleSlugs.add(override.courseSlug);
    } else {
      accessibleSlugs.delete(override.courseSlug);
    }
  }

  return Array.from(accessibleSlugs);
}
