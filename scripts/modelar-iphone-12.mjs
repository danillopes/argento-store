// Modela do zero o iPhone 12 e o iPhone 12 mini e grava public/models/iphone-12.glb e iphone-12-mini.glb.
// Uso: npm run modelar:iphone12
//
// Geometria própria (não copia malhas de terceiros), em metros e nas medidas oficiais:
//   iPhone 12      146,7 × 71,5 × 7,4 mm      iPhone 12 mini 131,5 × 64,2 × 7,4 mm
// Detalhes da geração: laterais retas de alumínio, traseira de vidro brilhante, módulo de câmera
// quadrado com duas lentes na vertical + flash + microfone, notch largo, botões, gaveta do SIM,
// linhas de antena, porta Lightning, alto-falantes e parafusos.
//
// Convenções iguais às dos demais modelos do site (o visualizador reconhece pelos nomes dos materiais):
//   eixo Y = espessura (traseira em +Y) · eixo Z = comprimento (topo em −Z) · câmera no lado −X
//   'Anodized aluminum' moldura/botões (recebe a cor do aparelho) · 'Frosted glass' traseira (cor)
//   'Glass' vidro frontal · 'Display Frame' borda preta · 'OLED' tela (UV u→x, v=0 no topo) · 'OLED off' notch
import { writeFile, mkdir } from 'node:fs/promises'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const MM = 0.001

// ---------- materiais (mesmos nomes e valores-base dos outros modelos) ----------
const MATERIALS = {
  'Anodized aluminum': { c: [0.41, 0.41, 0.41, 1], m: 0.78, r: 0.34 },
  'Plastic antena': { c: [0.51, 0.51, 0.51, 1], m: 0, r: 0.4 },
  'Plastic port': { c: [0.02, 0.02, 0.02, 1], m: 0, r: 0.41 },
  'Camera filter': { c: [0, 0, 0, 1], m: 0, r: 0.56 },
  LED: { c: [1, 0.94, 0.58, 1], m: 0, r: 0.5 },
  'Plastic LED': { c: [1, 1, 1, 0.8], m: 0, r: 0.37, blend: true },
  'Metal Screw': { c: [0.56, 0.61, 0.8, 1], m: 0.94, r: 0.16 },
  'Display Frame': { c: [0, 0, 0, 1], m: 0.02, r: 0.05 },
  'Camera sapphire miror': { c: [0, 0, 0, 0.73], m: 0, r: 0.01, blend: true },
  'Camera Lens': { c: [0.01, 0.01, 0.02, 1], m: 0.2, r: 0.02 },
  'Frosted glass': { c: [0.8, 0.8, 0.8, 1], m: 0, r: 0.06 },
  Glass: { c: [0, 0, 0, 0.78], m: 0, r: 0.02, blend: true },
  'OLED off': { c: [0.02, 0.02, 0.02, 1], m: 0, r: 0.06 },
  OLED: { c: [0.02, 0.02, 0.025, 1], m: 0, r: 0.057 },
}

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

// Placa arredondada no plano XZ, ocupando y0..y1, centrada em (cx, cz). Chanfro suave nas bordas.
function slab(w, h, r, y0, y1, { cx = 0, cz = 0, bevel = 0, seg = 18 } = {}) {
  const d = y1 - y0
  const bt = Math.min(bevel, d * 0.45)
  const shape = roundedRect(w - 2 * bevel, h - 2 * bevel, Math.max(0.0002, r - bevel))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-6, d - 2 * bt), bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelSegments: 3, curveSegments: seg,
  })
  g.translate(0, 0, bt) // 0..d no eixo da extrusão
  g.rotateX(Math.PI / 2) // forma Y → Z do aparelho, extrusão → −Y
  g.translate(cx, y1, cz)
  return g
}

// Disco voltado para +Y (traseira) ou −Y (frente)
function disc(r, y, cx, cz, up = true, seg = 40) {
  const g = new THREE.CircleGeometry(r, seg)
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  g.translate(cx, y, cz)
  return g
}

// Cilindro no eixo Y (lentes, flash)
function cyl(r, y0, y1, cx, cz, seg = 40) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, false)
  g.translate(cx, (y0 + y1) / 2, cz)
  return g
}

