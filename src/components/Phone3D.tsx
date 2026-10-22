import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, ContactShadows, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { CamLayout, PhoneModel } from '../data/models'

export interface Drive {
  rotY: number
  rotX: number
  rotZ: number
  x: number
  y: number
  scale: number
  color: string
  screen: number // brilho da tela 0..1
}

export const defaultDrive = (): Drive => ({ rotY: 0, rotX: 0, rotZ: 0, x: 0, y: 0, scale: 1, color: '#c2bcb2', screen: 1 })

const W = 1.42, H = 2.9, D = 0.16, R = 0.2

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function useScreenTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 1048
    const g = c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 512, 1048)
    grd.addColorStop(0, '#2b3a55')
    grd.addColorStop(0.45, '#0e1220')
    grd.addColorStop(1, '#030305')
    g.fillStyle = grd
    g.fillRect(0, 0, 512, 1048)
    const rg = g.createRadialGradient(380, 260, 10, 380, 260, 420)
    rg.addColorStop(0, 'rgba(190,200,220,0.55)')
    rg.addColorStop(1, 'rgba(190,200,220,0)')
    g.fillStyle = rg
    g.fillRect(0, 0, 512, 1048)
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.font = '200 132px Inter, system-ui, sans-serif'
    g.textAlign = 'center'
    g.fillText('9:41', 256, 300)
    g.font = '400 26px Inter, system-ui, sans-serif'
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fillText('quinta-feira, 22 de outubro', 256, 150)
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.fillRect(186, 1000, 140, 8)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
}

function lensPositions(cam: CamLayout): { p: [number, number]; r: number }[] {
  const L = W / 2 - 0.3, T = H / 2 - 0.3
  switch (cam) {
    case 'single': return [{ p: [L, T], r: 0.13 }]
    case 'vert2': return [{ p: [L, T], r: 0.12 }, { p: [L, T - 0.36], r: 0.12 }]
    case 'diag2': return [{ p: [L, T], r: 0.13 }, { p: [L - 0.34, T - 0.34], r: 0.13 }]
    case 'pill2': return [{ p: [L, T], r: 0.14 }, { p: [L, T - 0.44], r: 0.14 }]
    case 'air': return [{ p: [L, T + 0.02], r: 0.13 }]
    default: return [{ p: [L, T], r: 0.15 }, { p: [L, T - 0.5], r: 0.15 }, { p: [L - 0.44, T - 0.25], r: 0.15 }]
  }
}

