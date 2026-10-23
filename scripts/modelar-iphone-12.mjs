// Modela com alta fidelidade o iPhone 12 e o iPhone 12 mini seguindo as referências de estúdio
// e grava public/models/iphone-12.glb, public/models/iphone-12-mini.glb e suas versões em public/models/explodido/.
// Uso: npm run modelar:iphone12
//
// Medidas físicas oficiais em metros:
//   iPhone 12      146,7 × 71,5 × 7,4 mm      iPhone 12 mini 131,5 × 64,2 × 7,4 mm
// Detalhes fiéis às imagens de referência:
//   - Laterais retas de alumínio anodizado com chanfro polido frontal/traseiro e 6 faixas de antena
//   - Lado esquerdo (+X): chave Silencioso rebaixada com indicador laranja + Volume + / − + gaveta do SIM com furo ejetor
//   - Lado direito (−X): botão lateral (Power) com friso + janela 5G mmWave em cápsula rente ao chassi
//   - Base (+Z): porta Lightning com aro metálico e pinos dourados + 2 parafusos pentalobe + furos assimétricos (4+2 no mini, 5+3 no 12) + antena
//   - Traseira (+Y): vidro brilhante, logotipo 3D centralizado, platô quadrado fosco chanfrado com 2 lentes ópticas multicamadas na esquerda,
//     microfone no canto superior direito e flash True-Tone Fresnel centralizado na coluna direita
//   - Frente (−Y): borda preta uniforme, notch largo com ombros curvos, alto-falante de chamada rebaixado, câmera TrueDepth à direita do alto-falante
//     e tela OLED com textura iOS 14 (esferas concêntricas, cadeado, 9:41, lanterna/câmera e barra Home) embutida no GLB.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const MM = 0.001

// ---------- materiais PBR ----------
const MATERIALS = {
  'Anodized aluminum': { c: [0.82, 0.80, 0.78, 1], m: 0.78, r: 0.34 },
  'Plastic antena': { c: [0.92, 0.91, 0.89, 1], m: 0, r: 0.38 },
  'Plastic port': { c: [0.05, 0.05, 0.06, 1], m: 0, r: 0.45 },
  'Mute orange': { c: [0.95, 0.42, 0.14, 1], m: 0.05, r: 0.35 },
  'Camera filter': { c: [0.04, 0.04, 0.06, 1], m: 0.1, r: 0.45 },
  LED: { c: [0.98, 0.93, 0.76, 1], m: 0, r: 0.35 },
  'Plastic LED': { c: [0.96, 0.95, 0.92, 0.78], m: 0, r: 0.28, blend: true },
  'Metal Screw': { c: [0.76, 0.77, 0.80, 1], m: 0.94, r: 0.16 },
  'Display Frame': { c: [0.02, 0.02, 0.025, 1], m: 0.04, r: 0.08 },
  'Camera sapphire miror': { c: [0.06, 0.09, 0.16, 0.55], m: 0.1, r: 0.01, blend: true },
  'Camera Lens': { c: [0.015, 0.02, 0.035, 1], m: 0.25, r: 0.02 },
  'Glass tint': { c: [0.68, 0.68, 0.70, 1], m: 0.55, r: 0.08 },
  'Frosted glass': { c: [0.95, 0.94, 0.92, 1], m: 0.02, r: 0.06 },
  Glass: { c: [0.92, 0.94, 0.96, 0.24], m: 0, r: 0.02, blend: true },
  'OLED off': { c: [0.03, 0.03, 0.035, 1], m: 0, r: 0.08 },
  OLED: { c: [1, 1, 1, 1], m: 0, r: 0.05, textured: true },
  // ---- componentes internos da versão desmontável ----
  Midframe: { c: [0.62, 0.63, 0.65, 1], m: 0.85, r: 0.38 },
  PCB: { c: [0.04, 0.09, 0.07, 1], m: 0.1, r: 0.55 },
  Chip: { c: [0.05, 0.05, 0.06, 1], m: 0.2, r: 0.35 },
  Shield: { c: [0.72, 0.73, 0.75, 1], m: 0.92, r: 0.22 },
  Battery: { c: [0.13, 0.13, 0.14, 1], m: 0.15, r: 0.6 },
  'Battery label': { c: [0.85, 0.85, 0.86, 1], m: 0, r: 0.7 },
  Magnet: { c: [0.2, 0.2, 0.22, 1], m: 0.6, r: 0.35 },
  Coil: { c: [0.76, 0.52, 0.24, 1], m: 0.9, r: 0.25 },
  'Camera body': { c: [0.08, 0.08, 0.09, 1], m: 0.4, r: 0.4 },
  Sensor: { c: [0.18, 0.2, 0.32, 1], m: 0.7, r: 0.15 },
  'Lens element': { c: [0.32, 0.52, 0.78, 0.58], m: 0.15, r: 0.02, blend: true },
  Speaker: { c: [0.06, 0.06, 0.07, 1], m: 0.1, r: 0.6 },
}

// Extrai o logotipo traseiro 3D (Glass tint C2 + C3) de iphone-17-pro.glb para proporção 100% fiel
async function loadAppleLogoGeometry() {
  try {
    const buf = await readFile('public/models/iphone-17-pro.glb')
    const jsonLen = buf.readUInt32LE(12)
    const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
    const bin = buf.subarray(28 + jsonLen)
    const getAcc = (idx) => {
      const acc = gltf.accessors[idx]
      const bv = gltf.bufferViews[acc.bufferView]
      const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0)
      const comps = { SCALAR: 1, VEC2: 2, VEC3: 3 }[acc.type]
      const Typed = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[acc.componentType]
      return new Typed(bin.buffer, bin.byteOffset + offset, acc.count * comps)
    }
    const p5 = gltf.meshes[0].primitives[5]
    const pos = getAcc(p5.attributes.POSITION)
    const ind = getAcc(p5.indices)
    const outPos = []
    const outNorm = []
    const outUv = []
    const cx = 0.0001, cz = 0.0204
    for (let i = 0; i < ind.length; i += 3) {
      const i0 = ind[i], i1 = ind[i + 1], i2 = ind[i + 2]
      const x0 = pos[i0 * 3], y0 = pos[i0 * 3 + 1], z0 = pos[i0 * 3 + 2]
      // Filtra apenas os triângulos do logotipo (Y > 0.0040 e |X| < 0.012)
      if (y0 > 0.0040 && Math.abs(x0) < 0.012) {
        for (const v of [i0, i1, i2]) {
          const lx = pos[v * 3] - cx
          const lz = pos[v * 3 + 2] - cz
          outPos.push(lx, 0, lz)
          outNorm.push(0, 1, 0)
          outUv.push(0.5, 0.5)
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(outPos), 3))
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(outNorm), 3))
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(outUv), 2))
    return g
  } catch {
    return null
  }
}

