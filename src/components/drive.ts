// Estado de pose do iPhone 3D, controlado pelo GSAP ou pela página (sem importar three.js)
export interface Drive {
  rotY: number
  rotX: number
  rotZ: number
  x: number
  y: number
  scale: number
  color: string
  screen: number // brilho da tela 0..1
  island?: number // expansão da Dynamic Island 0..1
  poseKey?: number // contador para zerar rotação manual ao escolher ângulo predefinido
  fold?: number // aparelhos dobráveis: 0 fechado … 1 aberto (alvo; a animação suaviza)
}

export const defaultDrive = (): Drive => ({ rotY: 0, rotX: 0, rotZ: 0, x: 0, y: 0, scale: 1, color: '#c2bcb2', screen: 1, island: 0, poseKey: 0 })

