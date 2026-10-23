import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Layers, Camera, RotateCcw, Info } from 'lucide-react'
import { gsap } from 'gsap'
import { getLenis } from '../../lib/motion'
import type { ExplodeConfig } from '../../data/explode-config'
import { newExplodeState } from './state'

const ExplodedCanvas = lazy(() => import('./ExplodedPhone'))

// Experiência imersiva: girar 360°, aproximar, desmontar 0–100 %, selecionar peças e remontar.
// O modal é uma camada por cima da página do produto: cor, armazenamento, bateria, conservação e unidade
// escolhidos continuam intactos ao fechar.
export default function ExplodeModal({ title, config, onClose, tint }: { title: string; config: ExplodeConfig; onClose: () => void; tint?: string }) {
  const state = useRef(newExplodeState())
  const [pct, setPct] = useState(0)
  const [lens, setLens] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const tween = useRef<gsap.core.Tween | null>(null)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // lista de peças sem repetir (as camadas de lente aparecem como um item)
  const items = useMemo(() => {
    const seen = new Set<string>()
    return config.parts.filter((p) => (seen.has(p.label) ? false : (seen.add(p.label), true)))
  }, [config])
  const selected = sel ? config.parts.find((p) => p.node === sel) : null

  useEffect(() => {
    getLenis()?.stop()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    // abre já começando a desmontar, para mostrar o que a experiência faz
    const t = setTimeout(() => animateTo(0.55), 450)
    return () => {
      clearTimeout(t)
      tween.current?.kill()
      window.removeEventListener('keydown', key)
      document.body.style.overflow = prev
      getLenis()?.start()
    }
  }, [])

  function animateTo(target: number) {
    tween.current?.kill()
    const s = state.current
    tween.current = gsap.to(s, {
      progress: target,
      duration: reduce ? 0 : 0.9 + Math.abs(target - s.progress) * 1.1,
      ease: 'power2.inOut',
      onUpdate: () => setPct(Math.round(s.progress * 100)),
    })
    if (target === 0) { setLens(false); state.current.lens = 0 }
  }

  const select = (node: string | null) => {
    setSel(node)
    state.current.selected = node
    if (node && state.current.progress < 0.5) animateTo(1)
  }

  const toggleLens = () => {
    const next = !lens
    setLens(next)
    state.current.lens = next ? 1 : 0
    if (next && state.current.progress < 0.9) animateTo(1)
  }

  return createPortal(
    <motion.div className="xp" role="dialog" aria-modal="true" aria-label={`${title} por dentro`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3 }}>
      <header className="xp-head">
        <div>
          <p className="eyebrow">Explorar por dentro</p>
          <h2>{title}</h2>
        </div>
        <button className="xp-close" onClick={onClose} aria-label="Fechar e voltar à compra"><X size={18} /> <span>Voltar à compra</span></button>
      </header>

      <div className="xp-stage">
        <Suspense fallback={<div className="xp-loading" role="status">Carregando peças em 3D…</div>}>
          <ExplodedCanvas config={config} state={state} tint={tint} mode="interactive" onSelect={(n) => select(sel === n ? null : n)} />
        </Suspense>
        {config.illustrative && (
          <p className="xp-badge"><Info size={13} /> <span className="xp-long">Ilustração: componentes internos com forma e posição aproximadas. As fotos reais de cada unidade estão na página do produto.</span><span className="xp-short">Ilustração: peças internas aproximadas</span></p>
        )}
        <p className="xp-hint">Arraste para girar · pinça ou roda para aproximar · toque numa peça</p>
      </div>

      <div className="xp-panel">
        <div className="xp-row">
          <label className="xp-slider">
            <span>Desmontagem <strong>{pct}%</strong></span>
            <input
              type="range" min={0} max={100} value={pct}
              onChange={(e) => { tween.current?.kill(); const v = Number(e.target.value); setPct(v); state.current.progress = v / 100 }}
              aria-label="Desmontagem de 0 a 100%"
            />
          </label>
          <div className="xp-actions">
            <button className="xp-btn" onClick={() => animateTo(1)}><Layers size={15} /> Desmontar</button>
            <button className={`xp-btn ${lens ? 'is-on' : ''}`} onClick={toggleLens} aria-pressed={lens}><Camera size={15} /> Câmeras</button>
            <button className="xp-btn" onClick={() => { select(null); animateTo(0) }}><RotateCcw size={15} /> Remontar</button>
          </div>
        </div>

        <div className="xp-parts" role="listbox" aria-label="Componentes">
          {items.map((p) => (
            <button key={p.node} role="option" aria-selected={selected?.label === p.label} className={`xp-chip ${selected?.label === p.label ? 'is-on' : ''}`} onClick={() => select(selected?.label === p.label ? null : p.node)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="xp-info" aria-live="polite">
          {selected ? (
            <>
              <strong>{selected.label}</strong>
              <span>{selected.desc}</span>
            </>
          ) : lens ? (
            <ul className="xp-cams">
              {config.cameras.map((c) => <li key={c.title}><strong>{c.title}</strong><span>{c.text}</span></li>)}
            </ul>
          ) : (
            <span className="muted">Selecione um componente para ver a explicação.</span>
          )}
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}
