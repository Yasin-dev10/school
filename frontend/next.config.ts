import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://school-ta8j.onrender.com/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'https://school-ta8j.onrender.com/socket.io/:path*',
      }
    ];
  },
};

export default nextConfig;
