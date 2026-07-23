/**
 * Galería de avatares predisenados. Son ilustraciones generadas al vuelo
 * por DiceBear (servicio gratuito y open source) a partir de una "semilla"
 * fija — por eso cada uno siempre se ve igual, no cambian solos.
 *
 * Guardamos directamente la URL en profiles.avatar_url, igual que si
 * fuera una foto subida por el usuario: para el resto de la app (navbar,
 * panel de admin) un avatar de galería y una foto propia son lo mismo,
 * una URL de imagen.
 */

export interface PresetAvatar {
  seed: string
  bg: string
  url: string
}

const SEEDS: { seed: string; bg: string }[] = [
  { seed: 'Luna', bg: 'b6e3f4' },
  { seed: 'Tomate', bg: 'ffd5dc' },
  { seed: 'Canela', bg: 'ffdfbf' },
  { seed: 'Menta', bg: 'c0f2d8' },
  { seed: 'Cielo', bg: 'd1e8ff' },
  { seed: 'Uva', bg: 'e5d4ff' },
  { seed: 'Girasol', bg: 'fff3b0' },
  { seed: 'Coral', bg: 'ffd6cc' },
  { seed: 'Bosque', bg: 'd4f0d0' },
  { seed: 'Durazno', bg: 'ffe0e0' },
  { seed: 'Oceano', bg: 'c9ecff' },
  { seed: 'Frutilla', bg: 'ffccd5' },
]

export const PRESET_AVATARS: PresetAvatar[] = SEEDS.map(({ seed, bg }) => ({
  seed,
  bg,
  url: `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=${bg}&radius=50`,
}))

export function isPresetAvatar(url: string | null | undefined) {
  return !!url && url.startsWith('https://api.dicebear.com/')
}
