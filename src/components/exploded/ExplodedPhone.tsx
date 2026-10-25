// Visualizador de desmontagem (Exploded View) reutilizável.
// Lê um GLB com um nó por peça e desloca cada peça no eixo da espessura conforme o progresso (0 = montado,
// 1 = desmontado). Tudo é interpolado a cada quadro a partir de refs, então rolar para cima remonta
// exatamente pelo mesmo caminho. Usado no modal "Explorar por dentro" e na seção da página inicial.
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { CachedModelLoader } from '../../lib/model-loader'
import { useRenderQuality, qualityDecline, qualityIncline, qualityFallback } from '../../lib/render-quality'
import { makeScreenEmissive } from '../../lib/screen-material'
import type { ExplodeConfig, ExplodePart } from '../../data/explode-config'
import StudioFinish from './StudioFinish'
import { inspectionNodesFor, makeInspectionGroup } from '../../lib/part-inspection'

import type { ExplodeState } from './state'
export { newExplodeState, type ExplodeState } from './state'

const UNITS = 2.9 / 0.1467 // mesma escala física dos outros visualizadores (iPhone 12 = 2,9 unidades)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function PartStudy({config,node}:{config:ExplodeConfig;node:string}) {
  const gltf=useLoader(CachedModelLoader,config.url)
  const size=useThree(s=>s.size)
  const data=useMemo(()=>makeInspectionGroup(gltf.scene,inspectionNodesFor(node),size.width/size.height),[gltf,node,size.width,size.height])
  useEffect(()=>()=>{data?.materials.forEach(m=>m.dispose())},[data])
  return data?<group rotation={[.12,node==='MainBoard'?Math.PI-.22:-.22,0]}><primitive object={data.group}/></group>:null
}

function ResetInspectionCamera({id,far}:{id:string|null;far:[number,number,number]}) {
  const camera=useThree(s=>s.camera)
  useEffect(()=>{camera.position.set(...far);camera.lookAt(0,0,0);camera.updateProjectionMatrix()},[camera,id,far[0],far[1],far[2]])
  return null
}

interface PartRuntime { obj: THREE.Object3D; cfg: ExplodePart; baseX: number; baseY: number; baseZ: number; mats: { m: THREE.MeshStandardMaterial; opacity: number; blend: boolean }[] }