const appleLogoBaseGeo = await loadAppleLogoGeometry()

// Gera a textura JPEG da tela de bloqueio iOS 14 idêntica às imagens de referência (esferas concêntricas coral/laranja/dourado)
async function renderIos14ScreenJpeg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1100" viewBox="0 0 512 1100">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ebd7c4"/>
        <stop offset="45%" stop-color="#d8beaa"/>
        <stop offset="100%" stop-color="#b47f49"/>
      </linearGradient>
      <radialGradient id="cOuter" cx="46%" cy="52%" r="54%">
        <stop offset="0%" stop-color="#f9d8b6" stop-opacity="0.35"/>
        <stop offset="72%" stop-color="#f5ece2" stop-opacity="0.65"/>
        <stop offset="96%" stop-color="#ffffff" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="cMid" cx="38%" cy="48%" r="52%">
        <stop offset="0%" stop-color="#ff6a4d" stop-opacity="0.92"/>
        <stop offset="58%" stop-color="#f79654" stop-opacity="0.88"/>
        <stop offset="92%" stop-color="#f8d29c" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="#f8d29c" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="cInner" cx="35%" cy="46%" r="50%">
        <stop offset="0%" stop-color="#ff4738" stop-opacity="0.96"/>
        <stop offset="62%" stop-color="#fb7c4c" stop-opacity="0.92"/>
        <stop offset="95%" stop-color="##ffd19a" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="#ffd19a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="cCore" cx="32%" cy="45%" r="50%">
        <stop offset="0%" stop-color="#ff3b2f"/>
        <stop offset="68%" stop-color="#ff7a45"/>
        <stop offset="100%" stop-color="#ffbe7d"/>
      </radialGradient>
    </defs>
    <rect width="512" height="1100" fill="url(#bg)"/>
    <g transform="translate(512,0) scale(-1,1)">
      <!-- Esferas concêntricas translúcidas do iOS 14 -->
      <circle cx="256" cy="545" r="395" fill="url(#cOuter)"/>
      <circle cx="222" cy="575" r="315" fill="url(#cMid)"/>
      <circle cx="206" cy="560" r="218" fill="url(#cInner)"/>
      <circle cx="268" cy="585" r="142" fill="url(#cCore)" opacity="0.94"/>
      <circle cx="268" cy="585" r="141" fill="none" stroke="rgba(255,240,215,0.55)" stroke-width="2"/>

      <!-- Barra de status no canto superior direito -->
      <rect x="404" y="42" width="3.5" height="7" rx="1" fill="#fff"/>
      <rect x="410" y="39" width="3.5" height="10" rx="1" fill="#fff"/>
      <rect x="416" y="36" width="3.5" height="13" rx="1" fill="#fff"/>
      <rect x="422" y="33" width="3.5" height="16" rx="1" fill="#fff" opacity="0.45"/>
      <rect x="448" y="34" width="28" height="14" rx="3.5" fill="none" stroke="#fff" stroke-width="1.6"/>
      <rect x="450.5" y="36.5" width="21" height="9" rx="2" fill="#fff"/>
      <rect x="477.5" y="38.5" width="2" height="5" rx="1" fill="#fff"/>

      <!-- Cadeado iOS 14 -->
      <rect x="242" y="198" width="28" height="22" rx="5" fill="#fff"/>
      <path d="M248 198 V190 A8 8 0 0 1 264 190 V198" fill="none" stroke="#fff" stroke-width="3.2"/>

      <!-- Relógio fino e data abaixo (layout autêntico do iOS 14 nas imagens de referência) -->
      <text x="256" y="316" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="112" font-weight="200" letter-spacing="-2">9:41</text>
      <text x="256" y="362" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400">Monday, January 20</text>

      <!-- Botões de Lanterna e Câmera -->
      <circle cx="104" cy="966" r="32" fill="rgba(255,255,255,0.24)"/>
      <rect x="99" y="951" width="10" height="28" rx="3" fill="#fff"/>
      <circle cx="408" cy="966" r="32" fill="rgba(255,255,255,0.24)"/>
      <rect x="394" y="956" width="28" height="20" rx="4" fill="#fff"/>
      <circle cx="408" cy="966" r="5" fill="#d88b56"/>

      <!-- Texto e barra inferior -->
      <text x="256" y="1022" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500">Swipe up to unlock</text>
      <rect x="182" y="1058" width="148" height="6" rx="3" fill="#ffffff"/>
    </g>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
}

const ios14WallpaperJpeg = await renderIos14ScreenJpeg()

// ---------- utilitários de geometria ----------
function roundedRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  r = Math.min(r, w / 2, h / 2)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

