// Gera public/models/explodido/iphone-17-pro.glb: o modelo real do iPhone 17 Pro do site separado em peças
// (vidro frontal, tela, câmeras, vidro traseiro, carcaça unibody) + componentes internos ilustrativos
// posicionados conforme o layout publicado do aparelho (placa lógica com A19 Pro no topo, bateria grande
// no centro, câmara de vapor, MagSafe, Taptic Engine, alto-falante e porta USB-C na base).
// Uso: npm run modelar:17pro
//
// O arquivo original public/models/iphone-17-pro.glb não é alterado. Nesta cópia as texturas são
// reduzidas para 1024 px (WebP) para o carregamento ser leve no celular.
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup } from '@gltf-transform/functions'
import sharp from 'sharp'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MM, roundedRect, slab, extrudeShape, cyl, disc, ring, flatten } from './lib/geometria.mjs'

const SRC = 'public/models/iphone-17-pro.glb'
const OUT = 'public/models/explodido/iphone-17-pro.glb'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(SRC)
const root = doc.getRoot()
const buffer = root.listBuffers()[0]

// ---------- 1. separar o modelo real em peças, pelo material de cada primitiva ----------
const groupOf = (meshName, mat) => {
  const front = meshName.endsWith('.004') || meshName.endsWith('.001') // malha da frente (tela e vidro)
  if (front) return mat === 'Glass' ? 'FrontGlass' : 'Display'
  if (['Display Frame', 'Camera sapphire miror', 'Camera mirror filter', 'Camera Lens', 'LED', 'Plastic LED'].includes(mat)) return 'CameraModule'
  if (mat === 'Frosted glass') return 'RearGlass'
  return 'DeviceBody'
}
const parts = new Map() // nome → Mesh
const partMesh = (name) => {
  if (!parts.has(name)) parts.set(name, doc.createMesh(name))
  return parts.get(name)
}
const oldNodes = root.listNodes().slice()
const rotation = oldNodes[0].getRotation()
for (const node of oldNodes) {
  const mesh = node.getMesh()
  if (!mesh) continue
  for (const prim of mesh.listPrimitives().slice()) {
    const g = groupOf(mesh.getName(), prim.getMaterial()?.getName() ?? '')
    mesh.removePrimitive(prim)
    partMesh(g).addPrimitive(prim)
  }
}
for (const n of oldNodes) n.dispose()

// ---------- 2. componentes internos (ilustração; medidas em metros, espaço do modelo) ----------
const MATS = {
  PCB: { c: [0.04, 0.09, 0.07, 1], m: 0.1, r: 0.55 },
  Chip: { c: [0.06, 0.06, 0.07, 1], m: 0.25, r: 0.32 },
  'Chip lid': { c: [0.68, 0.69, 0.72, 1], m: 0.9, r: 0.25 },
  Shield: { c: [0.72, 0.73, 0.75, 1], m: 0.92, r: 0.22 },
  Battery: { c: [0.12, 0.12, 0.13, 1], m: 0.15, r: 0.6 },
  'Battery label': { c: [0.86, 0.86, 0.87, 1], m: 0, r: 0.7 },
  Copper: { c: [0.78, 0.47, 0.26, 1], m: 0.95, r: 0.28 },
  Graphite: { c: [0.16, 0.16, 0.17, 1], m: 0.3, r: 0.5 },
  Magnet: { c: [0.2, 0.2, 0.22, 1], m: 0.6, r: 0.35 },
  'Camera body': { c: [0.08, 0.08, 0.09, 1], m: 0.4, r: 0.4 },
  Sensor: { c: [0.18, 0.2, 0.32, 1], m: 0.7, r: 0.15 },
  'Lens element': { c: [0.55, 0.7, 0.85, 0.55], m: 0.1, r: 0.03, blend: true },
  Speaker: { c: [0.06, 0.06, 0.07, 1], m: 0.1, r: 0.6 },
  Flex: { c: [0.85, 0.55, 0.12, 1], m: 0.2, r: 0.45 },
}
const internal = {} // peça → material → [geometrias]
const add = (part, mat, g) => { ((internal[part] ??= {})[mat] ??= []).push(g) }