function PhoneMesh({ drive, cam = 'tri' }: { drive: React.MutableRefObject<Drive>; cam?: CamLayout }) {
  const group = useRef<THREE.Group>(null!)
  const backMat = useRef<THREE.MeshPhysicalMaterial>(null!)
  const frameMat = useRef<THREE.MeshStandardMaterial>(null!)
  const moduleMat = useRef<THREE.MeshPhysicalMaterial>(null!)
  const screenMat = useRef<THREE.MeshBasicMaterial>(null!)
  const tex = useScreenTexture()
  const faceShape = useMemo(() => roundedRectShape(W - 0.04, H - 0.04, R - 0.02), [])
  const screenShape = useMemo(() => roundedRectShape(W - 0.12, H - 0.12, R - 0.07), [])
  const target = useMemo(() => new THREE.Color(), [])
  const lenses = lensPositions(cam)

  // UV da tela em [0,1]
  const screenGeo = useMemo(() => {
    const g = new THREE.ShapeGeometry(screenShape, 24)
    const pos = g.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + (W - 0.12) / 2) / (W - 0.12)
      uv[i * 2 + 1] = (pos.getY(i) + (H - 0.12) / 2) / (H - 0.12)
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }, [screenShape])

  useFrame((_, dt) => {
    const d = drive.current
    const k = 1 - Math.pow(0.0009, dt)
    target.set(d.color)
    backMat.current.color.lerp(target, k)
    moduleMat.current.color.lerp(target, k)
    const fr = target.clone().offsetHSL(0, -0.05, target.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6 ? -0.12 : 0.12)
    frameMat.current.color.lerp(fr, k)
    screenMat.current.opacity += (d.screen - screenMat.current.opacity) * k
  })

  const isPlateau = cam === 'plateau'
  const isAir = cam === 'air'

  return (
    <group ref={group}>
      {/* corpo / moldura */}
      <RoundedBox args={[W, H, D]} radius={0.075} smoothness={6} bevelSegments={6} creaseAngle={0.4}>
        <meshStandardMaterial ref={frameMat} color="#b8b2a8" metalness={0.95} roughness={0.28} />
      </RoundedBox>
      {/* vidro frontal */}
      <mesh position={[0, 0, D / 2 + 0.001]}>
        <shapeGeometry args={[faceShape, 24]} />
        <meshPhysicalMaterial color="#050506" roughness={0.08} metalness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.002]} geometry={screenGeo}>
        <meshBasicMaterial ref={screenMat} map={tex} transparent toneMapped={false} />
      </mesh>
      {/* Dynamic Island */}
      <mesh position={[0, H / 2 - 0.2, D / 2 + 0.003]}>
        <shapeGeometry args={[roundedRectShape(0.36, 0.1, 0.05), 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* traseira */}
      <mesh position={[0, 0, -D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <shapeGeometry args={[faceShape, 24]} />
        <meshPhysicalMaterial ref={backMat} color="#c2bcb2" roughness={0.42} metalness={0.15} clearcoat={0.6} clearcoatRoughness={0.4} />
      </mesh>
      {/* módulo de câmera */}
      {(isPlateau || isAir) ? (
        <RoundedBox args={[W - 0.08, isAir ? 0.42 : 0.92, 0.07]} radius={0.03} smoothness={4} position={[0, H / 2 - (isAir ? 0.28 : 0.52), -D / 2 - 0.035]}>
          <meshPhysicalMaterial ref={moduleMat} color="#c2bcb2" metalness={0.6} roughness={0.3} clearcoat={0.8} />
        </RoundedBox>
      ) : (
        <RoundedBox
          args={cam === 'single' ? [0.01, 0.01, 0.01] : cam === 'pill2' ? [0.42, 0.88, 0.04] : [0.82, 0.82, 0.04]}
          radius={cam === 'pill2' ? 0.2 : 0.16}
          smoothness={4}
          position={cam === 'pill2' ? [W / 2 - 0.3, H / 2 - 0.52, -D / 2 - 0.02] : [W / 2 - 0.5, H / 2 - 0.52, -D / 2 - 0.02]}
        >
          <meshPhysicalMaterial ref={moduleMat} color="#c2bcb2" roughness={0.25} metalness={0.2} clearcoat={1} />
        </RoundedBox>
      )}
      {lenses.map((l, i) => (
        <group key={i} position={[l.p[0], l.p[1], -D / 2 - (isPlateau || isAir ? 0.075 : 0.045)]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[l.r + 0.025, l.r + 0.025, 0.06, 40]} />
            <meshStandardMaterial color="#9a9ea6" metalness={1} roughness={0.2} />
          </mesh>
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.031]}>
            <circleGeometry args={[l.r, 40]} />
            <meshPhysicalMaterial color="#05060a" roughness={0.05} metalness={0.4} clearcoat={1} />
          </mesh>
          <mesh position={[0, 0, -0.032]} rotation={[0, Math.PI, 0]}>
            <ringGeometry args={[l.r * 0.35, l.r * 0.55, 40]} />
            <meshBasicMaterial color="#1c2440" />
          </mesh>
        </group>
      ))}
      {/* flash */}
      <mesh position={[W / 2 - (isPlateau || isAir ? 1.05 : 0.86), H / 2 - 0.26, -D / 2 - (isPlateau || isAir ? 0.072 : 0.042)]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.05, 24]} />
        <meshBasicMaterial color="#f6e9c9" />
      </mesh>
      {/* botões laterais */}
      {[0.55, 0.2, -0.15].map((y, i) => (
        <RoundedBox key={i} args={[0.03, i === 0 ? 0.14 : 0.24, 0.05]} radius={0.012} position={[-W / 2 - 0.008, y + 0.3, 0]}>
          <meshStandardMaterial color="#9a9ea6" metalness={0.9} roughness={0.3} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.03, 0.4, 0.05]} radius={0.012} position={[W / 2 + 0.008, 0.45, 0]}>
        <meshStandardMaterial color="#9a9ea6" metalness={0.9} roughness={0.3} />
      </RoundedBox>
    </group>
  )
}

interface DragState { active: boolean; x: number; y: number; ry: number; rx: number; v: number; t: number }

