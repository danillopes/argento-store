import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import Phone3D, { defaultDrive, type Drive } from '../components/Phone3D'
import { gsap } from '../lib/motion'
import { MODELS } from '../data/models'
import { useStore } from '../store/Store'

const PALETTE = ['#c2bcb2', '#2d3a55', '#e0702b', '#6b1f2e', '#b9d0e4', '#e4e4e2']

export default function Scrolly() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const drive = useRef<Drive>({ ...defaultDrive(), color: PALETTE[0] })
  const { theme } = useStore()

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add(
        { desk: '(min-width: 861px)', mob: '(max-width: 860px)', reduce: '(prefers-reduced-motion: reduce)' },
        (c) => {
          const { desk, reduce } = c.conditions as { desk: boolean; reduce: boolean }
          const d = drive.current
          const dark = theme === 'dark'
          const light1 = dark ? '#000000' : '#f5f5f7'
          const light2 = dark ? '#111214' : '#e9ebee'
          const ink = dark ? '#f5f5f7' : '#1d1d1f'
          gsap.set(stage.current, { backgroundColor: light1, color: ink })
          const side = desk ? 1.35 : 0
          const mobY = desk ? 0 : 0.85
          Object.assign(d, { rotY: -0.35, rotX: 0.08, rotZ: 0, x: desk ? 1.45 : 0, y: mobY, scale: desk ? 1 : 0.6 })

          if (reduce) {
            gsap.set('.ch', { autoAlpha: 1, position: 'relative', y: 0 })
            return
          }

          // entrada
          gsap.from(d, { y: -4, rotY: -1.6, duration: 1.6, ease: 'expo.out' })
          gsap.from('.ch-0 > *', { y: 30, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'power3.out', delay: 0.2 })

          const col = { t: 0 }
          const a = new THREE.Color(), b = new THREE.Color(), out = new THREE.Color()
          const tl = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: { trigger: root.current, start: 'top top', end: '+=480%', scrub: 1, pin: stage.current, anticipatePin: 1 },
          })

          // 1 — traseira + aproximação nas câmeras
          tl.to('.ch-0', { autoAlpha: 0, y: -40, duration: 0.6 }, 0.2)
            .to(d, { rotY: Math.PI, rotX: 0, scale: desk ? 1.6 : 0.85, y: desk ? -0.55 : 0.75, x: desk ? -1 : 0, duration: 1.4 }, 0.2)
            .to(stage.current, { backgroundColor: '#0a0a0b', color: '#f5f5f7', duration: 1 }, 0.4)
            .fromTo('.ch-1', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.2)
            // 2 — lateral: bordas e acabamento
            .to('.ch-1', { autoAlpha: 0, y: -40, duration: 0.5 }, 2.3)
            .to(d, { rotY: Math.PI * 1.5, rotZ: 0.12, scale: desk ? 1.15 : 0.7, y: mobY, x: desk ? side * 0.6 : 0, duration: 1.3 }, 2.3)
            .fromTo('.ch-2', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 3.1)
            // 3 — frente: tela e bateria, deslocamento lateral
            .to('.ch-2', { autoAlpha: 0, y: -40, duration: 0.5 }, 4.1)
            .to(d, { rotY: Math.PI * 2 - 0.25, rotZ: 0, x: -side, scale: desk ? 1.05 : 0.6, duration: 1.3 }, 4.1)
            .to(stage.current, { backgroundColor: light2, color: ink, duration: 1 }, 4.3)
            .fromTo('.ch-3', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 4.9)
            .fromTo('.batt-fill', { scaleX: 0 }, { scaleX: 0.97, duration: 0.9, ease: 'power1.out' }, 5.0)
            .fromTo('.batt-num', { innerText: 0 }, { innerText: 97, snap: { innerText: 1 }, duration: 0.9, ease: 'power1.out' }, 5.0)
            // 4 — giro completo e troca de cores
            .to('.ch-3', { autoAlpha: 0, y: -40, duration: 0.5 }, 6.1)
            .to(d, { rotY: Math.PI * 3, x: desk ? 1.45 : 0, y: desk ? 0 : mobY, scale: desk ? 0.95 : 0.6, duration: 1.6 }, 6.1)
            .to(stage.current, { backgroundColor: light1, duration: 1 }, 6.2)
            .to(col, {
              t: PALETTE.length - 1,
              duration: 2,
              ease: 'none',
              onUpdate: () => {
                const i = Math.min(PALETTE.length - 2, Math.floor(col.t))
                a.set(PALETTE[i]); b.set(PALETTE[i + 1])
                out.lerpColors(a, b, col.t - i)
                d.color = '#' + out.getHexString()
              },
            }, 6.3)
            .fromTo('.ch-4', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 6.9)
            .to({}, { duration: 0.8 })
          tl.to('.scrolly-progress i', { scaleY: 1, ease: 'none', duration: tl.duration() }, 0)
        },
      )
    }, root)
    return () => ctx.revert()
  }, [theme])

  return (
    <section className="scrolly" ref={root} aria-label="Apresentação">
      <div className="scrolly-stage" ref={stage}>
        <div className="scrolly-canvas">
          <Phone3D drive={drive} cam="plateau" glb={['iphone-17-pro', 'iphone-16-pro']} />
        </div>

        <div className="ch ch-0">
          <p className="eyebrow">Showroom Argento</p>
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
            <strong><span className="batt-num">97</span>%</strong>
          </div>
          <p className="lead">Um aparelho com 97% é anunciado com 97%. Cada unidade mostra o número exato medido no iOS.</p>
        </div>

        <div className="ch ch-4">
          <p className="eyebrow">Catálogo</p>
          <h2 className="display-2">{MODELS.length} modelos.<br />Todas as cores.</h2>
          <p className="lead">Do iPhone 12 mini ao iPhone 18 Pro Max. Role para entrar no showroom.</p>
        </div>

        <div className="scrolly-progress" aria-hidden><i /></div>
      </div>
    </section>
  )
}
