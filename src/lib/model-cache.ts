export const MODEL_CACHE = 'argento-modelos-3d'
const pending = new Map<string, Promise<ArrayBuffer>>()

// Cache binário persistente mesmo na primeira visita, antes do SW assumir a página.
// A mesma Promise também evita downloads duplicados entre preload e configurador.
export function readModelAsset(url: string): Promise<ArrayBuffer> {
  const key = new URL(url, globalThis.location?.href ?? 'http://localhost/').href
  const existing = pending.get(key)
  if (existing) return existing
  const promise = (async () => {
    let cache: Cache | undefined
    try {
      cache = await globalThis.caches?.open(MODEL_CACHE)
      const hit = await cache?.match(key)
      if (hit) {
        if (import.meta.env?.DEV) console.debug('[3D cache] persistente:', key)
        return await hit.arrayBuffer()
      }
    } catch { /* navegador privado ou quota: continua pela rede */ }
    const response = await fetch(key)
    if (import.meta.env?.DEV) console.debug('[3D cache] primeiro download:', key)
    if (!response.ok) throw new Error(`Modelo 3D: HTTP ${response.status}`)
    const bytes = await response.arrayBuffer()
    try {
      await cache?.put(key, new Response(bytes, { headers: { 'Content-Type': 'model/gltf-binary' } }))
    } catch { /* falta de espaço não bloqueia a apresentação */ }
    return bytes
  })()
  pending.set(key, promise)
  promise.catch(() => { if (pending.get(key) === promise) pending.delete(key) })
  if (pending.size > 3) pending.delete(pending.keys().next().value!)
  return promise
}
