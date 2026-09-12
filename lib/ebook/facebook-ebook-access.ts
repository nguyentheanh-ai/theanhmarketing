import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getOwnedCourseSlugs } from "@/services/courseAccessService";
import { FACEBOOK_EBOOK_COURSE_SLUG, FACEBOOK_EBOOK_READER_HREF } from "@/lib/ebook/facebook-ebook";

export type FacebookEbookAccess =
  | {
      ok: true;
      userId?: string;
      email?: string;
      isAdmin: boolean;
    }
  | {
      ok: false;
      status: 401 | 403;
      redirectTo: string;
    };

export async function requireFacebookEbookAccess(nextPath = FACEBOOK_EBOOK_READER_HREF): Promise<FacebookEbookAccess> {
  const { adminRole, user } = await getCurrentAuth();
  const loginRedirect = `/dang-nhap?next=${encodeURIComponent(nextPath)}`;

  if (!user) {
    if (!isAuthGuardEnabled()) {
      return { ok: true, isAdmin: false };
    }

    return {
      ok: false,
      status: 401,
      redirectTo: loginRedirect,
    };
  }

  if (adminRole) {
    return {
      ok: true,
      userId: user.id,
      email: user.email ?? "",
      isAdmin: true,
    };
  }

  if (!user.email) {
    return {
      ok: false,
      status: 401,
      redirectTo: loginRedirect,
    };
  }

  const ownedSlugs = await getOwnedCourseSlugs(user.email);

  if (!ownedSlugs.includes(FACEBOOK_EBOOK_COURSE_SLUG)) {
    return {
      ok: false,
      status: 403,
      redirectTo: "/academy/ebook-facebook-ads-2026",
    };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email,
    isAdmin: false,
  };
}