// Caixa com cantos arredondados (botões, porta) via extrusão; eixo longo = Z
function sideButton(len, thick, protrude, x, cz, side) {
  const shape = roundedRect(protrude * 2, len, Math.min(protrude, len / 2))
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 10 })
  g.translate(0, 0, -thick / 2)
  g.rotateX(Math.PI / 2) // forma Y → Z, extrusão → Y
  g.translate(x + side * 0.0001, 0, cz)
  return g
}

// Furo/porta na borda inferior (z = +H/2): cápsula achatada vista de baixo
function bottomCapsule(len, height, x, H, depth = 0.0006) {
  const shape = roundedRect(len, height, height / 2)
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 })
  // forma no plano XY (x, altura=y do aparelho), extrusão → +Z (para fora da base)
  g.translate(x, 0, H / 2 - depth * 0.5)
  return g
}

function bottomHole(r, x, H) {
  const g = new THREE.CylinderGeometry(r, r, 0.0006, 20)
  g.rotateX(Math.PI / 2)
  g.translate(x, 0, H / 2 + 0.00005)
  return g
}

// Tela com UV igual aos outros modelos: u = (x − xmín)/w, v = 0 no topo (−Z)
function screenPlane(w, h, r, y) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 24)
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.rotateX(Math.PI / 2) // normal → −Y (frente); forma Y → Z
  g.translate(0, y, 0)
  return g
}

// Notch do iPhone 12: retângulo com cantos inferiores arredondados e "ombros" curvos no topo
function notch(nw, nh, topZ, y) {
  const s = new THREE.Shape()
  const rb = nh * 0.42, sh = nh * 0.38
  const x0 = -nw / 2, x1 = nw / 2
  // coordenadas da forma: X = largura, Y = profundidade a partir do topo (positivo para baixo)
  s.moveTo(x0 - sh, 0)
  s.quadraticCurveTo(x0, 0, x0, sh)
  s.lineTo(x0, nh - rb)
  s.quadraticCurveTo(x0, nh, x0 + rb, nh)
  s.lineTo(x1 - rb, nh)
  s.quadraticCurveTo(x1, nh, x1, nh - rb)
  s.lineTo(x1, sh)
  s.quadraticCurveTo(x1, 0, x1 + sh, 0)
  s.lineTo(x0 - sh, 0)
  const g = new THREE.ShapeGeometry(s, 16)
  g.rotateX(Math.PI / 2) // forma Y → +Z (para baixo da tela), normal → −Y
  g.translate(0, y, topZ)
  return g
}

