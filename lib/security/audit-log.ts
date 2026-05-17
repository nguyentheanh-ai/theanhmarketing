type SecurityEvent = {
  action: string;
  detail?: Record<string, string | number | boolean | null | undefined>;
  request?: Request;
};

function clientIp(request?: Request) {
  if (!request) {
    return undefined;
  }

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export function logSecurityEvent({ action, detail, request }: SecurityEvent) {
  console.warn("security_event", {
    action,
    detail,
    ip: clientIp(request),
    userAgent: request?.headers.get("user-agent") ?? undefined,
    at: new Date().toISOString(),
  });
}
