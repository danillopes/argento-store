import { MODELS, modelById } from './models'

export type Condition = 'novo' | 'seminovo'
export type Grade = 'A+' | 'A' | 'B' | 'C' | 'novo'
export type UnitStatus = 'disponivel' | 'reservado' | 'vendido'

export interface Unit {
  id: string // identificador interno único
  modelId: string
  storage: number
  colorId: string
  condition: Condition
  battery: number // saúde exata
  batteryReplaced: boolean
  grade: Grade
  price: number // preço final da unidade (definido pelo vendedor)
  promo: number // % de desconto (0 = sem oferta)
  warrantyMonths: number
  imeiMasked: string
  repairs: string
  notes: string
  published: boolean
  status: UnitStatus
  reservedUntil?: number
  createdAt: number
}

export const GRADES: { id: Exclude<Grade, 'novo'>; name: string; desc: string; bullets: string[] }[] = [
  { id: 'A+', name: 'Impecável', desc: 'Aparência praticamente nova', bullets: ['Sem marcas relevantes', 'Maior valor comercial'] },
  { id: 'A', name: 'Excelente', desc: 'Marcas mínimas de utilização', bullets: ['Ótima conservação', 'Visíveis apenas sob luz direta'] },
  { id: 'B', name: 'Muito bom', desc: 'Pequenos arranhões ou sinais visíveis', bullets: ['Tela sem riscos profundos', 'Preço intermediário'] },
  { id: 'C', name: 'Bom', desc: 'Marcas mais evidentes', bullets: ['Funcionamento 100% testado', 'Preço mais acessível'] },
]

export const gradeName = (g: Grade) => (g === 'novo' ? 'Novo lacrado' : `${GRADES.find((x) => x.id === g)!.name} · Grau ${g}`)

export const BATTERY_BANDS = [
  { id: '80-84', label: '80% a 84%', min: 80, max: 84 },
  { id: '85-89', label: '85% a 89%', min: 85, max: 89 },
  { id: '90-94', label: '90% a 94%', min: 90, max: 94 },
  { id: '95-99', label: '95% a 99%', min: 95, max: 99 },
  { id: '100', label: '100%', min: 100, max: 100 },
]
export const bandOf = (b: number) => BATTERY_BANDS.find((x) => b >= x.min && b <= x.max)!

// ---------- Política de preços (editável no painel) ----------
export interface PricingRules {
  storageStep: number // % por degrau de armazenamento
  usedFactorPerYear: number // % de depreciação por ano de idade
  batteryAdj: Record<string, number> // R$ por faixa
  gradeAdj: Record<string, number> // R$ por grau
  margin: number // % de margem
}

export const DEFAULT_RULES: PricingRules = {
  storageStep: 12,
  usedFactorPerYear: 11,
  batteryAdj: { '80-84': -250, '85-89': -120, '90-94': 0, '95-99': 150, '100': 250 },
  gradeAdj: { 'A+': 200, A: 80, B: -150, C: -350 },
  margin: 0,
}

export function suggestPrice(rules: PricingRules, modelId: string, storage: number, condition: Condition, battery: number, grade: Grade, year = 2026) {
  const m = modelById(modelId)!
  const step = Math.max(0, m.storages.indexOf(storage))
  let price = m.basePrice * (1 + (rules.storageStep / 100) * step)
  if (condition === 'seminovo') {
    const age = Math.max(1, year - m.year)
    price = price * Math.max(0.3, 1 - (rules.usedFactorPerYear / 100) * age)
    price += rules.batteryAdj[bandOf(battery).id] ?? 0
    price += rules.gradeAdj[grade] ?? 0
  }
  price = price * (1 + rules.margin / 100)
  return Math.round(price / 10) * 10 - 1
}

export function breakdown(rules: PricingRules, u: Pick<Unit, 'modelId' | 'storage' | 'condition' | 'battery' | 'grade'>) {
  const m = modelById(u.modelId)!
  const step = Math.max(0, m.storages.indexOf(u.storage))
  const rows: { label: string; value: number }[] = []
  let base = m.basePrice * (1 + (rules.storageStep / 100) * step)
  if (u.condition === 'seminovo') base *= Math.max(0.3, 1 - (rules.usedFactorPerYear / 100) * Math.max(1, 2026 - m.year))
  rows.push({ label: 'Preço-base do modelo e capacidade', value: Math.round(base) })
  if (u.condition === 'seminovo') {
    rows.push({ label: `Saúde da bateria ${u.battery}%`, value: rules.batteryAdj[bandOf(u.battery).id] ?? 0 })
    rows.push({ label: `Conservação grau ${u.grade}`, value: rules.gradeAdj[u.grade] ?? 0 })
  }
  return rows
}

// ---------- Gerador determinístico do estoque demonstrativo ----------
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function seedInventory(): Unit[] {
  const r = rng(20261022)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const units: Unit[] = []
  let n = 1001
  const now = Date.now()
  for (const m of MODELS) {
    const isRecent = m.family >= 17 || m.id === 'iphone-16e'
    if (isRecent) {
      // novos lacrados: uma unidade por cor nas duas primeiras capacidades
      for (const col of m.colors) {
        for (const st of m.storages.slice(0, 2)) {
          if (r() < 0.25) continue
          units.push(makeUnit(m.id, st, col.id, 'novo', 100, 'novo'))
        }
      }
    }
    if (m.family <= 17 && m.id !== 'iphone-17e') {
      const count = m.family >= 17 ? 2 : 4 + Math.floor(r() * 4)
      for (let i = 0; i < count; i++) {
        const st = pick(m.storages.slice(0, 3))
        const col = pick(m.colors).id
        const ageYears = 2026 - m.year
        const minBat = Math.max(80, 100 - ageYears * 4)
        const replaced = r() < 0.18
        const battery = replaced ? 100 : Math.min(100, Math.floor(minBat + r() * (101 - minBat)))
        const grade = pick(['A+', 'A', 'A', 'B', 'B', 'C'] as Grade[])
        units.push(makeUnit(m.id, st, col, 'seminovo', battery, grade, replaced))
      }
    }
  }
  return units

  function makeUnit(modelId: string, storage: number, colorId: string, condition: Condition, battery: number, grade: Grade, replaced = false): Unit {
    const price = suggestPrice(DEFAULT_RULES, modelId, storage, condition, battery, grade)
    const promo = r() < 0.16 ? pick([5, 8, 10, 12]) : 0
    const id = `ARG-${n++}`
    return {
      id,
      modelId,
      storage,
      colorId,
      condition,
      battery,
      batteryReplaced: replaced,
      grade,
      price,
      promo,
      warrantyMonths: condition === 'novo' ? 12 : 6,
      imeiMasked: `35${'•'.repeat(9)}${Math.floor(1000 + r() * 8999)}`,
      repairs: replaced ? 'Bateria substituída por peça nova, com registro de serviço.' : 'Nenhum reparo conhecido.',
      notes: condition === 'novo' ? 'Lacrado de fábrica, nota fiscal emitida pela loja.' : 'Testado em 42 pontos: tela, Face ID, câmeras, alto-falantes, microfones, sensores e conectividade.',
      published: true,
      status: 'disponivel',
      createdAt: now - Math.floor(r() * 40) * 86400000,
    }
  }
}

export const finalPrice = (u: Unit) => (u.promo ? Math.round((u.price * (1 - u.promo / 100)) / 10) * 10 - 1 : u.price)
