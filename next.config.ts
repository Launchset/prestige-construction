import type { NextConfig } from "next";

const assetsBase = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "");

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (assetsBase) {
  const assetUrl = new URL(assetsBase);
  const protocol = assetUrl.protocol === "https:" ? "https" : "http";

  remotePatterns.push({
    protocol,
    hostname: assetUrl.hostname,
  });
}


const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.prestigekitchensandbedrooms.com",
      },
    ],
  },
};

export default nextConfig;