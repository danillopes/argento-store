// Visualizador de desmontagem (Exploded View) reutilizável.
// Lê um GLB com um nó por peça e desloca cada peça no eixo da espessura conforme o progresso (0 = montado,
// 1 = desmontado). Tudo é interpolado a cada quadro a partir de refs, então rolar para cima remonta
// exatamente pelo mesmo caminho. Usado no modal "Explorar por dentro" e na seção da página inicial.
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { CachedModelLoader } from '../../lib/model-loader'
import type { ExplodeConfig, ExplodePart } from '../../data/explode-config'

import type { ExplodeState } from './state'
export { newExplodeState, type ExplodeState } from './state'

const UNITS = 2.9 / 0.1467 // mesma escala física dos outros visualizadores (iPhone 12 = 2,9 unidades)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface PartRuntime { obj: THREE.Object3D; cfg: ExplodePart; baseY: number; mats: { m: THREE.MeshStandardMaterial; opacity: number; blend: boolean }[] }

function Model({ config, state, onSelect, tint }: { config: ExplodeConfig; state: MutableRefObject<ExplodeState>; onSelect?: (node: string) => void; tint?: string }) {
  const gltf = useLoader(CachedModelLoader, config.url)
  const smooth = useRef({ p: 0, l: 0 })
  const data = useMemo(() => {
    const root = gltf.scene.clone(true)
    const byName = new Map(config.parts.map((p) => [p.node, p]))
    const parts: PartRuntime[] = []
    root.traverse((o) => {
      const cfg = byName.get(o.name)
      if (!cfg) return
      const mats: PartRuntime['mats'] = []
      o.traverse((m) => {
        if (!(m instanceof THREE.Mesh)) return
        const clone = (mat: THREE.Material) => {
          const c = mat.clone() as THREE.MeshStandardMaterial
          // cor escolhida no produto: moldura e traseira (vidro brilhante, como no iPhone 12)
          if (tint && (c.name === 'Anodized aluminum' || c.name === 'Frosted glass')) {
            c.color.set(tint)
            if (c.name === 'Frosted glass') { c.roughness = 0.1; c.metalness = 0.05 }
            else { c.color.offsetHSL(0, -0.04, -0.04); c.metalness = 0.75; c.roughness = 0.36 }
          }
          mats.push({ m: c, opacity: c.opacity, blend: c.transparent })
          return c
        }
        m.material = Array.isArray(m.material) ? m.material.map(clone) : clone(m.material)
        m.userData.part = cfg.node
      })
      parts.push({ obj: o, cfg, baseY: o.position.y, mats })
    })
    const wrap = new THREE.Group()
    wrap.add(root)
    wrap.scale.setScalar(UNITS)
    return { wrap, parts }
  }, [gltf, config, tint])

  useEffect(() => () => { data.parts.forEach((p) => p.mats.forEach(({ m }) => m.dispose())) }, [data])

  useFrame((_, dt) => {
    const s = state.current
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.09)
    smooth.current.p += (s.progress - smooth.current.p) * k
    smooth.current.l += (s.lens - smooth.current.l) * k
    const e = ease(Math.min(1, Math.max(0, smooth.current.p)))
    const l = ease(Math.min(1, Math.max(0, smooth.current.l)))
    const sel = s.selected
    const selLabel = sel ? config.parts.find((p) => p.node === sel)?.label : null
    for (const part of data.parts) {
      const { cfg } = part
      let y = part.baseY + (cfg.offset - config.center) * e
      if (cfg.group === 'camera') y += 0.008 * l * e
      if (cfg.lens !== undefined) y += (cfg.lens + 1) * 0.007 * l * e
      part.obj.position.y = y
      // destaque: peça selecionada (ou o conjunto de câmeras no foco) em evidência, demais esmaecem
      let target = 1
      if (selLabel) target = cfg.label === selLabel ? 1 : 0.14
      else if (l > 0.01 && cfg.group !== 'camera') target = 1 - 0.78 * l
      for (const mm of part.mats) {
        const want = mm.opacity * target
        const cur = mm.m.opacity + (want - mm.m.opacity) * k
        mm.m.opacity = cur
        const fading = cur < 0.995 * mm.opacity || mm.blend
        mm.m.transparent = fading
        mm.m.depthWrite = !fading || cur > 0.9
      }
    }
  })

  return (
    <primitive
      object={data.wrap}
      onClick={onSelect ? (e: { stopPropagation: () => void; object: THREE.Object3D }) => {
        e.stopPropagation()
        let o: THREE.Object3D | null = e.object
        while (o && !o.userData.part) o = o.parent
        if (o?.userData.part) onSelect(o.userData.part as string)
      } : undefined}
    />
  )
}

