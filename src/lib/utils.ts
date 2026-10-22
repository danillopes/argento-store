import { useEffect, useState } from 'react'
import { MODELS, type PhoneModel } from '../data/models'
import { finalPrice, type Unit } from '../data/inventory'

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const brl2 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const installment = (v: number, n = 12) => brl2(v / n)

export function usePrefersReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setR(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return r
}

export function useIsMobile(bp = 860) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return m
}

export interface ModelSummary {
  model: PhoneModel
  units: Unit[]
  minPrice: number | null
  hasNew: boolean
  hasUsed: boolean
  maxPromo: number
}

export function summarize(inventory: Unit[], available: (u: Unit) => boolean): ModelSummary[] {
  return MODELS.map((model) => {
    const units = inventory.filter((u) => u.modelId === model.id && available(u))
    const prices = units.map(finalPrice)
    return {
      model,
      units,
      minPrice: prices.length ? Math.min(...prices) : null,
      hasNew: units.some((u) => u.condition === 'novo'),
      hasUsed: units.some((u) => u.condition === 'seminovo'),
      maxPromo: Math.max(0, ...units.map((u) => u.promo)),
    }
  })
}

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
