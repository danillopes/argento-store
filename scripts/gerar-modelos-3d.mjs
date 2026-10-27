// Gera os arquivos .glb para todos os modelos do catálogo em public/models/<id>.glb
// a partir das malhas de alta precisão e materiais PBR de public/models/iphone-17-pro.glb,
// adaptando dimensões físicas reais (5,4" mini a 6,9" Pro Max e 5,64 mm Air),
// módulos de câmera (vert2, diag2, pill2, tri, single, air, plateau),
// frente (notch largo no 12, notch estreito no 13/14/16e/17e, Dynamic Island nos demais),
// botões laterais (Controle da Câmera na linha 16/17/18) e acabamento de cada geração.
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const DONOR_PATH = 'public/models/iphone-17-pro.glb'
const W0 = 0.0720
const H0 = 0.1500
const D0 = 0.0088

// Especificações físicas e visuais dos 27 modelos a gerar (iphone-17-pro.glb original é preservado intacto)
const SPECS = [
  // Geração 12
  { id: 'iphone-12-mini', w: 0.0642, h: 0.1315, d: 0.0074, cam: 'vert2', front: 'notch-wide', frame: 'alu', back: 'gloss', camCtrl: false, hex: '#1d4a75', accent: '#4d88c4', family: 12 },
  { id: 'iphone-12', w: 0.0715, h: 0.1467, d: 0.0074, cam: 'vert2', front: 'notch-wide', frame: 'alu', back: 'gloss', camCtrl: false, hex: '#1d4a75', accent: '#b7afe6', family: 12 },
  { id: 'iphone-12-pro', w: 0.0715, h: 0.1467, d: 0.0074, cam: 'tri-12', front: 'notch-wide', frame: 'steel', back: 'matte', camCtrl: false, hex: '#2e4755', accent: '#5a8299', family: 12 },
  { id: 'iphone-12-pro-max', w: 0.0781, h: 0.1608, d: 0.0074, cam: 'tri-12', front: 'notch-wide', frame: 'steel', back: 'matte', camCtrl: false, hex: '#2e4755', accent: '#f3dfc1', family: 12 },

  // Geração 13
  { id: 'iphone-13-mini', w: 0.0642, h: 0.1315, d: 0.00765, cam: 'diag2', front: 'notch-narrow', frame: 'alu', back: 'gloss', camCtrl: false, hex: '#f6d6cf', accent: '#276787', family: 13 },
  { id: 'iphone-13', w: 0.0715, h: 0.1467, d: 0.00765, cam: 'diag2', front: 'notch-narrow', frame: 'alu', back: 'gloss', camCtrl: false, hex: '#232a31', accent: '#276787', family: 13 },
  { id: 'iphone-13-pro', w: 0.0715, h: 0.1467, d: 0.00765, cam: 'tri-13', front: 'notch-narrow', frame: 'steel', back: 'matte', camCtrl: false, hex: '#a7c1d9', accent: '#576856', family: 13 },
  { id: 'iphone-13-pro-max', w: 0.0781, h: 0.1608, d: 0.00765, cam: 'tri-13', front: 'notch-narrow', frame: 'steel', back: 'matte', camCtrl: false, hex: '#a7c1d9', accent: '#f2dcbf', family: 13 },

  // Geração 14
  { id: 'iphone-14', w: 0.0715, h: 0.1467, d: 0.0078, cam: 'diag2', front: 'notch-narrow', frame: 'alu', back: 'gloss', camCtrl: false, hex: '#a0b4c7', accent: '#e0d4e8', family: 14 },
  { id: 'iphone-14-plus', w: 0.0781, h: 0.1608, d: 0.0078, cam: 'diag2', front: 'notch-narrow', frame: 'alu', back: 'gloss', camCtrl: false, hex: '#a0b4c7', accent: '#f6e27a', family: 14 },
  { id: 'iphone-14-pro', w: 0.0715, h: 0.1475, d: 0.00785, cam: 'tri-14', front: 'island', frame: 'steel', back: 'matte', camCtrl: false, hex: '#594f63', accent: '#9a7bb8', family: 14 },
  { id: 'iphone-14-pro-max', w: 0.0776, h: 0.1607, d: 0.00785, cam: 'tri-14', front: 'island', frame: 'steel', back: 'matte', camCtrl: false, hex: '#594f63', accent: '#f1e3c4', family: 14 },

  // Geração 15
  { id: 'iphone-15', w: 0.0716, h: 0.1476, d: 0.0078, cam: 'diag2', front: 'island', frame: 'alu', back: 'matte', camCtrl: false, hex: '#d4e4ed', accent: '#f3d9d9', family: 15 },
  { id: 'iphone-15-plus', w: 0.0778, h: 0.1609, d: 0.0078, cam: 'diag2', front: 'island', frame: 'alu', back: 'matte', camCtrl: false, hex: '#e0e7d9', accent: '#d4e4ed', family: 15 },
  { id: 'iphone-15-pro', w: 0.0706, h: 0.1466, d: 0.00825, cam: 'tri-14', front: 'island', frame: 'titanium', back: 'matte', camCtrl: false, hex: '#bab4a9', accent: '#2f4452', family: 15 },
  { id: 'iphone-15-pro-max', w: 0.0767, h: 0.1599, d: 0.00825, cam: 'tri-14', front: 'island', frame: 'titanium', back: 'matte', camCtrl: false, hex: '#bab4a9', accent: '#6d6a63', family: 15 },

  // Geração 16
  { id: 'iphone-16e', w: 0.0715, h: 0.1467, d: 0.0078, cam: 'single', front: 'notch-narrow', frame: 'alu', back: 'matte', camCtrl: false, hex: '#2c2c2e', accent: '#5a78a8', family: 16 },
  { id: 'iphone-16', w: 0.0716, h: 0.1476, d: 0.0078, cam: 'pill2', front: 'island', frame: 'alu', back: 'matte', camCtrl: true, hex: '#9aadf6', accent: '#f2adda', family: 16 },
  { id: 'iphone-16-plus', w: 0.0778, h: 0.1609, d: 0.0078, cam: 'pill2', front: 'island', frame: 'alu', back: 'matte', camCtrl: true, hex: '#b0d4d2', accent: '#9aadf6', family: 16 },
  { id: 'iphone-16-pro', w: 0.0715, h: 0.1496, d: 0.00825, cam: 'tri-14', front: 'island', frame: 'titanium', back: 'matte', camCtrl: true, hex: '#bfa48f', accent: '#8c6f58', family: 16 },
  { id: 'iphone-16-pro-max', w: 0.0776, h: 0.1630, d: 0.00825, cam: 'tri-14', front: 'island', frame: 'titanium', back: 'matte', camCtrl: true, hex: '#bfa48f', accent: '#c2bcb2', family: 16 },

  // Geração 17 + Air
  { id: 'iphone-17e', w: 0.0715, h: 0.1467, d: 0.0078, cam: 'single', front: 'notch-narrow', frame: 'alu', back: 'matte', camCtrl: false, hex: '#f1d4d4', accent: '#9fb6cf', family: 17 },
  { id: 'iphone-17', w: 0.0715, h: 0.1496, d: 0.0078, cam: 'pill2', front: 'island', frame: 'alu', back: 'matte', camCtrl: true, hex: '#9fb6cf', accent: '#d8c9e6', family: 17 },
  { id: 'iphone-air', w: 0.0747, h: 0.1560, d: 0.00564, cam: 'air', front: 'island', frame: 'titanium', back: 'matte', camCtrl: true, hex: '#c9dbe9', accent: '#ecdcc0', family: 17 },
  { id: 'iphone-17-pro-max', w: 0.0776, h: 0.1630, d: 0.00875, cam: 'plateau', front: 'island', frame: 'alu-unibody', back: 'matte', camCtrl: true, hex: '#e0702b', accent: '#2d3a55', family: 17 },

  // Geração 18
  { id: 'iphone-18-pro', w: 0.0720, h: 0.1500, d: 0.00875, cam: 'plateau', front: 'island', frame: 'alu-unibody', back: 'matte', camCtrl: true, hex: '#6b1f2e', accent: '#b9d0e4', family: 18, island: 'compact' },
  { id: 'iphone-18-pro-max', w: 0.0776, h: 0.1630, d: 0.00875, cam: 'plateau', front: 'island', frame: 'alu-unibody', back: 'matte', camCtrl: true, hex: '#6b1f2e', accent: '#e4e4e2', family: 18, island: 'compact' },
]