function Model({ config, state, onSelect, tint, reduced }: { config: ExplodeConfig; state: MutableRefObject<ExplodeState>; onSelect?: (node: string) => void; tint?: string; reduced: boolean }) {
  const gltf = useLoader(CachedModelLoader, config.url)
  const smooth = useRef({ p: state.current.progress, l: state.current.lens })
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
          let c = mat.clone() as THREE.MeshStandardMaterial
          if (c.name === 'Argento glass') {
            const coating = new THREE.MeshPhysicalMaterial({ color: c.color, metalness: .02, roughness: .095, clearcoat: 1, clearcoatRoughness: .075, ior: 1.52, envMapIntensity: 1.4 })
            coating.name = c.name
            c.dispose(); c = coating
          }
          // cor escolhida no produto: moldura e traseira (vidro brilhante, como no iPhone 12)
          if (tint && (c.name === 'Anodized aluminum' || c.name === 'Frosted glass')) {
            c.color.set(tint)
            if (c.name === 'Frosted glass') { c.roughness = config.glossBack ? 0.1 : 0.32; c.metalness = 0.05 }
            else { c.color.offsetHSL(0, -0.04, -0.04); c.metalness = 0.75; c.roughness = 0.36 }
          }
          // tela: imagem só como emissão (o GLB traz textura + emissão com força 10, que estourava)
          if (c.name === 'OLED') makeScreenEmissive(c)
          mats.push({ m: c, opacity: c.opacity, blend: c.transparent })
          return c
        }
        m.material = Array.isArray(m.material) ? m.material.map(clone) : clone(m.material)
        m.castShadow = !String((Array.isArray(m.material) ? m.material[0] : m.material).name).includes('glass')
        m.receiveShadow = true
        m.userData.part = cfg.node
      })
      parts.push({ obj: o, cfg, baseX: o.position.x, baseY: o.position.y, baseZ: o.position.z, mats })
    })
    const wrap = new THREE.Group()
    wrap.add(root)
    wrap.scale.setScalar(UNITS)
    return { wrap, parts }
  }, [gltf, config, tint])

  useEffect(() => () => { data.parts.forEach((p) => p.mats.forEach(({ m }) => m.dispose())) }, [data])

  useFrame((_, dt) => {
    const s = state.current
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) / 0.09)
    smooth.current.p += (s.progress - smooth.current.p) * k
    smooth.current.l += (s.lens - smooth.current.l) * k
    if (Math.abs(s.progress - smooth.current.p) < 0.00001) smooth.current.p = s.progress
    if (Math.abs(s.lens - smooth.current.l) < 0.00001) smooth.current.l = s.lens
    const p = Math.min(1, Math.max(0, smooth.current.p))
    const e = ease(p)
    const l = ease(Math.min(1, Math.max(0, smooth.current.l)))
    const sel = s.selected
    const selLabel = sel ? config.parts.find((p) => p.node === sel)?.label : null
    for (const part of data.parts) {
      const { cfg } = part
      const local = ease(THREE.MathUtils.clamp((p - (cfg.start ?? 0)) / ((cfg.end ?? 1) - (cfg.start ?? 0)), 0, 1))
      let y = part.baseY + cfg.offset * local - config.center * e
      const dir = Math.sign(cfg.offset) || 1 // câmeras e lentes se afastam no mesmo sentido em que saem
      if (cfg.group === 'camera') y += dir * 0.008 * l * e
      if (cfg.lens !== undefined) y += dir * (cfg.lens + 1) * 0.007 * l * e
      part.obj.position.y = y
      const fan = ease(THREE.MathUtils.clamp((p - .84) / .16, 0, 1))
      part.obj.position.x = part.baseX + (cfg.travel?.[0] ?? 0) * fan
      part.obj.position.z = part.baseZ + (cfg.travel?.[1] ?? 0) * fan
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
function Presentation({ state, base, children, reduced }: { state: MutableRefObject<ExplodeState>; base: [number, number, number]; children: ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) / 0.18)
    g.current.rotation.x += (base[0] - g.current.rotation.x) * k
    g.current.rotation.y += (base[1] + state.current.spin - g.current.rotation.y) * k
    g.current.rotation.z += (base[2] - g.current.rotation.z) * k
  })
  return <group ref={g}>{children}</group>
}

// Câmera virtual que aproxima o módulo de câmeras (seção da home)
function FocusRig({ config, state, far, presentation, narrow }: { config: ExplodeConfig; state: MutableRefObject<ExplodeState>; far: [number, number, number]; presentation: [number, number, number]; narrow: boolean }) {
  const { camera } = useThree()
  const smooth = useRef(0)
  const tmp = useMemo(() => ({ focus: new THREE.Vector3(), euler: new THREE.Euler(), look: new THREE.Vector3(), pos: new THREE.Vector3(), farV: new THREE.Vector3(...far) }), [far])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.12)
    smooth.current += (state.current.focus - smooth.current) * k
    const f = ease(Math.min(1, Math.max(0, smooth.current)))
    // ponto do módulo de câmera no mundo (modelo: +90° em X; peças de câmera afastadas para trás)
    const [fx, fz] = config.cameraFocus
    tmp.focus.set(fx * UNITS, -fz * UNITS, config.cameraDepth * UNITS)
    tmp.euler.set(presentation[0], presentation[1] + state.current.spin, presentation[2])
    tmp.focus.applyEuler(tmp.euler)
    // no celular o alvo sobe um pouco: as câmeras ficam na metade de baixo, abaixo do texto
    const target = tmp.focus.clone().add(new THREE.Vector3(0, narrow ? 0.85 : 0, 0))
    tmp.look.set(0, 0, 0).lerp(target, f)
    const close = narrow ? new THREE.Vector3(0.7, 0.55, 4.4) : new THREE.Vector3(1.2, 0.45, 3.3)
    tmp.pos.copy(tmp.focus).add(close).sub(tmp.farV).multiplyScalar(f).add(tmp.farV)
    camera.position.copy(tmp.pos)
    camera.lookAt(tmp.look)
  })
  return null
}

