import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone", poweredByHeader: false, devIndicators: false,
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};
export default config;
