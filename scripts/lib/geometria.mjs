// Utilitários de geometria compartilhados pelos geradores de modelos 3D (metros; eixo Y = espessura,
// traseira em +Y; eixo Z = comprimento, topo em −Z — mesma convenção dos modelos do site).
import * as THREE from 'three'

export const MM = 0.001

export function roundedRect(w, h, r) {
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

// Placa arredondada no plano XZ ocupando y0..y1, centrada em (cx, cz)
export function slab(w, h, r, y0, y1, { cx = 0, cz = 0, bevel = 0, seg = 16 } = {}) {
  const d = y1 - y0
  const bt = Math.min(bevel, d * 0.45)
  const shape = roundedRect(w - 2 * bevel, h - 2 * bevel, Math.max(0.0002, r - bevel))
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-6, d - 2 * bt), bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelSegments: 2, curveSegments: seg })
  g.translate(0, 0, bt)
  g.rotateX(Math.PI / 2)
  g.translate(cx, y1, cz)
  return g
}

// Forma livre (THREE.Shape no plano X/Z do aparelho) extrudada entre y0 e y1
export function extrudeShape(shape, y0, y1, seg = 16) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg })
  g.rotateX(Math.PI / 2)
  g.translate(0, y1, 0)
  return g
}

export function cyl(r, y0, y1, cx, cz, seg = 36) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, false)
  g.translate(cx, (y0 + y1) / 2, cz)
  return g
}

export function disc(r, y, cx, cz, up = true, seg = 36) {
  const g = new THREE.CircleGeometry(r, seg)
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  g.translate(cx, y, cz)
  return g
}

export function ring(ro, ri, y0, y1, cx, cz, seg = 64) {
  const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI * 2, false)
  const h = new THREE.Path(); h.absarc(0, 0, ri, 0, Math.PI * 2, true); s.holes.push(h)
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg })
  g.rotateX(Math.PI / 2)
  g.translate(cx, y1, cz)
  return g
}

// Une geometrias (sem índice) mantendo posição, normal e uv
export function flatten(list, mergeGeometries) {
  const geos = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g
    if (!n.attributes.normal) n.computeVertexNormals()
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
    return n
  })
  return mergeGeometries(geos, false)
}
