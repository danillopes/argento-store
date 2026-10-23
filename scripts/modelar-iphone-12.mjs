// Modela com fotorrealismo de estúdio o iPhone 12 e o iPhone 12 mini seguindo as 11 referências
// e grava public/models/iphone-12.glb, public/models/iphone-12-mini.glb e suas versões em public/models/explodido/.
// Uso: npm run modelar:iphone12
//
// Melhorias de realismo fotográfico implementadas:
//   1. Curvatura contínua G2 "Apple Squircle" (superelipse n=4.2) nos cantos do chassi, tela e módulo de câmera
//   2. Separação entre alumínio acetinado das laterais ('Anodized aluminum') e chanfro polido de 45° ('finish-chamfer')
//   3. 4 texturas PBR de alta definição geradas via sharp e embutidas no .glb:
//      - Texture 0: Lock Screen oficial do iOS 14 (1024×2200) com esferas concêntricas, cadeado, 9:41 fino e ícones translúcidos
//      - Texture 1: Óptica multicamadas das lentes traseiras/frontal (512×512) com anéis antirreflexo e reflexo safira azul/violeta
//      - Texture 2: Flash True-Tone com anéis concêntricos de Fresnel e duplo LED âmbar/marfim (512×512)
//      - Texture 3: Malha acústica metálica (honeycomb 256×256) no receptor do Notch, microfone traseiro e furos da base
//   4. Extensões glTF 2.0 físicas (KHR_materials_clearcoat, KHR_materials_ior, KHR_materials_specular)
//   5. Sombras de contato (Ambient Occlusion geométrico) ao redor dos botões, chave Mute laranja, gaveta SIM, 5G mmWave e anéis de lente
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const MM = 0.001

// ---------- materiais PBR + extensões físicas glTF 2.0 ----------
const MATERIALS = {
  'Anodized aluminum': {
    c: [0.82, 0.80, 0.78, 1],
    m: 0.78,
    r: 0.34,
  },
  'finish-chamfer': {
    c: [0.88, 0.86, 0.84, 1],
    m: 0.90,
    r: 0.14,
    ext: { KHR_materials_clearcoat: { clearcoatFactor: 0.35, clearcoatRoughnessFactor: 0.08 } },
  },
  'Plastic antena': { c: [0.92, 0.91, 0.89, 1], m: 0, r: 0.38 },
  'Plastic port': { c: [0.025, 0.025, 0.032, 1], m: 0, r: 0.55 },
  'Mute orange': { c: [0.96, 0.38, 0.11, 1], m: 0.04, r: 0.30 },
  'Camera filter': { c: [0.03, 0.035, 0.055, 1], m: 0.18, r: 0.32 },
  LED: {
    c: [1, 1, 1, 1],
    m: 0.05,
    r: 0.22,
    texIndex: 2,
    emissiveTexIndex: 2,
    emissiveFactor: [0.18, 0.16, 0.12],
  },
  'Plastic LED': {
    c: [0.98, 0.96, 0.92, 0.42],
    m: 0,
    r: 0.12,
    blend: true,
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.04 },
      KHR_materials_ior: { ior: 1.49 },
    },
  },
  'Metal Screw': { c: [0.82, 0.83, 0.86, 1], m: 0.95, r: 0.14 },
  'Acoustic mesh': {
    c: [0.75, 0.76, 0.78, 1],
    m: 0.65,
    r: 0.48,
    texIndex: 3,
  },
  'Display Frame': { c: [0.015, 0.015, 0.02, 1], m: 0.05, r: 0.06 },
  'Camera sapphire miror': {
    c: [0.08, 0.14, 0.26, 0.24],
    m: 0.1,
    r: 0.01,
    blend: true,
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.01 },
      KHR_materials_ior: { ior: 1.77 },
      KHR_materials_specular: { specularFactor: 1.0, specularColorFactor: [0.38, 0.62, 0.98] },
    },
  },
  'Camera Lens': {
    c: [1, 1, 1, 1],
    m: 0.18,
    r: 0.03,
    texIndex: 1,
    emissiveTexIndex: 1,
    emissiveFactor: [0.32, 0.35, 0.42],
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.015 },
      KHR_materials_ior: { ior: 1.62 },
    },
  },
  'Camera Lens Bot': {
    c: [1, 1, 1, 1],
    m: 0.18,
    r: 0.03,
    texIndex: 4,
    emissiveTexIndex: 4,
    emissiveFactor: [0.32, 0.35, 0.42],
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.015 },
      KHR_materials_ior: { ior: 1.62 },
    },
  },
  'Glass tint': {
    c: [0.70, 0.70, 0.72, 1],
    m: 0.68,
    r: 0.06,
    ext: { KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.02 } },
  },
  'Frosted glass': {
    c: [0.95, 0.94, 0.92, 1],
    m: 0.04,
    r: 0.06,
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.025 },
      KHR_materials_ior: { ior: 1.52 },
    },
  },
  'Frosted bump': {
    c: [0.93, 0.92, 0.90, 1],
    m: 0.06,
    r: 0.34,
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 0.42, clearcoatRoughnessFactor: 0.20 },
      KHR_materials_ior: { ior: 1.52 },
    },
  },
  Glass: {
    c: [0.94, 0.96, 0.98, 0.22],
    m: 0,
    r: 0.02,
    blend: true,
    ext: {
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.015 },
      KHR_materials_ior: { ior: 1.55 },
    },
  },
  'OLED off': { c: [0.02, 0.02, 0.025, 1], m: 0, r: 0.08 },
  OLED: {
    c: [1, 1, 1, 1],
    m: 0,
    r: 0.04,
    texIndex: 0,
    emissiveTexIndex: 0,
    emissiveFactor: [0.94, 0.94, 0.94],
    ext: { KHR_materials_clearcoat: { clearcoatFactor: 0.85, clearcoatRoughnessFactor: 0.03 } },
  },
  // ---- componentes internos da versão desmontável ----
  Midframe: { c: [0.62, 0.63, 0.65, 1], m: 0.85, r: 0.38 },
  PCB: { c: [0.04, 0.09, 0.07, 1], m: 0.1, r: 0.55 },
  Chip: { c: [0.05, 0.05, 0.06, 1], m: 0.2, r: 0.35 },
  Shield: { c: [0.72, 0.73, 0.75, 1], m: 0.92, r: 0.22 },
  Battery: { c: [0.13, 0.13, 0.14, 1], m: 0.15, r: 0.6 },
  'Battery label': { c: [0.85, 0.85, 0.86, 1], m: 0, r: 0.7 },
  Magnet: { c: [0.2, 0.2, 0.22, 1], m: 0.6, r: 0.35 },
  Coil: { c: [0.84, 0.62, 0.26, 1], m: 0.94, r: 0.18 },
  'Camera body': { c: [0.08, 0.08, 0.09, 1], m: 0.4, r: 0.4 },
  Sensor: { c: [0.18, 0.2, 0.32, 1], m: 0.7, r: 0.15 },
  'Lens element': { c: [0.28, 0.52, 0.86, 0.48], m: 0.15, r: 0.02, blend: true },
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
      const x0 = pos[i0 * 3], y0 = pos[i0 * 3 + 1]
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

