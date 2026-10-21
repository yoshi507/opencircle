import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Map simple names → the NEXT_PUBLIC_ ones the browser needs
  env: {
    NEXT_PUBLIC_SB_URL: process.env.SB_URL || process.env.NEXT_PUBLIC_SB_URL,
    NEXT_PUBLIC_SB_KEY: process.env.SB_KEY || process.env.NEXT_PUBLIC_SB_KEY,
  },
};

export default nextConfig;
