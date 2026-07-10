import { redirect } from "next/navigation";
import { FacebookEbookReader } from "@/components/ebook/facebook-ebook-reader";
import {
  FACEBOOK_EBOOK_COURSE_SLUG,
  FACEBOOK_EBOOK_READER_HREF,
  getFacebookEbookManifest,
} from "@/lib/ebook/facebook-ebook";
import { requireFacebookEbookAccess } from "@/lib/ebook/facebook-ebook-access";

export const dynamic = "force-dynamic";

export default async function FacebookAdsEbookPage() {
  const loginRedirect = `/dang-nhap?next=${encodeURIComponent(FACEBOOK_EBOOK_READER_HREF)}`;
  const access = await requireFacebookEbookAccess(FACEBOOK_EBOOK_READER_HREF);

  if (!access.ok) {
    redirect(access.redirectTo || loginRedirect);
  }

  return <FacebookEbookReader key={FACEBOOK_EBOOK_COURSE_SLUG} manifest={getFacebookEbookManifest()} />;
}
