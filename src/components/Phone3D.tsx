import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, ContactShadows, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import type { CamLayout, PhoneModel } from '../data/models'
import { CachedModelLoader } from '../lib/model-loader'
import { modelAssetUrl } from '../lib/model-assets'
import { useStore } from '../store/Store'

import type { Drive } from './drive'
export { defaultDrive, type Drive } from './drive'

const W = 1.42, H = 2.9, D = 0.16, R = 0.2
const BASE_METERS = 0.15
const preparedModels = new Set<string>()

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

function roundRect2D(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rad, y)
  g.lineTo(x + w - rad, y)
  g.quadraticCurveTo(x + w, y, x + w, y + rad)
  g.lineTo(x + w, y + h - rad)
  g.quadraticCurveTo(x + w, y + h, x + w - rad, y + h)
  g.lineTo(x + rad, y + h)
  g.quadraticCurveTo(x, y + h, x, y + h - rad)
  g.lineTo(x, y + rad)
  g.quadraticCurveTo(x, y, x + rad, y)
  g.closePath()
}

function shiftHex(hex: string, lDelta: number, sDelta = 0) {
  const c = new THREE.Color(hex || '#c2bcb2')
  c.offsetHSL(0, sDelta, lDelta)
  return '#' + c.getHexString()
}

