const defaultOwnerEmails = ["nguyenhoainhu2006thd@gmail.com"];

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function parseEmailList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function getConfiguredOwnerEmails(env: NodeJS.ProcessEnv = process.env) {
  const configuredEmails = parseEmailList(env.ADMIN_EMAILS);
  const fallbackEmail = normalizeEmail(env.ADMIN_LOGIN_EMAIL);
  const baseEmails = configuredEmails.length > 0 ? configuredEmails : fallbackEmail ? [fallbackEmail] : [];

  return Array.from(new Set([...baseEmails, ...defaultOwnerEmails]));
}
