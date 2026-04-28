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
    "@arquiteure/iso-consultant",
  ],
  webpack(config) {
    // Resolve ESM .js imports to their TypeScript source counterparts
    // Required for workspace packages that use `import ... from "./foo.js"` pattern
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};
export default config;
