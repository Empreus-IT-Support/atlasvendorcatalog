import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
};

export default config;