// Placa arredondada no plano XZ, ocupando y0..y1, centrada em (cx, cz).
function slab(w, h, r, y0, y1, { cx = 0, cz = 0, bevel = 0, bevelSeg = 4, seg = 36 } = {}) {
  const d = y1 - y0
  const bt = Math.min(bevel, d * 0.46)
  const shape = roundedRect(w - 2 * bevel, h - 2 * bevel, Math.max(0.0002, r - bevel))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-6, d - 2 * bt),
    bevelEnabled: bevel > 0,
    bevelThickness: bt,
    bevelSize: bevel,
    bevelSegments: bevelSeg,
    curveSegments: seg,
  })
  g.translate(0, 0, bt)
  g.rotateX(Math.PI / 2)
  g.translate(cx, y1, cz)
  return g
}

// Moldura oca com chanfro externo (para ilhas, colares de botões e versão desmontável)
function ringSlab(wOut, hOut, rOut, wIn, hIn, rIn, y0, y1, { cx = 0, cz = 0, seg = 36 } = {}) {
  const outer = roundedRect(wOut, hOut, rOut)
  outer.holes.push(roundedRect(wIn, hIn, rIn))
  const g = new THREE.ExtrudeGeometry(outer, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg })
  g.rotateX(Math.PI / 2)
  g.translate(cx, y1, cz)
  return g
}

// Disco voltado para +Y (traseira) ou −Y (frente)
function disc(r, y, cx, cz, up = true, seg = 48) {
  const g = new THREE.CircleGeometry(r, seg)
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  g.translate(cx, y, cz)
  return g
}

// Anel circular plano voltado para +Y ou −Y
function flatRing(rIn, rOut, y, cx, cz, up = true, seg = 48) {
  const g = new THREE.RingGeometry(rIn, rOut, seg)
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  g.translate(cx, y, cz)
  return g
}

// Calota esférica (elemento óptico convexo interno da lente)
function lensDome(r, height, yBase, cx, cz, up = true, seg = 36) {
  const g = new THREE.SphereGeometry(r, seg, 16, 0, Math.PI * 2, 0, Math.PI * 0.38)
  g.scale(1, height / (r * 0.4), 1)
  if (!up) g.rotateX(Math.PI)
  g.translate(cx, yBase, cz)
  return g
}

// Cilindro ou tubo no eixo Y (lentes, flash)
function cyl(rTop, rBot, y0, y1, cx, cz, openEnded = false, seg = 48) {
  const g = new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg, 1, openEnded)
  g.translate(cx, (y0 + y1) / 2, cz)
  return g
}

// Cápsula/botão lateral com chanfro suave; eixo longo = Z, extrusão para fora da lateral (±X)
function sidePill(len, thickY, depthX, xCenter, yCenter, cz, bevel = 0.18 * MM, seg = 20) {
  const b = Math.min(bevel, thickY * 0.35, depthX * 0.4)
  const s = roundedRect(thickY - 2 * b, len - 2 * b, Math.max(0.05 * MM, (thickY - 2 * b) / 2))
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-6, depthX - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: seg,
  })
  g.translate(0, 0, -(depthX - 2 * b) / 2)
  // Atualmente X = thickY, Y = len, Z = depthX → rotaciona para X = depthX, Y = thickY, Z = len
  g.rotateY(Math.PI / 2)
  g.rotateX(Math.PI / 2)
  g.translate(xCenter, yCenter, cz)
  return g
}

// Cápsula na face inferior (z = +H/2): forma no plano XY, extrusão em Z
function bottomCapsule(lenX, heightY, x, z0, z1, r = heightY / 2, seg = 20) {
  const shape = roundedRect(lenX, heightY, Math.min(r, lenX / 2, heightY / 2))
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: seg })
  g.translate(x, 0, z0)
  return g
}

function bottomCapsuleRing(wOut, hOut, wIn, hIn, x, z0, z1, seg = 24) {
  const outer = roundedRect(wOut, hOut, hOut / 2)
  outer.holes.push(roundedRect(wIn, hIn, hIn / 2))
  const g = new THREE.ExtrudeGeometry(outer, { depth: z1 - z0, bevelEnabled: false, curveSegments: seg })
  g.translate(x, 0, z0)
  return g
}

function bottomCyl(r, x, z0, z1, seg = 28) {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg)
  g.rotateX(Math.PI / 2)
  g.translate(x, 0, (z0 + z1) / 2)
  return g
}