// ---------- Geradores das 4 Texturas PBR Fotorrealistas ----------

// 1. Wallpaper Oficial de Estúdio do iPhone 12 (idêntico às fotos reais 1, 2 e 3: esferas concêntricas luminosas sem poluição visual)
async function renderIos14ScreenJpeg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="2200" viewBox="0 0 512 1100">
    <defs>
      <linearGradient id="bg" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stop-color="#e5d0b8"/>
        <stop offset="28%" stop-color="#c9ae92"/>
        <stop offset="72%" stop-color="#9e6d36"/>
        <stop offset="100%" stop-color="#693e0e"/>
      </linearGradient>
      <!-- Grande esfera externa (preenche quase toda a altura da tela com borda superior creme e base âmbar dourada) -->
      <radialGradient id="sphereOuter" cx="44%" cy="46%" r="54%" fx="32%" fy="36%">
        <stop offset="0%" stop-color="#f2c58d" stop-opacity="0.45"/>
        <stop offset="58%" stop-color="#e8b878" stop-opacity="0.62"/>
        <stop offset="86%" stop-color="#f7e6ce" stop-opacity="0.88"/>
        <stop offset="97%" stop-color="#fff9f0" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="#fff9f0" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="outerAmberGlow" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="65%" stop-color="#f5a623" stop-opacity="0.28"/>
        <stop offset="95%" stop-color="#ffc83b" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="#b8740f" stop-opacity="0"/>
      </linearGradient>
      <!-- Esfera média deslocada para a esquerda (coral alaranjado à esquerda + borda creme luminosa à direita) -->
      <radialGradient id="sphereMid" cx="30%" cy="52%" r="58%" fx="22%" fy="50%">
        <stop offset="0%" stop-color="#ff5a2e" stop-opacity="0.96"/>
        <stop offset="45%" stop-color="#f98c48" stop-opacity="0.94"/>
        <stop offset="78%" stop-color="#fbd29d" stop-opacity="0.95"/>
        <stop offset="96%" stop-color="#fff3df" stop-opacity="0.98"/>
        <stop offset="100%" stop-color="#fff3df" stop-opacity="0"/>
      </radialGradient>
      <!-- Esfera central (núcleo vermelho-coral vibrante com halo dourado/pêssego na borda direita) -->
      <radialGradient id="sphereCore" cx="34%" cy="52%" r="56%" fx="26%" fy="52%">
        <stop offset="0%" stop-color="#ff3818"/>
        <stop offset="48%" stop-color="#ff6433"/>
        <stop offset="82%" stop-color="#ffac63"/>
        <stop offset="97%" stop-color="#ffe4b5"/>
        <stop offset="100%" stop-color="#ffe4b5" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="512" height="1100" fill="url(#bg)"/>
    <g transform="translate(512,0) scale(-1,1)">
      <circle cx="262" cy="520" r="435" fill="url(#sphereOuter)"/>
      <circle cx="262" cy="520" r="435" fill="url(#outerAmberGlow)"/>
      <circle cx="212" cy="508" r="278" fill="url(#sphereMid)"/>
      <circle cx="236" cy="516" r="136" fill="url(#sphereCore)"/>
    </g>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 94 }).toBuffer()
}

// Extrai e super-resolve (512×512 bicúbico polar com realce radial) os 4 componentes ópticos reais da foto macro de referência
const macroRefImg = await sharp('scripts/iphone12-macro-ref.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })

function cubicInterp(v0, v1, v2, v3, t) {
  const a0 = -0.5 * v0 + 1.5 * v1 - 1.5 * v2 + 0.5 * v3
  const a1 = v0 - 2.5 * v1 + 2.0 * v2 - 0.5 * v3
  const a2 = -0.5 * v0 + 0.5 * v2
  const a3 = v1
  return ((a0 * t + a1) * t + a2) * t + a3
}

function sampleRefBicubic(fx, fy) {
  const w = macroRefImg.info.width, h = macroRefImg.info.height, pix = macroRefImg.data
  const ix = Math.floor(fx), iy = Math.floor(fy)
  const tx = fx - ix, ty = fy - iy
  const rgb = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const row = []
    for (let dy = -1; dy <= 2; dy++) {
      const y = Math.max(0, Math.min(h - 1, iy + dy))
      const p = []
      for (let dx = -1; dx <= 2; dx++) {
        const x = Math.max(0, Math.min(w - 1, ix + dx))
        p.push(pix[(y * w + x) * 4 + c])
      }
      row.push(cubicInterp(p[0], p[1], p[2], p[3], tx))
    }
    rgb[c] = Math.max(0, Math.min(255, cubicInterp(row[0], row[1], row[2], row[3], ty)))
  }
  return rgb
}

