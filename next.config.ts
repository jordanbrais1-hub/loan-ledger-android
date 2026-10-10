import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a fully static app into `out/`, which Capacitor packages into the
  // Android app. There is no server: data lives on the device.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
