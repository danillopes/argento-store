// Modelo autoral de apresentação, em geometria real 3D; sem imagens ou modelos de terceiros.
// Regenerar: node scripts/gerar-iphone-17-pro.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import * as T from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

// GLTFExporter usa FileReader para empacotar o buffer binário no navegador.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() })
  }
}
const phone = new T.Group()
phone.name = 'iPhone 17 Pro — Argento'
phone.userData = { model: 'iphone-17-pro', author: 'Argento', type: 'authored-product-visualization' }
const material = (name, color, metalness, roughness) => {
  const m = new T.MeshStandardMaterial({ color, metalness, roughness })
  m.name = name
  return m
}
const aluminum = material('finish-aluminum', '#e0702b', 0.8, 0.3)
const rearGlass = material('finish-glass', '#e0702b', 0.18, 0.26)
const camera = material('finish-camera', '#e0702b', 0.68, 0.27)
const black = material('graphite', '#101113', 0.65, 0.24)
const lensGlass = material('optical-glass', '#080e19', 0.42, 0.075)
const lensCoating = material('optical-coating', '#182a49', 0.65, 0.14)
const white = material('flash', '#eee6cf', 0.05, 0.45)
const mark = material('rear-emblem', '#b34d1c', 0.68, 0.32)
const ink = new T.MeshBasicMaterial({ color: '#030305' })
const light = new T.MeshBasicMaterial({ color: '#fff3e7' })
function rounded(w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}
function mesh(name, geometry, mat, x, y, z, back = false) {
  const m = new T.Mesh(geometry, mat)
  m.name = name; m.position.set(x, y, z)
  if (back) m.rotation.y = Math.PI
  phone.add(m)
  return m
}
function slab(name, w, h, r, depth, mat, x, y, z) {
  const g = new T.ExtrudeGeometry(rounded(w - 0.012, h - 0.012, r), {
    depth: depth - 0.012, bevelEnabled: true, bevelSegments: 3,
    steps: 1, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 20,
  })
  g.translate(0, 0, -(depth - 0.012) / 2)
  return mesh(name, g, mat, x, y, z)
}
function face(name, w, h, r, mat, x, y, z, back = false) {
  return mesh(name, new T.ShapeGeometry(rounded(w, h, r), 24), mat, x, y, z, back)
}
function disk(name, radius, mat, x, y, z, back = true) {
  return mesh(name, new T.CircleGeometry(radius, 48), mat, x, y, z, back)
}
slab('Aluminum unibody', 1.42, 2.9, 0.22, 0.16, aluminum, 0, 0, 0)
face('Front glass', 1.395, 2.875, 0.212, black, 0, 0, 0.081)
const screen = new T.MeshBasicMaterial({ vertexColors: true })
const wallpaper = new T.ShapeGeometry(rounded(1.31, 2.79, 0.18), 32)
const pos = wallpaper.attributes.position, colors = []
for (let i = 0; i < pos.count; i++) {
  const t = T.MathUtils.clamp((pos.getY(i) + 1.4) / 2.8, 0, 1)
  const c = new T.Color('#451e16').lerp(new T.Color('#d28b61'), t)
  colors.push(c.r, c.g, c.b)
}
wallpaper.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
mesh('Display', wallpaper, screen, 0, 0, 0.083)
// Wallpaper geométrico, sem texturas pesadas.
const arc = new T.Shape()
arc.moveTo(-0.655, -0.88); arc.bezierCurveTo(0.56, -0.3, 0.6, 0.4, -0.655, 0.28)
arc.lineTo(-0.655, 0.12); arc.bezierCurveTo(0.42, 0.25, 0.42, -0.27, -0.655, -0.68)
arc.closePath()
mesh('Wallpaper contour', new T.ShapeGeometry(arc, 40), material('wallpaper', '#e7ad80', 0, 0.9), 0, 0, 0.084)
face('Dynamic Island', 0.35, 0.1, 0.05, ink, 0, 1.23, 0.086)
disk('Front camera', 0.024, lensGlass, 0.11, 1.23, 0.087, false)
face('Home indicator', 0.35, 0.012, 0.006, light, 0, -1.31, 0.087)

