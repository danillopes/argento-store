// Qualidade adaptativa do 3D (Ultra / Alta / Otimizada), compartilhada por todos os canvases.
// O nível inicial vem da GPU e do tipo de aparelho; depois o FPS real (PerformanceMonitor) sobe ou desce
// a resolução em degraus de 0,25 e, no limite de cada nível, troca de nível. O último nível observado
// fica salvo no aparelho, então a próxima visita já começa onde o desempenho se mostrou estável.
import { useSyncExternalStore } from 'react'

export type QualityTier = 'otimizada' | 'alta' | 'ultra'
const ORDER: QualityTier[] = ['otimizada', 'alta', 'ultra']
const STORAGE_KEY = 'argento-3d-tier'
const STEP = 0.25

export interface QualitySettings {
  /** resolução máxima e mínima de renderização (multiplicador de pixels) neste nível */
  dprMax: number
  dprMin: number
  /** resolução do canvas que desenha a tela do iPhone */
  screen: [number, number]
  /** resolução do cubemap de reflexos */
  envResolution: number
  /** sombra de contato */
  shadow: boolean
  shadowResolution: number
}

const isBrowser = typeof window !== 'undefined'
const deviceDpr = () => (isBrowser ? window.devicePixelRatio || 1 : 1)
const isTouch = () => isBrowser && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 860px)').matches)

export function settingsFor(tier: QualityTier): QualitySettings {
  const dpr = deviceDpr()
  const touch = isTouch()
  const cap = (v: number) => Math.max(1, Math.min(dpr, v))
  if (tier === 'ultra') return { dprMax: cap(2), dprMin: cap(1.5), screen: [1024, 2200], envResolution: 256, shadow: true, shadowResolution: 512 }
  if (tier === 'alta') return { dprMax: cap(touch ? 1.5 : 1.75), dprMin: cap(1.25), screen: [1024, 2200], envResolution: 256, shadow: true, shadowResolution: 256 }
  return { dprMax: cap(1.25), dprMin: 1, screen: [512, 1100], envResolution: 128, shadow: true, shadowResolution: 256 }
}

// ---------- detecção inicial ----------
function gpuName(): string {
  if (!isBrowser) return ''
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return ''
  }
}

export function detectTier(): QualityTier {
  if (!isBrowser) return 'alta'
  const gpu = gpuName().toLowerCase()
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  // renderização por software ou aparelho com pouca memória
  if (/swiftshader|llvmpipe|softpipe|basic render|microsoft basic/.test(gpu)) return 'otimizada'
  if (memory != null && memory <= 3) return 'otimizada'
  if (isTouch()) {
    // GPUs de entrada de Android (Adreno 3xx–5xx, Mali-4xx/T/G5x, PowerVR)
    if (/adreno \(tm\) [3-5]\d\d|adreno [3-5]\d\d|mali-4|mali-t|mali-g5\d|powervr/.test(gpu)) return 'otimizada'
    return 'alta' // iPhone e Android intermediário/topo
  }
  // desktop: GPU dedicada ou Apple Silicon → Ultra; integradas comuns → Alta
  if (/nvidia|geforce|quadro|rtx|radeon rx|radeon pro|apple m\d|apple gpu/.test(gpu) && !/intel/.test(gpu)) return 'ultra'
  return 'alta'
}

function savedTier(): QualityTier | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && (ORDER as string[]).includes(v) ? (v as QualityTier) : null
  } catch {
    return null
  }
}
function saveTier(t: QualityTier) {
  try { localStorage.setItem(STORAGE_KEY, t) } catch { /* armazenamento indisponível: segue sem lembrar */ }
}

// ---------- estado compartilhado ----------
interface QualityState { tier: QualityTier; cap: QualityTier; dpr: number; settings: QualitySettings }
let state: QualityState | null = null
const listeners = new Set<() => void>()

function init(): QualityState {
  const detected = detectTier()
  const saved = savedTier()
  // começa no menor entre o detectado e o último observado; o FPS pode subir até o detectado
  const tier = saved && ORDER.indexOf(saved) < ORDER.indexOf(detected) ? saved : detected
  const settings = settingsFor(tier)
  return { tier, cap: detected, dpr: settings.dprMax, settings }
}
function get(): QualityState {
  if (!state) state = init()
  return state
}
function set(next: Partial<QualityState>) {
  const cur = get()
  const tier = next.tier ?? cur.tier
  const settings = tier === cur.tier ? cur.settings : settingsFor(tier)
  state = { ...cur, ...next, settings }
  if (tier !== cur.tier) saveTier(tier)
  listeners.forEach((l) => l())
}

/** FPS abaixo do esperado: reduz a resolução e, no mínimo do nível, desce um nível */
export function qualityDecline() {
  const s = get()
  if (s.dpr - STEP >= s.settings.dprMin - 1e-3) return set({ dpr: +(s.dpr - STEP).toFixed(2) })
  const i = ORDER.indexOf(s.tier)
  if (i > 0) {
    const tier = ORDER[i - 1]
    set({ tier, dpr: Math.min(s.dpr, settingsFor(tier).dprMax) })
  }
}
/** FPS com folga: aumenta a resolução e, no máximo do nível, sobe um nível (até o limite do aparelho) */
export function qualityIncline() {
  const s = get()
  if (s.dpr + STEP <= s.settings.dprMax + 1e-3) return set({ dpr: +(s.dpr + STEP).toFixed(2) })
  const i = ORDER.indexOf(s.tier)
  if (i < ORDER.indexOf(s.cap)) set({ tier: ORDER[i + 1] })
}
/** FPS instável mesmo após os ajustes: fixa no mínimo do nível Otimizado (resolução 1x, ainda com MSAA) */
export function qualityFallback() {
  const o = settingsFor('otimizada')
  set({ tier: 'otimizada', cap: 'otimizada', dpr: o.dprMin })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
export function useRenderQuality() {
  return useSyncExternalStore(subscribe, get, get)
}
/** leitura pontual (diagnóstico) */
export function currentQuality() {
  return get()
}
if (isBrowser) (window as unknown as { __argentoQuality?: () => QualityState }).__argentoQuality = currentQuality
