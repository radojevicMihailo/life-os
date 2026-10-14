import type { NextConfig } from "next";
const config: NextConfig = {
  deploymentId: process.env.DEPLOYMENT_VERSION,
  output: "standalone", poweredByHeader: false, devIndicators: false,
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};
export default config;
