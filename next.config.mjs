/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow event cover-image uploads through server actions.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
