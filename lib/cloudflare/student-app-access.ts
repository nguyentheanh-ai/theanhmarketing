/** Authenticate server-to-server calls to the student app's protected staging Worker. */
export function getStudentAppStagingAccessHeaders(endpoint: string): Record<string, string> {
  const clientId = process.env.CF_ACCESS_STUDENT_APP_CLIENT_ID?.trim();
  const clientSecret = process.env.CF_ACCESS_STUDENT_APP_CLIENT_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) return {};

  try {
    const target = new URL(endpoint);
    const configuredApp = new URL(appUrl);
    if (target.protocol !== "https:" || !target.hostname.endsWith(".workers.dev") || target.origin !== configuredApp.origin) {
      return {};
    }
    return { "CF-Access-Client-Id": clientId, "CF-Access-Client-Secret": clientSecret };
  } catch {
    return {};
  }
}