// Desenha a tela de bloqueio iOS com o wallpaper da geração sincronizado à cor escolhida e Dynamic Island interativa
function drawIosScreen(
  g: CanvasRenderingContext2D,
  opts: { hex: string; family: number; hasIsland: boolean; island: number; time: number; mirrorX: boolean },
) {
  const CW = 512, CH = 1100
  const { hex, family, hasIsland, island, time, mirrorX } = opts
  g.save()
  g.clearRect(0, 0, CW, CH)
  if (mirrorX) {
    g.translate(CW, 0)
    g.scale(-1, 1)
  }

  const base = new THREE.Color(hex || '#c2bcb2')
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)
  const isLight = hsl.l > 0.62
  const primary = shiftHex(hex, isLight ? -0.18 : 0.14, 0.12)
  const secondary = shiftHex(hex, isLight ? -0.38 : -0.12, 0.18)
  const glow = shiftHex(hex, isLight ? 0.08 : 0.28, 0.15)
  const deep = shiftHex(hex, -0.48, 0.08)

  // Fundo base
  const bg = g.createLinearGradient(0, 0, CW, CH)
  bg.addColorStop(0, primary)
  bg.addColorStop(0.52, secondary)
  bg.addColorStop(1, '#05060b')
  g.fillStyle = bg
  g.fillRect(0, 0, CW, CH)

  // Estilo visual do wallpaper por geração do iPhone
  if (family <= 12) {
    // iOS 14 oficial (referência iPhone 12 / 12 mini): esferas concêntricas translúcidas
    const bg14 = g.createLinearGradient(0, 0, CW, CH)
    bg14.addColorStop(0, '#ebd7c4')
    bg14.addColorStop(0.45, secondary)
    bg14.addColorStop(1, primary)
    g.fillStyle = bg14
    g.fillRect(0, 0, CW, CH)

    for (const [cx, cy, r, c0, c1, c2, strokeAlpha] of [
      [256, 545, 385, 'rgba(255,235,215,0.28)', glow, 'rgba(255,255,255,0.85)', 0.55],
      [224, 575, 305, primary, glow, 'rgba(255,225,185,0.92)', 0.45],
      [208, 560, 212, deep, primary, glow, 0.5],
      [268, 585, 138, primary, glow, '#ffe3b8', 0.6],
    ] as const) {
      g.save()
      g.beginPath()
      g.arc(cx, cy, r, 0, Math.PI * 2)
      const rg = g.createRadialGradient(cx - r * 0.24, cy - r * 0.18, r * 0.05, cx, cy, r)
      rg.addColorStop(0, c0)
      rg.addColorStop(0.64, c1)
      rg.addColorStop(1, c2)
      g.fillStyle = rg
      g.fill()
      g.strokeStyle = `rgba(255,255,255,${strokeAlpha})`
      g.lineWidth = 2
      g.stroke()
      g.restore()
    }
  } else if (family === 13 || family === 14) {
    // iOS 15 / 16: feixes e ondas diagonais luminosas
    const rg = g.createRadialGradient(380, 240, 20, 320, 380, 480)
    rg.addColorStop(0, glow)
    rg.addColorStop(0.5, primary)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = rg
    g.fillRect(0, 0, CW, CH)

    g.save()
    g.beginPath()
    g.moveTo(-40, 340)
    g.bezierCurveTo(150, 220, 360, 520, 560, 340)
    g.lineTo(560, 780)
    g.bezierCurveTo(360, 620, 140, 880, -40, 720)
    g.closePath()
    const wg = g.createLinearGradient(0, 260, CW, 780)
    wg.addColorStop(0, 'rgba(255,255,255,0.34)')
    wg.addColorStop(0.5, glow)
    wg.addColorStop(1, 'rgba(5,6,12,0.1)')
    g.fillStyle = wg
    g.fill()
    g.restore()
  } else if (family === 15 || family === 16) {
    // iOS 17 / 18: pétalas e camadas minerais radiantes
    for (const [cx, cy, rx, ry, rot, alpha] of [
      [256, 460, 220, 145, -0.35, 0.55],
      [256, 610, 240, 155, 0.32, 0.42],
      [256, 740, 190, 120, -0.2, 0.3],
    ] as const) {
      g.save()
      g.translate(cx, cy)
      g.rotate(rot)
      g.beginPath()
      g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      const pg = g.createRadialGradient(-rx * 0.2, -ry * 0.2, 10, 0, 0, rx)
      pg.addColorStop(0, `rgba(255,255,255,${alpha})`)
      pg.addColorStop(0.45, glow)
      pg.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = pg
      g.fill()
      g.restore()
    }
  } else {
    // iOS 19 / 26 (iPhone 17, Air, 18): Liquid Glass escultural
    const rg1 = g.createRadialGradient(390, 250, 10, 360, 280, 440)
    rg1.addColorStop(0, 'rgba(255,255,255,0.52)')
    rg1.addColorStop(0.4, glow)
    rg1.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = rg1
    g.fillRect(0, 0, CW, CH)

    for (let i = 0; i < 3; i++) {
      g.save()
      g.beginPath()
      const y0 = 370 + i * 135
      g.moveTo(-30, y0)
      g.bezierCurveTo(160, y0 - 130, 350, y0 + 130, 542, y0 - 30)
      g.lineTo(542, y0 + 150)
      g.bezierCurveTo(350, y0 + 270, 160, y0 + 20, -30, y0 + 140)
      g.closePath()
      const lg = g.createLinearGradient(0, y0 - 80, CW, y0 + 180)
      lg.addColorStop(0, `rgba(255,255,255,${0.32 - i * 0.07})`)
      lg.addColorStop(0.55, i % 2 === 0 ? glow : primary)
      lg.addColorStop(1, 'rgba(0,0,0,0.05)')
      g.fillStyle = lg
      g.fill()
      g.restore()
    }
  }

  // Vinheta suave nas bordas para destacar a tipografia iOS
  const vig = g.createLinearGradient(0, 0, 0, CH)
  vig.addColorStop(0, 'rgba(0,0,0,0.22)')
  vig.addColorStop(0.3, 'rgba(0,0,0,0.04)')
  vig.addColorStop(0.8, 'rgba(0,0,0,0.12)')
  vig.addColorStop(1, 'rgba(0,0,0,0.38)')
  g.fillStyle = vig
  g.fillRect(0, 0, CW, CH)

  // Barra de status superior (5G, sinal e bateria)
  g.fillStyle = 'rgba(255,255,255,0.88)'
  g.font = '600 18px Inter, system-ui, -apple-system, sans-serif'
  g.textAlign = 'left'
  g.fillText('Argento', 48, 62)
  g.textAlign = 'right'
  g.font = '600 16px Inter, system-ui, -apple-system, sans-serif'
  g.fillText('5G', 420, 61)
  // Ícone de bateria no canto superior direito
  roundRect2D(g, 430, 46, 36, 17, 4.5)
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = 1.8
  g.stroke()
  roundRect2D(g, 433, 49, 28, 11, 2.5)
  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.fill()
  g.fillRect(468, 51, 2.5, 7)

  // Deslocamento suave do relógio quando a Dynamic Island expande
  const clockShift = hasIsland ? island * 92 : 0

  // Dynamic Island interativa (Live Activity expandida)
  if (hasIsland && island > 0.01) {
    const prog = THREE.MathUtils.smoothstep(island, 0, 1)
    const iw = 152 + prog * 288 // de 152px até 440px
    const ih = 46 + prog * 134 // de 46px até 180px
    const ix = (CW - iw) / 2
    const iy = 34
    g.save()
    roundRect2D(g, ix, iy, iw, ih, 44)
    g.fillStyle = 'rgba(6, 7, 10, 0.96)'
    g.fill()
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    g.lineWidth = 1.5
    g.stroke()

    if (prog > 0.35) {
      const contentAlpha = Math.min(1, (prog - 0.35) / 0.55)
      g.globalAlpha = contentAlpha

      // Capa do álbum / ícone à esquerda
      const artGrad = g.createLinearGradient(ix + 22, iy + 84, ix + 82, iy + 144)
      artGrad.addColorStop(0, glow)
      artGrad.addColorStop(1, primary)
      roundRect2D(g, ix + 22, iy + 82, 58, 58, 14)
      g.fillStyle = artGrad
      g.fill()

      // Textos da atividade ao vivo
      g.fillStyle = '#ffffff'
      g.textAlign = 'left'
      g.font = '600 20px Inter, system-ui, sans-serif'
      g.fillText('Showroom Argento', ix + 94, iy + 106)
      g.fillStyle = 'rgba(255,255,255,0.64)'
      g.font = '500 15px Inter, system-ui, sans-serif'
      g.fillText('Áudio Espacial · AirPods Pro', ix + 94, iy + 129)

      // Equalizador animado à direita
      const bars = 6
      for (let b = 0; b < bars; b++) {
        const wave = 0.35 + 0.65 * Math.abs(Math.sin(time * 4.2 + b * 0.85))
        const bh = 12 + wave * 28
        const bx = ix + iw - 78 + b * 9
        const by = iy + 111 - bh / 2
        roundRect2D(g, bx, by, 5, bh, 2.5)
        g.fillStyle = glow
        g.fill()
      }

      // Barra de progresso inferior
      roundRect2D(g, ix + 24, iy + 154, iw - 48, 5, 2.5)
      g.fillStyle = 'rgba(255,255,255,0.18)'
      g.fill()
      roundRect2D(g, ix + 24, iy + 154, (iw - 48) * 0.42, 5, 2.5)
      g.fillStyle = '#ffffff'
      g.fill()
    }
    g.restore()
  }

  // Data e Hora da Tela de Bloqueio iOS
  g.textAlign = 'center'
  if (family <= 12) {
    // Layout clássico iOS 14: cadeado no topo, relógio fino 9:41 e data logo abaixo
    roundRect2D(g, CW / 2 - 12, 126, 24, 20, 4)
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.fill()
    g.beginPath()
    g.arc(CW / 2, 124, 7.5, Math.PI, 0, false)
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.lineWidth = 2.8
    g.stroke()

    g.fillStyle = 'rgba(255,255,255,0.96)'
    g.font = '200 112px Inter, system-ui, -apple-system, sans-serif'
    g.fillText('9:41', CW / 2, 258)

    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.font = '400 22px Inter, system-ui, -apple-system, sans-serif'
    g.fillText('Monday, January 20', CW / 2, 298)

    g.fillStyle = 'rgba(255,255,255,0.88)'
    g.font = '500 16px Inter, system-ui, -apple-system, sans-serif'
    g.fillText('Swipe up to unlock', CW / 2, 1044)
  } else {
    g.fillStyle = 'rgba(255,255,255,0.82)'
    g.font = '600 22px Inter, system-ui, -apple-system, sans-serif'
    g.fillText('quinta-feira, 22 de outubro', CW / 2, 168 + clockShift)

    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.font = '700 124px Inter, system-ui, -apple-system, sans-serif'
    g.fillText('9:41', CW / 2, 292 + clockShift)
  }

  // Atalhos inferiores (Lanterna e Câmera) + barra Home
  for (const cx of [92, CW - 92]) {
    g.beginPath()
    g.arc(cx, 992, 34, 0, Math.PI * 2)
    g.fillStyle = 'rgba(15, 18, 25, 0.42)'
    g.fill()
    g.strokeStyle = 'rgba(255, 255, 255, 0.22)'
    g.lineWidth = 1.5
    g.stroke()
  }
  // Ícone simplificado de lanterna (esquerda)
  roundRect2D(g, 86, 976, 12, 32, 4)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.fill()
  // Ícone simplificado de câmera (direita)
  roundRect2D(g, CW - 106, 980, 28, 22, 5)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.fill()
  g.beginPath()
  g.arc(CW - 92, 991, 5.5, 0, Math.PI * 2)
  g.fillStyle = '#141824'
  g.fill()

  // Indicador Home
  roundRect2D(g, (CW - 148) / 2, 1064, 148, 7, 3.5)
  g.fillStyle = 'rgba(255,255,255,0.78)'
  g.fill()

  g.restore()
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

