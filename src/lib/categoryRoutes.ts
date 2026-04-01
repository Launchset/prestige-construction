export const LEGACY_CATEGORY_REDIRECTS: Record<string, string> = {
  "sinks-taps": "sinks",
};

export function getLegacyCategoryRedirect(slug: string) {
  return LEGACY_CATEGORY_REDIRECTS[slug] ?? null;
}