// Carrega o GLB doador
const donorBuf = await readFile(DONOR_PATH)
const donorJsonLen = donorBuf.readUInt32LE(12)
const donorGltf = JSON.parse(donorBuf.subarray(20, 20 + donorJsonLen).toString('utf8'))
const donorBin = donorBuf.subarray(28 + donorJsonLen)

function getAcc(gltf, bin, idx) {
  if (idx == null) return null
  const acc = gltf.accessors[idx]
  const bv = gltf.bufferViews[acc.bufferView]
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type]
  const Typed = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[acc.componentType]
  return new Typed(bin.buffer, bin.byteOffset + offset, acc.count * comps)
}

// Compacta os mapas de normais do doador uma única vez para que os 27 novos GLBs sejam leves (<700 KB)
const compactImageBuffers = new Map()
for (const [imgIdx, img] of donorGltf.images.entries()) {
  const bv = donorGltf.bufferViews[img.bufferView]
  const raw = donorBin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
  if (imgIdx === 0 || imgIdx === 1) {
    // Mapas de ruído de 11 MB / 3.2 MB → 64x64 WebP (~1.5 KB)
    compactImageBuffers.set(imgIdx, await sharp(raw).resize(64, 64).webp({ quality: 80 }).toBuffer())
  } else if (imgIdx >= 2 && imgIdx <= 4) {
    compactImageBuffers.set(imgIdx, await sharp(raw).resize(128, 128).webp({ quality: 82 }).toBuffer())
  } else if (imgIdx === 5) {
    compactImageBuffers.set(imgIdx, await sharp(raw).resize(128, 128).png({ compressionLevel: 9 }).toBuffer())
  } else {
    compactImageBuffers.set(imgIdx, raw)
  }
}

// Gera um wallpaper iOS autêntico para cada geração/modelo como JPEG leve
async function renderModelWallpaper(spec) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1100" viewBox="0 0 512 1100">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${spec.hex}"/>
        <stop offset="50%" stop-color="#141824"/>
        <stop offset="100%" stop-color="#05060a"/>
      </linearGradient>
      <radialGradient id="orb1" cx="70%" cy="28%" r="55%">
        <stop offset="0%" stop-color="${spec.accent}" stop-opacity="0.88"/>
        <stop offset="60%" stop-color="${spec.hex}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="orb2" cx="25%" cy="68%" r="60%">
        <stop offset="0%" stop-color="${spec.hex}" stop-opacity="0.82"/>
        <stop offset="55%" stop-color="${spec.accent}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <rect width="512" height="1100" fill="url(#bg)"/>
    <g transform="translate(512,0) scale(-1,1)">
      <rect width="512" height="1100" fill="url(#orb1)"/>
      <rect width="512" height="1100" fill="url(#orb2)"/>
      <path d="M-60 420 C120 290, 390 520, 570 360 L570 760 C380 620, 140 850, -60 700 Z" fill="url(#glass)"/>
      <circle cx="256" cy="560" r="190" fill="url(#glass)" opacity="0.55"/>
      <text x="256" y="168" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="500">quinta-feira, 22 de outubro</text>
      <text x="256" y="292" text-anchor="middle" fill="rgba(255,255,255,0.94)" font-family="system-ui, -apple-system, sans-serif" font-size="122" font-weight="700" letter-spacing="-3">9:41</text>
      <rect x="186" y="1062" width="140" height="7" rx="3.5" fill="rgba(255,255,255,0.68)"/>
    </g>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer()
}