function PhoneMesh({ drive, cam = 'tri', model }: { drive: React.MutableRefObject<Drive>; cam?: CamLayout; model?: PhoneModel }) {
  const group = useRef<THREE.Group>(null!)
  const backMat = useRef<THREE.MeshStandardMaterial>(null!)
  const frameMat = useRef<THREE.MeshStandardMaterial>(null!)
  const moduleMat = useRef<THREE.MeshStandardMaterial>(null!)
  const screenMat = useRef<THREE.MeshBasicMaterial>(null!)

  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 1100
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return { canvas: c, tex: t }
  }, [])

  const faceShape = useMemo(() => roundedRectShape(W - 0.04, H - 0.04, R - 0.02), [])
  const screenShape = useMemo(() => roundedRectShape(W - 0.12, H - 0.12, R - 0.07), [])
  const target = useMemo(() => new THREE.Color(), [])
  const lenses = lensPositions(cam)
  const islandVal = useRef(0)
  const lastHex = useRef('')

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

  useFrame((state, dt) => {
    const d = drive.current
    const k = 1 - Math.pow(0.0009, dt)
    target.set(d.color)
    backMat.current.color.lerp(target, k)
    moduleMat.current.color.lerp(target, k)
    const fr = target.clone().offsetHSL(0, -0.05, target.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6 ? -0.12 : 0.12)
    frameMat.current.color.lerp(fr, k)
    screenMat.current.opacity += (d.screen - screenMat.current.opacity) * k

    const targetIsland = d.island ?? 0
    const prevIsland = islandVal.current
    islandVal.current += (targetIsland - prevIsland) * Math.min(1, dt * 10)
    if (d.color !== lastHex.current || Math.abs(islandVal.current - prevIsland) > 0.004 || islandVal.current > 0.05) {
      lastHex.current = d.color
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawIosScreen(ctx, {
          hex: d.color,
          family: model?.family ?? 17,
          hasIsland: (model?.front ?? 'island') === 'island',
          island: islandVal.current,
          time: state.clock.elapsedTime,
          mirrorX: false,
        })
        tex.needsUpdate = true
      }
    }
  })

  const isPlateau = cam === 'plateau'
  const isAir = cam === 'air'

  return (
    <group ref={group}>
      <RoundedBox args={[W, H, D]} radius={0.075} smoothness={4} bevelSegments={4} creaseAngle={0.4}>
        <meshStandardMaterial ref={frameMat} color="#b8b2a8" metalness={0.95} roughness={0.28} />
      </RoundedBox>
      <mesh position={[0, 0, D / 2 + 0.001]}>
        <shapeGeometry args={[faceShape, 24]} />
        <meshStandardMaterial color="#050506" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.002]} geometry={screenGeo}>
        <meshBasicMaterial ref={screenMat} map={tex} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, H / 2 - (model?.front === 'notch' ? 0.1 : 0.2), D / 2 + 0.003]}>
        <shapeGeometry args={[roundedRectShape(model?.front === 'notch' ? 0.52 : 0.36, 0.1, 0.05), 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0, 0, -D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <shapeGeometry args={[faceShape, 24]} />
        <meshStandardMaterial ref={backMat} color="#c2bcb2" roughness={0.38} metalness={0.2} />
      </mesh>
      {(isPlateau || isAir) ? (
        <RoundedBox args={[W - 0.08, isAir ? 0.42 : 0.92, 0.07]} radius={0.03} smoothness={4} position={[0, H / 2 - (isAir ? 0.28 : 0.52), -D / 2 - 0.035]}>
          <meshStandardMaterial ref={moduleMat} color="#c2bcb2" metalness={0.6} roughness={0.28} />
        </RoundedBox>
      ) : (
        <RoundedBox
          args={cam === 'single' ? [0.01, 0.01, 0.01] : cam === 'pill2' ? [0.42, 0.88, 0.04] : [0.82, 0.82, 0.04]}
          radius={cam === 'pill2' ? 0.2 : 0.16}
          smoothness={4}
          position={cam === 'pill2' ? [W / 2 - 0.3, H / 2 - 0.52, -D / 2 - 0.02] : [W / 2 - 0.5, H / 2 - 0.52, -D / 2 - 0.02]}
        >
          <meshStandardMaterial ref={moduleMat} color="#c2bcb2" roughness={0.22} metalness={0.25} />
        </RoundedBox>
      )}
      {lenses.map((l, i) => (
        <group key={i} position={[l.p[0], l.p[1], -D / 2 - (isPlateau || isAir ? 0.075 : 0.045)]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[l.r + 0.025, l.r + 0.025, 0.06, 28]} />
            <meshStandardMaterial color="#9a9ea6" metalness={1} roughness={0.2} />
          </mesh>
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.031]}>
            <circleGeometry args={[l.r, 28]} />
            <meshStandardMaterial color="#05060a" roughness={0.05} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, -0.032]} rotation={[0, Math.PI, 0]}>
            <ringGeometry args={[l.r * 0.35, l.r * 0.55, 28]} />
            <meshBasicMaterial color="#1c2440" />
          </mesh>
        </group>
      ))}
      <mesh position={[W / 2 - (isPlateau || isAir ? 1.05 : 0.86), H / 2 - 0.26, -D / 2 - (isPlateau || isAir ? 0.072 : 0.042)]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.05, 24]} />
        <meshBasicMaterial color="#f6e9c9" />
      </mesh>
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
  const lastPoseKey = useRef(drive.current.poseKey ?? 0)
  useLayoutEffect(() => {
    const d = drive.current
    g.current.position.set(d.x, d.y, 0)
    g.current.rotation.set(d.rotX, d.rotY, d.rotZ)
    g.current.scale.setScalar(d.scale)
  }, [drive])
  useFrame((state, elapsed) => {
    const dt = Math.min(elapsed, 0.05)
    const d = drive.current
    const dr = drag.current
    if ((d.poseKey ?? 0) !== lastPoseKey.current) {
      lastPoseKey.current = d.poseKey ?? 0
      dr.ry = 0
      dr.rx = 0
      dr.v = 0
    }
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

// Carrega o .glb do modelo com acabamentos PBR, tela interativa iOS e escala física proporcional
function GLBPhone({
  url,
  drive,
  model,
  interactive,
  onReady,
}: {
  url: string
  drive: React.MutableRefObject<Drive>
  model?: PhoneModel
  interactive?: boolean
  onReady: (url: string) => void
}) {
  const { scene } = useLoader(CachedModelLoader, url)
  useEffect(() => { preparedModels.add(url); onReady(url) }, [url, onReady])

  const screenSurface = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 1100
    const t = new THREE.CanvasTexture(c)
    t.flipY = false
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return { canvas: c, tex: t }
  }, [])

  const obj = useMemo(() => {
    const c = scene.clone(true)
    const frames: THREE.MeshStandardMaterial[] = []
    const glasses: THREE.MeshStandardMaterial[] = []
    const logos: THREE.MeshStandardMaterial[] = []
    const antennas: THREE.MeshStandardMaterial[] = []
    const oleds: THREE.MeshStandardMaterial[] = []

    const isPro = model?.tier === 'pro' || model?.tier === 'promax'
    const isSteel = isPro && (model?.family ?? 17) <= 14
    const isTitanium = (isPro && (model?.family === 15 || model?.family === 16)) || model?.tier === 'air'
    const isGlossBack = !isPro && (model?.family ?? 17) <= 14

    c.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      const tint = (original: THREE.Material) => {
        const mat = original.clone()
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mat.name === 'Anodized aluminum' || mat.name.startsWith('finish-')) {
            mat.normalScale.multiplyScalar(0.18)
            if (isSteel) {
              mat.metalness = 0.96
              mat.roughness = 0.14
            } else if (isTitanium) {
              mat.metalness = 0.88
              mat.roughness = 0.26
            } else {
              mat.metalness = 0.78
              mat.roughness = 0.36
            }
            frames.push(mat)
          } else if (mat.name === 'Frosted glass') {
            mat.normalScale.multiplyScalar(0.15)
            mat.roughness = isGlossBack ? 0.07 : 0.32
            mat.metalness = isGlossBack ? 0.05 : 0.1
            glasses.push(mat)
          } else if (mat.name === 'Glass tint') {
            mat.roughness = 0.08
            mat.metalness = 0.65
            logos.push(mat)
          } else if (mat.name === 'Plastic antena') {
            mat.normalScale.multiplyScalar(0.15)
            antennas.push(mat)
          } else if (mat.name === 'Glass') {
            mat.opacity = 0.14
            mat.depthWrite = false
          } else if (mat.name === 'OLED') {
            mat.emissiveIntensity = 0.92
            mat.toneMapped = false
            if (interactive || model) {
              mat.map = screenSurface.tex
              mat.emissiveMap = screenSurface.tex
              mat.emissive.set('#ffffff')
            }
            oleds.push(mat)
          }
        }
        return mat
      }
      node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material)
    })

    // O GLB usa a traseira no eixo +Z; a animação espera a tela em +Z.
    if (frames.length > 0) c.rotateY(Math.PI)
    const box = new THREE.Box3().setFromObject(c)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    // Preserva a proporção física real entre mini (131,5 mm), base/Pro (147–150 mm) e Plus/Pro Max (160–163 mm)
    const s = maxDim > 0.11 && maxDim < 0.20 ? H / BASE_METERS : H / maxDim
    c.position.sub(center.multiplyScalar(s))
    c.scale.setScalar(s)
    const wrap = new THREE.Group()
    wrap.add(c)
    return { root: wrap, frames, glasses, logos, antennas, oleds }
  }, [scene, model, interactive, screenSurface])

  const target = useMemo(() => new THREE.Color(), [])
  const glassTarget = useMemo(() => new THREE.Color(), [])
  const logoTarget = useMemo(() => new THREE.Color(), [])
  const antTarget = useMemo(() => new THREE.Color(), [])
  const screenColor = useMemo(() => new THREE.Color('#ffffff'), [])
  const offColor = useMemo(() => new THREE.Color('#050507'), [])
  const screenLevel = useRef(drive.current.screen)
  const islandLevel = useRef(drive.current.island ?? 0)
  const lastDrawnColor = useRef('')

  useFrame((state, dt) => {
    const d = drive.current
    const k = 1 - Math.pow(0.0009, dt)
    target.set(d.color)
    const hsl = { h: 0, s: 0, l: 0 }
    target.getHSL(hsl)

    glassTarget.copy(target).offsetHSL(0, -0.02, hsl.l > 0.6 ? -0.03 : 0.04)
    logoTarget.copy(target).offsetHSL(0, 0, hsl.l > 0.55 ? -0.18 : 0.18)
    antTarget.copy(target).offsetHSL(0, -0.12, hsl.l > 0.5 ? -0.12 : 0.08)

    for (const mat of obj.frames) mat.color.lerp(target, k)
    for (const mat of obj.glasses) mat.color.lerp(glassTarget, k)
    for (const mat of obj.logos) mat.color.lerp(logoTarget, k)
    for (const mat of obj.antennas) mat.color.lerp(antTarget, k)

    // Brilho da tela (Ligar / Desligar)
    screenLevel.current += (d.screen - screenLevel.current) * Math.min(1, dt * 8)
    for (const mat of obj.oleds) {
      mat.emissiveIntensity = 0.92 * screenLevel.current
      mat.color.copy(offColor).lerp(screenColor, screenLevel.current)
    }

    // Atualiza o canvas da tela iOS quando a cor ou a Dynamic Island mudam
    if (interactive || model) {
      const targetIsland = d.island ?? 0
      const prevIsland = islandLevel.current
      islandLevel.current += (targetIsland - prevIsland) * Math.min(1, dt * 10)
      const needsRedraw =
        d.color !== lastDrawnColor.current ||
        Math.abs(islandLevel.current - prevIsland) > 0.003 ||
        (islandLevel.current > 0.05 && screenLevel.current > 0.1)

      if (needsRedraw) {
        lastDrawnColor.current = d.color
        const ctx = screenSurface.canvas.getContext('2d')
        if (ctx) {
          drawIosScreen(ctx, {
            hex: d.color,
            family: model?.family ?? 17,
            hasIsland: (model?.front ?? 'island') === 'island',
            island: islandLevel.current,
            time: state.clock.elapsedTime,
            mirrorX: true,
          })
          screenSurface.tex.needsUpdate = true
        }
      }
    }
  })

  return <primitive object={obj.root} />
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch() { this.props.onError?.() }
  render() { return this.state.err ? this.props.fallback : this.props.children }
}