// Tela OLED com UV padrão do visualizador: u = (x + w/2)/w, v = 0 no topo (−Z) e v = 1 na base (+Z)
function screenPlane(w, h, r, y) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 36)
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.rotateX(Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

// Notch do iPhone 12: retângulo com cantos inferiores arredondados e ombros superiores suaves
function notch(nw, nh, topZ, y) {
  const s = new THREE.Shape()
  const rb = nh * 0.44, sh = nh * 0.32
  const x0 = -nw / 2, x1 = nw / 2
  s.moveTo(x0 - sh, 0)
  s.quadraticCurveTo(x0, 0, x0, sh)
  s.lineTo(x0, nh - rb)
  s.quadraticCurveTo(x0, nh, x0 + rb, nh)
  s.lineTo(x1 - rb, nh)
  s.quadraticCurveTo(x1, nh, x1, nh - rb)
  s.lineTo(x1, sh)
  s.quadraticCurveTo(x1, 0, x1 + sh, 0)
  s.lineTo(x0 - sh, 0)
  const g = new THREE.ShapeGeometry(s, 24)
  g.rotateX(Math.PI / 2)
  g.translate(0, y, topZ)
  return g
}

function frameRing(W, H, corner, wall, y0, y1) {
  const outer = roundedRect(W, H, corner)
  outer.holes.push(roundedRect(W - 2 * wall, H - 2 * wall, corner - wall))
  const g = new THREE.ExtrudeGeometry(outer, { depth: y1 - y0, bevelEnabled: false, curveSegments: 40 })
  g.rotateX(Math.PI / 2)
  g.translate(0, y1, 0)
  return g
}

// Constrói uma lente traseira multicamadas idêntica às referências (anel chanfrado + barril escuro + ranhuras + domo óptico + safira)
function addDetailedRearLens(add, R, yBase, lx, lz) {
  const hRing = 1.22 * MM
  const yTop = yBase + hRing
  // Colar externo de alumínio anodizado com chanfro no topo
  add('Anodized aluminum', cyl(R, R + 0.12 * MM, yBase, yTop - 0.14 * MM, lx, lz, true, 48))
  add('Anodized aluminum', cyl(R - 0.12 * MM, R, yTop - 0.14 * MM, yTop, lx, lz, true, 48))
  add('Anodized aluminum', flatRing(R - 0.58 * MM, R - 0.10 * MM, yTop + 0.005 * MM, lx, lz, true, 48))
  add('Anodized aluminum', cyl(R - 0.58 * MM, R - 0.58 * MM, yBase + 0.2 * MM, yTop, lx, lz, true, 48))

  // Barril interno preto fosco e ranhuras ópticas concêntricas
  const rGlass = R - 0.58 * MM
  add('Display Frame', disc(rGlass, yBase + 0.25 * MM, lx, lz, true, 48))
  add('Display Frame', flatRing(rGlass * 0.72, rGlass, yTop - 0.12 * MM, lx, lz, true, 48))
  add('Camera filter', flatRing(rGlass * 0.50, rGlass * 0.73, yTop - 0.18 * MM, lx, lz, true, 48))
  add('Display Frame', flatRing(rGlass * 0.36, rGlass * 0.51, yTop - 0.22 * MM, lx, lz, true, 48))

  // Elemento óptico convexo profundo + reflexo azulado de revestimento antirreflexo
  add('Camera Lens', disc(rGlass * 0.42, yTop - 0.24 * MM, lx, lz, true, 40))
  add('Camera Lens', lensDome(rGlass * 0.38, 0.32 * MM, yTop - 0.24 * MM, lx, lz, true, 36))
  add('Lens element', flatRing(rGlass * 0.18, rGlass * 0.31, yTop - 0.10 * MM, lx, lz, true, 36))

  // Cristal de safira frontal
  add('Camera sapphire miror', disc(rGlass * 0.98, yTop - 0.04 * MM, lx, lz, true, 48))
}

function buildIphone12({ id, W, H, D, corner, cam }, exploded = false) {
  const parts = {}
  let current = 'DeviceBody'
  const add = (mat, g, part = current) => {
    if (!g) return
    ;((parts[part] ??= {})[mat] ??= []).push(g)
  }
  const hy = D / 2

  // 1. Chassi / Moldura de alumínio com laterais retas e chanfro polido de 0,32 mm
  if (exploded) {
    add('Anodized aluminum', frameRing(W, H, corner, 1.6 * MM, -hy, hy))
  } else {
    add('Anodized aluminum', slab(W, H, corner, -hy, hy, { bevel: 0.32 * MM, bevelSeg: 4, seg: 44 }))
  }

  // 2. Seis faixas plásticas de antena (laterais, topo à direita e base à esquerda)
  const bandT = 1.05 * MM
  const bandH = D - 0.68 * MM
  for (const sx of [-1, 1]) {
    for (const zPos of [-H / 2 + 13.2 * MM, H / 2 - 13.2 * MM]) {
      const g = new THREE.BoxGeometry(0.14 * MM, bandH, bandT)
      g.translate(sx * (W / 2 + 0.01 * MM), 0, zPos)
      add('Plastic antena', g)
    }
  }
  {
    // Antena superior (visível nas fotos frontais/traseiras no lado −X)
    const gTop = new THREE.BoxGeometry(bandT, bandH, 0.14 * MM)
    gTop.translate(-W / 2 + 15.2 * MM * cam.k, 0, -H / 2 - 0.01 * MM)
    add('Plastic antena', gTop)
    // Antena inferior (visível na foto da base ao lado dos 2 furos de microfone, lado +X)
    const gBot = new THREE.BoxGeometry(bandT, bandH, 0.14 * MM)
    gBot.translate(W / 2 - 15.2 * MM * cam.k, 0, H / 2 + 0.01 * MM)
    add('Plastic antena', gBot)
  }

  // 3. Traseira de vidro brilhante + Logotipo 3D + Módulo de câmera quadrado chanfrado
  current = 'RearPanel'
  // Aro metálico perimetral sutil + painel de vidro traseiro
  add('Frosted glass', slab(W - 0.85 * MM, H - 0.85 * MM, corner - 0.42 * MM, hy - 0.35 * MM, hy + 0.03 * MM, { bevel: 0.16 * MM, seg: 44 }))

  // Logotipo 3D centralizado na traseira
  if (appleLogoBaseGeo) {
    const logoG = appleLogoBaseGeo.clone()
    const logoScale = cam.k * 0.96
    logoG.scale(logoScale, 1, logoScale)
    logoG.translate(0, hy + 0.055 * MM, 0)
    add('Glass tint', logoG)
  }

  // Platô quadrado de câmera com borda chanfrada translúcida (como nas referências)
  const sq = cam.size, sqR = cam.radius
  const sqCx = -W / 2 + cam.margin + sq / 2
  const sqCz = -H / 2 + cam.margin + sq / 2
  const plateauTop = hy + 0.95 * MM
  add('Glass', slab(sq + 0.45 * MM, sq + 0.45 * MM, sqR + 0.22 * MM, hy, plateauTop - 0.08 * MM, { cx: sqCx, cz: sqCz, bevel: 0.42 * MM, seg: 32 }))
  add('Frosted glass', slab(sq, sq, sqR, hy + 0.02 * MM, plateauTop, { cx: sqCx, cz: sqCz, bevel: 0.28 * MM, seg: 32 }))

  // Duas lentes ópticas multicamadas na coluna esquerda do módulo
  const lensX = sqCx - sq / 2 + cam.lensInset
  const lensZTop = sqCz - sq / 2 + cam.lensInset
  const lensZBot = sqCz + sq / 2 - cam.lensInset
  addDetailedRearLens(add, cam.ring, plateauTop, lensX, lensZTop)
  addDetailedRearLens(add, cam.ring, plateauTop, lensX, lensZBot)

  // Coluna direita do módulo: Microfone no topo + Flash True-Tone Fresnel centralizado (exatamente como nas fotos)
  const rightX = sqCx + sq / 2 - cam.lensInset * 0.78
  const micZ = lensZTop + 0.6 * MM
  add('Plastic port', flatRing(0.55 * MM, 0.82 * MM, plateauTop + 0.02 * MM, rightX, micZ, true, 28))
  add('Plastic port', disc(0.56 * MM, plateauTop + 0.01 * MM, rightX, micZ, true, 28))
  add('Metal Screw', disc(0.42 * MM, plateauTop + 0.015 * MM, rightX, micZ, true, 24))

  // Flash True-Tone no centro vertical do módulo
  const flashZ = sqCz + 0.15 * MM
  const rFlash = cam.flash
  add('Metal Screw', cyl(rFlash + 0.18 * MM, rFlash + 0.22 * MM, plateauTop, plateauTop + 0.12 * MM, rightX, flashZ, true, 36))
  add('Metal Screw', flatRing(rFlash, rFlash + 0.20 * MM, plateauTop + 0.125 * MM, rightX, flashZ, true, 36))
  add('LED', disc(rFlash * 0.96, plateauTop + 0.06 * MM, rightX, flashZ, true, 36))
  add('Plastic LED', flatRing(rFlash * 0.35, rFlash * 0.68, plateauTop + 0.09 * MM, rightX, flashZ, true, 36))
  add('Plastic LED', disc(rFlash, plateauTop + 0.115 * MM, rightX, flashZ, true, 36))

  // 4. Frente: borda preta (Display Frame), tela OLED iOS 14, Notch largo, alto-falante e câmera TrueDepth
  const fy = -hy
  current = 'Display'
  add('Display Frame', slab(W - 0.8 * MM, H - 0.8 * MM, corner - 0.4 * MM, fy - 0.015 * MM, fy + 0.42 * MM, { bevel: 0.12 * MM, seg: 44 }))
  const sw = W - 4.3 * MM, sh = H - 4.3 * MM
  add('OLED', screenPlane(sw, sh, corner - 2.15 * MM, fy - 0.032 * MM))

  // Notch largo do iPhone 12 com alto-falante central e câmera frontal à direita (na visão frontal = −X local)
  const nw = cam.notchW, nh = cam.notchH
  add('OLED off', notch(nw, nh, -sh / 2 - 0.15 * MM, fy - 0.052 * MM))
  const earZ = -sh / 2 + nh * 0.42
  {
    const earOuter = new THREE.ShapeGeometry(roundedRect(nw * 0.34, 1.05 * MM, 0.52 * MM), 16)
    earOuter.rotateX(Math.PI / 2)
    earOuter.translate(0, fy - 0.062 * MM, earZ)
    add('Plastic port', earOuter)

    const earMesh = new THREE.ShapeGeometry(roundedRect(nw * 0.31, 0.72 * MM, 0.36 * MM), 16)
    earMesh.rotateX(Math.PI / 2)
    earMesh.translate(0, fy - 0.068 * MM, earZ)
    add('Metal Screw', earMesh)
  }
  // Câmera frontal TrueDepth à direita do alto-falante quando visto de frente (−X no espaço local)
  const fCamX = -nw * 0.22
  add('Camera filter', disc(1.18 * MM, fy - 0.062 * MM, fCamX, earZ, false, 32))
  add('Camera Lens', disc(0.82 * MM, fy - 0.068 * MM, fCamX, earZ, false, 32))
  add('Lens element', flatRing(0.22 * MM, 0.48 * MM, fy - 0.072 * MM, fCamX, earZ, false, 28))

  // Cobertura Ceramic Shield frontal
  add('Glass', slab(W - 0.75 * MM, H - 0.75 * MM, corner - 0.38 * MM, fy - 0.32 * MM, fy - 0.02 * MM, { bevel: 0.10 * MM, seg: 44 }), 'FrontGlass')

  // 5. Botões laterais, chave Silencioso com indicador laranja, gaveta do SIM e janela 5G mmWave
  current = 'DeviceBody'
  const btnT = 1.95 * MM
  const btnP = 0.52 * MM

  // Lado direito visto de frente (−X): Botão Power + janela 5G mmWave abaixo
  const pwrZ = -H / 2 + 44.5 * MM * cam.k
  const pwrLen = 17.6 * MM * cam.k
  add('Plastic port', sidePill(pwrLen + 0.5 * MM, btnT + 0.45 * MM, 0.18 * MM, -W / 2, 0, pwrZ, 0.04 * MM))
  add('Anodized aluminum', sidePill(pwrLen, btnT, btnP * 2, -W / 2 - btnP * 0.45, 0, pwrZ, 0.22 * MM))

  // Janela 5G mmWave (cápsula rente à lateral −X, abaixo do botão Power, visível nas referências)
  const mmwZ = -H / 2 + 82.5 * MM * cam.k
  const mmwLen = 19.5 * MM * cam.k
  add('Plastic port', sidePill(mmwLen + 0.4 * MM, 3.3 * MM, 0.14 * MM, -W / 2, 0, mmwZ, 0.03 * MM))
  add('Plastic antena', sidePill(mmwLen, 2.95 * MM, 0.18 * MM, -W / 2 - 0.01 * MM, 0, mmwZ, 0.06 * MM))

  // Lado esquerdo visto de frente (+X): Chave Silencioso (com faixa laranja) + Volume + / − + Gaveta do SIM com furo
  const muteZ = -H / 2 + 26.2 * MM * cam.k
  const muteLen = 6.8 * MM * cam.k
  // Cavidade da chave Silencioso + faixa laranja + alavanca metálica deslocada
  add('Plastic port', sidePill(muteLen, 2.15 * MM, 0.22 * MM, W / 2, 0, muteZ, 0.05 * MM))
  add('Mute orange', sidePill(muteLen - 0.7 * MM, 0.75 * MM, 0.26 * MM, W / 2 + 0.01 * MM, -0.45 * MM, muteZ, 0.04 * MM))
  add('Anodized aluminum', sidePill(muteLen - 0.5 * MM, 1.05 * MM, btnP * 1.8, W / 2 + btnP * 0.38, 0.38 * MM, muteZ, 0.16 * MM))

  // Botões de Volume + e Volume −
  for (const vz of [-H / 2 + 39.2 * MM * cam.k, -H / 2 + 52.8 * MM * cam.k]) {
    const vLen = 10.6 * MM * cam.k
    add('Plastic port', sidePill(vLen + 0.45 * MM, btnT + 0.42 * MM, 0.18 * MM, W / 2, 0, vz, 0.04 * MM))
    add('Anodized aluminum', sidePill(vLen, btnT, btnP * 2, W / 2 + btnP * 0.45, 0, vz, 0.22 * MM))
  }

  // Gaveta do SIM + furo circular do ejetor (lado +X, parte inferior)
  const simZ = -H / 2 + 88.5 * MM * cam.k
  const simLen = 15.8 * MM * cam.k
  add('Plastic port', sidePill(simLen, 2.25 * MM, 0.16 * MM, W / 2, 0, simZ, 0.03 * MM))
  add('Anodized aluminum', sidePill(simLen - 0.38 * MM, 1.88 * MM, 0.20 * MM, W / 2 + 0.005 * MM, 0, simZ, 0.04 * MM))
  // Furo do ejetor na parte de baixo da gaveta do SIM
  {
    const pinHole = new THREE.CylinderGeometry(0.48 * MM, 0.48 * MM, 0.28 * MM, 24)
    pinHole.rotateZ(Math.PI / 2)
    pinHole.translate(W / 2 + 0.02 * MM, 0, simZ + simLen * 0.31)
    add('Plastic port', pinHole)
  }

  // 6. Base (+Z): Porta Lightning com aro metálico e pinos dourados + 2 parafusos pentalobe + furos de som assimétricos
  const bz = H / 2
  add('Metal Screw', bottomCapsuleRing(9.1 * MM, 3.05 * MM, 8.2 * MM, 2.25 * MM, 0, bz - 0.15 * MM, bz + 0.08 * MM))
  add('Plastic port', bottomCapsule(8.25 * MM, 2.28 * MM, 0, bz - 0.35 * MM, bz + 0.05 * MM))
  // Pinos de contato dourados no interior da porta Lightning
  for (let p = -3.5; p <= 3.5; p += 1) {
    const pin = new THREE.BoxGeometry(0.42 * MM, 0.22 * MM, 0.16 * MM)
    pin.translate(p * 0.82 * MM, 0.65 * MM, bz - 0.02 * MM)
    add('Coil', pin)
  }

  // Dois parafusos pentalobe ladeando a porta Lightning
  for (const sx of [-1, 1]) {
    const px = sx * 5.75 * MM
    add('Metal Screw', bottomCyl(0.68 * MM, px, bz - 0.15 * MM, bz + 0.07 * MM, 28))
    add('Plastic port', bottomCyl(0.24 * MM, px, bz - 0.10 * MM, bz + 0.08 * MM, 6))
  }

  // Furos de alto-falante à esquerda (lado −X: 4 no mini, 5 no 12) e microfone à direita (lado +X: 2 no mini, 3 no 12)
  const leftHoles = id === 'iphone-12-mini' ? 4 : 5
  const rightHoles = id === 'iphone-12-mini' ? 2 : 3
  for (let i = 0; i < leftHoles; i++) {
    const hx = -(9.2 * MM + i * 2.15 * MM)
    add('Plastic port', bottomCyl(0.62 * MM, hx, bz - 0.20 * MM, bz + 0.06 * MM, 24))
    add('Metal Screw', bottomCyl(0.44 * MM, hx, bz - 0.22 * MM, bz + 0.03 * MM, 20))
  }
  for (let i = 0; i < rightHoles; i++) {
    const hx = 9.2 * MM + i * 2.15 * MM
    add('Plastic port', bottomCyl(0.62 * MM, hx, bz - 0.20 * MM, bz + 0.06 * MM, 24))
    add('Metal Screw', bottomCyl(0.44 * MM, hx, bz - 0.22 * MM, bz + 0.03 * MM, 20))
  }

  if (exploded) addInternals({ W, H, D, corner, cam, add, sqCx, sqCz, lensX, sq })

  // Une por peça e material
  const merge = (list) => {
    const geos = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g.clone()
      if (!n.attributes.normal) n.computeVertexNormals()
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
      return n
    })
    return mergeGeometries(geos, false)
  }

  const out = {}
  if (!exploded) {
    const all = {}
    for (const byMat of Object.values(parts)) for (const [mat, list] of Object.entries(byMat)) (all[mat] ??= []).push(...list)
    out.Phone = Object.fromEntries(Object.entries(all).map(([m, l]) => [m, merge(l)]))
  } else {
    for (const [part, byMat] of Object.entries(parts)) out[part] = Object.fromEntries(Object.entries(byMat).map(([m, l]) => [m, merge(l)]))
  }
  return out
}