// Separa componentes conexos de uma primitiva
function getComponents(pos, ind) {
  const n = pos.length / 3
  const parent = new Int32Array(n).fill(-1)
  const find = (x) => (parent[x] < 0 ? x : (parent[x] = find(parent[x])))
  const union = (a, b) => {
    a = find(a); b = find(b)
    if (a !== b) {
      if (parent[a] < parent[b]) { parent[a] += parent[b]; parent[b] = a }
      else { parent[b] += parent[a]; parent[a] = b }
    }
  }
  for (let i = 0; i < ind.length; i += 3) {
    union(ind[i], ind[i + 1])
    union(ind[i + 1], ind[i + 2])
  }
  const map = new Map()
  for (let i = 0; i < ind.length; i += 3) {
    const r = find(ind[i])
    let c = map.get(r)
    if (!c) {
      c = { tris: [], verts: new Set(), minX: 1e9, minY: 1e9, minZ: 1e9, maxX: -1e9, maxY: -1e9, maxZ: -1e9 }
      map.set(r, c)
    }
    c.tris.push(ind[i], ind[i + 1], ind[i + 2])
    for (const v of [ind[i], ind[i + 1], ind[i + 2]]) {
      c.verts.add(v)
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]
      if (x < c.minX) c.minX = x; if (x > c.maxX) c.maxX = x
      if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y
      if (z < c.minZ) c.minZ = z; if (z > c.maxZ) c.maxZ = z
    }
  }
  return [...map.values()].map((c) => ({
    ...c,
    cx: (c.minX + c.maxX) / 2,
    cy: (c.minY + c.maxY) / 2,
    cz: (c.minZ + c.maxZ) / 2,
  }))
}

function classifyComp(pi, c) {
  if (c.maxY < 0 && c.cz < -0.060 && Math.abs(c.cx - (-0.0075)) < 0.004) return 'frontCam'
  if (c.minY > 0.0025 && Math.hypot(c.cx - (-0.02175), c.cz - (-0.0607)) < 0.0075 && (c.maxX - c.minX) < 0.018) return 'lens1'
  if (c.minY > 0.0025 && Math.hypot(c.cx - (-0.0218), c.cz - (-0.0415)) < 0.0075 && (c.maxX - c.minX) < 0.018) return 'lens2'
  if (c.minY > 0.0025 && Math.hypot(c.cx - (-0.0036), c.cz - (-0.0511)) < 0.0075 && (c.maxX - c.minX) < 0.018) return 'lens3'
  if (c.minY > 0.0030 && Math.hypot(c.cx - 0.0221, c.cz - (-0.0614)) < 0.0045 && (c.maxX - c.minX) < 0.010) return 'flash'
  if (c.minY > 0.0030 && Math.hypot(c.cx - 0.0221, c.cz - (-0.0409)) < 0.0045 && (c.maxX - c.minX) < 0.010) return 'lidar'
  if (c.minY > 0.0040 && Math.hypot(c.cx - 0.0221, c.cz - (-0.0512)) < 0.003 && (c.maxX - c.minX) < 0.005) return 'mic'
  if (pi === 5 && c.minY > 0.0040 && (c.maxX - c.minX) < 0.020) return 'logo'
  if (pi === 13) return 'backGlass'
  if (pi === 5 && c.minY > 0.0030 && (c.maxX - c.minX) > 0.050) return 'backPlate'
  if (pi === 0 && c.minY > 0.0030 && c.maxY < 0.0035 && (c.maxX - c.minX) > 0.050) return 'backPlate'
  if ((pi === 0 || pi === 1) && c.minY >= 0.0048) return 'plateauTop'
  if (c.maxX < -0.031 && c.minZ > 0.014 && c.maxZ < 0.033 && (c.maxZ - c.minZ) < 0.020) return 'camCtrl'
  return 'chassis'
}

// Extrai um subconjunto de componentes de uma primitiva como buffers independentes
function extractSubMesh(pos, norm, uv, comps, transformFn) {
  const vMap = new Map()
  const outPos = []
  const outNorm = []
  const outUv = []
  const outInd = []
  for (const c of comps) {
    for (const oldV of c. tris) {
      let newV = vMap.get(oldV)
      if (newV === undefined) {
        newV = outPos.length / 3
        vMap.set(oldV, newV)
        const x = pos[oldV * 3], y = pos[oldV * 3 + 1], z = pos[oldV * 3 + 2]
        const nx = norm ? norm[oldV * 3] : 0, ny = norm ? norm[oldV * 3 + 1] : 1, nz = norm ? norm[oldV * 3 + 2] : 0
        const u = uv ? uv[oldV * 2] : 0, v = uv ? uv[oldV * 2 + 1] : 0
        const [tx, ty, tz, tnx, tny, tnz, tu, tv] = transformFn
          ? transformFn(x, y, z, nx, ny, nz, u, v)
          : [x, y, z, nx, ny, nz, u, v]
        outPos.push(tx, ty, tz)
        outNorm.push(tnx, tny, tnz)
        outUv.push(tu, tv)
      }
      outInd.push(newV)
    }
  }
  return { pos: outPos, norm: outNorm, uv: outUv, ind: outInd }
}

function appendGeometry(target, src, transformFn) {
  const baseV = target.pos.length / 3
  const n = src.pos.length / 3
  for (let i = 0; i < n; i++) {
    const x = src.pos[i * 3], y = src.pos[i * 3 + 1], z = src.pos[i * 3 + 2]
    const nx = src.norm[i * 3], ny = src.norm[i * 3 + 1], nz = src.norm[i * 3 + 2]
    const u = src.uv[i * 2], v = src.uv[i * 2 + 1]
    if (transformFn) {
      const [tx, ty, tz, tnx = nx, tny = ny, tnz = nz, tu = u, tv = v] = transformFn(x, y, z, nx, ny, nz, u, v)
      target.pos.push(tx, ty, tz)
      target.norm.push(tnx, tny, tnz)
      target.uv.push(tu, tv)
    } else {
      target.pos.push(x, y, z)
      target.norm.push(nx, ny, nz)
      target.uv.push(u, v)
    }
  }
  for (let i = 0; i < src.ind.length; i++) {
    target.ind.push(baseV + src.ind[i])
  }
}

// Pré-classifica todas as primitivas da Mesh 0 do doador
const donorMesh0 = donorGltf.meshes[0].primitives.map((p, pi) => {
  const pos = getAcc(donorGltf, donorBin, p.attributes.POSITION)
  const norm = getAcc(donorGltf, donorBin, p.attributes.NORMAL)
  const uv = getAcc(donorGltf, donorBin, p.attributes.TEXCOORD_0)
  const ind = getAcc(donorGltf, donorBin, p.indices)
  const comps = getComponents(pos, ind)
  const byTag = {}
  for (const c of comps) {
    const tag = classifyComp(pi, c)
    ;(byTag[tag] ??= []).push(c)
  }
  return { material: p.material, pos, norm, uv, ind, byTag }
})