function sampleRefPolarSharpened(cx, cy, dx, dy, ringSmooth = 0.032, radialSharpen = 0.58) {
  const r = Math.hypot(dx, dy)
  if (r < 0.4) return sampleRefBicubic(cx + dx, cy + dy)
  const ang = Math.atan2(dy, dx)
  const weights = [0.14, 0.22, 0.28, 0.22, 0.14]
  const center = [0, 0, 0]
  for (let k = -2; k <= 2; k++) {
    const a = ang + k * ringSmooth
    const s = sampleRefBicubic(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    const w = weights[k + 2]
    center[0] += s[0] * w; center[1] += s[1] * w; center[2] += s[2] * w
  }
  const sIn = sampleRefBicubic(cx + Math.cos(ang) * Math.max(0, r - 0.52), cy + Math.sin(ang) * Math.max(0, r - 0.52))
  const sOut = sampleRefBicubic(cx + Math.cos(ang) * (r + 0.52), cy + Math.sin(ang) * (r + 0.52))
  return [
    Math.max(0, Math.min(255, center[0] + radialSharpen * (center[0] - 0.5 * (sIn[0] + sOut[0])))),
    Math.max(0, Math.min(255, center[1] + radialSharpen * (center[1] - 0.5 * (sIn[1] + sOut[1])))),
    Math.max(0, Math.min(255, center[2] + radialSharpen * (center[2] - 0.5 * (sIn[2] + sOut[2])))),
  ]
}

async function buildMacroPatchJpeg(cx, cy, R, smooth, sharpen, isMic = false) {
  const S = 512
  const buf = Buffer.alloc(S * S * 3)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - S / 2) / (S / 2)
      const ny = (y + 0.5 - S / 2) / (S / 2)
      let rgb = sampleRefPolarSharpened(cx, cy, nx * R, ny * R, smooth, sharpen)
      if (isMic) {
        const mr = Math.hypot(nx, ny)
        if (mr < 0.84) {
          const edgeFade = Math.min(1, (0.84 - mr) / 0.06)
          const u = (nx + ny) * 7.5, v = (nx - ny) * 7.5
          const wireX = Math.pow(Math.cos(u * Math.PI), 2)
          const wireY = Math.pow(Math.cos(v * Math.PI), 2)
          const mesh = Math.max(wireX, wireY) * 0.72 + (wireX * wireY) * 0.28
          const shade = 0.82 + 0.18 * (-nx * 0.6 - ny * 0.6)
          const baseL = (26 + 34 * mesh) * shade
          const k = edgeFade * 0.68
          rgb = [
            rgb[0] * (1 - k) + baseL * k,
            rgb[1] * (1 - k) + baseL * k,
            rgb[2] * (1 - k) + (baseL + 2) * k,
          ]
        }
      }
      const idx = (y * S + x) * 3
      buf[idx] = Math.round(rgb[0])
      buf[idx + 1] = Math.round(rgb[1])
      buf[idx + 2] = Math.round(rgb[2])
    }
  }
  return sharp(buf, { raw: { width: S, height: S, channels: 3 } }).jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toBuffer()
}

// 2A. Textura Óptica da Lente Superior (Ultra-Wide: extraída em alta definição da referência macro oficial)
async function renderTopCameraLensTextureJpeg() {
  return buildMacroPatchJpeg(93.00, 86.00, 49.3, 0.032, 0.60, false)
}

// 2B. Textura Óptica da Lente Inferior (Wide: extraída em alta definição da referência macro oficial)
async function renderBotCameraLensTextureJpeg() {
  return buildMacroPatchJpeg(93.00, 223.75, 49.3, 0.032, 0.60, false)
}

// 3. Textura do Flash True-Tone Fresnel (extraída em alta definição da referência macro oficial)
async function renderTrueToneFlashTextureJpeg() {
  return buildMacroPatchJpeg(214.00, 154.85, 26.8, 0.018, 0.55, false)
}

// 4. Textura da Malha Acústica Metálica Diagonal 45° + Chanfro Côncavo do Microfone Traseiro
async function renderAcousticMeshTextureJpeg() {
  return buildMacroPatchJpeg(213.25, 81.75, 12.2, 0.020, 0.45, true)
}

const [ios14WallpaperJpeg, topCameraLensJpeg, trueToneFlashJpeg, acousticMeshJpeg, botCameraLensJpeg] = await Promise.all([
  renderIos14ScreenJpeg(),
  renderTopCameraLensTextureJpeg(),
  renderTrueToneFlashTextureJpeg(),
  renderAcousticMeshTextureJpeg(),
  renderBotCameraLensTextureJpeg(),
])

// ---------- utilitários de geometria com curvatura contínua G2 (Apple Squircle) ----------
function roundedRect(w, h, r, cornerSeg = 20) {
  const s = new THREE.Shape()
  const hw = w / 2, hh = h / 2
  const cr = Math.min(r, hw - 1e-5, hh - 1e-5)
  if (cr <= 1e-5) {
    s.moveTo(-hw, -hh)
    s.lineTo(hw, -hh)
    s.lineTo(hw, hh)
    s.lineTo(-hw, hh)
    s.closePath()
    return s
  }
  // Superelipse contínua (n = 4.2) calibrada para passar exatamente pelo ponto diagonal do raio r
  const n = 4.2
  const exp = 2 / n
  const diagRatio = (1 - Math.SQRT1_2) / (1 - Math.pow(0.5, 1 / n))
  const a = Math.min(cr * Math.min(1.38, diagRatio), hw - 1e-5, hh - 1e-5)

  const corners = [
    { cx: hw - a, cy: -hh + a, sx: 1, sy: -1, t0: 0, t1: Math.PI / 2 },
    { cx: hw - a, cy: hh - a, sx: 1, sy: 1, t0: 0, t1: Math.PI / 2 },
    { cx: -hw + a, cy: hh - a, sx: -1, sy: 1, t0: 0, t1: Math.PI / 2 },
    { cx: -hw + a, cy: -hh + a, sx: -1, sy: -1, t0: 0, t1: Math.PI / 2 },
  ]

  const pts = []
  for (let c = 0; c < 4; c++) {
    const { cx, cy, sx, sy } = corners[c]
    for (let i = 0; i <= cornerSeg; i++) {
      const u = i / cornerSeg
      // Em c=0 e c=2 vamos do eixo Y para o eixo X; em c=1 e c=3 do eixo X para o eixo Y
      const theta = (c % 2 === 0 ? u : 1 - u) * (Math.PI / 2)
      const px = cx + sx * a * Math.pow(Math.sin(theta), exp)
      const py = cy + sy * a * Math.pow(Math.cos(theta), exp)
      pts.push(new THREE.Vector2(px, py))
    }
  }
  s.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i].x, pts[i].y)
  s.closePath()
  return s
}

