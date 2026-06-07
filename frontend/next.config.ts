import type { NextConfig } from "next";

const DEFAULT_BACKEND_URL = "https://school-management-live.onrender.com";
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const apiUrl =
  process.env.BACKEND_INTERNAL_URL?.trim() ||
  (publicApiUrl?.startsWith("http") ? publicApiUrl : "") ||
  DEFAULT_BACKEND_URL;
const backendUrl = apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      }
    ];
  },
};

export default nextConfig;