// Sub-montagens reais centradas na origem (0, 0, 0) para posicionamento em qualquer layout de câmera
const LENS1_CENTER = { x: -0.02175, y: 0.00682, z: -0.0607 }
const FLASH_CENTER = { x: 0.0221, y: 0.00688, z: -0.0614 }
const LIDAR_CENTER = { x: 0.0221, y: 0.00688, z: -0.0409 }
const MIC_CENTER = { x: 0.0221, y: 0.00685, z: -0.0512 }
const LOGO_CENTER = { x: 0.0001, y: 0.0044, z: 0.0204 }
const FRONTCAM_CENTER = { x: -0.0075, y: -0.0031, z: -0.0670 }

// Dynamic Island compacta (iPhone 18 Pro / 18 Pro Max), medida no modelo de referência do Daniel
// (dist/apple-iphone-18-pro-max-silver-2026.zip): 15,3 × 5,7 mm, mesma distância do topo.
// A ilha do doador (17 Pro) mede 21,0 × 6,0 mm: câmera circular num extremo (centro x = -7,5 mm) e pílula até +10,5 mm.
// O mapeamento mantém a câmera e a ponta arredondada circulares e encurta só o trecho reto.
// Tamanho final igual no Pro e no Pro Max (a ilha não cresce com a tela), por isso compensa a escala do aparelho.
const ISLAND_DONOR = { L: -0.0105, camC: -0.0075, a: -0.0045, b: 0.0075, R: 0.0105, zc: -0.0670, r: 0.003 }
const ISLAND_COMPACT = { width: 0.01532, height: 0.00569, centerFromTop: 0.00785 }
function islandRemap(x, z, sx, sz, phoneH) {
  const d = ISLAND_DONOR
  const rFinal = ISLAND_COMPACT.height / 2
  const kx = rFinal / (d.r * sx)
  const kz = rFinal / (d.r * sz)
  const hw = ISLAND_COMPACT.width / 2 / sx
  const camC = -hw + d.r * kx
  const a = camC + d.r * kx
  const capC = hw - d.r * kx
  let nx
  if (x <= d.a) nx = camC + (x - d.camC) * kx
  else if (x >= d.b) nx = capC + (x - d.b) * kx
  else nx = a + ((x - d.a) * (capC - a)) / (d.b - d.a)
  // centro a 7,85 mm da borda superior em qualquer tamanho (como na referência)
  const zc = (-phoneH / 2 + ISLAND_COMPACT.centerFromTop) / sz
  return [nx, zc + (z - d.zc) * kz]
}
const inIslandZone = (x, z) => Math.abs(x) < 0.0108 && z > -0.0703 && z < -0.0637

const lensAssembly = donorMesh0.map((p) =>
  extractSubMesh(p.pos, p.norm, p.uv, p.byTag.lens1 ?? [], (x, y, z, nx, ny, nz, u, v) => [
    x - LENS1_CENTER.x,
    Math.max(-0.00015, y - LENS1_CENTER.y),
    z - LENS1_CENTER.z,
    nx, ny, nz, u, v,
  ]),
)

const flashAssembly = donorMesh0.map((p) =>
  extractSubMesh(p.pos, p.norm, p.uv, p.byTag.flash ?? [], (x, y, z, nx, ny, nz, u, v) => [
    x - FLASH_CENTER.x,
    Math.max(-0.00035, y - FLASH_CENTER.y),
    z - FLASH_CENTER.z,
    nx, ny, nz, u, v,
  ]),
)

const lidarAssembly = donorMesh0.map((p) =>
  extractSubMesh(p.pos, p.norm, p.uv, p.byTag.lidar ?? [], (x, y, z, nx, ny, nz, u, v) => [
    x - LIDAR_CENTER.x,
    Math.max(-0.00035, y - LIDAR_CENTER.y),
    z - LIDAR_CENTER.z,
    nx, ny, nz, u, v,
  ]),
)

const micAssembly = donorMesh0.map((p) =>
  extractSubMesh(p.pos, p.norm, p.uv, p.byTag.mic ?? [], (x, y, z, nx, ny, nz, u, v) => [
    x - MIC_CENTER.x,
    Math.max(-0.00025, y - MIC_CENTER.y),
    z - MIC_CENTER.z,
    nx, ny, nz, u, v,
  ]),
)

const logoAssembly = extractSubMesh(
  donorMesh0[5].pos,
  donorMesh0[5].norm,
  donorMesh0[5].uv,
  donorMesh0[5].byTag.logo ?? [],
  (x, y, z, nx, ny, nz, u, v) => [x - LOGO_CENTER.x, 0, z - LOGO_CENTER.z, nx, ny, nz, u, v],
)