// Placa arredondada no plano XZ, ocupando y0..y1, centrada em (cx, cz).
function slab(w, h, r, y0, y1, { cx = 0, cz = 0, bevel = 0, bevelSeg = 4, seg = 36 } = {}) {
  const d = y1 - y0
  const bt = Math.min(bevel, d * 0.46)
  const shape = roundedRect(w - 2 * bevel, h - 2 * bevel, Math.max(0.0002, r - bevel), Math.max(12, Math.round(seg / 2)))
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

// Anel perimetral chanfrado a 45° para destacar o chanfro polido do chassi de alumínio
function chamferRim(W, H, corner, bevel, y0, y1) {
  const outer = roundedRect(W, H, corner, 22)
  outer.holes.push(roundedRect(W - 2 * bevel * 1.35, H - 2 * bevel * 1.35, Math.max(0.2 * MM, corner - bevel * 1.35), 22))
  const g = new THREE.ExtrudeGeometry(outer, {
    depth: Math.max(1e-5, y1 - y0),
    bevelEnabled: true,
    bevelThickness: bevel * 0.65,
    bevelSize: bevel * 0.55,
    bevelSegments: 3,
    curveSegments: 36,
  })
  g.rotateX(Math.PI / 2)
  g.translate(0, y1, 0)
  return g
}

// Disco voltado para +Y (traseira) ou −Y (frente) com UVs radiais [0,1] centradas em (0.5, 0.5) e v=0 no topo (-Z)
function disc(r, y, cx, cz, up = true, seg = 48) {
  const g = new THREE.CircleGeometry(r, seg)
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = 0.5 + pos.getX(i) / (2 * r)
    uv[i * 2 + 1] = 0.5 + pos.getZ(i) / (2 * r)
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
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

// Calota esférica (elemento óptico convexo interno da lente) com mapeamento UV planar contínuo com o disco externo (rFull)
function lensDome(r, height, yBase, cx, cz, up = true, seg = 40, rFull = r) {
  const g = new THREE.SphereGeometry(r, seg, 18, 0, Math.PI * 2, 0, Math.PI * 0.38)
  g.scale(1, height / (r * 0.4), 1)
  if (!up) g.rotateX(Math.PI)
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = 0.5 + pos.getX(i) / (2 * rFull)
    uv[i * 2 + 1] = 0.5 + pos.getZ(i) / (2 * rFull)
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
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
  const s = roundedRect(thickY - 2 * b, len - 2 * b, Math.max(0.05 * MM, (thickY - 2 * b) / 2), 10)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-6, depthX - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: seg,
  })
  g.translate(0, 0, -(depthX - 2 * b) / 2)
  g.rotateY(Math.PI / 2)
  g.rotateX(Math.PI / 2)
  g.translate(xCenter, yCenter, cz)
  return g
}

// Cápsula na face inferior (z = +H/2): forma no plano XY, extrusão em Z
function bottomCapsule(lenX, heightY, x, z0, z1, r = heightY / 2, seg = 20) {
  const shape = roundedRect(lenX, heightY, Math.min(r, lenX / 2, heightY / 2), 10)
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: seg })
  g.translate(x, 0, z0)
  return g
}

function bottomCapsuleRing(wOut, hOut, wIn, hIn, x, z0, z1, seg = 24) {
  const outer = roundedRect(wOut, hOut, hOut / 2, 12)
  outer.holes.push(roundedRect(wIn, hIn, hIn / 2, 12))
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

// Disco voltado para +Z (base do aparelho, ex: tela acústica nos furos de alto-falante)
function bottomDisc(r, x, z, seg = 24) {
  const g = new THREE.CircleGeometry(r, seg)
  g.translate(x, 0, z)
  return g
}

// Tela OLED com UV padrão do visualizador: u = (x + w/2)/w, v = 0 no topo (−Z) e v = 1 na base (+Z)
function screenPlane(w, h, r, y) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r, 22), 36)
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

// Notch do iPhone 12 fiel às Fotos 1, 2 e 3: ombros superiores curtos e cantos inferiores suaves
function notch(nw, nh, topZ, y) {
  const s = new THREE.Shape()
  const rb = nh * 0.48, sh = nh * 0.18
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
  const g = new THREE.ShapeGeometry(s, 28)
  g.rotateX(Math.PI / 2)
  g.translate(0, y, topZ)
  return g
}

function frameRing(W, H, corner, wall, y0, y1) {
  const outer = roundedRect(W, H, corner, 22)
  outer.holes.push(roundedRect(W - 2 * wall, H - 2 * wall, corner - wall, 22))
  const g = new THREE.ExtrudeGeometry(outer, { depth: y1 - y0, bevelEnabled: false, curveSegments: 40 })
  g.rotateX(Math.PI / 2)
  g.translate(0, y1, 0)
  return g
}

