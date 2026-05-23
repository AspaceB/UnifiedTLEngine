/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
  webpack: (config) => {
    // pdf-parse pulls in a debug harness that tries to read a test PDF at
    // module load; ignoring the .pdf import keeps it from breaking the bundle.
    config.module.rules.push({
      test: /\.pdf$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