// Gera painel ou ilha retangular arredondada com chanfro suave 3D (retorna malha da borda chanfrada e do topo plano)
function createRoundedIsland({ cx, cz, w, h, r, yBase, yTop, bevelW = 0.0007, cornerSegs = 12 }) {
  const rad = Math.min(r, w / 2 - 0.0002, h / 2 - 0.0002)
  const perimeter = []
  const corners = [
    { ox: w / 2 - rad, oz: h / 2 - rad, a0: 0, a1: Math.PI / 2 },
    { ox: -w / 2 + rad, oz: h / 2 - rad, a0: Math.PI / 2, a1: Math.PI },
    { ox: -w / 2 + rad, oz: -h / 2 + rad, a0: Math.PI, a1: Math.PI * 1.5 },
    { ox: w / 2 - rad, oz: -h / 2 + rad, a0: Math.PI * 1.5, a1: Math.PI * 2 },
  ]
  for (const c of corners) {
    for (let i = 0; i <= cornerSegs; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / cornerSegs)
      const cos = Math.cos(a), sin = Math.sin(a)
      perimeter.push({ dx: c.ox + rad * cos, dz: c.oz + rad * sin, nx: cos, nz: sin })
    }
  }
  const N = perimeter.length
  const rings = 5
  const rim = { pos: [], norm: [], uv: [], ind: [] }
  for (let ri = 0; ri <= rings; ri++) {
    const t = ri / rings
    const ang = t * (Math.PI / 2)
    const inset = bevelW * (1 - Math.cos(ang))
    const py = yBase + (yTop - yBase) * Math.sin(ang)
    const ny = Math.sin(ang)
    const nHoriz = Math.cos(ang)
    for (let pi = 0; pi < N; pi++) {
      const p = perimeter[pi]
      const px = cx + p.dx - p.nx * inset
      const pz = cz + p.dz - p.nz * inset
      rim.pos.push(px, py, pz)
      rim.norm.push(p.nx * nHoriz, ny, p.nz * nHoriz)
      rim.uv.push((px + 0.036) / 0.072, (pz + 0.075) / 0.150)
    }
  }
  for (let ri = 0; ri < rings; ri++) {
    const r0 = ri * N, r1 = (ri + 1) * N
    for (let pi = 0; pi < N; pi++) {
      const pNext = (pi + 1) % N
      // Sentido anti-horário visto de +Y (normal apontando para +Y)
      rim.ind.push(r0 + pi, r0 + pNext, r1 + pNext)
      rim.ind.push(r0 + pi, r1 + pNext, r1 + pi)
    }
  }

  // Topo plano
  const cap = { pos: [cx, yTop, cz], norm: [0, 1, 0], uv: [(cx + 0.036) / 0.072, (cz + 0.075) / 0.150], ind: [] }
  for (let pi = 0; pi < N; pi++) {
    const p = perimeter[pi]
    const px = cx + p.dx - p.nx * bevelW
    const pz = cz + p.dz - p.nz * bevelW
    cap.pos.push(px, yTop, pz)
    cap.norm.push(0, 1, 0)
    cap.uv.push((px + 0.036) / 0.072, (pz + 0.075) / 0.150)
  }
  for (let pi = 0; pi < N; pi++) {
    const pNext = (pi + 1) % N
    cap.ind.push(0, 1 + pNext, 1 + pi)
  }
  return { rim, cap }
}

function placeSubAssembly(prims, assembly, tx, ty, tz, scaleXZ = 1, scaleY = 1) {
  for (let pi = 0; pi < prims.length; pi++) {
    if (!assembly[pi] || assembly[pi].ind.length === 0) continue
    appendGeometry(prims[pi], assembly[pi], (x, y, z, nx, ny, nz, u, v) => [
      tx + x * scaleXZ,
      ty + y * scaleY,
      tz + z * scaleXZ,
      nx, ny, nz, u, v,
    ])
  }
}

