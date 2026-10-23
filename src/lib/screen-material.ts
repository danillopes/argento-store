import * as THREE from 'three'

// Tela OLED: a imagem entra só como emissão (luz própria), nunca como textura iluminada.
// Com map e emissiveMap ao mesmo tempo, a imagem era somada duas vezes (luz da cena + emissão)
// e, sem tone mapping, os brancos estouravam (relógio 9:41 ilegível).
const PANEL_OFF = new THREE.Color('#050507')

export function makeScreenEmissive(mat: THREE.MeshStandardMaterial, image?: THREE.Texture | null) {
  const tex = image ?? mat.emissiveMap ?? mat.map
  mat.map = null
  mat.emissiveMap = tex ?? null
  mat.emissive.set('#ffffff')
  mat.color.copy(PANEL_OFF) // vidro preto do painel: reflexos continuam, a imagem não é iluminada
  mat.emissiveIntensity = 1
  mat.toneMapped = false // cores exatas do desenho da tela
  mat.needsUpdate = true
}
