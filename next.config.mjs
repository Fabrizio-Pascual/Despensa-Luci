/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
  // sacá el unoptimized, y si tus imágenes vienen de Supabase/Vercel Blob:
  remotePatterns: [
    { protocol: 'https', hostname: 'TU_SUPABASE_PROJECT.supabase.co' },
    { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
  ],
},
  experimental: {
    turbo: {
      enabled: false,
    }
  }
}

export default nextConfig