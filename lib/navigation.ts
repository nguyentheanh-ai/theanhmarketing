export function getSafeNextPath(
  nextPath: string | null | undefined,
  fallbackPath: string,
  options: { requiredPrefix?: string } = {},
) {
  const value = String(nextPath ?? "").trim();

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallbackPath;
  }

  if (value.includes("://") || value.includes("\\") || value.includes("\n")) {
    return fallbackPath;
  }

  if (options.requiredPrefix && value !== options.requiredPrefix && !value.startsWith(`${options.requiredPrefix}/`)) {
    return fallbackPath;
  }

  return value;
}