// Câmeras traseiras: posições tiradas das lentes do próprio modelo (duas à esquerda, uma à direita)
const LENSES = [
  { x: -0.0183, z: -0.0621, r: 0.0060 }, // grande-angular (Fusion 48 MP)
  { x: -0.0183, z: -0.0449, r: 0.0060 }, // ultra-angular
  { x: -0.0062, z: -0.0535, r: 0.0060 }, // teleobjetiva
]
for (const L of LENSES) {
  add('CameraBodies', 'Camera body', slab(L.r * 2.3, L.r * 2.3, 1.6 * MM, -1.2 * MM, 2.2 * MM, { cx: L.x, cz: L.z }))
  add('CameraBodies', 'Camera body', cyl(L.r * 0.95, 2.2 * MM, 5.6 * MM, L.x, L.z))
  add('CameraSensors', 'Sensor', slab(L.r * 1.5, L.r * 1.3, 0.5 * MM, -1.3 * MM, -1.2 * MM, { cx: L.x, cz: L.z }))
  for (let i = 0; i < 4; i++) {
    const y = -0.4 * MM + i * 1.3 * MM
    add(`CameraLenses${i}`, 'Lens element', cyl(L.r * (0.68 - i * 0.07), y, y + 0.25 * MM, L.x, L.z, 32))
  }
}
// Scanner LiDAR (abaixo do flash, à direita do platô)
add('CameraBodies', 'Camera body', slab(6.2 * MM, 6.2 * MM, 1.2 * MM, -1.0 * MM, 3.6 * MM, { cx: 0.0221, cz: -0.0505 }))
add('CameraSensors', 'Sensor', disc(1.7 * MM, 3.62 * MM, 0.0221, -0.0505))

// Placa lógica: topo à direita das câmeras + faixa sob o platô, com A19 Pro e memória
add('MainBoard', 'PCB', slab(0.0275, 0.044, 2 * MM, -1.1 * MM, -0.3 * MM, { cx: 0.0185, cz: -0.046 }))
add('MainBoard', 'PCB', slab(0.064, 0.016, 2 * MM, -1.1 * MM, -0.3 * MM, { cx: 0.0005, cz: -0.0185 }))
add('MainBoard', 'PCB', slab(0.0085, 0.062, 1.5 * MM, -1.1 * MM, -0.3 * MM, { cx: 0.0285, cz: 0.012 })) // placa lateral (SIM/RF)
add('MainBoard', 'Chip lid', slab(12.5 * MM, 12.5 * MM, 1.2 * MM, -1.75 * MM, -1.1 * MM, { cx: 0.0035, cz: -0.0225 })) // A19 Pro
add('MainBoard', 'Chip', slab(7 * MM, 9 * MM, 0.6 * MM, -1.6 * MM, -1.1 * MM, { cx: 0.0215, cz: -0.0335 }))
add('MainBoard', 'Chip', slab(5 * MM, 5 * MM, 0.5 * MM, -1.5 * MM, -1.1 * MM, { cx: 0.0185, cz: -0.06 }))
add('MainBoard', 'Shield', slab(9 * MM, 13 * MM, 0.8 * MM, -1.6 * MM, -1.1 * MM, { cx: 0.0285, cz: 0.004 }))
add('MainBoard', 'Shield', slab(7 * MM, 10 * MM, 0.8 * MM, -1.6 * MM, -1.1 * MM, { cx: 0.0285, cz: 0.026 }))
add('MainBoard', 'Flex', slab(16 * MM, 3 * MM, 1 * MM, -1.2 * MM, -1.05 * MM, { cx: 0.012, cz: -0.0035 }))

// Bateria grande no centro (ocupa a maior parte da metade inferior)
add('Battery', 'Battery', slab(0.0525, 0.066, 2.2 * MM, -1.2 * MM, 2.0 * MM, { cx: -0.0045, cz: 0.022, bevel: 0.5 * MM }))
{
  const lab = new THREE.ShapeGeometry(roundedRect(0.028, 0.02, 1 * MM), 6)
  lab.rotateX(Math.PI / 2); lab.translate(-0.0045, -1.21 * MM, 0.024) // virada para a frente
  add('Battery', 'Battery label', lab)
}
add('Battery', 'Flex', slab(10 * MM, 4 * MM, 1 * MM, -1.25 * MM, -1.1 * MM, { cx: 0.016, cz: -0.0085 }))

// Câmara de vapor + dissipador de grafite (atrás da placa, junto à carcaça)
add('VaporChamber', 'Copper', slab(0.06, 0.03, 3 * MM, 2.05 * MM, 2.45 * MM, { cx: 0.002, cz: -0.022 }))
add('VaporChamber', 'Graphite', slab(0.062, 0.07, 3 * MM, 2.5 * MM, 2.65 * MM, { cx: 0, cz: 0.02 }))