// ---------- o aparelho ----------
function buildIphone12({ W, H, D, corner, cam }) {
  const parts = Object.fromEntries(Object.keys(MATERIALS).map((k) => [k, []]))
  const add = (mat, g) => parts[mat].push(g)
  const hy = D / 2

  // Moldura de alumínio com laterais retas e chanfro mínimo
  add('Anodized aluminum', slab(W, H, corner, -hy, hy, { bevel: 0.22 * MM, seg: 28 }))

  // Linhas de antena (faixas plásticas atravessando a lateral)
  const strip = (x, z, alongX) => {
    const g = new THREE.BoxGeometry(alongX ? 0.9 * MM : 0.12 * MM, D * 0.92, alongX ? 0.12 * MM : 0.9 * MM)
    g.translate(x, 0, z)
    add('Plastic antena', g)
  }
  const sideX = W / 2 + 0.03 * MM, endZ = H / 2 + 0.03 * MM
  for (const sx of [-1, 1]) {
    strip(sx * sideX, -H / 2 + 13 * MM, false)
    strip(sx * sideX, H / 2 - 13 * MM, false)
  }
  strip(-W / 2 + 15 * MM, -endZ, true)
  strip(W / 2 - 22 * MM, endZ, true)

  // Traseira de vidro (rente à moldura) e módulo de câmera quadrado em vidro
  add('Frosted glass', slab(W - 0.7 * MM, H - 0.7 * MM, corner - 0.35 * MM, hy - 0.5 * MM, hy + 0.02 * MM, { bevel: 0.15 * MM, seg: 28 }))
  const sq = cam.size, sqR = cam.radius
  const sqCx = -W / 2 + cam.margin + sq / 2
  const sqCz = -H / 2 + cam.margin + sq / 2
  add('Frosted glass', slab(sq, sq, sqR, hy, hy + 0.85 * MM, { cx: sqCx, cz: sqCz, bevel: 0.35 * MM, seg: 24 }))
  const top = hy + 0.85 * MM

  // Duas lentes na vertical (coluna esquerda do módulo, vista de trás)
  const lensX = sqCx - sq / 2 + cam.lensInset
  for (const lz of [sqCz - sq / 2 + cam.lensInset, sqCz + sq / 2 - cam.lensInset]) {
    add('Anodized aluminum', cyl(cam.ring, top, top + 1.15 * MM, lensX, lz)) // anel metálico
    add('Camera Lens', disc(cam.ring - 0.45 * MM, top + 1.16 * MM, lensX, lz)) // vidro de safira
    add('Camera filter', disc(cam.ring * 0.55, top + 1.17 * MM, lensX, lz)) // abertura
    add('Camera sapphire miror', disc(cam.ring * 0.3, top + 1.18 * MM, lensX, lz)) // reflexo interno
  }
  // Coluna direita: microfone em cima e flash no centro
  const rightX = sqCx + sq / 2 - cam.lensInset * 0.82
  add('Plastic port', disc(0.45 * MM, top + 0.01 * MM, rightX, sqCz - sq / 2 + cam.lensInset * 0.85))
  add('Plastic LED', cyl(cam.flash, top, top + 0.12 * MM, rightX, sqCz + 0.4 * MM, 32))
  add('LED', disc(cam.flash * 0.7, top + 0.13 * MM, rightX, sqCz + 0.4 * MM))

  // Frente: vidro, borda preta, tela e notch
  const fy = -hy
  add('Display Frame', slab(W - 0.6 * MM, H - 0.6 * MM, corner - 0.3 * MM, fy - 0.01 * MM, fy + 0.45 * MM, { seg: 28 }))
  const sw = W - 4.4 * MM, sh = H - 4.4 * MM
  add('OLED', screenPlane(sw, sh, corner - 2.2 * MM, fy - 0.03 * MM))
  const nw = cam.notchW, nh = cam.notchH
  add('OLED off', notch(nw, nh, -sh / 2, fy - 0.05 * MM))
  // alto-falante de chamada e câmera frontal dentro do notch
  {
    const g = new THREE.ShapeGeometry(roundedRect(nw * 0.36, 0.75 * MM, 0.37 * MM), 8)
    g.rotateX(Math.PI / 2); g.translate(0, fy - 0.07 * MM, -sh / 2 + nh * 0.36)
    add('Metal Screw', g)
  }
  add('Camera Lens', disc(0.85 * MM, fy - 0.07 * MM, nw * 0.24, -sh / 2 + nh * 0.45, false, 24))
  add('Glass', slab(W - 0.55 * MM, H - 0.55 * MM, corner - 0.28 * MM, fy - 0.35 * MM, fy - 0.02 * MM, { bevel: 0.12 * MM, seg: 28 }))

  // Botões (vista de frente: liga/desliga à direita = lado −X; volume e chave à esquerda = +X)
  const btnT = D * 0.5, btnP = 0.45 * MM
  add('Anodized aluminum', sideButton(17.5 * MM * cam.k, btnT, btnP, -W / 2, -H / 2 + 47 * MM * cam.k, -1))
  add('Anodized aluminum', sideButton(6.5 * MM * cam.k, btnT * 0.8, btnP, W / 2, -H / 2 + 27 * MM * cam.k, 1))
  add('Anodized aluminum', sideButton(10.5 * MM * cam.k, btnT, btnP, W / 2, -H / 2 + 40 * MM * cam.k, 1))
  add('Anodized aluminum', sideButton(10.5 * MM * cam.k, btnT, btnP, W / 2, -H / 2 + 54 * MM * cam.k, 1))
  // Gaveta do SIM (contorno escuro rente à lateral +X)
  {
    const g = new THREE.BoxGeometry(0.05 * MM, D * 0.42, 15.5 * MM * cam.k)
    g.translate(W / 2 + 0.02 * MM, 0, -H / 2 + 86 * MM * cam.k)
    add('Plastic port', g)
  }

  // Base: porta Lightning, alto-falantes, parafusos
  add('Plastic port', bottomCapsule(8.6 * MM, 2.75 * MM, 0, H))
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 6; i++) add('Plastic port', bottomHole(0.55 * MM, sx * (8.8 * MM + i * 1.75 * MM), H))
    add('Metal Screw', bottomHole(0.62 * MM, sx * 5.9 * MM, H))
  }

  // Une por material (todas as geometrias sem índice, com posição/normal/uv)
  const out = {}
  for (const [mat, list] of Object.entries(parts)) {
    if (!list.length) continue
    const geos = list.map((g) => {
      let n = g.index ? g.toNonIndexed() : g
      if (!n.attributes.normal) n.computeVertexNormals()
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
      return n
    })
    out[mat] = mergeGeometries(geos, false)
  }
  return out
}