// Apresentação: gira o aparelho para que as camadas apareçam de lado (não de frente para o eixo da explosão)
function Presentation({ state, base, children }: { state: MutableRefObject<ExplodeState>; base: [number, number, number]; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.18)
    g.current.rotation.x += (base[0] - g.current.rotation.x) * k
    g.current.rotation.y += (base[1] + state.current.spin - g.current.rotation.y) * k
    g.current.rotation.z += (base[2] - g.current.rotation.z) * k
  })
  return <group ref={g}>{children}</group>
}

// Câmera virtual que aproxima o módulo de câmeras (seção da home)
function FocusRig({ config, state, far, presentation }: { config: ExplodeConfig; state: MutableRefObject<ExplodeState>; far: [number, number, number]; presentation: [number, number, number] }) {
  const { camera } = useThree()
  const smooth = useRef(0)
  const tmp = useMemo(() => ({ focus: new THREE.Vector3(), euler: new THREE.Euler(), look: new THREE.Vector3(), pos: new THREE.Vector3(), farV: new THREE.Vector3(...far) }), [far])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.12)
    smooth.current += (state.current.focus - smooth.current) * k
    const f = ease(Math.min(1, Math.max(0, smooth.current)))
    // ponto do módulo de câmera no mundo (modelo: +90° em X; peças de câmera afastadas para trás)
    const [fx, fz] = config.cameraFocus
    tmp.focus.set(fx * UNITS, -fz * UNITS, (0.026 + 0.012 - config.center) * UNITS)
    tmp.euler.set(presentation[0], presentation[1] + state.current.spin, presentation[2])
    tmp.focus.applyEuler(tmp.euler)
    tmp.look.set(0, 0, 0).lerp(tmp.focus, f)
    tmp.pos.copy(tmp.focus).add(new THREE.Vector3(0.9, 0.35, 2.1)).sub(tmp.farV).multiplyScalar(f).add(tmp.farV)
    camera.position.copy(tmp.pos)
    camera.lookAt(tmp.look)
  })
  return null
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 5, 7]} intensity={2.1} />
      <directionalLight position={[-5, 1.5, 4]} intensity={0.9} />
      {/* luz de recorte por trás: contorna as peças escuras sobre o fundo preto */}
      <directionalLight position={[-3, 4, -7]} intensity={2.4} color="#dfe6ff" />
      <directionalLight position={[5, -2, -6]} intensity={1.2} color="#ffffff" />
      <Environment resolution={128} environmentIntensity={1.25}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 0, 8]} scale={4} />
      </Environment>
    </>
  )
}

export function ExplodedCanvas({
  config, state, mode, onSelect, className, tint,
}: {
  tint?: string
  config: ExplodeConfig
  state: MutableRefObject<ExplodeState>
  mode: 'interactive' | 'scroll'
  onSelect?: (node: string) => void
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [lost, setLost] = useState(false)
  const lowPower = typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia('(max-width: 860px)').matches)
  const narrow = typeof window !== 'undefined' && window.innerWidth < 700
  // inclina o aparelho: as camadas ficam visíveis de lado
  const presentation: [number, number, number] = mode === 'scroll' ? [0.24, -1.02, 0.06] : [0.2, -0.98, 0.04]
  const far: [number, number, number] = narrow ? [0, 0.2, 11.2] : [0, 0.15, 9.4]

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (lost) return <div className="xp-fallback">O 3D foi pausado pelo navegador para economizar memória. Recarregue a página para ver de novo.</div>

  return (
    <div ref={wrap} className={className} style={{ position: 'absolute', inset: 0, touchAction: mode === 'interactive' ? 'none' : 'pan-y' }}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={lowPower ? [1, 1.25] : [1, 1.75]}
        camera={{ position: far, fov: 30 }}
        gl={{ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setLost(true) }, { once: true })
        }}
      >
        <Lights />
        <Suspense fallback={null}>
          <Presentation state={state} base={presentation}>
            <Model config={config} state={state} onSelect={onSelect} tint={tint} />
          </Presentation>
        </Suspense>
        {mode === 'interactive' ? (
          <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={narrow ? 4.5 : 3.4} maxDistance={narrow ? 14 : 11} rotateSpeed={0.8} zoomSpeed={0.8} />
        ) : (
          <FocusRig config={config} state={state} far={far} presentation={presentation} />
        )}
      </Canvas>
    </div>
  )
}

export default ExplodedCanvas