// MagSafe dentro da janela de vidro traseira
{
  const cz = 0.0225
  add('MagSafe', 'Magnet', ring(0.0232, 0.0200, 2.7 * MM, 3.2 * MM, 0, cz))
  for (let k = 0; k < 6; k++) {
    const r1 = 0.0152 - k * 0.0019, r2 = r1 - 0.0011
    if (r2 > 0) add('MagSafe', 'Copper', ring(r1, r2, 2.75 * MM, 3.15 * MM, 0, cz, 48))
  }
}

// Base: Taptic Engine (esquerda, vista de trás), alto-falante (direita)
add('Taptic', 'Shield', slab(0.021, 0.0085, 1 * MM, -1.2 * MM, 2.0 * MM, { cx: -0.019, cz: 0.064 }))
add('Speakers', 'Speaker', slab(0.019, 0.0095, 1.5 * MM, -1.2 * MM, 2.2 * MM, { cx: 0.021, cz: 0.0635 }))
add('Speakers', 'Speaker', slab(0.014, 0.004, 1 * MM, -1.2 * MM, 0.4 * MM, { cx: 0, cz: -0.0705 })) // alto-falante superior

// Câmera frontal 18 MP / Face ID sob a Dynamic Island
add('TrueDepth', 'Camera body', slab(0.021, 0.0055, 1.2 * MM, -2.2 * MM, -1.3 * MM, { cx: -0.0007, cz: -0.067 }))
add('TrueDepth', 'Sensor', disc(1.0 * MM, -2.22 * MM, 0.0065, -0.067, false, 24))

// ---------- 3. converter as geometrias internas em malhas do documento ----------
const matCache = {}
const material = (name) => {
  if (matCache[name]) return matCache[name]
  const d = MATS[name]
  const m = doc.createMaterial(name).setBaseColorFactor(d.c).setMetallicFactor(d.m).setRoughnessFactor(d.r).setDoubleSided(true)
  if (d.blend) m.setAlphaMode('BLEND')
  return (matCache[name] = m)
}
for (const [part, byMat] of Object.entries(internal)) {
  const mesh = partMesh(part)
  for (const [mat, list] of Object.entries(byMat)) {
    const g = flatten(list, mergeGeometries)
    const pos = doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.position.array)).setBuffer(buffer)
    const nrm = new Float32Array(g.attributes.normal.array)
    for (let i = 0; i < nrm.length; i += 3) { const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1; nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l }
    const nor = doc.createAccessor().setType('VEC3').setArray(nrm).setBuffer(buffer)
    const uv = doc.createAccessor().setType('VEC2').setArray(new Float32Array(g.attributes.uv.array)).setBuffer(buffer)
    mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nor).setAttribute('TEXCOORD_0', uv).setMaterial(material(mat)))
  }
}

// ---------- 4. hierarquia: nó raiz (mesma rotação dos outros modelos) com um filho por peça ----------
const rootNode = doc.createNode('iPhone 17 Pro').setRotation(rotation)
for (const [name, mesh] of parts) rootNode.addChild(doc.createNode(name).setMesh(mesh))
const scene = root.listScenes()[0] ?? doc.createScene()
for (const c of scene.listChildren()) scene.removeChild(c)
scene.addChild(rootNode)

// ---------- 5. texturas menores (1024 px, WebP) só nesta cópia ----------
for (const tex of root.listTextures()) {
  const img = tex.getImage()
  if (!img) continue
  const out = await sharp(Buffer.from(img)).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  tex.setImage(new Uint8Array(out)).setMimeType('image/webp')
}

await doc.transform(dedup(), prune())
await mkdir('public/models/explodido', { recursive: true })
const bytes = await io.writeBinary(doc)
await writeFile(OUT, bytes)

// versão para invalidar o cache do navegador quando o arquivo mudar
const vpath = 'src/data/explodidos.json'
const versions = JSON.parse(await readFile(vpath, 'utf8').catch(() => '{}'))
versions['iphone-17-pro'] = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
await writeFile(vpath, JSON.stringify(versions, null, 1) + '\n')
console.log(`✓ ${OUT}  ${(bytes.length / 1024 / 1024).toFixed(2)} MB · peças: ${[...parts.keys()].join(', ')}`)
