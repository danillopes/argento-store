// Configuração da desmontagem por modelo. Para adicionar um aparelho (ex.: iPhone 17 Pro com peças reais),
// basta um GLB com um nó por peça e uma entrada aqui — o visualizador e a seção da home são os mesmos.
import versions from './explodidos.json'

export interface ExplodePart {
  node: string // nome do nó no GLB
  label: string
  desc: string
  offset: number // deslocamento ao desmontar, em metros, no eixo da espessura (+ = para trás)
  lens?: number // índice da camada de lente (afasta mais na aproximação das câmeras)
  group?: 'camera'
}

export interface ExplodeConfig {
  url: string
  illustrative: boolean // true = componentes internos são ilustração, não engenharia reversa
  heightMeters: number
  cameraFocus: [number, number] // posição (x, z) do módulo de câmera no espaço do modelo, em metros
  center: number // centro da pilha desmontada (metros), para manter o conjunto centralizado
  cameraDepth: number // profundidade (metros, eixo da espessura) do módulo de câmeras desmontado
  view: 'front' | 'back' // lado voltado para quem olha durante a desmontagem
  glossBack?: boolean // traseira de vidro brilhante (aplica acabamento brilhante à cor escolhida)
  cameras: { title: string; text: string }[]
  parts: ExplodePart[]
}

const BASE = import.meta.env.BASE_URL
const v = versions as Record<string, string>
const url = (id: string) => `${BASE}models/explodido/${id}.glb${v[id] ? `?v=${v[id]}` : ''}`

// iPhone 17 Pro — especificações oficiais das câmeras
const CAMERAS_17PRO = [
  { title: 'Câmera principal', text: 'Fusion de 48 MP, ƒ/1.78, estabilização por deslocamento do sensor de 2ª geração' },
  { title: 'Ultra-angular', text: 'Fusion de 48 MP, ƒ/2.2, campo de visão de 120°' },
  { title: 'Teleobjetiva', text: '48 MP, zoom óptico de 4x (100 mm), ƒ/2.8; até 8x com qualidade óptica' },
  { title: 'Sensores', text: 'Três sensores de 48 MP e Scanner LiDAR' },
  { title: 'Estabilização óptica', text: 'Deslocamento do sensor 3D na teleobjetiva e de 2ª geração na principal' },
]

// Desmontagem pela frente (carcaça unibody): vidro e tela saem para a frente, vidro traseiro e MagSafe para trás
const parts17Pro: ExplodePart[] = [
  { node: 'FrontGlass', label: 'Vidro frontal', desc: 'Cobertura Ceramic Shield 2 sobre a tela.', offset: -0.062 },
  { node: 'Display', label: 'Tela', desc: 'Super Retina XDR de 6,3 polegadas com ProMotion até 120 Hz, Always-On e Dynamic Island.', offset: -0.048 },
  { node: 'TrueDepth', label: 'Câmera frontal', desc: 'Câmera frontal Center Stage de 18 MP e sensores do Face ID.', offset: -0.036 },
  { node: 'MainBoard', label: 'Placa lógica', desc: 'Concentra o chip A19 Pro, a memória e os circuitos de rede.', offset: -0.03 },
  { node: 'CameraModule', label: 'Câmeras traseiras', desc: 'Três câmeras Fusion de 48 MP — principal, ultra-angular e teleobjetiva 4x — com flash e Scanner LiDAR.', offset: -0.024, group: 'camera' },
  { node: 'CameraBodies', label: 'Câmeras traseiras', desc: 'Três câmeras Fusion de 48 MP — principal, ultra-angular e teleobjetiva 4x — com flash e Scanner LiDAR.', offset: -0.024, group: 'camera' },
  { node: 'CameraSensors', label: 'Sensores das câmeras', desc: 'Três sensores de 48 MP e o Scanner LiDAR.', offset: -0.02, group: 'camera' },
  ...[0, 1, 2, 3].map((i) => ({ node: `CameraLenses${i}`, label: 'Elementos ópticos', desc: 'Representação ilustrativa da pilha de lentes de cada câmera.', offset: -0.024, lens: i, group: 'camera' as const })),
  { node: 'Battery', label: 'Bateria', desc: 'Bateria no centro do aparelho. Forma e tamanho ilustrativos.', offset: -0.018 },
  { node: 'Taptic', label: 'Taptic Engine', desc: 'Motor que gera as vibrações e respostas táteis.', offset: -0.013 },
  { node: 'Speakers', label: 'Alto-falantes', desc: 'Alto-falantes do sistema estéreo, na base e no topo.', offset: -0.013 },
  { node: 'VaporChamber', label: 'Câmara de vapor', desc: 'Leva o calor do A19 Pro para a carcaça de alumínio e mantém o desempenho estável.', offset: -0.007 },
  { node: 'DeviceBody', label: 'Carcaça unibody', desc: 'Corpo de alumínio em peça única, com platô de câmeras, botões e porta USB-C.', offset: 0 },
  { node: 'MagSafe', label: 'MagSafe', desc: 'Ímãs e bobina para carregamento sem fio e encaixe de acessórios.', offset: 0.016 },
  { node: 'RearGlass', label: 'Vidro traseiro', desc: 'Janela de vidro Ceramic Shield que deixa passar o carregamento sem fio.', offset: 0.03 },
]

export const EXPLODE: Record<string, ExplodeConfig> = {
  'iphone-17-pro': { url: url('iphone-17-pro'), illustrative: true, heightMeters: 0.15, cameraFocus: [-0.0143, -0.0535], center: -0.016, cameraDepth: -0.006, view: 'front', cameras: CAMERAS_17PRO, parts: parts17Pro },
}

export const explodeFor = (id: string) => EXPLODE[id]