// Lente traseira 3D fiel às 3 fotos macro: anel anodizado jateado (0,92 mm) + aro interno metálico brilhante + barril recuado + óptica diferenciada (Superior Ultra-Wide vs Inferior Wide)
function addDetailedRearLens(add, R, yBase, lx, lz, isTopLens = true) {
  const hRing = 1.05 * MM
  const yTop = yBase + hRing
  const lensMat = isTopLens ? 'Camera Lens' : 'Camera Lens Bot'

  // 1. Sulco escuro de sombra de contato na base do anel sobre o platô fosco
  add('Plastic port', flatRing(R - 0.02 * MM, R + 0.18 * MM, yBase + 0.008 * MM, lx, lz, true, 64))

  // 2. Anel externo de alumínio anodizado (R=6.00mm até rInner=5.08mm) + aro interno metálico prateado fino ('Metal Screw')
  const rInner = R * (49.0 / 57.5)
  add('Anodized aluminum', cyl(R, R + 0.05 * MM, yBase, yTop - 0.08 * MM, lx, lz, true, 64))
  add('finish-chamfer', cyl(R - 0.06 * MM, R, yTop - 0.08 * MM, yTop, lx, lz, true, 64))
  add('Anodized aluminum', flatRing(rInner + 0.11 * MM, R - 0.06 * MM, yTop + 0.004 * MM, lx, lz, true, 64))
  add('Metal Screw', flatRing(rInner, rInner + 0.11 * MM, yTop + 0.005 * MM, lx, lz, true, 64))
  add('Display Frame', cyl(rInner, rInner * 0.95, yTop - 0.36 * MM, yTop + 0.004 * MM, lx, lz, true, 64))

  // 3. Interior óptico recuado com UV contínuo entre o disco plano e a calota central 3D (sem duplicar os anéis)
  const rOptic = rInner * 0.992
  add(lensMat, disc(rOptic, yTop - 0.34 * MM, lx, lz, true, 64))
  add(lensMat, lensDome(rOptic * (isTopLens ? 0.34 : 0.28), 0.20 * MM, yTop - 0.33 * MM, lx, lz, true, 48, rOptic))

  // 4. Cristal de safira plano no topo do anel com reflexo especular diagonal
  add('Camera sapphire miror', disc(rInner * 0.995, yTop - 0.02 * MM, lx, lz, true, 64))
}

