import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Supabase — simple names for mobile Vercel UI
    NEXT_PUBLIC_SB_URL: process.env.SB_URL || process.env.NEXT_PUBLIC_SB_URL,
    NEXT_PUBLIC_SB_KEY: process.env.SB_KEY || process.env.NEXT_PUBLIC_SB_KEY,
    // LiveKit — simple names (one underscore)
    NEXT_PUBLIC_LK_URL: process.env.LK_URL || process.env.NEXT_PUBLIC_LK_URL,
  },
};

export default nextConfig;