async function buildModelGlb(spec) {
  const gltf = structuredClone(donorGltf)
  const sx = spec.w / W0
  const sy = spec.d / D0
  const sz = spec.h / H0
  const yBack = spec.d / 2

  // Ajusta fatores PBR de acordo com o acabamento da geração
  const matAlu = gltf.materials[0].pbrMetallicRoughness
  const matGlass = gltf.materials[13].pbrMetallicRoughness
  if (spec.frame === 'steel') {
    matAlu.metallicFactor = 0.96
    matAlu.roughnessFactor = 0.12
  } else if (spec.frame === 'titanium') {
    matAlu.metallicFactor = 0.86
    matAlu.roughnessFactor = 0.26
  } else {
    matAlu.metallicFactor = 0.78
    matAlu.roughnessFactor = 0.34
  }
  matGlass.roughnessFactor = spec.back === 'gloss' ? 0.06 : 0.32

  // Prepara primitivas da Mesh 0
  const mesh0Prims = donorMesh0.map(() => ({ pos: [], norm: [], uv: [], ind: [] }))

  if (spec.cam === 'plateau') {
    // Modelos com plateau (17 Pro Max, 18 Pro, 18 Pro Max): preserva 100% da topologia do 17 Pro escalada
    for (let pi = 0; pi < donorMesh0.length; pi++) {
      const p = donorMesh0[pi]
      const allComps = Object.values(p.byTag).flat()
      const sub = extractSubMesh(p.pos, p.norm, p.uv, allComps, (x, y, z, nx, ny, nz, u, v) => {
        // 18 Pro: lente/filtro da câmera frontal (face frontal, y < 0) acompanham a ilha compacta
        if (spec.island === 'compact' && y < -0.0025 && inIslandZone(x, z)) [x, z] = islandRemap(x, z, sx, sz, spec.h)
        return [x * sx, y * sy, z * sz, nx, ny, nz, u, v]
      })
      appendGeometry(mesh0Prims[pi], sub)
    }
  } else {
    // Demais 24 modelos: chassi com traseira nivelada + vidro traseiro inteiriço + ilha de câmera específica
    for (let pi = 0; pi < donorMesh0.length; pi++) {
      const p = donorMesh0[pi]
      const chassisComps = [...(p.byTag.chassis ?? [])]
      const mapChassisVertex = (x, y, z, nx, ny, nz, u, v) => {
        let cy = y
        let cny = ny
        // Nivela o interior traseiro do chassi abaixo do vidro traseiro inteiriço
        const isInnerBack = Math.abs(x) < 0.0343 && Math.abs(z) < 0.0733
        if (isInnerBack && cy > 0.0026) {
          cy = Math.min(cy, 0.00405)
          cny = 1
        } else if (cy > 0.00435) {
          cy = 0.00435
        }
        return [x * sx, cy * sy, z * sz, nx, cny, nz, u, v]
      }
      if (chassisComps.length) {
        appendGeometry(mesh0Prims[pi], extractSubMesh(p.pos, p.norm, p.uv, chassisComps, mapChassisVertex))
      }

      // Câmera frontal permanece na Mesh 0 (Prim 3 e Prim 11), deslocando-se para o Notch quando necessário
      if (p.byTag.frontCam?.length) {
        const notchScaleX = spec.front === 'notch-wide' ? 1.48 : spec.front === 'notch-narrow' ? 1.18 : 1
        const dzNotch = spec.front === 'island' ? 0 : -0.0021
        const dxNotch = spec.front === 'island' ? 0 : FRONTCAM_CENTER.x * (notchScaleX - 1)
        appendGeometry(
          mesh0Prims[pi],
          extractSubMesh(p.pos, p.norm, p.uv, p.byTag.frontCam, (x, y, z, nx, ny, nz, u, v) => [
            (x + dxNotch) * sx,
            y * sy,
            (z + dzNotch) * sz,
            nx, ny, nz, u, v,
          ]),
        )
      }

      // Controle da Câmera: mantém nos modelos 16/17/18 ou nivela rente à moldura de alumínio nos modelos anteriores
      if (p.byTag.camCtrl?.length) {
        if (spec.camCtrl) {
          appendGeometry(mesh0Prims[pi], extractSubMesh(p.pos, p.norm, p.uv, p.byTag.camCtrl, mapChassisVertex))
        } else {
          // Fecha o recorte na lateral direita usando o material Anodized aluminum (Prim 0)
          const sealed = extractSubMesh(p.pos, p.norm, p.uv, p.byTag.camCtrl, (x, y, z, _nx, ny, nz, u, v) => [
            Math.min(x, -0.03585) * sx,
            y * sy,
            z * sz,
            -1, ny * 0.1, nz * 0.1, u, v,
          ])
          appendGeometry(mesh0Prims[0], sealed)
        }
      }
    }

    // Painel traseiro inteiriço de vidro (Prim 13 - Frosted glass)
    const backPanel = createRoundedIsland({
      cx: 0,
      cz: 0,
      w: spec.w - 0.0024,
      h: spec.h - 0.0024,
      r: 0.0072 * sx,
      yBase: yBack - 0.00022,
      yTop: yBack + 0.00004,
      bevelW: 0.00045,
      cornerSegs: 16,
    })
    appendGeometry(mesh0Prims[13], backPanel.rim)
    appendGeometry(mesh0Prims[13], backPanel.cap)

    // Logotipo centralizado na traseira (Prim 5 - Glass tint)
    appendGeometry(mesh0Prims[5], logoAssembly, (x, _y, z, nx, ny, nz, u, v) => [
      x,
      yBack + 0.00009,
      z,
      nx, ny, nz, u, v,
    ])

    // Constrói o módulo de câmera traseiro e posiciona lentes, flash, LiDAR e microfone
    const xLeft = -spec.w / 2
    const zTop = -spec.h / 2

    if (spec.cam.startsWith('tri')) {
      const is12 = spec.cam === 'tri-12'
      const is13 = spec.cam === 'tri-13'
      const islandW = is12 ? 0.0315 : is13 ? 0.0355 : 0.0372
      const islandH = is12 ? 0.0330 : is13 ? 0.0370 : 0.0388
      const lensScale = is12 ? 0.86 : is13 ? 0.96 : 1.01
      const bumpH = is12 ? 0.0017 : 0.0021
      const cx = xLeft + 0.0044 + islandW / 2
      const cz = zTop + 0.0044 + islandH / 2
      const yTop = yBack + bumpH

      const island = createRoundedIsland({
        cx, cz, w: islandW, h: islandH, r: islandW * 0.27,
        yBase: yBack, yTop, bevelW: 0.0008, cornerSegs: 14,
      })
      appendGeometry(mesh0Prims[0], island.rim)
      appendGeometry(mesh0Prims[13], island.cap)

      placeSubAssembly(mesh0Prims, lensAssembly, cx - islandW * 0.235, yTop, cz - islandH * 0.245, lensScale, 1)
      placeSubAssembly(mesh0Prims, lensAssembly, cx - islandW * 0.235, yTop, cz + islandH * 0.245, lensScale, 1)
      placeSubAssembly(mesh0Prims, lensAssembly, cx + islandW * 0.225, yTop, cz, lensScale, 1)
      placeSubAssembly(mesh0Prims, flashAssembly, cx + islandW * 0.235, yTop, cz - islandH * 0.285, 0.92, 1)
      placeSubAssembly(mesh0Prims, lidarAssembly, cx + islandW * 0.235, yTop, cz + islandH * 0.285, 0.92, 1)
      placeSubAssembly(mesh0Prims, micAssembly, cx + islandW * 0.36, yTop, cz + islandH * 0.145, 0.9, 1)
    } else if (spec.cam === 'diag2') {
      const islandW = 0.0295
      const islandH = 0.0295
      const bumpH = 0.0018
      const cx = xLeft + 0.0046 + islandW / 2
      const cz = zTop + 0.0046 + islandH / 2
      const yTop = yBack + bumpH

      const island = createRoundedIsland({
        cx, cz, w: islandW, h: islandH, r: 0.0082,
        yBase: yBack, yTop, bevelW: 0.00075, cornerSegs: 14,
      })
      appendGeometry(mesh0Prims[0], island.rim)
      appendGeometry(mesh0Prims[13], island.cap)

      placeSubAssembly(mesh0Prims, lensAssembly, cx - islandW * 0.23, yTop, cz - islandH * 0.23, 0.86, 0.92)
      placeSubAssembly(mesh0Prims, lensAssembly, cx + islandW * 0.23, yTop, cz + islandH * 0.23, 0.86, 0.92)
      placeSubAssembly(mesh0Prims, flashAssembly, cx + islandW * 0.24, yTop, cz - islandH * 0.24, 0.88, 1)
      placeSubAssembly(mesh0Prims, micAssembly, cx - islandW * 0.24, yTop, cz + islandH * 0.24, 0.9, 1)
    } else if (spec.cam === 'vert2') {
      const islandW = 0.0268
      const islandH = 0.0308
      const bumpH = 0.0017
      const cx = xLeft + 0.0046 + islandW / 2
      const cz = zTop + 0.0046 + islandH / 2
      const yTop = yBack + bumpH

      const island = createRoundedIsland({
        cx, cz, w: islandW, h: islandH, r: 0.0078,
        yBase: yBack, yTop, bevelW: 0.0007, cornerSegs: 14,
      })
      appendGeometry(mesh0Prims[0], island.rim)
      appendGeometry(mesh0Prims[13], island.cap)

      placeSubAssembly(mesh0Prims, lensAssembly, cx - islandW * 0.17, yTop, cz - islandH * 0.24, 0.82, 0.9)
      placeSubAssembly(mesh0Prims, lensAssembly, cx - islandW * 0.17, yTop, cz + islandH * 0.24, 0.82, 0.9)
      placeSubAssembly(mesh0Prims, flashAssembly, cx + islandW * 0.25, yTop, cz, 0.85, 1)
      placeSubAssembly(mesh0Prims, micAssembly, cx + islandW * 0.25, yTop, cz + islandH * 0.25, 0.85, 1)
    } else if (spec.cam === 'pill2') {
      const padW = 0.0285, padH = 0.0365
      const pillW = 0.0184, pillH = 0.0345
      const cz = zTop + 0.0048 + padH / 2
      const cxPad = xLeft + 0.0048 + padW / 2
      const cxPill = xLeft + 0.0056 + pillW / 2
      const yPad = yBack + 0.0008
      const yPill = yBack + 0.0021

      const pad = createRoundedIsland({
        cx: cxPad, cz, w: padW, h: padH, r: 0.0092,
        yBase: yBack, yTop: yPad, bevelW: 0.0006, cornerSegs: 12,
      })
      appendGeometry(mesh0Prims[13], pad.rim)
      appendGeometry(mesh0Prims[13], pad.cap)

      const pill = createRoundedIsland({
        cx: cxPill, cz, w: pillW, h: pillH, r: pillW / 2 - 0.0003,
        yBase: yPad, yTop: yPill, bevelW: 0.0007, cornerSegs: 16,
      })
      appendGeometry(mesh0Prims[0], pill.rim)
      appendGeometry(mesh0Prims[0], pill.cap)

      placeSubAssembly(mesh0Prims, lensAssembly, cxPill, yPill, cz - pillH * 0.24, 0.88, 0.95)
      placeSubAssembly(mesh0Prims, lensAssembly, cxPill, yPill, cz + pillH * 0.24, 0.88, 0.95)
      placeSubAssembly(mesh0Prims, flashAssembly, cxPill + pillW * 0.72, yPad + 0.0001, cz, 0.86, 1)
      placeSubAssembly(mesh0Prims, micAssembly, cxPill + pillW * 0.46, yPill, cz, 0.85, 1)
    } else if (spec.cam === 'single') {
      const cx = xLeft + 0.0148
      const cz = zTop + 0.0148
      const collar = createRoundedIsland({
        cx, cz, w: 0.0168, h: 0.0168, r: 0.0082,
        yBase: yBack, yTop: yBack + 0.0006, bevelW: 0.0004, cornerSegs: 16,
      })
      appendGeometry(mesh0Prims[13], collar.rim)
      appendGeometry(mesh0Prims[13], collar.cap)

      placeSubAssembly(mesh0Prims, lensAssembly, cx, yBack + 0.0005, cz, 0.90, 0.92)
      placeSubAssembly(mesh0Prims, flashAssembly, cx + 0.0135, yBack + 0.0001, cz, 0.85, 1)
      placeSubAssembly(mesh0Prims, micAssembly, cx + 0.0090, yBack + 0.0001, cz + 0.0052, 0.85, 1)
    } else if (spec.cam === 'air') {
      const barW = spec.w - 0.0088
      const barH = 0.0190
      const cz = zTop + 0.0054 + barH / 2
      const yTop = yBack + 0.0018

      const bar = createRoundedIsland({
        cx: 0, cz, w: barW, h: barH, r: barH / 2 - 0.0003,
        yBase: yBack, yTop, bevelW: 0.0008, cornerSegs: 16,
      })
      appendGeometry(mesh0Prims[0], bar.rim)
      appendGeometry(mesh0Prims[13], bar.cap)

      placeSubAssembly(mesh0Prims, lensAssembly, -barW / 2 + 0.0108, yTop, cz, 0.88, 0.92)
      placeSubAssembly(mesh0Prims, flashAssembly, barW / 2 - 0.0108, yTop, cz, 0.88, 1)
      placeSubAssembly(mesh0Prims, micAssembly, -barW / 2 + 0.0225, yTop, cz, 0.88, 1)
    }
  }

  // Prepara as 5 primitivas da Mesh 1 (tela frontal, vidro, Dynamic Island / Notch)
  const notchScaleX = spec.front === 'notch-wide' ? 1.48 : spec.front === 'notch-narrow' ? 1.18 : 1
  const isNotch = spec.front !== 'island'

  const mesh1Prims = donorGltf.meshes[1].primitives.map((p, pi) => {
    const pos = getAcc(donorGltf, donorBin, p.attributes.POSITION)
    const norm = getAcc(donorGltf, donorBin, p.attributes.NORMAL)
    const uv = getAcc(donorGltf, donorBin, p.attributes.TEXCOORD_0)
    const ind = getAcc(donorGltf, donorBin, p.indices)
    const comps = getComponents(pos, ind)

    const out = extractSubMesh(pos, norm, uv, comps, (x, y, z, nx, ny, nz, u, v) => {
      let tx = x
      let tz = z
      const inIsland = Math.abs(x) < 0.012 && z > -0.071 && z < -0.063
      if (spec.island === 'compact' && inIslandZone(x, z)) {
        // ilha compacta: pílula, contorno, vidro e a borda do recorte da tela OLED seguem o mesmo mapeamento
        ;[tx, tz] = islandRemap(x, z, sx, sz, spec.h)
      } else if (isNotch && inIsland) {
        if (pi === 2) {
          // Lente da câmera frontal (Prim 2 C1): desloca sem distorcer o círculo
          tx = x + FRONTCAM_CENTER.x * (notchScaleX - 1)
          tz = z - 0.0021
        } else {
          tx = x * notchScaleX
          // Une o topo da Dynamic Island à borda superior (-0.07245) para formar o Notch
          const t = (z - (-0.0700)) / ((-0.0640) - (-0.0700))
          tz = -0.07245 + t * ((-0.0658) - (-0.07245))
        }
      }
      const fx = tx * sx
      const fy = y * sy
      const fz = tz * sz
      // Recalcula UV limpo na tela OLED (Prim 4)
      if (pi === 4) {
        const halfW = 0.0334 * sx
        const halfH = 0.0725 * sz
        const nu = Math.min(0.998, Math.max(0.002, (fx + halfW) / (2 * halfW)))
        const nv = Math.min(0.998, Math.max(0.002, (fz + halfH) / (2 * halfH)))
        return [fx, fy, fz, nx, ny, nz, nu, nv]
      }
      return [fx, fy, fz, nx, ny, nz, u, v]
    })

    // Nos modelos com Notch, adiciona a ponte superior preta na Prim 3 (OLED off) para cantos superiores retos junto à moldura
    if (isNotch && pi === 3) {
      const nw = 0.0105 * notchScaleX * sx
      const z0 = -0.0734 * sz
      const z1 = -0.0688 * sz
      const ny = -0.00341 * sy
      const base = out.pos.length / 3
      out.pos.push(-nw, ny, z0, nw, ny, z0, nw, ny, z1, -nw, ny, z1)
      out.norm.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0)
      out.uv.push(0, 0, 1, 0, 1, 1, 0, 1)
      out.ind.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    return out
  })

  // Reconstrói buffer binário compacto (geometria + texturas otimizadas + wallpaper do modelo)
  const newBufferViews = []
  const newAccessors = []
  const chunks = []
  let byteOffset = 0

  function pushBufferView(buf, target) {
    const pad = (4 - (buf.length % 4)) % 4
    const bvIndex = newBufferViews.length
    const bv = { buffer: 0, byteOffset, byteLength: buf.length }
    if (target) bv.target = target
    newBufferViews.push(bv)
    chunks.push(buf)
    byteOffset += buf.length
    if (pad) {
      chunks.push(Buffer.alloc(pad))
      byteOffset += pad
    }
    return bvIndex
  }

  function pushAccessor(typedArr, type, componentType, target) {
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3 }[type]
    const count = typedArr.length / comps
    const min = new Array(comps).fill(Infinity)
    const max = new Array(comps).fill(-Infinity)
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < comps; c++) {
        const v = typedArr[i * comps + c]
        if (v < min[c]) min[c] = v
        if (v > max[c]) max[c] = v
      }
    }
    const buf = Buffer.from(typedArr.buffer, typedArr.byteOffset, typedArr.byteLength)
    const bufferView = pushBufferView(buf, target)
    const accIndex = newAccessors.length
    newAccessors.push({
      bufferView,
      byteOffset: 0,
      componentType,
      count,
      type,
      min: min.map((n) => Number(n.toFixed(6))),
      max: max.map((n) => Number(n.toFixed(6))),
    })
    return accIndex
  }

  function buildGltfPrimitives(primList, origPrims) {
    const out = []
    for (let pi = 0; pi < primList.length; pi++) {
      const g = primList[pi]
      if (!g.ind.length) continue
      const posArr = new Float32Array(g.pos)
      const normArr = new Float32Array(g.norm)
      const uvArr = new Float32Array(g.uv)
      const maxVert = g.pos.length / 3
      const useU32 = maxVert > 65535
      const indArr = useU32 ? new Uint32Array(g.ind) : new Uint16Array(g.ind)

      const posAcc = pushAccessor(posArr, 'VEC3', 5126, 34962)
      const normAcc = pushAccessor(normArr, 'VEC3', 5126, 34962)
      const uvAcc = pushAccessor(uvArr, 'VEC2', 5126, 34962)
      const indAcc = pushAccessor(indArr, 'SCALAR', useU32 ? 5125 : 5123, 34963)

      out.push({
        attributes: { POSITION: posAcc, NORMAL: normAcc, TEXCOORD_0: uvAcc },
        indices: indAcc,
        material: origPrims[pi].material,
        mode: 4,
      })
    }
    return out
  }

  gltf.meshes[0].primitives = buildGltfPrimitives(mesh0Prims, donorGltf.meshes[0].primitives)
  gltf.meshes[1].primitives = buildGltfPrimitives(mesh1Prims, donorGltf.meshes[1].primitives)

  // Adiciona as 7 imagens (0..5 compactadas + 6 wallpaper exclusivo do modelo)
  const wallpaperBuf = await renderModelWallpaper(spec)
  for (let imgIdx = 0; imgIdx < gltf.images.length; imgIdx++) {
    const imgBuf = imgIdx === 6 ? wallpaperBuf : compactImageBuffers.get(imgIdx)
    const bvIdx = pushBufferView(imgBuf)
    gltf.images[imgIdx].bufferView = bvIdx
  }

  gltf.bufferViews = newBufferViews
  gltf.accessors = newAccessors
  gltf.buffers = [{ byteLength: byteOffset }]

  const jsonBytes = Buffer.from(JSON.stringify(gltf))
  const jsonPad = Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)
  const jsonChunk = Buffer.concat([jsonBytes, jsonPad])
  const binChunk = Buffer.concat(chunks)

  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + jsonChunk.length + binChunk.length, 8)
  header.writeUInt32LE(jsonChunk.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)

  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binChunk.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)

  const outPath = `public/models/${spec.id}.glb`
  const full = Buffer.concat([header, jsonChunk, binHeader, binChunk])
  await writeFile(outPath, full)
  return { id: spec.id, kb: Math.round(full.length / 1024) }
}