// ---------- componentes internos da versão desmontável ----------
function addInternals({ W, H, D, corner, cam, add, sqCx, sqCz, lensX, sq }) {
  const hy = D / 2
  const inW = W - 3.6 * MM, inH = H - 3.6 * MM
  add('Midframe', slab(inW, inH, corner - 1.8 * MM, -2.0 * MM, -1.45 * MM, { seg: 24 }), 'MidFrame')

  const bTop = -H / 2 + 3 * MM, bH = 33 * MM * cam.k
  const camEdge = sqCx + sq / 2 + 0.8 * MM
  const boardW = W / 2 - 2.4 * MM - camEdge
  const bx = camEdge + boardW / 2, bz = bTop + bH / 2
  add('PCB', slab(boardW, bH, 2 * MM, -1.4 * MM, -0.6 * MM, { cx: bx, cz: bz }), 'MainBoard')
  add('PCB', slab(W - 6 * MM, 9 * MM * cam.k, 2 * MM, -1.4 * MM, -0.6 * MM, { cx: 0, cz: bTop + bH + 2 * MM }), 'MainBoard')
  add('Chip', slab(11 * MM * cam.k, 11 * MM * cam.k, 1 * MM, -0.6 * MM, 0.1 * MM, { cx: bx - 1 * MM, cz: bz - 5 * MM }), 'MainBoard')
  add('Shield', slab(boardW - 2 * MM, 9 * MM * cam.k, 0.8 * MM, -0.6 * MM, 0.05 * MM, { cx: bx, cz: bz + 9 * MM * cam.k }), 'MainBoard')
  add('Chip', slab(6 * MM, 4 * MM, 0.6 * MM, -0.6 * MM, -0.1 * MM, { cx: -W / 2 + 12 * MM, cz: bTop + bH + 2 * MM }), 'MainBoard')

  const lensZs = [sqCz - sq / 2 + cam.lensInset, sqCz + sq / 2 - cam.lensInset]
  lensZs.forEach((lz) => {
    add('Camera body', slab(cam.ring * 2.1, cam.ring * 2.1, 1.5 * MM, -1.4 * MM, 1.0 * MM, { cx: lensX, cz: lz }), 'CameraModule')
    add('Camera body', cyl(cam.ring * 0.92, cam.ring * 0.92, 1.0 * MM, hy + 0.6 * MM, lensX, lz), 'CameraModule')
    add('Sensor', slab(cam.ring * 1.25, cam.ring * 1.05, 0.4 * MM, -1.45 * MM, -1.38 * MM, { cx: lensX, cz: lz }), 'CameraSensors')
    for (let i = 0; i < 4; i++) {
      const y = -0.6 * MM + i * 0.9 * MM
      add('Lens element', cyl(cam.ring * (0.62 - i * 0.06), cam.ring * (0.62 - i * 0.06), y, y + 0.22 * MM, lensX, lz, false, 36), `CameraLenses${i}`)
    }
  })

  add('Camera body', slab(cam.notchW * 0.7, 4.2 * MM, 1.2 * MM, -3.0 * MM, -2.05 * MM, { cx: 0, cz: -H / 2 + 6.5 * MM }), 'TrueDepth')
  add('Sensor', disc(0.9 * MM, -3.02 * MM, -cam.notchW * 0.22, -H / 2 + 6.5 * MM, false, 24), 'TrueDepth')

  {
    const bw = W - 6.5 * MM, z0 = bTop + bH + 7.5 * MM * cam.k, z1 = H / 2 - 17 * MM * cam.k
    const s = new THREE.Shape()
    const x0 = -bw / 2, x1 = bw / 2, cut = 12 * MM * cam.k
    s.moveTo(x0, z0 + cut); s.lineTo(x0 + bw * 0.45, z0 + cut); s.lineTo(x0 + bw * 0.45, z0); s.lineTo(x1, z0); s.lineTo(x1, z1); s.lineTo(x0, z1); s.lineTo(x0, z0 + cut)
    const g = new THREE.ExtrudeGeometry(s, { depth: 3.0 * MM, bevelEnabled: true, bevelThickness: 0.25 * MM, bevelSize: 0.6 * MM, bevelSegments: 2 })
    g.translate(0, 0, 0.25 * MM); g.rotateX(Math.PI / 2); g.translate(0, 2.3 * MM, 0)
    add('Battery', g, 'Battery')
    const lab = new THREE.ShapeGeometry(roundedRect(bw * 0.5, (z1 - z0) * 0.35, 1 * MM), 6)
    lab.rotateX(-Math.PI / 2); lab.translate(bw * 0.12, 2.32 * MM, (z0 + z1) / 2 + 4 * MM)
    add('Battery label', lab, 'Battery')
  }

  {
    const cz = 4 * MM * cam.k, ro = 23 * MM * cam.k, ri = 19.8 * MM * cam.k
    const ring = new THREE.Shape(); ring.absarc(0, 0, ro, 0, Math.PI * 2, false)
    const hole = new THREE.Path(); hole.absarc(0, 0, ri, 0, Math.PI * 2, true); ring.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(ring, { depth: 0.6 * MM, bevelEnabled: false, curveSegments: 64 })
    g.rotateX(Math.PI / 2); g.translate(0, 3.0 * MM, cz)
    add('Magnet', g, 'MagSafe')
    for (let k = 0; k < 6; k++) {
      const r1 = 15 * MM * cam.k - k * 1.9 * MM * cam.k, r2 = r1 - 1.1 * MM * cam.k
      if (r2 <= 0) break
      const c = new THREE.Shape(); c.absarc(0, 0, r1, 0, Math.PI * 2, false)
      const h = new THREE.Path(); h.absarc(0, 0, r2, 0, Math.PI * 2, true); c.holes.push(h)
      const cg = new THREE.ExtrudeGeometry(c, { depth: 0.35 * MM, bevelEnabled: false, curveSegments: 48 })
      cg.rotateX(Math.PI / 2); cg.translate(0, 2.95 * MM, cz)
      add('Coil', cg, 'MagSafe')
    }
  }

  add('Shield', slab(15 * MM * cam.k, 7 * MM, 1 * MM, -1.4 * MM, 1.6 * MM, { cx: -W / 2 + 12 * MM, cz: H / 2 - 9 * MM }), 'Taptic')
  add('Speaker', slab(16 * MM * cam.k, 8 * MM, 1.5 * MM, -1.4 * MM, 1.8 * MM, { cx: W / 2 - 12.5 * MM, cz: H / 2 - 9 * MM }), 'Speaker')
}

