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
  cameras: { title: string; text: string }[]
  parts: ExplodePart[]
}

const BASE = import.meta.env.BASE_URL
const v = versions as Record<string, string>
const url = (id: string) => `${BASE}models/explodido/${id}.glb${v[id] ? `?v=${v[id]}` : ''}`

// Especificações das câmeras do iPhone 12 / 12 mini (iguais nos dois)
const CAMERAS_12 = [
  { title: 'Câmera principal', text: 'Grande-angular de 12 MP, abertura ƒ/1.6' },
  { title: 'Ultra-angular', text: '12 MP, abertura ƒ/2.4 e campo de visão de 120°' },
  { title: 'Teleobjetiva', text: 'Não disponível neste modelo' },
  { title: 'Sensores', text: 'Dois sensores de 12 MP, um por câmera' },
  { title: 'Estabilização óptica', text: 'Na câmera grande-angular' },
]

const parts12 = (screen: string): ExplodePart[] => [
  { node: 'FrontGlass', label: 'Vidro frontal', desc: 'Cobertura Ceramic Shield, que estreou na linha iPhone 12.', offset: -0.05 },
  { node: 'Display', label: 'Tela', desc: `Super Retina XDR (OLED) de ${screen} polegadas, com o notch da câmera TrueDepth.`, offset: -0.034 },
  { node: 'TrueDepth', label: 'Câmera TrueDepth', desc: 'Câmera frontal de 12 MP (ƒ/2.2) e os sensores do Face ID.', offset: -0.019 },
  { node: 'MidFrame', label: 'Estrutura interna', desc: 'Chassi que sustenta a tela e os componentes.', offset: -0.008 },
  { node: 'DeviceBody', label: 'Moldura de alumínio', desc: 'Laterais retas com botões, linhas de antena, porta Lightning e alto-falantes.', offset: 0 },
  { node: 'MainBoard', label: 'Placa lógica', desc: 'Concentra o chip A14 Bionic, a memória e os circuitos de rede.', offset: 0.014 },
  { node: 'CameraSensors', label: 'Sensores das câmeras', desc: 'Dois sensores de 12 MP, um para cada câmera traseira.', offset: 0.018, group: 'camera' },
  { node: 'CameraModule', label: 'Câmeras traseiras', desc: 'Grande-angular (ƒ/1.6, com estabilização óptica) e ultra-angular (ƒ/2.4, 120°).', offset: 0.026, group: 'camera' },
  ...[0, 1, 2, 3].map((i) => ({ node: `CameraLenses${i}`, label: 'Elementos ópticos', desc: 'Representação ilustrativa da pilha de lentes de cada câmera.', offset: 0.026, lens: i, group: 'camera' as const })),
  { node: 'Battery', label: 'Bateria', desc: 'Bateria em formato de L. Forma e tamanho ilustrativos.', offset: 0.031 },
  { node: 'Taptic', label: 'Taptic Engine', desc: 'Motor que gera as vibrações e respostas táteis.', offset: 0.02 },
  { node: 'Speaker', label: 'Alto-falante', desc: 'Alto-falante inferior do sistema estéreo.', offset: 0.02 },
  { node: 'MagSafe', label: 'MagSafe', desc: 'Ímãs e bobina para carregamento sem fio e encaixe de acessórios.', offset: 0.043 },
  { node: 'RearPanel', label: 'Tampa traseira', desc: 'Vidro traseiro com o módulo de câmera integrado.', offset: 0.06 },
]

export const EXPLODE: Record<string, ExplodeConfig> = {
  'iphone-12': { url: url('iphone-12'), illustrative: true, heightMeters: 0.1467, cameraFocus: [-0.0189, -0.0565], center: 0.005, cameras: CAMERAS_12, parts: parts12('6,1') },
  'iphone-12-mini': { url: url('iphone-12-mini'), illustrative: true, heightMeters: 0.1315, cameraFocus: [-0.0165, -0.0502], center: 0.005, cameras: CAMERAS_12, parts: parts12('5,4') },
}

export const explodeFor = (id: string) => EXPLODE[id]
