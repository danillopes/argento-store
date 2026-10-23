import { useState } from 'react'
import photos from '../data/photos.json'

export interface PhotoInfo {
  path: string
  w: number[]
  ratio: number
  blur: string
  label?: string
}

type Manifest = { modelos: Record<string, Record<string, PhotoInfo>>; unidades: Record<string, PhotoInfo[]> }
const M = photos as Manifest
const BASE = import.meta.env.BASE_URL

export const modelPhoto = (modelId: string, colorId: string): PhotoInfo | undefined => M.modelos[modelId]?.[colorId]
export const anyModelPhoto = (modelId: string): PhotoInfo | undefined => Object.values(M.modelos[modelId] ?? {})[0]
export const unitPhotos = (unitId: string): PhotoInfo[] => M.unidades[unitId] ?? []
export const hasUnitPhotos = (unitId: string) => !!M.unidades[unitId]?.length

const srcset = (p: PhotoInfo, ext: string) => p.w.map((w) => `${BASE}${p.path}-${w}.${ext} ${w}w`).join(', ')

// <picture> com AVIF → WebP, tamanhos responsivos, carregamento preguiçoso e miniatura borrada
export default function Photo({ p, alt, sizes = '(max-width: 860px) 90vw, 40vw', className, priority = false }: { p: PhotoInfo; alt: string; sizes?: string; className?: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <picture className={`photo-pic ${loaded ? 'is-loaded' : ''} ${className ?? ''}`} style={{ aspectRatio: `1 / ${p.ratio}`, backgroundImage: `url(${p.blur})` }}>
      <source type="image/avif" srcSet={srcset(p, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(p, 'webp')} sizes={sizes} />
      <img
        src={`${BASE}${p.path}-${p.w[0]}.webp`}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        width={p.w[p.w.length - 1]}
        height={Math.round(p.w[p.w.length - 1] * p.ratio)}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
    </picture>
  )
}
