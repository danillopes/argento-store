// Faixa de lançamento do iPhone 18 Pro: o par de fotos e o close do módulo das câmeras vão surgindo conforme a
// pessoa rola, presos ao progresso da rolagem (scrub) como o resto da página.
import { useLayoutEffect, useRef } from 'react'
import { gsap, useExpandNav } from '../lib/motion'
import { MODELS } from '../data/models'

const MODELO = MODELS.find((m) => m.id === 'iphone-18-pro')!
const COR = MODELO.colors.find((c) => c.id === 'borgonha')!
const BASE = import.meta.env.BASE_URL

function Arte({ nome, larguras, alt, sizes, className }: { nome: string; larguras: number[]; alt: string; sizes: string; className: string }) {
  const conjunto = (ext: string) => larguras.map((w) => `${BASE}lancamento/${nome}-${w}.${ext} ${w}w`).join(', ')
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={conjunto('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={conjunto('webp')} sizes={sizes} />
      <img src={`${BASE}lancamento/${nome}-${larguras[0]}.webp`} alt={alt} loading="lazy" decoding="async" draggable={false} />
    </picture>
  )
}

export default function Lancamento() {
  const root = useRef<HTMLElement>(null)
  const expand = useExpandNav()

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // entram de baixo e de longe enquanto a seção sobe pela tela; voltam igual ao rolar para cima
        const comum = { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: true as const }
        gsap.fromTo('.lanc-par', { yPercent: 16, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'none', scrollTrigger: comum })
        gsap.fromTo('.lanc-modulo', { yPercent: 46, xPercent: -8, scale: 0.86, autoAlpha: 0 },
          { yPercent: 0, xPercent: 0, scale: 1, autoAlpha: 1, ease: 'none', scrollTrigger: { ...comum, end: 'top 10%' } })
        gsap.fromTo('.lanc-copy > *', { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.12, ease: 'none', scrollTrigger: comum })
        // depois de montada, as duas peças seguem em velocidades diferentes: dá profundidade ao conjunto
        gsap.fromTo('.lanc-modulo', { yPercent: 0 }, { yPercent: -14, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 25%', end: 'bottom top', scrub: true } })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="lanc" ref={root} aria-label={`Lançamento ${MODELO.name}`}>
      <div className="lanc-in">
        <div className="lanc-copy">
          <p className="eyebrow">Lançamento</p>
          <h2 className="display-2">{MODELO.name}.<br />Em {COR.name.toLowerCase()}.</h2>
          <p className="lead">
            Chip {MODELO.chip}, câmera {MODELO.cameras.toLowerCase()} e tela de {String(MODELO.screen).replace('.', ',')}". Novo, lacrado e com nota fiscal
            emitida pela loja.
          </p>
          <button className="btn btn-primary" onClick={(e) => expand(e, `/produto/${MODELO.id}`, COR.hex)}>Configurar</button>
        </div>
        <div className="lanc-art">
          <Arte nome="18-pro-par" larguras={[600, 876]} sizes="(max-width: 860px) 70vw, 34vw" className="lanc-par" alt={`${MODELO.name} ${COR.name}, frente e traseira`} />
          <Arte nome="18-pro-modulo" larguras={[420, 530]} sizes="(max-width: 860px) 42vw, 19vw" className="lanc-modulo" alt={`Módulo de câmeras do ${MODELO.name}`} />
        </div>
      </div>
    </section>
  )
}
