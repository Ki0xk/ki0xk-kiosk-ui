/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['serialport', 'ws', '@serialport/parser-readline', 'nfc-pcsc'],
}

export default nextConfig