let totalKb = 0
// iPhone 12 e 12 mini têm modelo próprio (scripts/modelar-iphone-12.mjs): não sobrescrever
// modelos próprios (não gerados aqui): 12/12 mini (modelar-iphone-12.mjs); 12 Pro/Pro Max, 13 Pro e 14 Pro/Pro Max (scripts/blender/)
const MODELADOS_A_PARTE = new Set(['iphone-12', 'iphone-12-mini', 'iphone-12-pro', 'iphone-12-pro-max', 'iphone-13-pro', 'iphone-14-pro', 'iphone-14-pro-max', 'iphone-air', 'iphone-17', 'iphone-16', 'iphone-16-plus'])
// --only=iphone-18-pro,iphone-18-pro-max gera apenas esses modelos (os demais arquivos ficam intactos)
const ONLY = new Set((process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean))
for (const spec of SPECS) {
  if (ONLY.size && !ONLY.has(spec.id)) continue
  if (MODELADOS_A_PARTE.has(spec.id)) { console.log(`• ${spec.id}: mantido (modelo próprio)`); continue }
  const res = await buildModelGlb(spec)
  totalKb += res.kb
  console.log(`✓ ${res.id}.glb (${res.kb} KB)`)
}
const gerados = SPECS.filter((s) => (!ONLY.size || ONLY.has(s.id)) && !MODELADOS_A_PARTE.has(s.id)).length
console.log(`✓ ${gerados} modelo(s) 3D gerado(s) (${(totalKb / 1024).toFixed(1)} MB no total) + iphone-17-pro.glb preservado`)