function buildIphone12({ id, W, H, D, corner, cam }, exploded = false) {
  const parts = {}
  let current = 'DeviceBody'
  const add = (mat, g, part = current) => {
    if (!g) return
    ;((parts[part] ??= {})[mat] ??= []).push(g)
  }
  const hy = D / 2

  // 1. Chassi de alumínio acetinado com laterais retas + chanfro perimetral polido ('finish-chamfer')
  if (exploded) {
    add('Anodized aluminum', frameRing(W, H, corner, 1.6 * MM, -hy, hy))
  } else {
    add('Anodized aluminum', slab(W, H, corner, -hy + 0.18 * MM, hy - 0.18 * MM, { bevel: 0.18 * MM, bevelSeg: 3, seg: 44 }))
    add('finish-chamfer', chamferRim(W - 0.04 * MM, H - 0.04 * MM, corner - 0.02 * MM, 0.34 * MM, hy - 0.24 * MM, hy - 0.02 * MM))
    add('finish-chamfer', chamferRim(W - 0.04 * MM, H - 0.04 * MM, corner - 0.02 * MM, 0.34 * MM, -hy + 0.02 * MM, -hy + 0.24 * MM))
  }

  // 2. Seis faixas plásticas de antena (laterais, topo à direita e base à esquerda)
  const bandT = 1.08 * MM
  const bandH = D - 0.64 * MM
  for (const sx of [-1, 1]) {
    for (const zPos of [-H / 2 + 13.2 * MM, H / 2 - 13.2 * MM]) {
      const g = new THREE.BoxGeometry(0.16 * MM, bandH, bandT)
      g.translate(sx * (W / 2 + 0.01 * MM), 0, zPos)
      add('Plastic antena', g)
    }
  }
  {
    const gTop = new THREE.BoxGeometry(bandT, bandH, 0.16 * MM)
    gTop.translate(-W / 2 + 15.2 * MM * cam.k, 0, -H / 2 - 0.01 * MM)
    add('Plastic antena', gTop)
    const gBot = new THREE.BoxGeometry(bandT, bandH, 0.16 * MM)
    gBot.translate(W / 2 - 15.2 * MM * cam.k, 0, H / 2 + 0.01 * MM)
    add('Plastic antena', gBot)
  }

  // 3. Traseira de vidro polido com Clearcoat + Logotipo 3D + Platô de câmera fosco chanfrado
  current = 'RearPanel'
  // Friso escuro finíssimo de junção entre o chassi e o vidro traseiro (sombra de contato)
  add('Plastic port', slab(W - 0.68 * MM, H - 0.68 * MM, corner - 0.34 * MM, hy - 0.12 * MM, hy + 0.005 * MM, { bevel: 0.04 * MM, seg: 40 }))
  add('Frosted glass', slab(W - 0.86 * MM, H - 0.86 * MM, corner - 0.43 * MM, hy - 0.32 * MM, hy + 0.035 * MM, { bevel: 0.14 * MM, seg: 44 }))

  // Logotipo Apple 3D centralizado na traseira
  if (appleLogoBaseGeo) {
    const logoG = appleLogoBaseGeo.clone()
    const logoScale = cam.k * 0.96
    logoG.scale(logoScale, 1, logoScale)
    logoG.translate(0, hy + 0.06 * MM, 0)
    add('Glass tint', logoG)
  }

  // Platô de câmera esculpido no vidro com borda de duplo contorno (aro externo + vale côncavo + crista interna fosca)
  const sq = cam.size, sqR = cam.radius
  const sqCx = -W / 2 + cam.margin + sq / 2
  const sqCz = -H / 2 + cam.margin + sq / 2
  const plateauTop = hy + 0.58 * MM
  add('Glass', slab(sq + 1.45 * MM, sq + 1.45 * MM, sqR + 0.72 * MM, hy + 0.01 * MM, hy + 0.34 * MM, { cx: sqCx, cz: sqCz, bevel: 0.28 * MM, bevelSeg: 5, seg: 44 }))
  add('Frosted bump', slab(sq, sq, sqR, hy + 0.02 * MM, plateauTop, { cx: sqCx, cz: sqCz, bevel: 0.22 * MM, bevelSeg: 5, seg: 44 }))

  // Duas lentes ópticas grandes na coluna esquerda do módulo (Superior Ultra-Wide e Inferior Wide diferenciadas)
  const lensX = sqCx - sq / 2 + cam.lensInset
  const lensZTop = sqCz - sq / 2 + cam.lensInset
  const lensZBot = sqCz + sq / 2 - cam.lensInset
  addDetailedRearLens(add, cam.ring, plateauTop, lensX, lensZTop, true)
  addDetailedRearLens(add, cam.ring, plateauTop, lensX, lensZBot, false)

  // Coluna direita do módulo fiel às 3 fotos macro: Microfone alinhado ligeiramente acima do centro da lente superior + Flash True-Tone Fresnel centralizado
  const rightX = sqCx + sq / 2 - 6.35 * MM * cam.k
  const micZ = lensZTop - 0.45 * MM * cam.k
  const rMic = 1.22 * MM * cam.k
  add('Acoustic mesh', disc(rMic, plateauTop + 0.008 * MM, rightX, micZ, true, 48))

  // Flash True-Tone Fresnel embutido com chanfro translúcido no vidro e duplo LED interno
  const flashZ = sqCz - 0.08 * MM * cam.k
  const rFlash = 2.75 * MM * cam.k
  add('LED', disc(rFlash * 0.98, plateauTop + 0.008 * MM, rightX, flashZ, true, 56))
  add('Plastic LED', disc(rFlash, plateauTop + 0.014 * MM, rightX, flashZ, true, 56))

  // 4. Frente fiel às Fotos 1, 2 e 3: filete metálico interno ao redor da borda preta + tela OLED + Notch
  const fy = -hy
  current = 'Display'
  add('Display Frame', slab(W - 0.84 * MM, H - 0.84 * MM, corner - 0.42 * MM, fy - 0.015 * MM, fy + 0.42 * MM, { bevel: 0.10 * MM, seg: 44 }))
  const sw = W - 4.4 * MM, sh = H - 4.4 * MM
  add('OLED', screenPlane(sw, sh, corner - 2.2 * MM, fy - 0.032 * MM))

  // Notch largo do iPhone 12 com alto-falante central e câmera frontal à direita (na visão frontal = −X local)
  const nw = cam.notchW, nh = cam.notchH
  add('OLED off', notch(nw, nh, -sh / 2 - 0.15 * MM, fy - 0.052 * MM))
  const earZ = -sh / 2 + nh * 0.42
  {
    const earW = nw * 0.34, earH = 1.08 * MM
    const earOuter = new THREE.ShapeGeometry(roundedRect(earW, earH, 0.52 * MM, 10), 16)
    earOuter.rotateX(Math.PI / 2)
    earOuter.translate(0, fy - 0.062 * MM, earZ)
    add('Plastic port', earOuter)

    const mw = nw * 0.31, mh = 0.76 * MM
    const earMesh = new THREE.ShapeGeometry(roundedRect(mw, mh, 0.36 * MM, 10), 16)
    const pos = earMesh.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + mw / 2) / mw
      uv[i * 2 + 1] = (pos.getY(i) + mh / 2) / mh
    }
    earMesh.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    earMesh.rotateX(Math.PI / 2)
    earMesh.translate(0, fy - 0.068 * MM, earZ)
    add('Acoustic mesh', earMesh)
  }
  // Câmera frontal TrueDepth à direita do alto-falante quando visto de frente (−X no espaço local)
  const fCamX = -nw * 0.22
  add('Camera filter', disc(1.22 * MM, fy - 0.062 * MM, fCamX, earZ, false, 36))
  add('Camera Lens', disc(0.88 * MM, fy - 0.068 * MM, fCamX, earZ, false, 36))
  add('Camera sapphire miror', disc(0.92 * MM, fy - 0.072 * MM, fCamX, earZ, false, 36))

  // Cobertura Ceramic Shield frontal
  add('Glass', slab(W - 0.75 * MM, H - 0.75 * MM, corner - 0.38 * MM, fy - 0.30 * MM, fy - 0.02 * MM, { bevel: 0.10 * MM, seg: 44 }), 'FrontGlass')

  // 5. Botões laterais com colar de sombra AO, chave Silencioso com indicador laranja, gaveta do SIM e janela 5G mmWave
  current = 'DeviceBody'
  const btnT = 1.95 * MM
  const btnP = 0.54 * MM

  // Lado direito visto de frente (−X): Botão Power + janela 5G mmWave abaixo
  const pwrZ = -H / 2 + 44.5 * MM * cam.k
  const pwrLen = 17.6 * MM * cam.k
  add('Plastic port', sidePill(pwrLen + 0.56 * MM, btnT + 0.52 * MM, 0.22 * MM, -W / 2, 0, pwrZ, 0.04 * MM))
  add('finish-chamfer', sidePill(pwrLen + 0.08 * MM, btnT + 0.08 * MM, btnP * 1.4, -W / 2 - btnP * 0.22, 0, pwrZ, 0.18 * MM))
  add('Anodized aluminum', sidePill(pwrLen, btnT, btnP * 2, -W / 2 - btnP * 0.46, 0, pwrZ, 0.22 * MM))

  // Janela 5G mmWave (cápsula rente à lateral −X, abaixo do botão Power)
  const mmwZ = -H / 2 + 82.5 * MM * cam.k
  const mmwLen = 19.5 * MM * cam.k
  add('Plastic port', sidePill(mmwLen + 0.48 * MM, 3.38 * MM, 0.16 * MM, -W / 2, 0, mmwZ, 0.03 * MM))
  add('Plastic antena', sidePill(mmwLen, 2.96 * MM, 0.20 * MM, -W / 2 - 0.012 * MM, 0, mmwZ, 0.06 * MM))

  // Lado esquerdo visto de frente (+X): Chave Silencioso (com faixa laranja) + Volume + / − + Gaveta do SIM com furo
  const muteZ = -H / 2 + 26.2 * MM * cam.k
  const muteLen = 6.8 * MM * cam.k
  add('Plastic port', sidePill(muteLen + 0.18 * MM, 2.25 * MM, 0.28 * MM, W / 2, 0, muteZ, 0.05 * MM))
  add('Mute orange', sidePill(muteLen - 0.65 * MM, 0.82 * MM, 0.32 * MM, W / 2 + 0.015 * MM, -0.46 * MM, muteZ, 0.04 * MM))
  add('finish-chamfer', sidePill(muteLen - 0.42 * MM, 1.08 * MM, btnP * 1.85, W / 2 + btnP * 0.40, 0.38 * MM, muteZ, 0.16 * MM))

  // Botões de Volume + e Volume −
  for (const vz of [-H / 2 + 39.2 * MM * cam.k, -H / 2 + 52.8 * MM * cam.k]) {
    const vLen = 10.6 * MM * cam.k
    add('Plastic port', sidePill(vLen + 0.54 * MM, btnT + 0.50 * MM, 0.22 * MM, W / 2, 0, vz, 0.04 * MM))
    add('finish-chamfer', sidePill(vLen + 0.08 * MM, btnT + 0.08 * MM, btnP * 1.4, W / 2 + btnP * 0.22, 0, vz, 0.18 * MM))
    add('Anodized aluminum', sidePill(vLen, btnT, btnP * 2, W / 2 + btnP * 0.46, 0, vz, 0.22 * MM))
  }

  // Gaveta do SIM + furo circular do ejetor (lado +X, parte inferior)
  const simZ = -H / 2 + 88.5 * MM * cam.k
  const simLen = 15.8 * MM * cam.k
  add('Plastic port', sidePill(simLen + 0.12 * MM, 2.32 * MM, 0.18 * MM, W / 2, 0, simZ, 0.03 * MM))
  add('Anodized aluminum', sidePill(simLen - 0.38 * MM, 1.88 * MM, 0.22 * MM, W / 2 + 0.006 * MM, 0, simZ, 0.04 * MM))
  {
    const pinHole = new THREE.CylinderGeometry(0.50 * MM, 0.50 * MM, 0.32 * MM, 28)
    pinHole.rotateZ(Math.PI / 2)
    pinHole.translate(W / 2 + 0.02 * MM, 0, simZ + simLen * 0.31)
    add('Plastic port', pinHole)
  }

  // 6. Base (+Z): Porta Lightning com aro metálico e pinos dourados + 2 parafusos pentalobe + furos de som com malha acústica
  const bz = H / 2
  add('Plastic port', bottomCapsuleRing(9.35 * MM, 3.25 * MM, 8.15 * MM, 2.20 * MM, 0, bz - 0.12 * MM, bz + 0.05 * MM))
  add('Metal Screw', bottomCapsuleRing(9.1 * MM, 3.05 * MM, 8.2 * MM, 2.25 * MM, 0, bz - 0.15 * MM, bz + 0.08 * MM))
  add('Plastic port', bottomCapsule(8.25 * MM, 2.28 * MM, 0, bz - 0.35 * MM, bz + 0.05 * MM))
  for (let p = -3.5; p <= 3.5; p += 1) {
    const pin = new THREE.BoxGeometry(0.42 * MM, 0.24 * MM, 0.18 * MM)
    pin.translate(p * 0.82 * MM, 0.65 * MM, bz - 0.01 * MM)
    add('Coil', pin)
  }

  // Dois parafusos pentalobe ladeando a porta Lightning
  for (const sx of [-1, 1]) {
    const px = sx * 5.75 * MM
    add('Plastic port', bottomCyl(0.76 * MM, px, bz - 0.14 * MM, bz + 0.05 * MM, 28))
    add('Metal Screw', bottomCyl(0.66 * MM, px, bz - 0.15 * MM, bz + 0.07 * MM, 28))
    add('Plastic port', bottomCyl(0.25 * MM, px, bz - 0.10 * MM, bz + 0.08 * MM, 5))
  }

  // Furos de alto-falante à esquerda (4 no mini, 5 no 12) e microfone à direita (2 no mini, 3 no 12) com malha acústica
  const leftHoles = id === 'iphone-12-mini' ? 4 : 5
  const rightHoles = id === 'iphone-12-mini' ? 2 : 3
  for (let i = 0; i < leftHoles; i++) {
    const hx = -(9.2 * MM + i * 2.15 * MM)
    add('Plastic port', bottomCyl(0.64 * MM, hx, bz - 0.20 * MM, bz + 0.06 * MM, 24))
    add('Acoustic mesh', bottomDisc(0.50 * MM, hx, bz + 0.04 * MM, 24))
  }
  for (let i = 0; i < rightHoles; i++) {
    const hx = 9.2 * MM + i * 2.15 * MM
    add('Plastic port', bottomCyl(0.64 * MM, hx, bz - 0.20 * MM, bz + 0.06 * MM, 24))
    add('Acoustic mesh', bottomDisc(0.50 * MM, hx, bz + 0.04 * MM, 24))
  }

  if (exploded) addInternals({ W, H, D, corner, cam, add, sqCx, sqCz, lensX, sq })

  // Une por peça e material com indexação compacta de vértices
  const merge = (list) => {
    const geos = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g.clone()
      if (!n.attributes.normal) n.computeVertexNormals()
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
      return n
    })
    return mergeVertices(mergeGeometries(geos, false), 1e-6)
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

