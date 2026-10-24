// Página de apresentação do lançamento: iPhone 18 Pro. Tudo que é número sai de src/data/models.ts, então a página
// acompanha o catálogo sozinha. O que ainda não está confirmado aparece como "em verificação" (model.verify).
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useExpandNav } from '../lib/motion'
import { MODELS, type PhoneModel } from '../data/models'
import { brl } from '../lib/utils'

const BASE = import.meta.env.BASE_URL
const NOVO = MODELS.find((m) => m.id === 'iphone-18-pro')!
const ANTERIOR = MODELS.find((m) => m.id === 'iphone-17-pro')!
const RETRASADO = MODELS.find((m) => m.id === 'iphone-16-pro')!
const COR = NOVO.colors.find((c) => c.id === 'borgonha') ?? NOVO.colors[0]

function Arte({ nome, larguras, alt, sizes, className, priority = false }: { nome: string; larguras: number[]; alt: string; sizes: string; className: string; priority?: boolean }) {
  const conjunto = (ext: string) => larguras.map((w) => `${BASE}lancamento/${nome}-${w}.${ext} ${w}w`).join(', ')
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={conjunto('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={conjunto('webp')} sizes={sizes} />
      <img src={`${BASE}lancamento/${nome}-${larguras[0]}.webp`} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} draggable={false} />
    </picture>
  )
}

const polegadas = (v: number) => `${String(v).replace('.', ',')}"`
const gramas = (v: number | null) => (v == null ? '—' : `${v} g`)
const armazenamento = (m: PhoneModel) => m.storages.map((g) => (g >= 1024 ? `${g / 1024} TB` : `${g} GB`)).join(' · ')

