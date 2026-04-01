export function getSafeInternalPath(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const trimmed = path.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.includes("\\") || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed, "https://example.com");

    if (url.origin !== "https://example.com") {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