// ---------- gravação GLB (glTF 2.0 binário com 4 texturas PBR e extensões físicas) ----------
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
        const matObj = {
          name: matName,
          pbrMetallicRoughness: {
            ...(def.texIndex !== undefined ? { baseColorTexture: { index: def.texIndex } } : {}),
            ...(def.c ? { baseColorFactor: def.c } : {}),
            metallicFactor: def.m,
            roughnessFactor: def.r,
          },
          ...(def.emissiveTexIndex !== undefined
            ? {
                emissiveTexture: { index: def.emissiveTexIndex },
                emissiveFactor: def.emissiveFactor ?? [1, 1, 1],
              }
            : {}),
          ...(def.blend ? { alphaMode: 'BLEND' } : {}),
          ...(def.ext ? { extensions: def.ext } : {}),
          doubleSided: true,
        }
        materials.push(matObj)
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
      if (g.index) {
        const idxArr = count < 65535 ? new Uint16Array(g.index.array) : new Uint32Array(g.index.array)
        const idxComp = count < 65535 ? 5123 : 5125
        const idxAcc = accessors.length
        accessors.push({ bufferView: pushTyped(idxArr, 34963), componentType: idxComp, count: idxArr.length, type: 'SCALAR' })
        primitives.push({ attributes: { POSITION: a, NORMAL: a + 1, TEXCOORD_0: a + 2 }, indices: idxAcc, material: mi, mode: 4 })
      } else {
        primitives.push({ attributes: { POSITION: a, NORMAL: a + 1, TEXCOORD_0: a + 2 }, material: mi, mode: 4 })
      }
    }
    meshes.push({ name: nodeName, primitives })
    children.push(nodeName)
  }

  // Embute as 5 texturas PBR no binário do GLB
  const wallpaperBv = pushBytes(ios14WallpaperJpeg)
  const topLensBv = pushBytes(topCameraLensJpeg)
  const flashBv = pushBytes(trueToneFlashJpeg)
  const meshBv = pushBytes(acousticMeshJpeg)
  const botLensBv = pushBytes(botCameraLensJpeg)

  const single = children.length === 1
  const nodes = single
    ? [{ name, mesh: 0, rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] }]
    : [{ name, rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2], children: children.map((_, i) => i + 1) }, ...children.map((n, i) => ({ name: n, mesh: i }))]
  const json = {
    asset: { version: '2.0', generator: 'Argento modelar-iphone-12.mjs Photorealistic PBR' },
    extensionsUsed: ['KHR_materials_clearcoat', 'KHR_materials_ior', 'KHR_materials_specular'],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials,
    textures: [
      { sampler: 0, source: 0 },
      { sampler: 0, source: 1 },
      { sampler: 0, source: 2 },
      { sampler: 1, source: 3 },
      { sampler: 0, source: 4 },
    ],
    samplers: [
      { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 },
      { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
    ],
    images: [
      { name: 'ios14-wallpaper', mimeType: 'image/jpeg', bufferView: wallpaperBv },
      { name: 'camera-lens-top-ultrawide', mimeType: 'image/jpeg', bufferView: topLensBv },
      { name: 'truetone-flash-fresnel', mimeType: 'image/jpeg', bufferView: flashBv },
      { name: 'acoustic-mesh', mimeType: 'image/jpeg', bufferView: meshBv },
      { name: 'camera-lens-bot-wide', mimeType: 'image/jpeg', bufferView: botLensBv },
    ],
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
    corner: 10.5 * MM,
    cam: { k: 1, size: 27.2 * MM, radius: 7.5 * MM, margin: 3.5 * MM, lensInset: 7.1 * MM, ring: 5.95 * MM, flash: 2.45 * MM, notchW: 35.0 * MM, notchH: 5.4 * MM },
  },
  {
    id: 'iphone-12-mini',
    name: 'iPhone 12 mini',
    W: 64.2 * MM,
    H: 131.5 * MM,
    D: 7.4 * MM,
    corner: 9.5 * MM,
    cam: { k: 0.9, size: 25.2 * MM, radius: 7.0 * MM, margin: 3.2 * MM, lensInset: 6.6 * MM, ring: 5.50 * MM, flash: 2.25 * MM, notchW: 33.2 * MM, notchH: 5.3 * MM },
  },
]