// ---------- gravação GLB (glTF 2.0 binário com textura iOS 14 embutida) ----------
function toGLB(name, nodesIn) {
  const chunks = []
  let offset = 0
  const bufferViews = [], accessors = [], materials = [], meshes = [], children = []
  const matIndex = {}

  const pushBytes = (bytes, target) => {
    const pad = (4 - (bytes.length % 4)) % 4
    const bv = { buffer: 0, byteOffset: offset, byteLength: bytes.length }
    if (target) bv.target = target
    bufferViews.push(bv)
    chunks.push(bytes, Buffer.alloc(pad))
    offset += bytes.length + pad
    return bufferViews.length - 1
  }

  const pushTyped = (arr, target) => pushBytes(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), target)

  for (const [nodeName, groups] of Object.entries(nodesIn)) {
    const primitives = []
    for (const [matName, g] of Object.entries(groups)) {
      const def = MATERIALS[matName]
      if (matIndex[matName] === undefined) {
        matIndex[matName] = materials.length
        if (def.textured) {
          materials.push({
            name: matName,
            pbrMetallicRoughness: {
              baseColorTexture: { index: 0 },
              metallicFactor: def.m,
              roughnessFactor: def.r,
            },
            emissiveTexture: { index: 0 },
            emissiveFactor: [0.92, 0.92, 0.92],
            doubleSided: true,
          })
        } else {
          materials.push({
            name: matName,
            pbrMetallicRoughness: { baseColorFactor: def.c, metallicFactor: def.m, roughnessFactor: def.r },
            ...(def.blend ? { alphaMode: 'BLEND' } : {}),
            doubleSided: true,
          })
        }
      }
      const mi = matIndex[matName]
      const pos = g.attributes.position.array, nrm = g.attributes.normal.array, uv = g.attributes.uv.array
      const count = pos.length / 3
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < count; i++) {
        for (let k = 0; k < 3; k++) {
          const v = pos[i * 3 + k]
          if (v < mn[k]) mn[k] = v
          if (v > mx[k]) mx[k] = v
        }
      }
      const n32 = new Float32Array(nrm)
      for (let i = 0; i < count; i++) {
        const l = Math.hypot(n32[i * 3], n32[i * 3 + 1], n32[i * 3 + 2]) || 1
        n32[i * 3] /= l; n32[i * 3 + 1] /= l; n32[i * 3 + 2] /= l
      }
      const a = accessors.length
      accessors.push({ bufferView: pushTyped(new Float32Array(pos), 34962), componentType: 5126, count, type: 'VEC3', min: mn, max: mx })
      accessors.push({ bufferView: pushTyped(n32, 34962), componentType: 5126, count, type: 'VEC3' })
      accessors.push({ bufferView: pushTyped(new Float32Array(uv), 34962), componentType: 5126, count, type: 'VEC2' })
      primitives.push({ attributes: { POSITION: a, NORMAL: a + 1, TEXCOORD_0: a + 2 }, material: mi, mode: 4 })
    }
    meshes.push({ name: nodeName, primitives })
    children.push(nodeName)
  }

  // Embute a imagem JPEG da tela iOS 14 para o material OLED
  const wallpaperBv = pushBytes(ios14WallpaperJpeg)

  const single = children.length === 1
  const nodes = single
    ? [{ name, mesh: 0, rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] }]
    : [{ name, rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2], children: children.map((_, i) => i + 1) }, ...children.map((n, i) => ({ name: n, mesh: i }))]
  const json = {
    asset: { version: '2.0', generator: 'Argento modelar-iphone-12.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials,
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ name: 'ios14-wallpaper', mimeType: 'image/jpeg', bufferView: wallpaperBv }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  }
  const bin = Buffer.concat(chunks)
  let jsonBuf = Buffer.from(JSON.stringify(json))
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)])
  const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8)
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8)
  jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4)
  bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, jh, jsonBuf, bh, bin])
}

