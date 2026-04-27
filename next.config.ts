import type { NextConfig } from "next";

// Set via the GitHub Actions workflow env:
//   BASE_PATH=/climate-action-leaderboard
// Locally: empty string (serves from root)
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",        // static HTML/CSS/JS — no Node server needed
  basePath,                // /climate-action-leaderboard on GitHub Pages, "" locally
  trailingSlash: true,     // /foo/ → /foo/index.html (required for GH Pages)
  images: {
    unoptimized: true,     // next/image optimisation needs a server — disable for export
  },
};

export default nextConfig;
