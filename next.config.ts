import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Il badge di sviluppo copre la barra di navigazione in basso.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
