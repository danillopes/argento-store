import media from '../data/photos.json'
const versions = (media as { modelos3dVersoes?: Record<string, string> }).modelos3dVersoes ?? {}
const available = new Set(media.modelos3d)
export function modelAssetUrl(names: string[]) {
  const hit = names.find(name => available.has(name))
  return hit ? `${import.meta.env.BASE_URL}models/${hit}.glb${versions[hit] ? `?v=${versions[hit]}` : ''}` : null
}
