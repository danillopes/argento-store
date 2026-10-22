import { useLayoutEffect, useMemo, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform } from 'framer-motion'
import PhoneArt from '../components/PhoneArt'
import { FAMILIES, MODELS, type PhoneModel } from '../data/models'
import { gsap } from '../lib/motion'
import { useExpandNav } from '../lib/motion'
import { useStore } from '../store/Store'
import { brl, summarize } from '../lib/utils'

const FAMILY_COPY: Record<number, string> = {
  12: 'Bordas retas e MagSafe estreiam na linha.',
  13: 'Mais bateria e Modo Cinema.',
  14: 'Dynamic Island chega aos Pro.',
  15: 'USB-C e titânio nos Pro.',
  16: 'Controle da Câmera e Apple Intelligence.',
  17: 'iPhone Air e o novo platô de câmeras.',
  18: 'A20 Pro e modem C2.',
}

function flagship(f: number): PhoneModel {
  const fam = MODELS.filter((m) => m.family === f)
  return fam.find((m) => m.tier === 'pro') ?? fam[fam.length - 1]
}

// Cartão com inclinação 3D que acompanha o ponteiro
function TiltCard({ children, className, onClick, label }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent<HTMLElement>) => void; label: string }) {
  const mx = useMotionValue(0), my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 20 })
  return (
    <motion.button
      className={className}
      aria-label={label}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width - 0.5)
        my.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onPointerLeave={() => { mx.set(0); my.set(0) }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

// ---------- 1. Rolagem horizontal com parallax ----------
export function HorizontalGallery() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const expand = useExpandNav()
  const { inventory, available } = useStore()
  const sums = useMemo(() => summarize(inventory, available), [inventory, available])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = track.current!
        const dist = () => el.scrollWidth - window.innerWidth
        const tween = gsap.to(el, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${dist()}`, scrub: 0.8, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
        })
        // parallax: camadas próximas e distantes
        gsap.utils.toArray<HTMLElement>('.hg-card').forEach((card) => {
          const near = card.querySelector('.par-near'), far = card.querySelector('.par-far'), num = card.querySelector('.hg-num')
          const st = { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
          if (near) gsap.fromTo(near, { xPercent: 22 }, { xPercent: -22, ease: 'none', scrollTrigger: st })
          if (far) gsap.fromTo(far, { xPercent: -10 }, { xPercent: 10, ease: 'none', scrollTrigger: st })
          if (num) gsap.fromTo(num, { xPercent: 40 }, { xPercent: -40, ease: 'none', scrollTrigger: st })
          gsap.fromTo(card, { rotateY: -14 }, { rotateY: 14, ease: 'none', scrollTrigger: st })
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="hg" ref={root} aria-label="Galeria por geração">
      <div className="hg-track" ref={track}>
        <div className="hg-intro">
          <p className="eyebrow">Motion Gallery</p>
          <h2 className="display-2">Sete gerações<br />num só corredor.</h2>
          <p className="lead">Continue rolando: os aparelhos deslizam para o lado. Clique para abrir o configurador.</p>
        </div>
        {FAMILIES.map((f) => {
          const m = flagship(f)
          const fam = MODELS.filter((x) => x.family === f)
          const min = sums.filter((s) => s.model.family === f && s.minPrice != null).map((s) => s.minPrice!)
          const c1 = m.colors[0].hex, c2 = m.colors[Math.min(1, m.colors.length - 1)].hex
          return (
            <div key={f} className="hg-card">
            <TiltCard className="hg-card-in" label={`Abrir ${m.name}`} onClick={(e) => expand(e, `/produto/${m.id}`, c2)}>
              <span className="hg-num" aria-hidden>{f}</span>
              <div className="hg-art">
                <PhoneArt model={m} hex={c2} view="front" className="par-far" />
                <PhoneArt model={m} hex={c1} view="back" className="par-near" />
              </div>
              <div className="hg-info">
                <strong>iPhone {f}</strong>
                <span>{FAMILY_COPY[f]}</span>
                <small>{fam.map((x) => x.name.replace(`iPhone ${f}`, '').trim() || 'padrão').join(' · ')}</small>
                <em>{min.length ? `a partir de ${brl(Math.min(...min))}` : 'Em breve'}</em>
              </div>
            </TiltCard>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------- 2. Galeria infinita arrastável ----------
export function InfiniteGallery({ reverse = false, speed = 40 }: { reverse?: boolean; speed?: number }) {
  const { inventory, available } = useStore()
  const expand = useExpandNav()
  const items = useMemo(() => {
    const s = summarize(inventory, available)
    const list = s.flatMap((x) => x.model.colors.slice(0, 2).map((c) => ({ s: x, c })))
    return reverse ? list.reverse() : list
  }, [inventory, available, reverse])
  const x = useMotionValue(0)
  const rowRef = useRef<HTMLDivElement>(null)
  const st = useRef({ drag: false, last: 0, vel: 0, moved: 0, hover: false })
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  useAnimationFrame((_, dt) => {
    const el = rowRef.current
    if (!el) return
    const half = el.scrollWidth / 2
    const s = st.current
    if (!s.drag) {
      const base = reduce ? 0 : (reverse ? 1 : -1) * speed * (s.hover ? 0.25 : 1)
      s.vel *= 0.94
      x.set(x.get() + (base + s.vel) * (dt / 1000))
    }
    let v = x.get()
    if (v <= -half) v += half
    if (v > 0) v -= half
    x.set(v)
  })

  return (
    <div
      className="ig"
      onPointerEnter={() => (st.current.hover = true)}
      onPointerLeave={() => { st.current.hover = false; st.current.drag = false }}
      onPointerDown={(e) => {
        st.current.drag = true
        st.current.last = e.clientX
        st.current.moved = 0
        st.current.vel = 0
      }}
      onPointerMove={(e) => {
        const s = st.current
        if (!s.drag) return
        const dx = e.clientX - s.last
        s.last = e.clientX
        s.moved += Math.abs(dx)
        s.vel = dx * 60
        x.set(x.get() + dx)
      }}
      onPointerUp={() => (st.current.drag = false)}
    >
      <motion.div className="ig-row" ref={rowRef} style={{ x }}>
        {[0, 1].map((k) =>
          items.map(({ s, c }, i) => (
            <motion.button
              key={`${k}-${i}`}
              className="ig-item"
              aria-hidden={k === 1}
              tabIndex={k === 1 ? -1 : 0}
              whileHover={{ scale: 1.08, y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              onClick={(e) => {
                if (st.current.moved > 6) return
                expand(e, `/produto/${s.model.id}`, c.hex)
              }}
            >
              <PhoneArt model={s.model} hex={c.hex} view={i % 3 === 0 ? 'front' : 'back'} className="ig-art" />
              <span className="ig-label">
                <strong>{s.model.name}</strong>
                <small>{c.name}{s.minPrice != null ? ` · ${brl(s.minPrice)}` : ''}</small>
              </span>
            </motion.button>
          )),
        )}
      </motion.div>
    </div>
  )
}

// ---------- 3. Galeria em camadas ----------
const LAYERS = [
  { title: 'Titânio, alumínio e vidro.', text: 'Do aço inoxidável dos 12 Pro ao alumínio unibody dos 17 Pro — materiais que você sente na mão.', model: 'iphone-16-pro', colors: ['#bfa48f', '#c2bcb2', '#3c3c3d'], dark: false },
  { title: 'Cada cor, uma unidade real.', text: 'Selecione uma cor e veja somente os aparelhos daquela cor que estão no nosso estoque agora.', model: 'iphone-17', colors: ['#9fb6cf', '#b5c4a5', '#d8c9e6'], dark: false },
  { title: 'Laranja-cósmico, Azul-profundo.', text: 'Os acabamentos mais recentes da linha Pro, novos e lacrados, com nota fiscal emitida pela loja.', model: 'iphone-17-pro-max', colors: ['#e0702b', '#2d3a55', '#e4e4e2'], dark: true },
]

export function LayeredGallery() {
  const root = useRef<HTMLElement>(null)
  const expand = useExpandNav()
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.layer')
        cards.forEach((card, i) => {
          if (i === cards.length - 1) return
          gsap.to(card, {
            scale: 0.9 - (cards.length - i) * 0.015,
            filter: 'brightness(0.75)',
            ease: 'none',
            scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 90px', scrub: true },
          })
        })
        cards.forEach((card) => {
          const arts = card.querySelectorAll('.layer-art svg')
          gsap.fromTo(arts, { y: (j) => 80 + j * 40, rotate: (j) => (j - 1) * 8 }, { y: 0, rotate: (j) => (j - 1) * 4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 30%', scrub: true } })
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])
  return (
    <section className="layers" ref={root} aria-label="Galeria em camadas">
      {LAYERS.map((l, i) => {
        const m = MODELS.find((x) => x.id === l.model)!
        return (
          <article key={i} className={`layer ${l.dark ? 'is-dark' : ''}`} style={{ top: `${84 + i * 14}px`, zIndex: i + 1 }}>
            <div className="layer-copy">
              <p className="eyebrow">{m.name}</p>
              <h3 className="display-3">{l.title}</h3>
              <p className="lead">{l.text}</p>
              <button className="btn btn-primary" onClick={(e) => expand(e, `/produto/${m.id}`, l.colors[0])}>Configurar</button>
            </div>
            <div className="layer-art">
              {l.colors.map((c, j) => (
                <PhoneArt key={c} model={m} hex={c} view={j === 1 ? 'front' : 'back'} />
              ))}
            </div>
          </article>
        )
      })}
    </section>
  )
}
