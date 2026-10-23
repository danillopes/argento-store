import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { defaultDrive, type Drive } from '../components/drive'
import { advanceScene, advanceColor, batteryPercent } from '../lib/scene-motion'

const Phone3D = lazy(() => import('../components/Phone3D'))
import { gsap, ScrollTrigger } from '../lib/motion'
import { MODELS } from '../data/models'

const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * t)
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')
}

const PALETTE = ['#e0702b', '#2d3a55', '#e4e4e2']

export default function Scrolly() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const battery = useRef<HTMLSpanElement>(null)
  const drive = useRef<Drive>({ ...defaultDrive(), color: PALETTE[0] })

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add(
        { desk: '(min-width: 861px)', mob: '(max-width: 860px)', reduce: '(prefers-reduced-motion: reduce)' },
        (c) => {
          const { desk, reduce } = c.conditions as { desk: boolean; reduce: boolean }
          const d = drive.current
          const dark = stage.current!.querySelector('.scrolly-dark')
          const canvas = stage.current!.querySelector('.scrolly-canvas')
          gsap.set(dark, { opacity: 0 })
          gsap.set(canvas, { autoAlpha: 1 })
          gsap.set('.ch', { y: 0, yPercent: desk ? -50 : 0 })
          if (!desk) gsap.set('.ch-0', { yPercent: -50 })
          const side = desk ? 1.35 : 0
          Object.assign(d, { rotY: -0.35, rotX: 0.08, rotZ: 0, x: desk ? 1.45 : 0, y: 0, scale: desk ? 1 : 0.9, color: PALETTE[0] })

          if (battery.current) battery.current.textContent = reduce ? '97' : '0'
          if (reduce) {
            gsap.set('.ch', { autoAlpha: 1, position: 'relative', y: 0, yPercent: 0 })
            if (!desk) {
              const reveal = ScrollTrigger.create({ trigger: root.current, start: 'top -40px', onEnter: () => gsap.set(canvas, { autoAlpha: 1 }), onLeaveBack: () => gsap.set(canvas, { autoAlpha: 0 }) })
              return () => reveal.kill()
            }
            return
          }

          // entrada
          gsap.from('.ch-0 > *', { y: 30, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'power3.out', delay: 0.2 })

          const col = { t: 0 }
          let colorPosition = 0
          const updateColor = () => {
            const i = Math.min(PALETTE.length - 2, Math.floor(colorPosition))
            d.color = mixHex(PALETTE[i], PALETTE[i + 1], colorPosition - i)
          }
          const tl = gsap.timeline({
            paused: true,
            defaults: { ease: 'power2.inOut' },
          })

          // 1 — traseira + aproximação nas câmeras
          tl.to('.ch-0', { autoAlpha: 0, y: -40, duration: 0.6 }, 0.2)
            .to(d, { rotY: Math.PI, rotX: 0, scale: desk ? 1.4 : 1.02, y: desk ? -0.65 : 0, x: desk ? -1 : 0, duration: 1.4 }, 0.2)
            .to(dark, { opacity: 1, duration: 1 }, 0.4)
            .fromTo('.ch-1', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.2)
            // 2 — lateral: bordas e acabamento
            .to('.ch-1', { autoAlpha: 0, y: -40, duration: 0.5 }, 2.3)
            .to(d, { rotY: Math.PI * 1.5, rotZ: 0.08, scale: desk ? 1.05 : 0.93, y: 0, x: desk ? side * 0.6 : 0, duration: 1.3 }, 2.3)
            .fromTo('.ch-2', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 3.1)
            // 3 — frente: tela e bateria, deslocamento lateral
            .to('.ch-2', { autoAlpha: 0, y: -40, duration: 0.5 }, 4.1)
            .to(d, { rotY: Math.PI * 2 - 0.25, rotZ: 0, x: -side, scale: desk ? 1 : 0.9, duration: 1.3 }, 4.1)
            .to(dark, { opacity: 0, duration: 1 }, 4.3)
            .fromTo('.ch-3', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 4.9)
            .fromTo('.batt-fill', { scaleX: 0 }, { scaleX: 0.97, duration: 0.9, ease: 'none' }, 5.0)
            // 4 — giro completo e troca de cores
            .to('.ch-3', { autoAlpha: 0, y: -40, duration: 0.5 }, 6.1)
            .to(d, { rotY: Math.PI * 3, x: desk ? 1.45 : 0, y: 0, scale: desk ? 0.95 : 0.9, duration: 1.6 }, 6.1)
            // Mantém cada acabamento à vista e faz cada troca em ~3,4 segundos.
            .to(col, { t: 1, duration: 2.2, ease: 'power1.inOut' }, 8)
            .to(col, { t: 2, duration: 2.2, ease: 'power1.inOut' }, 11.2)
            .fromTo('.ch-4', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 6.9)
            .to({}, { duration: 0.8 })
          tl.to('.scrolly-progress i', { scaleY: 1, ease: 'none', duration: tl.duration() }, 0)

          // O tempo extra pertence às cores; as cenas anteriores mantêm o ritmo.

          const clock = { current: 0, target: 0 }
          const trigger = ScrollTrigger.create({
            trigger: stage.current, start: 'top top', end: () => `+=${480 * tl.duration() / 9.1}%`, pin: stage.current, anticipatePin: 1,
            onUpdate: self => { clock.target = self.progress },
            onRefresh: self => { clock.target = self.progress },
          })
          const tick = (_time: number, deltaMs: number) => {
            if (document.hidden) return
            clock.current = advanceScene(clock.current, clock.target, deltaMs / 1000)
            tl.progress(clock.current)
            colorPosition = advanceColor(colorPosition, col.t, deltaMs / 1000)
            updateColor()
            if (battery.current) battery.current.textContent = String(batteryPercent(tl.time()))
          }
          gsap.ticker.add(tick)
          return () => { gsap.ticker.remove(tick); trigger.kill(); tl.kill() }
        },
      )
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="scrolly" ref={root} aria-label="Apresentação">
      <div className="scrolly-mobile-intro">
        <p className="eyebrow">Showroom Argento · iPhone 17 Pro</p>
        <h1 className="display">Seu próximo iPhone,<br />escolhido unidade por unidade.</h1>
        <p className="lead">Novos e seminovos, com saúde de bateria real e fotos de cada aparelho.</p>
        <Link to="/iphones" className="btn btn-primary">Explorar iPhones</Link>
        <p className="lead">Role para conhecer o iPhone 17 Pro.</p>
      </div>
      <div className="scrolly-stage" ref={stage}>
        <div className="scrolly-dark" aria-hidden />
        <div className="scrolly-canvas">
          <Suspense fallback={null}>
            <Phone3D drive={drive} cam="plateau" glb={['iphone-17-pro']} />
          </Suspense>
        </div>

        <div className="ch ch-0">
          <p className="eyebrow">Showroom Argento · iPhone 17 Pro</p>
          <h1 className="display">Seu próximo iPhone,<br />escolhido unidade<br />por unidade.</h1>
          <p className="lead">Novos e seminovos do 12 ao 18 Pro, com saúde de bateria real, grau de conservação honesto e fotos de cada aparelho.</p>
          <div className="row gap">
            <Link to="/iphones" className="btn btn-primary">Explorar iPhones</Link>
            <Link to="/seminovos" className="btn btn-ghost">Ver seminovos</Link>
          </div>
          <span className="scroll-hint" aria-hidden>Role para girar</span>
        </div>

        <div className="ch ch-1">
          <p className="eyebrow">Inspeção</p>
          <h2 className="display-2">Câmeras testadas<br />lente por lente.</h2>
          <p className="lead">Foco, estabilização, flash e LiDAR verificados antes de cada anúncio. Se algo não estiver perfeito, está escrito na ficha.</p>
        </div>

        <div className="ch ch-2">
          <p className="eyebrow">Acabamento</p>
          <h2 className="display-2">Bordas, botões<br />e laterais à vista.</h2>
          <p className="lead">Classificação de A+ a C com critério público. Você vê exatamente o que recebe.</p>
        </div>

        <div className="ch ch-3">
          <p className="eyebrow">Bateria</p>
          <h2 className="display-2">Saúde real.<br />Nada arredondado.</h2>
          <div className="batt-demo" aria-label="Exemplo: 97% de saúde">
            <div className="batt-shell"><i className="batt-fill" /></div>
            <strong><span className="batt-num" ref={battery} />%</strong>
          </div>
          <p className="lead">Um aparelho com 97% é anunciado com 97%. Cada unidade mostra o número exato medido no iOS.</p>
        </div>

        <div className="ch ch-4">
          <p className="eyebrow">Catálogo</p>
          <h2 className="display-2">{MODELS.length} modelos.<br />Todas as cores.</h2>
          <p className="lead">Do iPhone 12 mini ao iPhone 18 Pro Max. Role para entrar no showroom.</p>
        </div>

        <Link className="scrolly-model-link" to="/produto/iphone-17-pro">Ver iPhone 17 Pro</Link>
        <div className="scrolly-progress" aria-hidden><i /></div>
      </div>
    </section>
  )
}