export function preloadPhoneModel(url: string) { useLoader.preload(CachedModelLoader, url) }

// Procura o arquivo do modelo; Pro Max cai para o Pro, mini/Plus/e para o modelo base da geração
export function glbCandidates(m: Pick<PhoneModel, 'id' | 'family' | 'tier'>) {
  const list = [m.id]
  if (m.tier === 'promax') list.push(`iphone-${m.family}-pro`)
  if (m.tier === 'mini' || m.tier === 'plus' || m.tier === 'e') list.push(`iphone-${m.family}`)
  return list
}
// Lista vem do manifesto gerado no build: nenhuma requisição de teste no navegador
export function useGlb(names: string[]) {
  return modelAssetUrl(names)
}

// Enquadramento automático: afasta a câmera até o aparelho inteiro caber no quadro,
// com folga para os botões no topo e a dica embaixo — inclusive em telas estreitas de celular.
function FitCamera({ fov, tall }: { fov: number; tall: boolean }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2)
    const h = H * (tall ? 1.1 : 1) // Plus/Pro Max são ~9% mais altos
    const w = W * (tall ? 1.1 : 1) * 1.15 // folga para o giro e as bordas
    const marginY = size.height < 520 ? 1.42 : 1.3 // espaço para botões e dica sobre o 3D
    const dist = Math.max(7.2, ((h / 2) * marginY) / t, ((w / 2) * 1.25) / (t * aspect))
    camera.position.set(0, 0, dist)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, fov, tall])
  return null
}

