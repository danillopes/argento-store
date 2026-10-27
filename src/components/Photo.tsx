import { useEffect, useRef, useState } from 'react'
import photos from '../data/photos.json'

export interface PhotoInfo {
  path: string
  w: number[]
  ratio: number
  blur: string
  label?: string
}

export type Vista = 'frente' | 'traseira'
type Manifest = {
  modelos: Record<string, Record<string, PhotoInfo>>
  recortes: Record<string, Record<string, Partial<Record<Vista, PhotoInfo>>>>
  unidades: Record<string, PhotoInfo[]>
}
const M = photos as Manifest
const BASE = import.meta.env.BASE_URL

export const modelPhoto = (modelId: string, colorId: string): PhotoInfo | undefined => M.modelos[modelId]?.[colorId]
// Aparelho recortado da foto de catálogo (a oficial traz a traseira e a frente juntas), com fundo transparente
export const recortePhoto = (modelId: string, colorId: string, vista: Vista): PhotoInfo | undefined =>
  M.recortes?.[modelId]?.[colorId]?.[vista]
export const anyModelPhoto = (modelId: string): PhotoInfo | undefined => Object.values(M.modelos[modelId] ?? {})[0]
export const unitPhotos = (unitId: string): PhotoInfo[] => M.unidades[unitId] ?? []
export const hasUnitPhotos = (unitId: string) => !!M.unidades[unitId]?.length

const srcset = (p: PhotoInfo, ext: string) => p.w.map((w) => `${BASE}${p.path}-${w}.${ext} ${w}w`).join(', ')

// <picture> com AVIF → WebP, tamanhos responsivos, carregamento preguiçoso e miniatura borrada
export default function Photo({ p, alt, sizes = '(max-width: 860px) 90vw, 40vw', className, priority = false }: { p: PhotoInfo; alt: string; sizes?: string; className?: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  // O aviso de carregamento vem do próprio elemento: o evento load não sobe na árvore e nem sempre chega ao
  // React, e a foto que já estava em cache termina antes de qualquer listener — aí ela ficava em opacidade zero
  // e só a miniatura borrada aparecia.
  useEffect(() => {
    const el = img.current
    if (!el) return
    if (el.complete && el.naturalWidth > 0) return setLoaded(true)
    setLoaded(false)
    const pronto = () => setLoaded(true)
    el.addEventListener('load', pronto)
    return () => el.removeEventListener('load', pronto)
  }, [p.path])
  return (
    // a miniatura borrada sai de cena quando a foto chega: em foto com fundo transparente ela apareceria por trás
    <picture className={`photo-pic ${loaded ? 'is-loaded' : ''} ${className ?? ''}`} style={{ aspectRatio: `1 / ${p.ratio}`, backgroundImage: loaded ? undefined : `url(${p.blur})` }}>
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
        ref={img}
        draggable={false}
      />
    </picture>
  )
}
