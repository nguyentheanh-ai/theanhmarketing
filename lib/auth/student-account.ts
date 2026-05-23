type AutoAccountInput = {
  studentName: string;
  email: string;
  phone: string;
};

type UserLike = {
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

function stripVietnameseMarks(value: string) {
  return value
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeGivenName(studentName: string) {
  const parts = stripVietnameseMarks(studentName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const givenName = parts.at(-1)?.replace(/[^a-zA-Z0-9]/g, "") || "Hocvien";
  const lowerName = givenName.toLowerCase();

  return lowerName.charAt(0).toUpperCase() + lowerName.slice(1);
}

export function buildAutoStudentAccountCredentials(input: AutoAccountInput) {
  const email = input.email.trim().toLowerCase();
  const phoneDigits = input.phone.replace(/\D/g, "");
  const password = `${normalizeGivenName(input.studentName)}${phoneDigits}`;

  return { email, password };
}

export function shouldRequirePasswordChange(user: UserLike) {
  return user?.user_metadata?.must_change_password === true;
}

export function getPostLoginRedirect(user: UserLike, nextPath: string) {
  if (!shouldRequirePasswordChange(user)) {
    return nextPath;
  }

  return `/doi-mat-khau?next=${encodeURIComponent(nextPath)}`;
}
