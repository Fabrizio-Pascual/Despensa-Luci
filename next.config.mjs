/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Comodín: acepta imágenes de cualquier dominio https, para no
      // depender de conocer de antemano dónde están alojadas (Supabase,
      // Vercel Blob, o cualquier URL que ya hayas cargado desde el admin).
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    turbo: {
      enabled: false,
    }
  }
}

export default nextConfig