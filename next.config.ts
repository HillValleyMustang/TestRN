import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Removed custom webpack configuration for diagnostic purposes.
  // If the issue is resolved, we can investigate re-integrating the tagger
  // or finding an alternative solution if needed.
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);