export default function Phone3D({
  drive,
  cam,
  model,
  interactive = false,
  shadow = false,
  className,
  fov = 30,
  glb,
}: {
  drive: React.MutableRefObject<Drive>
  cam?: CamLayout
  model?: PhoneModel
  interactive?: boolean
  shadow?: boolean
  className?: string
  fov?: number
  glb?: string[]
}) {
  const { theme } = useStore()
  const drag = useRef<DragState>({ active: false, x: 0, y: 0, ry: 0, rx: 0, v: 0, t: 0 })
  const url = useGlb(glb ?? (model ? glbCandidates(model) : []))
  const [loadedUrl, setLoadedUrl] = useState<string | null>(() => url && preparedModels.has(url) ? url : null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  // Só renderiza quando a cena está na tela e a aba está visível (economiza bateria/GPU)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let onScreen = true
    const update = () => setVisible(onScreen && document.visibilityState === 'visible')
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update() }, { rootMargin: '120px' })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  // Resolução adaptativa: começa conforme o aparelho e reduz se o FPS cair
  const lowPower = typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia('(max-width: 860px)').matches)
  const [dpr, setDpr] = useState(lowPower ? 1 : 1.5)
  const procedural = <PhoneMesh drive={drive} cam={cam ?? model?.cam} model={model} />
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
    <div ref={wrap} className={className} style={{ position: 'relative', width: '100%', height: '100%', touchAction: interactive ? 'none' : undefined, cursor: interactive ? 'grab' : undefined }} {...handlers}>
      <Canvas frameloop={visible ? 'always' : 'never'} dpr={dpr} camera={{ position: [0, 0, 7.2], fov }} gl={{ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' }}>
        <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.25))} onIncline={() => setDpr((d) => Math.min(lowPower ? 1.25 : 1.75, d + 0.25))} flipflops={3} />
        <ambientLight intensity={theme === 'dark' ? 0.5 : 0.45} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <directionalLight position={[0, 1, 5]} intensity={theme === 'dark' ? 0.55 : 0.45} />
        <directionalLight position={[-4, -2, -4]} intensity={0.8} />
        <Environment resolution={lowPower ? 128 : 256} environmentIntensity={theme === 'dark' ? 0.9 : 0.85}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, 0, 8]} scale={4} />
        </Environment>
        {interactive && <FitCamera fov={fov} tall={model?.tier === 'promax' || model?.tier === 'plus'} />}
        <Rig drive={drive} drag={drag} interactive={interactive}>
          {url ? (
            <Boundary key={url} fallback={procedural} onError={() => setFailedUrl(url)}>
              <Suspense fallback={null}><GLBPhone url={url} drive={drive} model={model} interactive={interactive} onReady={setLoadedUrl} /></Suspense>
            </Boundary>
          ) : procedural}
        </Rig>
        {shadow && !lowPower && <ContactShadows position={[0, -1.75, 0]} opacity={0.35} blur={2.6} scale={6} far={3} />}
      </Canvas>
      {url && loadedUrl !== url && <div className="model-loading-overlay"><span className="model-loading" role={failedUrl === url ? 'alert' : 'status'}>{failedUrl === url ? 'Não foi possível carregar o modelo 3D. Atualize a página para tentar novamente.' : 'Carregando modelo 3D…'}</span></div>}
    </div>
  )
}
