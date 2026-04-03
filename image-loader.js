"use client";

const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

function normalizeAssetPath(path) {
  return path.replace(/^web\//i, "");
}

export default function imageLoader({ src, width, quality }) {
  if (src.startsWith("/")) {
    return src;
  }

  const normalizedPath = normalizeAssetPath(src);

  if (!ASSETS_BASE) {
    return normalizedPath;
  }

  return `${ASSETS_BASE}/i/${normalizedPath}?w=${width}&q=${quality ?? 75}`;
}
