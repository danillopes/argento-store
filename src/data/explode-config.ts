// Configuração da desmontagem por modelo. Para adicionar um aparelho (ex.: iPhone 17 Pro com peças reais),
// basta um GLB com um nó por peça e uma entrada aqui — o visualizador e a seção da home são os mesmos.
import interior from './interior-17-pro.json'

export interface ExplodePart {
  node: string // nome do nó no GLB
  label: string
  desc: string
  offset: number // deslocamento ao desmontar, em metros, no eixo da espessura (+ = para trás)
  lens?: number // índice da camada de lente (afasta mais na aproximação das câmeras)
  group?: 'camera'
  start?: number
  end?: number
  status?: string
  limitation?: string
  sources?: string[]
  asset?: string
  travel?: [number, number]
}

export interface ExplodeConfig {
  url: string
  illustrative: boolean // true = componentes internos são ilustração, não engenharia reversa
  fidelityNote?: string
  badge?: string
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

// iPhone 17 Pro — especificações oficiais das câmeras
const CAMERAS_17PRO = [
  { title: 'Câmera principal', text: 'Fusion de 48 MP, ƒ/1.78, estabilização por deslocamento do sensor de 2ª geração' },
  { title: 'Ultra-angular', text: 'Fusion de 48 MP, ƒ/2.2, campo de visão de 120°' },
  { title: 'Teleobjetiva', text: '48 MP, zoom óptico de 4x (100 mm), ƒ/2.8; até 8x com qualidade óptica' },
  { title: 'Sensores', text: 'Três sensores de 48 MP e Scanner LiDAR' },
  { title: 'Estabilização óptica', text: 'Deslocamento do sensor 3D na teleobjetiva e de 2ª geração na principal' },
]

// Desmontagem pela frente (carcaça unibody): vidro e tela saem para a frente, vidro traseiro e MagSafe para trás
export const legacyIllustrativeParts17Pro: ExplodePart[] = [
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

// Only the five actual exterior nodes are reused. Do not import legacy invented
// internals, camera lens stacks, capacities or an incorrect titanium chassis.
export const EXTERIOR: Record<string, ExplodeConfig> = {
  'iphone-17-pro': {
    heightMeters: 0.15, cameraFocus: [-0.0143, -0.0535], center: -0.008, cameraDepth: -0.026, view: 'back', cameras: CAMERAS_17PRO,
    url: `${BASE}models/explodido/iphone-17-pro-exterior.glb?v=exterior-1`,
    illustrative: true,
    fidelityNote: 'Estudo das superfícies externas; não reproduz a desmontagem física ou os encaixes.',
    parts: [
      {node:'RearGlass',label:'Vidro traseiro',desc:'Superfície do GLB fornecido; face interna e adesivos estimados.',offset:.038,start:.05,end:.4},
      {node:'DeviceBody',label:'Carcaça unibody · alumínio',desc:'Exterior original. Alumínio conforme especificação do 17 Pro; não é titânio.',offset:0},
      {node:'CameraModule',label:'Óptica exterior',desc:'Anéis e superfícies ópticas do GLB; não representa os elementos internos das lentes.',offset:-.018,start:.4,end:.85,group:'camera'},
      {node:'Display',label:'OLED · superfície',desc:'Superfície da tela original; conjunto interno reconstruído separadamente.',offset:-.05,start:.2,end:.65},
      {node:'FrontGlass',label:'Vidro frontal',desc:'Cobertura externa. Separação por material não implica remoção física independente do OLED.',offset:-.054,start:.2,end:.65},
    ],
  },
}
const exterior = EXTERIOR['iphone-17-pro']
const boardNodes17 = ['MainBoard','RFBoard','BoardShields','BoardConnectors','A19Pro','RAM','NAND','PMIC','IMU','Compass','Barometer','UWB','Wireless','Modem','ESIM','BatteryCharger','USBController','AudioCodec','AudioAmplifiers','RFTransceiver','RFFrontEnd']
export const EXPLODE: Record<string, ExplodeConfig> = {
  'iphone-17-pro': {
    ...exterior,
    url: `${BASE}models/explodido/iphone-17-pro-interior.glb?v=${interior.version}`,
    badge: 'Reconstrução visual · medidas internas estimadas',
    fidelityNote: `${interior.parts.length} conjuntos internos autorais. Layout geral documentado; dimensões estimadas. Chips e estruturas ocultas são esquemáticos.`,
    view: 'back', center: -0.018,
    cameraFocus: [-.0157, -.0511],
    parts: [
      ...exterior.parts.map(p => ({ ...p,
        offset: p.node === 'Display' || p.node === 'FrontGlass' ? -.108 : p.node === 'RearGlass' ? .04 : p.offset,
        start: p.node === 'RearGlass' ? .85 : p.node === 'Display' || p.node === 'FrontGlass' ? .08 : .48,
        end: p.node === 'RearGlass' ? 1 : p.node === 'Display' || p.node === 'FrontGlass' ? .31 : .72,
        label: p.node === 'Display' ? 'OLED · superfície' : p.label,
      })),
      ...interior.parts.map(p => {
        const display = ['DisplayShield','DisplaySeal','Digitizer','DisplayFlex','DisplayController','AmbientLightFlex'].includes(p.node)
        const battery = ['Battery','BatteryTray'].includes(p.node)
        const camera = ['CameraCarrier','MainCamera','UltraWide','Telephoto','TrueDepth','Selfie','IRCamera','DotProjector','Flood'].includes(p.node)
        const board = boardNodes17.includes(p.node)
        const cowling = p.node.endsWith('Cowling')
        const rear = ['RearSupport','MagSafe','BackSeal','BackGlassCowling'].includes(p.node)
        const stationary = p.node === 'InnerFrame'
        return {...p,
        offset: display ? -.108 : battery ? (p.node === 'Battery' ? -.078 : -.065) : camera ? -.044 : board ? -.026 : rear ? (p.node === 'MagSafe' ? .022 : p.node === 'BackSeal' ? .035 : 0) : stationary ? 0 : p.offset,
        start: cowling ? (rear ? .82 : .2) : display ? .08 : battery ? .32 : camera ? .51 : board ? .68 : rear ? .85 : stationary ? 0 : .75,
        end: cowling ? (rear ? .92 : .32) : display ? .31 : battery ? .53 : camera ? .73 : board ? .87 : 1,
        travel: (
        cowling ? (rear ? [.012,.008] : [.028,-.012]) :
        boardNodes17.includes(p.node) ? [.018,-.006] :
        p.node === 'MainCamera' ? [-.015,-.008] : p.node === 'UltraWide' ? [-.022,.006] : p.node === 'Telephoto' ? [.008,-.006] :
        p.node === 'Battery' ? [-.008,.005] : [0,0]
      ) as [number,number]}
      }),
    ],
  },
}

export const explodeFor = (id: string) => EXPLODE[id]
