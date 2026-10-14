import type { NextConfig } from "next";

const config: NextConfig = {
  cacheComponents: true,
  // Cold Grit files can exceed Next's default 54-second cache-fill watchdog.
  experimental: { useCacheTimeout: 210 },
  cacheHandlers: process.env.ATTUNE_REMOTE_CACHE_HANDLER
    ? { remote: process.env.ATTUNE_REMOTE_CACHE_HANDLER }
    : undefined,
  partialPrefetching: true,
  poweredByHeader: false,
  agentRules: false,
  outputFileTracingIncludes: {
    "/api/extraction": ["./.artifacts/server/**/*"],
  },
  async rewrites() {
    // The existing research site remains byte-for-byte static, beside /studio.
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/studio/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};
export default config;
