import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, GitCompareArrows } from 'lucide-react'
import PhoneArt from './PhoneArt'
import { useStore } from '../store/Store'
import { useExpandNav } from '../lib/motion'
import { brl, installment, type ModelSummary } from '../lib/utils'
import { storageLabel } from '../data/models'

export default function ProductCard({ s, condition }: { s: ModelSummary; condition?: 'novo' | 'seminovo' }) {
  const { favorites, toggleFav, compare, toggleCompare } = useStore()
  const expand = useExpandNav()
  const m = s.model
  const units = condition ? s.units.filter((u) => u.condition === condition) : s.units
  const colorsInStock = m.colors.filter((c) => units.some((u) => u.colorId === c.id))
  const [color, setColor] = useState(colorsInStock[0] ?? m.colors[0])
  const min = units.length ? Math.min(...units.map((u) => (u.promo ? Math.round((u.price * (1 - u.promo / 100)) / 10) * 10 - 1 : u.price))) : null
  const fav = favorites.includes(m.id)
  const cmp = compare.includes(m.id)
  const promo = Math.max(0, ...units.map((u) => u.promo))
  const to = `/produto/${m.id}${condition ? `?c=${condition}` : ''}`

  return (
    <motion.article
      className="pcard"
    >
      <div className="pcard-top">
        <div className="pcard-badges">
          {promo > 0 && <span className="badge badge-hot">−{promo}%</span>}
          {units.some((u) => u.condition === 'novo') && <span className="badge">Novo</span>}
          {units.some((u) => u.condition === 'seminovo') && <span className="badge badge-soft">Seminovo</span>}
          {m.verify && <span className="badge badge-soft">Lançamento</span>}
        </div>
        <div className="pcard-tools">
          <motion.button whileTap={{ scale: 0.85 }} className={`icon-btn ${fav ? 'is-on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Remover dos favoritos' : 'Salvar nos favoritos'} onClick={() => toggleFav(m.id)}>
            <Heart size={16} strokeWidth={1.7} fill={fav ? 'currentColor' : 'none'} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} className={`icon-btn ${cmp ? 'is-on' : ''}`} aria-pressed={cmp} aria-label="Comparar" onClick={() => toggleCompare(m.id)}>
            <GitCompareArrows size={16} strokeWidth={1.7} />
          </motion.button>
        </div>
      </div>
      <button className="pcard-art" onClick={(e) => expand(e, to, color.hex)} aria-label={`Abrir ${m.name}`}>
        <motion.div className="pcard-art-in" whileHover={{ scale: 1.06, rotate: -2 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <PhoneArt model={m} hex={color.hex} view="front" className="pa-front" />
          <PhoneArt model={m} hex={color.hex} view="back" className="pa-back" />
        </motion.div>
      </button>
      <div className="pcard-swatches" role="radiogroup" aria-label="Cores em estoque">
        {(colorsInStock.length ? colorsInStock : m.colors).map((c) => (
          <button key={c.id} role="radio" aria-checked={c.id === color.id} title={c.name} className={`sw ${c.id === color.id ? 'is-on' : ''}`} style={{ background: c.hex }} onMouseEnter={() => setColor(c)} onClick={() => setColor(c)} />
        ))}
      </div>
      <h3 className="pcard-name">{m.name}</h3>
      <p className="pcard-meta">{m.chip} · {m.screen}" · {m.storages.map(storageLabel).join(' / ')}</p>
      <div className="pcard-price">
        {min != null ? (
          <>
            <span className="muted">a partir de</span>
            <strong>{brl(min)}</strong>
            <span className="muted small">ou 12x de {installment(min)}</span>
          </>
        ) : (
          <span className="muted">Sem unidades disponíveis no momento</span>
        )}
      </div>
      <div className="pcard-foot">
        <span className={`stock ${units.length ? 'ok' : ''}`}>{units.length ? `${units.length} ${units.length === 1 ? 'unidade' : 'unidades'} em estoque` : 'Avise-me quando chegar'}</span>
      </div>
    </motion.article>
  )
}