// Aplica o "drive" (GSAP/estado) + arraste com inércia (velocidade herdada do gesto)
function Rig({ drive, drag, interactive, children }: { drive: React.MutableRefObject<Drive>; drag: React.MutableRefObject<DragState>; interactive: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame((state, dt) => {
    const d = drive.current
    const dr = drag.current
    if (!dr.active && Math.abs(dr.v) > 0.0001) {
      dr.ry += dr.v * dt
      dr.v *= Math.pow(0.135, dt) // ≈ desaceleração 0.998/ms (projeção de momento)
    }
    const k = 1 - Math.pow(0.0009, dt)
    const idle = interactive && !dr.active && Math.abs(dr.v) < 0.05 ? Math.sin(state.clock.elapsedTime * 0.6) * 0.12 : 0
    const ry = d.rotY + dr.ry + idle
    const rx = d.rotX + dr.rx
    const o = g.current
    o.rotation.y += (ry - o.rotation.y) * (dr.active ? 0.6 : k)
    o.rotation.x += (rx - o.rotation.x) * k
    o.rotation.z += (d.rotZ - o.rotation.z) * k
    o.position.x += (d.x - o.position.x) * k
    o.position.y += (d.y - o.position.y) * k
    o.scale.setScalar(o.scale.x + (d.scale - o.scale.x) * k)
  })
  return <group ref={g}>{children}</group>
}

// Carrega um .glb (ex.: Sketchfab) centralizado e na mesma escala do modelo procedural
function GLBPhone({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const s = H / Math.max(size.x, size.y, size.z)
    c.position.sub(center.multiplyScalar(s))
    c.scale.setScalar(s)
    const wrap = new THREE.Group()
    wrap.add(c)
    return wrap
  }, [scene])
  return <primitive object={obj} />
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? this.props.fallback : this.props.children }
}

const BASE = import.meta.env.BASE_URL
const glbCache = new Map<string, Promise<string | null>>()
async function probe(name: string) {
  const url = `${BASE}models/${name}.glb`
  try {
    const r = await fetch(url, { method: 'HEAD' })
    const type = r.headers.get('content-type') ?? ''
    return r.ok && !type.includes('text/html') ? url : null
  } catch { return null }
}
// Procura o arquivo do modelo; Pro Max cai para o Pro, mini/Plus/e para o modelo base da geração
export function glbCandidates(m: Pick<PhoneModel, 'id' | 'family' | 'tier'>) {
  const list = [m.id]
  if (m.tier === 'promax') list.push(`iphone-${m.family}-pro`)
  if (m.tier === 'mini' || m.tier === 'plus' || m.tier === 'e') list.push(`iphone-${m.family}`)
  return list
}
export function useGlb(names: string[]) {
  const key = names.join('|')
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setUrl(null)
    if (!glbCache.has(key)) glbCache.set(key, (async () => { for (const n of names) { const u = await probe(n); if (u) return u } return null })())
    glbCache.get(key)!.then((u) => alive && setUrl(u))
    return () => { alive = false }
  }, [key])
  return url
}

export default function Phone3D({ drive, cam, interactive = false, shadow = false, className, fov = 30, glb }: { drive: React.MutableRefObject<Drive>; cam?: CamLayout; interactive?: boolean; shadow?: boolean; className?: string; fov?: number; glb?: string[] }) {
  const drag = useRef<DragState>({ active: false, x: 0, y: 0, ry: 0, rx: 0, v: 0, t: 0 })
  const url = useGlb(glb ?? [])
  const procedural = <PhoneMesh drive={drive} cam={cam} />
  const handlers = interactive
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          Object.assign(drag.current, { active: true, x: e.clientX, y: e.clientY, v: 0, t: performance.now() })
        },
        onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
          const dr = drag.current
          if (!dr.active) return
          const now = performance.now()
          const dx = e.clientX - dr.x, dy = e.clientY - dr.y
          dr.ry += dx * 0.01 // 1:1 com o dedo
          dr.rx = THREE.MathUtils.clamp(dr.rx + dy * 0.006, -0.6, 0.6)
          const dtS = Math.max(0.008, (now - dr.t) / 1000)
          dr.v = dr.v * 0.6 + ((dx * 0.01) / dtS) * 0.4 // histórico curto de velocidade
          Object.assign(dr, { x: e.clientX, y: e.clientY, t: now })
        },
        onPointerUp: () => { drag.current.active = false; if (performance.now() - drag.current.t > 80) drag.current.v = 0 },
        onPointerCancel: () => { drag.current.active = false },
      }
    : {}
  return (
    <div className={className} style={{ width: '100%', height: '100%', touchAction: interactive ? 'pan-y' : undefined, cursor: interactive ? 'grab' : undefined }} {...handlers}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 7.2], fov }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <directionalLight position={[-4, -2, -4]} intensity={0.8} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, 0, 8]} scale={4} />
        </Environment>
        <Rig drive={drive} drag={drag} interactive={interactive}>
          {url ? (
            <Boundary fallback={procedural}>
              <Suspense fallback={procedural}><GLBPhone url={url} /></Suspense>
            </Boundary>
          ) : procedural}
        </Rig>
        {shadow && <ContactShadows position={[0, -1.75, 0]} opacity={0.35} blur={2.6} scale={6} far={3} />}
      </Canvas>
    </div>
  )
}