// ---------- gravação GLB (glTF 2.0 binário) ----------
function toGLB(name, groups) {
  const chunks = []
  let offset = 0
  const bufferViews = [], accessors = [], primitives = [], materials = []
  const push = (arr, target) => {
    const bytes = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
    const pad = (4 - (bytes.length % 4)) % 4
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target })
    chunks.push(bytes, Buffer.alloc(pad))
    offset += bytes.length + pad
    return bufferViews.length - 1
  }
  for (const [matName, g] of Object.entries(groups)) {
    const def = MATERIALS[matName]
    const mi = materials.length
    materials.push({
      name: matName,
      pbrMetallicRoughness: { baseColorFactor: def.c, metallicFactor: def.m, roughnessFactor: def.r },
      ...(def.blend ? { alphaMode: 'BLEND' } : {}),
      doubleSided: true,
    })
    const pos = g.attributes.position.array, nrm = g.attributes.normal.array, uv = g.attributes.uv.array
    const count = pos.length / 3
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) { const v = pos[i * 3 + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v }
    // normaliza normais (evita sombras erradas após a união)
    const n32 = new Float32Array(nrm)
    for (let i = 0; i < count; i++) { const l = Math.hypot(n32[i * 3], n32[i * 3 + 1], n32[i * 3 + 2]) || 1; n32[i * 3] /= l; n32[i * 3 + 1] /= l; n32[i * 3 + 2] /= l }
    const a = accessors.length
    accessors.push({ bufferView: push(new Float32Array(pos), 34962), componentType: 5126, count, type: 'VEC3', min: mn, max: mx })
    accessors.push({ bufferView: push(n32, 34962), componentType: 5126, count, type: 'VEC3' })
    accessors.push({ bufferView: push(new Float32Array(uv), 34962), componentType: 5126, count, type: 'VEC2' })
    primitives.push({ attributes: { POSITION: a, NORMAL: a + 1, TEXCOORD_0: a + 2 }, material: mi, mode: 4 })
  }
  const json = {
    asset: { version: '2.0', generator: 'Argento modelar-iphone-12.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    // mesma rotação dos demais modelos do site (+90° em X)
    nodes: [{ name, mesh: 0, rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] }],
    meshes: [{ name, primitives }],
    materials,
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
  // iPhone 12: módulo de câmera ~26,5 mm; notch largo ~34,8 mm
  { id: 'iphone-12', name: 'iPhone 12', W: 71.5 * MM, H: 146.7 * MM, D: 7.4 * MM, corner: 10.3 * MM,
    cam: { k: 1, size: 26.5 * MM, radius: 6.4 * MM, margin: 3.6 * MM, lensInset: 7.1 * MM, ring: 5.65 * MM, flash: 2.2 * MM, notchW: 34.8 * MM, notchH: 5.9 * MM } },
  // iPhone 12 mini: mesmas proporções, módulo e notch um pouco menores
  { id: 'iphone-12-mini', name: 'iPhone 12 mini', W: 64.2 * MM, H: 131.5 * MM, D: 7.4 * MM, corner: 9.3 * MM,
    cam: { k: 0.9, size: 24.6 * MM, radius: 6 * MM, margin: 3.3 * MM, lensInset: 6.6 * MM, ring: 5.25 * MM, flash: 2 * MM, notchW: 33.2 * MM, notchH: 5.8 * MM } },
]

await mkdir('public/models', { recursive: true })
for (const s of SPECS) {
  const glb = toGLB(s.name, buildIphone12(s))
  await writeFile(`public/models/${s.id}.glb`, glb)
  console.log(`✓ public/models/${s.id}.glb  ${(glb.length / 1024).toFixed(0)} KB`)
}
