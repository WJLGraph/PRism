/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the dev server output separate from production build artifacts.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // 前端统一走同源相对路径，/api 与 /a2a 在此代理到后端。
  // 生产环境由 Nginx 直接反代（优先级更高），此规则只兜底直连 Next 端口的情况。
  async rewrites() {
    const target = process.env.API_PROXY_TARGET || "http://127.0.0.1:8001";
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/a2a/:path*", destination: `${target}/a2a/:path*` }
    ];
  }
};

module.exports = nextConfig;