await mkdir('public/models/explodido', { recursive: true })
let explodidos = {}
try {
  explodidos = JSON.parse(await readFile('src/data/explodidos.json', 'utf8'))
} catch {}
let photos = null
try {
  photos = JSON.parse(await readFile('src/data/photos.json', 'utf8'))
} catch {}

for (const s of SPECS) {
  const glb = toGLB(s.name, buildIphone12(s))
  await writeFile(`public/models/${s.id}.glb`, glb)
  if (photos?.modelos3dVersoes) {
    photos.modelos3dVersoes[s.id] = createHash('sha256').update(glb).digest('hex').slice(0, 12)
  }
  console.log(`✓ public/models/${s.id}.glb  ${(glb.length / 1024).toFixed(0)} KB`)
  const ex = toGLB(s.name, buildIphone12(s, true))
  await writeFile(`public/models/explodido/${s.id}.glb`, ex)
  explodidos[s.id] = createHash('sha256').update(ex).digest('hex').slice(0, 12)
  console.log(`✓ public/models/explodido/${s.id}.glb  ${(ex.length / 1024).toFixed(0)} KB`)
}
await writeFile('src/data/explodidos.json', JSON.stringify(explodidos, null, 1) + '\n')
if (photos) {
  await writeFile('src/data/photos.json', JSON.stringify(photos, null, 1) + '\n')
}