export default function Lancamento18Pro() {
  const root = useRef<HTMLDivElement>(null)
  const expand = useExpandNav()

  // o que muda em relação à geração anterior, lido dos dados em vez de escrito à mão
  const mudancas = useMemo(() => {
    const itens: [string, string][] = []
    if (NOVO.chip !== ANTERIOR.chip) itens.push(['Chip', `${NOVO.chip}, no lugar do ${ANTERIOR.chip} do ${ANTERIOR.name}.`])
    itens.push(['Dynamic Island', 'Menor que a das gerações anteriores: 15,3 × 5,7 mm, contra 21 × 6 mm.'])
    for (const f of NOVO.features.filter((f) => !ANTERIOR.features.includes(f))) {
      itens.push([f, f === 'Modem C2' ? 'Modem de celular próprio da Apple.' : f === 'iOS 27' ? 'Sai de fábrica com a versão nova do sistema.' : 'Novidade desta geração.'])
    }
    itens.push(['Tela', `${polegadas(NOVO.screen)}, o mesmo tamanho do ${ANTERIOR.name}.`])
    return itens
  }, [])

  const linhas: [string, (m: PhoneModel) => string][] = [
    ['Ano', (m) => String(m.year)],
    ['Tela', (m) => polegadas(m.screen)],
    ['Chip', (m) => m.chip],
    ['Câmeras', (m) => m.cameras],
    ['Conector', (m) => m.connector],
    ['Peso', (m) => gramas(m.weight)],
    ['Armazenamento', (m) => armazenamento(m)],
    ['Cores', (m) => m.colors.map((c) => c.name).join(', ')],
    ['A partir de', (m) => brl(m.basePrice)],
  ]
  const comparados = [NOVO, ANTERIOR, RETRASADO]

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // a imagem do topo já nasce na tela: entra na abertura e depois acompanha a rolagem de leve
        gsap.from('.lp-faixa', { y: 40, scale: 0.94, autoAlpha: 0, duration: 1.1, ease: 'power3.out' })
        gsap.from('.lp-hero-copy > *', { y: 26, autoAlpha: 0, stagger: 0.09, duration: 0.8, ease: 'power3.out', delay: 0.15 })
        gsap.to('.lp-faixa', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true } })
        // daqui para baixo cada bloco surge preso ao progresso da rolagem
        for (const bloco of gsap.utils.toArray<HTMLElement>('.lp-rev')) {
          gsap.fromTo(bloco, { y: 56, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, ease: 'none',
            scrollTrigger: { trigger: bloco, start: 'top bottom-=60', end: 'top 62%', scrub: true },
          })
        }
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className="lp" ref={root}>
      <header className="lp-hero">
        <Arte nome="18-pro-faixa" larguras={[520, 800]} sizes="(max-width: 860px) 94vw, 820px" className="lp-faixa" priority alt={`${NOVO.name}`} />
        <div className="lp-hero-copy">
          <p className="eyebrow">Lançamento · {NOVO.year}</p>
          <h1 className="display">{NOVO.name}</h1>
          <p className="lead">
            Chip {NOVO.chip}, tela de {polegadas(NOVO.screen)} e câmera {NOVO.cameras.toLowerCase()}. Novo, lacrado e com nota fiscal emitida pela loja.
          </p>
          <div className="row gap">
            <button className="btn btn-primary" onClick={(e) => expand(e, `/produto/${NOVO.id}`, COR.hex)}>Configurar</button>
            <Link className="btn btn-ghost" to="/iphones">Ver todos os modelos</Link>
          </div>
        </div>
      </header>

      <section className="lp-bloco container lp-rev" aria-label="O que muda">
        <div className="lp-texto">
          <p className="eyebrow">Geração nova</p>
          <h2 className="h2">O que muda.</h2>
          <dl className="lp-lista">
            {mudancas.map(([t, d]) => (<div key={t}><dt>{t}</dt><dd>{d}</dd></div>))}
          </dl>
        </div>
        <Arte nome="18-pro-ios" larguras={[420, 697]} sizes="(max-width: 860px) 88vw, 44vw" className="lp-img" alt={`Telas do ${NOVO.name} com iOS 27`} />
      </section>

      <section className="lp-bloco container is-inv lp-rev" aria-label="Cores">
        <Arte nome="18-pro-cores" larguras={[460, 787]} sizes="(max-width: 860px) 88vw, 48vw" className="lp-img" alt={`${NOVO.name} nas ${NOVO.colors.length} cores`} />
        <div className="lp-texto">
          <p className="eyebrow">Acabamentos</p>
          <h2 className="h2">{NOVO.colors.length} cores.</h2>
          <p className="lead">Todas com o mesmo módulo de câmeras em relevo e a traseira fosca.</p>
          <div className="swatches-lg">
            {NOVO.colors.map((c) => (
              <span key={c.id} className="swl" aria-label={c.name}><span style={{ background: c.hex }} /><small>{c.name}</small></span>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-tabela container lp-rev" aria-label="Comparação entre gerações">
        <p className="eyebrow">Comparação</p>
        <h2 className="h2">Três gerações Pro.</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Especificação</th>{comparados.map((m) => <th key={m.id} scope="col">{m.name}</th>)}</tr>
            </thead>
            <tbody>
              {linhas.map(([rotulo, valor]) => (
                <tr key={rotulo}>
                  <th scope="row">{rotulo}</th>
                  {comparados.map((m) => <td key={m.id}>{valor(m)}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row">Recursos</th>
                {comparados.map((m) => <td key={m.id}>{m.features.join(' · ')}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        {NOVO.verify && <p className="note">Lançamento recente: as especificações do {NOVO.name} seguem em verificação com a documentação oficial.</p>}
        <p className="note">Preços demonstrativos, para o menor armazenamento, aparelho novo.</p>
      </section>

      <section className="lp-fim lp-rev">
        <h2 className="h2">Monte o seu.</h2>
        <p className="lead">Escolha cor e armazenamento e veja as unidades disponíveis agora.</p>
        <button className="btn btn-primary" onClick={(e) => expand(e, `/produto/${NOVO.id}`, COR.hex)}>Configurar {NOVO.name}</button>
      </section>
    </div>
  )
}
