export function getSafeNextPath(
  nextPath: string | null | undefined,
  fallbackPath: string,
  options: { requiredPrefix?: string } = {},
) {
  let value = String(nextPath ?? "").trim();

  for (let index = 0; index < 2; index += 1) {
    try {
      const decodedValue = decodeURIComponent(value).trim();

      if (decodedValue === value) {
        break;
      }

      value = decodedValue;
    } catch {
      return fallbackPath;
    }
  }

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallbackPath;
  }

  if (
    value.includes("://") ||
    value.includes("\\") ||
    value.includes("\n") ||
    value.includes("\r") ||
    value.toLowerCase().startsWith("/javascript:") ||
    value.toLowerCase().startsWith("/data:")
  ) {
    return fallbackPath;
  }

  if (options.requiredPrefix && value !== options.requiredPrefix && !value.startsWith(`${options.requiredPrefix}/`)) {
    return fallbackPath;
  }

  return value;
}