face('Back surface', 1.395, 2.875, 0.212, aluminum, 0, 0, -0.081, true)
slab('Rounded camera plateau', 1.38, 0.86, 0.14, 0.09, camera, 0, 0.99, -0.122)
face('Ceramic Shield inset', 1.31, 1.9, 0.18, rearGlass, 0, -0.44, -0.083, true)
for (const [i, [x, y]] of [[0.405, 1.17], [0.405, 0.70], [-0.025, 0.935]].entries()) {
  const rim = mesh(`Camera ${i + 1} barrel`, new T.CylinderGeometry(0.177, 0.177, 0.054, 48), black, x, y, -0.185)
  rim.rotation.x = Math.PI / 2
  disk(`Camera ${i + 1} glass`, 0.157, lensGlass, x, y, -0.213)
  mesh(`Camera ${i + 1} coating`, new T.RingGeometry(0.071, 0.112, 48), lensCoating, x, y, -0.214, true)
  disk(`Camera ${i + 1} aperture`, 0.068, ink, x, y, -0.215)
  disk(`Camera ${i + 1} reflection`, 0.021, material('lens-highlight', '#576b89', 0.6, 0.2), x + 0.053, y + 0.061, -0.216)
}
disk('True Tone flash rim', 0.062, aluminum, -0.43, 1.18, -0.17)
disk('True Tone flash', 0.052, white, -0.43, 1.18, -0.172)
disk('LiDAR Scanner', 0.049, black, -0.43, 0.73, -0.171)
disk('Rear microphone', 0.012, ink, -0.43, 0.93, -0.172)

// Emblema vetorial, sem requisição de imagem externa.
const apple = new T.Shape()
apple.moveTo(0, 0.12)
apple.bezierCurveTo(0.07, 0.16, 0.13, 0.12, 0.14, 0.08)
apple.bezierCurveTo(0.07, 0.04, 0.07, -0.04, 0.14, -0.07)
apple.bezierCurveTo(0.09, -0.20, 0.04, -0.21, 0, -0.18)
apple.bezierCurveTo(-0.04, -0.21, -0.10, -0.20, -0.14, -0.08)
apple.bezierCurveTo(-0.20, 0.08, -0.10, 0.16, -0.04, 0.13)
apple.bezierCurveTo(-0.02, 0.12, -0.01, 0.12, 0, 0.12)
mesh('Rear emblem', new T.ShapeGeometry(apple, 24), mark, 0, -0.33, -0.085, true)
const leaf = new T.Shape()
leaf.moveTo(0, 0); leaf.bezierCurveTo(-0.01, 0.07, 0.03, 0.10, 0.08, 0.11)
leaf.bezierCurveTo(0.08, 0.04, 0.04, 0.01, 0, 0)
mesh('Emblem leaf', new T.ShapeGeometry(leaf, 16), mark, 0, -0.19, -0.085, true)

for (const [name, side, y, h] of [['Action button', -1, 0.99, 0.12], ['Volume up', -1, 0.65, 0.23], ['Volume down', -1, 0.30, 0.23], ['Side button', 1, 0.62, 0.35], ['Camera Control', 1, -0.68, 0.27]]) {
  const button = slab(name, 0.055, h, 0.022, 0.025, aluminum, side * 0.715, y, 0)
  button.rotation.y = Math.PI / 2
}
// Porta USB-C e griglie na borda inferior.
const port = face('USB-C port', 0.19, 0.055, 0.025, ink, 0, -1.451, 0)
port.rotation.x = Math.PI / 2
for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
  const hole = disk('Speaker opening', 0.012, ink, side * (0.23 + i * 0.055), -1.451, 0, false)
  hole.rotation.x = Math.PI / 2
}
const glb = await new GLTFExporter().parseAsync(phone, { binary: true, onlyVisible: true })
await mkdir('public/models', { recursive: true })
await writeFile('public/models/iphone-17-pro.glb', Buffer.from(glb))
console.log(`iPhone 17 Pro: ${phone.children.length} partes; ${(glb.byteLength / 1024).toFixed(0)} KB → public/models/iphone-17-pro.glb`)
