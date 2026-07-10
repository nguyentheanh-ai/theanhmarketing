import manifestJson from "@/data/facebook-ebook-manifest.json";

export const FACEBOOK_EBOOK_COURSE_SLUG = "ebook-facebook-ads-2026";
export const FACEBOOK_EBOOK_READER_HREF = "/thu-vien/facebook-ads";
export const FACEBOOK_EBOOK_DEFAULT_BUCKET = "facebook-ads-ebook-2026";
export const FACEBOOK_EBOOK_PDF_HREF = "/thu-vien/facebook-ads/pdf";
export const FACEBOOK_EBOOK_PDF_API_HREF = "/api/ebook/facebook-ads/pdf";
export const FACEBOOK_EBOOK_PDF_DEFAULT_BUCKET = "facebook-ads-ebook-downloads-2026";
export const FACEBOOK_EBOOK_PDF_OBJECT_PATH = "downloads/facebook-ads-2026-full-ebook.pdf";
export const FACEBOOK_EBOOK_PDF_FILE_NAME = "Facebook Ads 2026 - Full Ebook.pdf";

export type FacebookEbookPart = {
  part: number;
  title: string;
  keywords: string[];
  topics: string[];
  topicPages: number[];
  pageCount: number;
  startAbsolutePage: number;
};

export type FacebookEbookManifest = {
  title: string;
  totalParts: number;
  totalPages: number;
  parts: FacebookEbookPart[];
};

const manifest = manifestJson as FacebookEbookManifest;

export function getFacebookEbookManifest() {
  return manifest;
}

export function getFacebookEbookPart(partNumber: number) {
  return manifest.parts.find((part) => part.part === partNumber) ?? null;
}

export function getFacebookEbookPage(partNumber: number, pageNumber: number) {
  const part = getFacebookEbookPart(partNumber);

  if (!part || pageNumber < 1 || pageNumber > part.pageCount) {
    return null;
  }

  return {
    part,
    page: pageNumber,
    absolutePage: part.startAbsolutePage + pageNumber - 1,
    storagePath: getFacebookEbookStoragePath(partNumber, pageNumber),
  };
}

export function getFacebookEbookStoragePath(partNumber: number, pageNumber: number) {
  return `pages/part-${partNumber}/${pageNumber}.png`;
}
