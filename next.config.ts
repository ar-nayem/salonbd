import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Android looks for this exact path; the handler lives under /api.
      { source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" },
    ];
  },

  /* config options here */
};

export default nextConfig;
