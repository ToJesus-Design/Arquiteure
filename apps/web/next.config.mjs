/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["@prisma/client", "pdfkit"] },
  transpilePackages: [
    "@arquiteure/api",
    "@arquiteure/core",
    "@arquiteure/db",
    "@arquiteure/audit",
    "@arquiteure/ai",
    "@arquiteure/intent",
    "@arquiteure/vision",
    "@arquiteure/voice",
    "@arquiteure/generator",
    "@arquiteure/validator",
    "@arquiteure/knowledge",
    "@arquiteure/drawing",
    "@arquiteure/exporter",
  ],
};
export default config;