const SPECS = [
  {
    id: 'iphone-12',
    name: 'iPhone 12',
    W: 71.5 * MM,
    H: 146.7 * MM,
    D: 7.4 * MM,
    corner: 10.3 * MM,
    cam: { k: 1, size: 26.6 * MM, radius: 6.8 * MM, margin: 3.6 * MM, lensInset: 7.2 * MM, ring: 5.75 * MM, flash: 2.35 * MM, notchW: 34.6 * MM, notchH: 5.9 * MM },
  },
  {
    id: 'iphone-12-mini',
    name: 'iPhone 12 mini',
    W: 64.2 * MM,
    H: 131.5 * MM,
    D: 7.4 * MM,
    corner: 9.3 * MM,
    cam: { k: 0.9, size: 24.8 * MM, radius: 6.4 * MM, margin: 3.3 * MM, lensInset: 6.7 * MM, ring: 5.35 * MM, flash: 2.15 * MM, notchW: 32.8 * MM, notchH: 5.8 * MM },
  },
]

await mkdir('public/models/explodido', { recursive: true })
const versions = {}
for (const s of SPECS) {
  const glb = toGLB(s.name, buildIphone12(s))
  await writeFile(`public/models/${s.id}.glb`, glb)
  console.log(`✓ public/models/${s.id}.glb  ${(glb.length / 1024).toFixed(0)} KB`)
  const ex = toGLB(s.name, buildIphone12(s, true))
  await writeFile(`public/models/explodido/${s.id}.glb`, ex)
  versions[s.id] = createHash('sha256').update(ex).digest('hex').slice(0, 12)
  console.log(`✓ public/models/explodido/${s.id}.glb  ${(ex.length / 1024).toFixed(0)} KB`)
}
// mescla com as versões já existentes (ex.: iphone-17-pro, gerado por modelar-iphone-17-pro-explodido.mjs)
const previousVersions = JSON.parse(await readFile('src/data/explodidos.json', 'utf8').catch(() => '{}'))
await writeFile('src/data/explodidos.json', JSON.stringify({ ...previousVersions, ...versions }, null, 1) + '\n')
