import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/pdfbox' : '',
  assetPrefix: isProd ? '/pdfbox/' : '',
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
