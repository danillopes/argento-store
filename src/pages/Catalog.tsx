import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SlidersHorizontal, X, Search } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { useStore } from '../store/Store'
import { FAMILIES, MODELS, storageLabel, frontLabel, type FrontLayout } from '../data/models'
import { GRADES, finalPrice, type Unit } from '../data/inventory'
import { normalize, type ModelSummary } from '../lib/utils'

type Mode = 'todos' | 'seminovos' | 'ofertas'
const SORTS = [
  { id: 'relevancia', label: 'Relevância' },
  { id: 'menor', label: 'Menor preço' },
  { id: 'maior', label: 'Maior preço' },
  { id: 'recentes', label: 'Mais recentes' },
  { id: 'capacidade', label: 'Maior capacidade' },
  { id: 'bateria', label: 'Melhor saúde da bateria' },
  { id: 'ofertas', label: 'Melhores ofertas' },
]
const ALL_STORAGES = [64, 128, 256, 512, 1024, 2048]
const ALL_COLORS = Array.from(new Set(MODELS.flatMap((m) => m.colors.map((c) => c.name)))).sort()

export default function Catalog({ mode = 'todos' }: { mode?: Mode }) {
  const { inventory, available } = useStore()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const q = params.get('q') ?? ''
  const [fam, setFam] = useState<number[]>([])
  const [cond, setCond] = useState<string>(mode === 'seminovos' ? 'seminovo' : params.get('cond') ?? '')
  const [storages, setStorages] = useState<number[]>([])
  const [color, setColor] = useState('')
  const [minBat, setMinBat] = useState(80)
  const [grades, setGrades] = useState<string[]>([])
  const [pmin, setPmin] = useState('')
  const [pmax, setPmax] = useState('')
  const [model, setModel] = useState('')
  const [front, setFront] = useState<FrontLayout | ''>('')
  const [onlyStock, setOnlyStock] = useState(true)
  const [promoOnly, setPromoOnly] = useState(mode === 'ofertas')
  const [sort, setSort] = useState(params.get('sort') ?? (mode === 'ofertas' ? 'ofertas' : 'relevancia'))

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const results = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean)
    const unitOk = (u: Unit) => {
      if (!available(u)) return false
      if (cond && u.condition !== cond) return false
      if (storages.length && !storages.includes(u.storage)) return false
      if (u.battery < minBat) return false
      if (grades.length && u.condition === 'seminovo' && !grades.includes(u.grade)) return false
      if (grades.length && u.condition === 'novo' && !grades.includes('novo')) return false
      const p = finalPrice(u)
      if (pmin && p < Number(pmin)) return false
      if (pmax && p > Number(pmax)) return false
      if (promoOnly && !u.promo) return false
      if (color) {
        const m = MODELS.find((x) => x.id === u.modelId)!
        if (m.colors.find((c) => c.id === u.colorId)?.name !== color) return false
      }
      return true
    }
    let list: ModelSummary[] = MODELS.filter((m) => {
      if (fam.length && !fam.includes(m.family)) return false
      if (model && m.id !== model) return false
      if (front && m.front !== front) return false
      if (terms.length) {
        const hay = normalize(`${m.name} ${m.chip} ${m.cameras} ${frontLabel(m)} ${m.features.join(' ')} ${m.colors.map((c) => c.name).join(' ')} ${m.storages.map((s) => storageLabel(s)).join(' ')} ${m.storages.join('gb ')}gb`)
        if (!terms.every((t) => hay.includes(t.replace(/^iphone$/, '')))) return false
      }
      return true
    }).map((m) => {
      const units = inventory.filter((u) => u.modelId === m.id && unitOk(u))
      const prices = units.map(finalPrice)
      return { model: m, units, minPrice: prices.length ? Math.min(...prices) : null, hasNew: units.some((u) => u.condition === 'novo'), hasUsed: units.some((u) => u.condition === 'seminovo'), maxPromo: Math.max(0, ...units.map((u) => u.promo)) }
    })
    if (onlyStock) list = list.filter((s) => s.units.length)
    const by = {
      relevancia: (a: ModelSummary, b: ModelSummary) => b.model.family - a.model.family || a.model.basePrice - b.model.basePrice,
      menor: (a: ModelSummary, b: ModelSummary) => (a.minPrice ?? 1e9) - (b.minPrice ?? 1e9),
      maior: (a: ModelSummary, b: ModelSummary) => (b.minPrice ?? 0) - (a.minPrice ?? 0),
      recentes: (a: ModelSummary, b: ModelSummary) => Math.max(0, ...b.units.map((u) => u.createdAt)) - Math.max(0, ...a.units.map((u) => u.createdAt)),
      capacidade: (a: ModelSummary, b: ModelSummary) => Math.max(0, ...b.units.map((u) => u.storage)) - Math.max(0, ...a.units.map((u) => u.storage)),
      bateria: (a: ModelSummary, b: ModelSummary) => Math.max(0, ...b.units.map((u) => u.battery)) - Math.max(0, ...a.units.map((u) => u.battery)),
      ofertas: (a: ModelSummary, b: ModelSummary) => b.maxPromo - a.maxPromo,
    }[sort as 'menor']
    return [...list].sort(by ?? (() => 0))
  }, [q, fam, model, front, cond, storages, color, minBat, grades, pmin, pmax, onlyStock, promoOnly, sort, inventory, available])

  const clear = () => {
    setFam([]); setCond(mode === 'seminovos' ? 'seminovo' : ''); setStorages([]); setColor(''); setMinBat(80); setGrades([]); setPmin(''); setPmax(''); setModel(''); setFront(''); setPromoOnly(mode === 'ofertas'); setOnlyStock(true)
    setParams({})
  }

  const title = mode === 'seminovos' ? 'Seminovos' : mode === 'ofertas' ? 'Ofertas' : 'iPhones'
  const sub = mode === 'seminovos' ? 'Unidades inspecionadas, com saúde da bateria exata e grau de conservação.' : mode === 'ofertas' ? 'Unidades com desconto por tempo limitado.' : 'Do iPhone 12 ao iPhone 18 Pro Max — novos e seminovos.'

  const Filters = (
    <div className="filters">
      <div className="f-group">
        <label className="f-label">Pesquisa</label>
        <div className="input-icon">
          <Search size={15} />
          <input className="input" value={q} onChange={(e) => setParams((p) => { e.target.value ? p.set('q', e.target.value) : p.delete('q'); return p }, { replace: true })} placeholder="Ex.: 15 pro 256 azul" />
        </div>
      </div>
      <div className="f-group">
        <span className="f-label">Geração</span>
        <div className="chips">{FAMILIES.map((f) => <button key={f} className={`chip ${fam.includes(f) ? 'is-on' : ''}`} onClick={() => toggle(fam, f, setFam)}>{f}</button>)}</div>
      </div>
      <div className="f-group">
        <label className="f-label" htmlFor="f-model">Modelo</label>
        <select id="f-model" className="input" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">Todos</option>
          {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="f-group">
        <span className="f-label">Frente</span>
        <div className="seg">
          {([['', 'Todas'], ['island', 'Dynamic Island'], ['notch', 'Notch']] as const).map(([v, l]) => <button key={v} className={front === v ? 'is-on' : ''} onClick={() => setFront(v)} aria-pressed={front === v}>{l}</button>)}
        </div>
      </div>
      {mode !== 'seminovos' && (
        <div className="f-group">
          <span className="f-label">Condição</span>
          <div className="seg">
            {[['', 'Todos'], ['novo', 'Novo'], ['seminovo', 'Seminovo']].map(([v, l]) => <button key={v} className={cond === v ? 'is-on' : ''} onClick={() => setCond(v)}>{l}</button>)}
          </div>
        </div>
      )}
      <div className="f-group">
        <span className="f-label">Preço (R$)</span>
        <div className="row gap-s">
          <input className="input" inputMode="numeric" placeholder="mín." value={pmin} onChange={(e) => setPmin(e.target.value.replace(/\D/g, ''))} aria-label="Preço mínimo" />
          <input className="input" inputMode="numeric" placeholder="máx." value={pmax} onChange={(e) => setPmax(e.target.value.replace(/\D/g, ''))} aria-label="Preço máximo" />
        </div>
      </div>
      <div className="f-group">
        <span className="f-label">Capacidade</span>
        <div className="chips">{ALL_STORAGES.map((s) => <button key={s} className={`chip ${storages.includes(s) ? 'is-on' : ''}`} onClick={() => toggle(storages, s, setStorages)}>{storageLabel(s)}</button>)}</div>
      </div>
      <div className="f-group">
        <label className="f-label" htmlFor="f-color">Cor</label>
        <select id="f-color" className="input" value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">Todas</option>
          {ALL_COLORS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="f-group">
        <label className="f-label" htmlFor="f-bat">Saúde mínima da bateria: <strong>{minBat}%</strong></label>
        <input id="f-bat" type="range" min={80} max={100} value={minBat} onChange={(e) => setMinBat(Number(e.target.value))} />
      </div>
      <div className="f-group">
        <span className="f-label">Conservação</span>
        <div className="chips">
          <button className={`chip ${grades.includes('novo') ? 'is-on' : ''}`} onClick={() => toggle(grades, 'novo', setGrades)}>Lacrado</button>
          {GRADES.map((g) => <button key={g.id} className={`chip ${grades.includes(g.id) ? 'is-on' : ''}`} onClick={() => toggle(grades, g.id, setGrades)}>{g.name}</button>)}
        </div>
      </div>
      <label className="check"><input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /> Somente disponíveis</label>
      <label className="check"><input type="checkbox" checked={promoOnly} onChange={(e) => setPromoOnly(e.target.checked)} /> Somente promoções</label>
      <button className="btn btn-ghost w-full" onClick={clear}>Limpar filtros</button>
    </div>
  )

  return (
    <div className="page container">
      <header className="page-head">
        <p className="eyebrow">Catálogo</p>
        <h1 className="h1">{title}</h1>
        <p className="lead">{sub}</p>
      </header>
      <div className="cat-bar">
        <button className="btn btn-ghost only-mob" onClick={() => setOpen(true)}><SlidersHorizontal size={16} /> Filtros</button>
        <span className="muted">{results.length} {results.length === 1 ? 'modelo' : 'modelos'} · {results.reduce((s, r) => s + r.units.length, 0)} unidades</span>
        <select className="input input-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div className="cat">
        <aside className="cat-side only-desk">{Filters}</aside>
        <div>
          {results.length ? (
            <motion.div layout className="grid-cards">
              <AnimatePresence mode="popLayout">
                {results.map((s) => (
                  <motion.div key={s.model.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                    <ProductCard s={s} condition={(cond || undefined) as 'novo' | undefined} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="empty">
              <h3>Nenhum aparelho com esses critérios.</h3>
              <p className="muted">Tente ampliar a faixa de preço ou remover algum filtro.</p>
              <button className="btn btn-primary" onClick={clear}>Limpar filtros</button>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} onClick={(e) => e.stopPropagation()} data-lenis-prevent>
              <div className="sheet-head"><strong>Filtros</strong><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button></div>
              {Filters}
              <button className="btn btn-primary w-full" onClick={() => setOpen(false)}>Ver {results.length} modelos</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
