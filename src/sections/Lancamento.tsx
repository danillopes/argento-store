// Faixa de lançamento do iPhone 18 Pro: o par de fotos e o close do módulo das câmeras vão surgindo conforme a
// pessoa rola, presos ao progresso da rolagem (scrub) como o resto da página.
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useExpandNav } from '../lib/motion'
import { MODELS } from '../data/models'

const MODELO = MODELS.find((m) => m.id === 'iphone-18-pro')!
const COR = MODELO.colors.find((c) => c.id === 'borgonha')!
const BASE = import.meta.env.BASE_URL

// `tamanho` é a medida original da arte: sem ela o navegador não reserva a altura da imagem, a página cresce quando
// a foto chega e o ScrollTrigger recalcula tudo no meio da rolagem — é o tranco que aparecia no celular.
function Arte({ nome, larguras, alt, sizes, className, tamanho }: { nome: string; larguras: number[]; alt: string; sizes: string; className: string; tamanho: [number, number] }) {
  const conjunto = (ext: string) => larguras.map((w) => `${BASE}lancamento/${nome}-${w}.${ext} ${w}w`).join(', ')
  return (
    <picture className={className} style={{ aspectRatio: `${tamanho[0]} / ${tamanho[1]}` }}>
      <source type="image/avif" srcSet={conjunto('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={conjunto('webp')} sizes={sizes} />
      <img src={`${BASE}lancamento/${nome}-${larguras[0]}.webp`} alt={alt} width={tamanho[0]} height={tamanho[1]} loading="lazy" decoding="async" draggable={false} />
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
        gsap.fromTo('.lanc-copy > *', { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.12, ease: 'none', scrollTrigger: comum })
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
          <div className="row gap">
            <button className="btn btn-primary" onClick={(e) => expand(e, `/produto/${MODELO.id}`, COR.hex)}>Configurar</button>
            <Link className="btn btn-ghost" to="/lancamento">Saiba mais</Link>
          </div>
        </div>
        <div className="lanc-art">
          <Arte nome="18-pro-par" larguras={[600, 876]} sizes="(max-width: 860px) 70vw, 34vw" className="lanc-par" tamanho={[876, 1608]} alt={`${MODELO.name} ${COR.name}, frente e traseira`} />
        </div>
      </div>
    </section>
  )
}
