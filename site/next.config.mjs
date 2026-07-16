/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — the site is a single client page, served by GitHub Pages.
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
