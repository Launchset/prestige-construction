import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./image-loader.js",
    qualities: [66, 68, 75, 80],
  },
};

export default nextConfig;
