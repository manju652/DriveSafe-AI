import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* requests to the FastAPI backend in dev
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/:path*`,
      },
    ];
  },
  // Standalone output for Docker
  output: "standalone",
};

export default nextConfig;