function Lights({ envResolution, shadows }: { envResolution: number; shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 5, 7]} intensity={2.6} color="#fff5e9" castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-camera-near={.1} shadow-camera-far={20} shadow-bias={-.00015} shadow-normalBias={.004} shadow-radius={3} />
      <directionalLight position={[-5, 1.5, 4]} intensity={0.65} color="#dfeaff" />
      {/* luz de recorte por trás: contorna as peças escuras sobre o fundo preto */}
      <directionalLight position={[-3, 4, -7]} intensity={2.4} color="#dfe6ff" />
      <directionalLight position={[5, -2, -6]} intensity={1.2} color="#ffffff" />
      <Environment resolution={envResolution} environmentIntensity={1.1}>
        <Lightformer form="rect" intensity={3.5} position={[0, 5, -6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[1, 1, 8]} scale={[6, 8, 1]} />
      </Environment>
    </>
  )
}

export function ExplodedCanvas({
  config, state, mode, onSelect, className, tint, isolated = null,
}: {
  tint?: string
  config: ExplodeConfig
  state: MutableRefObject<ExplodeState>
  mode: 'interactive' | 'scroll'
  onSelect?: (node: string) => void
  className?: string
  isolated?: string | null
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [lost, setLost] = useState(false)
  const quality = useRenderQuality()
  const [narrow, setNarrow] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 700px)').matches)
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const small = matchMedia('(max-width: 700px)'), motion = matchMedia('(prefers-reduced-motion: reduce)')
    const resize = () => setNarrow(small.matches), update = () => setReduced(motion.matches)
    small.addEventListener('change', resize); motion.addEventListener('change', update)
    return () => { small.removeEventListener('change', resize); motion.removeEventListener('change', update) }
  }, [])
  const shadows = !narrow && quality.tier !== 'otimizada'
  // inclina o aparelho: as camadas ficam visíveis de lado
  // vista pela frente (unibody): gira meia volta para a tela ficar voltada para quem olha
  const flip = config.view === 'front' ? Math.PI : 0
  const presentation: [number, number, number] = mode === 'scroll' ? [0.24, -1.02 + flip, 0.06] : [0.2, -0.98 + flip, 0.04]
  const far: [number, number, number] = narrow ? [0, 0.2, 7.8] : [0, 0.15, 7.2]

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
        dpr={quality.dpr}
        shadows={shadows ? 'soft' : false}
        camera={{ position: far, fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: THREE.SRGBColorSpace }}
        data-quality={quality.tier}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setLost(true) }, { once: true })
        }}
      >
        <PerformanceMonitor onDecline={qualityDecline} onIncline={qualityIncline} onFallback={qualityFallback} flipflops={3} />
        <Lights envResolution={quality.settings.envResolution} shadows={shadows} />
        <StudioFinish enabled={quality.tier !== 'otimizada'} drive={state} />
        <ResetInspectionCamera id={isolated} far={far}/>
        <Suspense fallback={null}>
          {isolated ? <PartStudy config={config} node={isolated}/> : <Presentation state={state} base={presentation} reduced={reduced}>
            <Model config={config} state={state} onSelect={onSelect} tint={tint} reduced={reduced} />
          </Presentation>}
        </Suspense>
        {mode === 'interactive' ? (
          <OrbitControls key={isolated ?? 'assembly'} makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={isolated ? 1.6 : narrow ? 4.5 : 3.4} maxDistance={narrow ? 14 : 11} rotateSpeed={0.8} zoomSpeed={0.8} />
        ) : (
          <FocusRig config={config} state={state} far={far} presentation={presentation} narrow={narrow} />
        )}
      </Canvas>
    </div>
  )
}

export default ExplodedCanvas
