// "A tecnologia por dentro." — desmontagem controlada pela rolagem (Exploded View + ScrollTrigger).
// Etapas: apresentação → desmontagem progressiva → conjunto aberto.
// Tudo deriva do progresso da rolagem, então rolar para cima remonta pelo mesmo caminho.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/motion'
import { explodeFor } from '../data/explode-config'
import { newExplodeState } from '../components/exploded/state'
import { insideScrollPose } from '../lib/inside-scroll'

const ExplodedCanvas = lazy(() => import('../components/exploded/ExplodedPhone'))

const MODEL_ID = 'iphone-17-pro'
const TINT = '#d9d9d6' // iPhone 17 Pro prateado: contraste com o fundo preto
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ramp = (p: number, a: number, b: number) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t) }
const band = (p: number, a: number, b: number, c: number, d: number) => ramp(p, a, b) * (1 - ramp(p, c, d))

export default function InsideTech() {
  const config = explodeFor(MODEL_ID)!
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const txt = useRef<Record<string, HTMLElement | null>>({})
  const state = useRef(newExplodeState())
  const [mount3D, setMount3D] = useState(false)

  // só carrega o 3D quando a seção se aproxima da tela
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMount3D(true); io.disconnect() } }, { rootMargin: '900px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      const show = (key: string, v: number) => {
        const el = txt.current[key]
        if (!el) return
        el.style.opacity = String(v)
        el.style.transform = `translate3d(0, ${(1 - v) * 24}px, 0)`
        el.style.visibility = v < 0.01 ? 'hidden' : 'visible'
      }
      const apply = (p: number) => {
        Object.assign(state.current,insideScrollPose(p))
        show('intro', 1 - ramp(p, 0.13, 0.2))
        show('explode', band(p, 0.24, 0.3, 0.52, 0.58))
        show('cams', band(p, 0.61, 0.67, 0.78, 0.84))
        show('final', ramp(p, 0.88, 0.95))
      }
      mm.add({ reduce: '(prefers-reduced-motion: reduce)', desk: '(min-width: 861px)', mob: '(max-width: 860px)' }, (c) => {
        const { reduce, desk } = c.conditions as { reduce: boolean; desk: boolean }
        if (reduce) {
          // alternativa estática: aparelho desmontado, todos os textos visíveis, sem prender a rolagem
          Object.assign(state.current, { progress: 0.75, lens: 0, focus: 0, spin: 0 })
          for (const k of Object.keys(txt.current)) show(k, 1)
          return
        }
        apply(0)
        const st = gsap.timeline({
          scrollTrigger: {
            trigger: root.current, start: 'top top', end: desk ? '+=420%' : '+=340%',
            pin: stage.current, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: (self) => apply(self.progress),
            onRefresh: (self) => apply(self.progress),
          },
        })
        return () => { st.scrollTrigger?.kill(); st.kill() }
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="it" ref={root} aria-label="A tecnologia por dentro">
      <div className="it-stage" ref={stage}>
        <div className="it-canvas">
          {mount3D && (
            <Suspense fallback={<div className="it-loading">Carregando peças em 3D…</div>}>
              <ExplodedCanvas config={config} state={state} tint={TINT} mode="scroll" />
            </Suspense>
          )}
        </div>

        <div className="it-copy it-intro" ref={(el) => { txt.current.intro = el }}>
          <p className="eyebrow">Por dentro do iPhone 17 Pro</p>
          <h2 className="display-2">A tecnologia<br />por dentro.</h2>
          <p className="lead">Cada detalhe. Cada componente. Descubra a engenharia por trás do seu próximo iPhone.</p>
        </div>

        <div className="it-copy it-step" ref={(el) => { txt.current.explode = el }}>
          <p className="eyebrow">Desmontagem</p>
          <h3 className="display-3">Camada por camada.</h3>
          <p className="lead">Continue rolando e descubra uma nova perspectiva.</p>
        </div>

        <div className="it-copy it-step it-cams" ref={(el) => { txt.current.cams = el }}>
          <p className="eyebrow">De dentro para fora</p>
          <h3 className="display-3">Tudo em perspectiva.</h3>
        </div>

        <div className="it-copy it-final" ref={(el) => { txt.current.final = el }}>
          <h3 className="display-3">Um novo olhar.<br />Por dentro.</h3>
        </div>

        {config.illustrative && <p className="it-note">Reconstrução visual · medidas internas estimadas.</p>}
      </div>
    </section>
  )
}
