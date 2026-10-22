// Catálogo de modelos — dados técnicos. Os modelos do catálogo NÃO são estoque:
// o estoque está em inventory.ts (unidades físicas).

export type CamLayout = 'vert2' | 'diag2' | 'pill2' | 'tri' | 'single' | 'air' | 'plateau'
export type FrontLayout = 'notch' | 'island'

export interface ColorOption {
  id: string
  name: string
  hex: string
}

export interface PhoneModel {
  id: string
  name: string
  family: number // geração
  year: number
  screen: number // polegadas
  chip: string
  cameras: string
  connector: 'Lightning' | 'USB-C'
  weight: number | null // gramas
  storages: number[] // GB
  colors: ColorOption[]
  cam: CamLayout
  front: FrontLayout
  tier: 'base' | 'mini' | 'plus' | 'pro' | 'promax' | 'e' | 'air'
  features: string[]
  basePrice: number // preço demonstrativo de referência (menor armazenamento, novo)
  verify?: boolean // especificações em verificação
}

const c = (id: string, name: string, hex: string): ColorOption => ({ id, name, hex })

const C12 = [c('preto', 'Preto', '#1f2020'), c('branco', 'Branco', '#f6f2ef'), c('vermelho', '(PRODUCT)RED', '#ba0c2e'), c('verde', 'Verde', '#d8efd5'), c('azul', 'Azul', '#1d4a75'), c('roxo', 'Roxo', '#b7afe6')]
const C12P = [c('grafite', 'Grafite', '#54524f'), c('prateado', 'Prateado', '#e9eae5'), c('dourado', 'Dourado', '#f3dfc1'), c('azul-pacifico', 'Azul-pacífico', '#2e4755')]
const C13 = [c('meia-noite', 'Meia-noite', '#232a31'), c('estelar', 'Estelar', '#f4efe9'), c('vermelho', '(PRODUCT)RED', '#bf0013'), c('azul', 'Azul', '#276787'), c('rosa', 'Rosa', '#f6d6cf'), c('verde', 'Verde', '#394c38')]
const C13P = [c('grafite', 'Grafite', '#54524f'), c('dourado', 'Dourado', '#f2dcbf'), c('prateado', 'Prateado', '#e9eae5'), c('azul-sierra', 'Azul-sierra', '#a7c1d9'), c('verde-alpino', 'Verde-alpino', '#576856')]
const C14 = [c('meia-noite', 'Meia-noite', '#222930'), c('estelar', 'Estelar', '#f4efe9'), c('vermelho', '(PRODUCT)RED', '#d1102a'), c('azul', 'Azul', '#a0b4c7'), c('roxo', 'Roxo', '#e0d4e8'), c('amarelo', 'Amarelo', '#f6e27a')]
const C14P = [c('preto-espacial', 'Preto-espacial', '#403e3d'), c('prateado', 'Prateado', '#eceeee'), c('dourado', 'Dourado', '#f1e3c4'), c('roxo-profundo', 'Roxo-profundo', '#594f63')]
const C15 = [c('preto', 'Preto', '#35393b'), c('azul', 'Azul', '#d4e4ed'), c('verde', 'Verde', '#e0e7d9'), c('amarelo', 'Amarelo', '#f7ecc9'), c('rosa', 'Rosa', '#f3d9d9')]
const C15P = [c('titanio-natural', 'Titânio natural', '#bab4a9'), c('titanio-azul', 'Titânio azul', '#2f4452'), c('titanio-branco', 'Titânio branco', '#f0efea'), c('titanio-preto', 'Titânio preto', '#3b3b3d')]
const C16 = [c('preto', 'Preto', '#3c3c3d'), c('branco', 'Branco', '#f6f6f4'), c('rosa', 'Rosa', '#f2adda'), c('verde-acinzentado', 'Verde-acinzentado', '#b0d4d2'), c('ultramarino', 'Ultramarino', '#9aadf6')]
const C16P = [c('titanio-deserto', 'Titânio-deserto', '#bfa48f'), c('titanio-natural', 'Titânio natural', '#c2bcb2'), c('titanio-branco', 'Titânio branco', '#f0efea'), c('titanio-preto', 'Titânio preto', '#3c3c3d')]
const C16E = [c('preto', 'Preto', '#2c2c2e'), c('branco', 'Branco', '#f4f4f0')]
const C17 = [c('preto', 'Preto', '#2b2b2d'), c('branco', 'Branco', '#f4f4f2'), c('azul-nevoa', 'Azul-névoa', '#9fb6cf'), c('salvia', 'Sálvia', '#b5c4a5'), c('lavanda', 'Lavanda', '#d8c9e6')]
const C17E = [c('preto', 'Preto', '#2b2b2d'), c('branco', 'Branco', '#f4f4f2'), c('rosa-suave', 'Rosa-suave', '#f1d4d4')]
const CAIR = [c('preto-espacial', 'Preto-espacial', '#2a2a2c'), c('branco-nuvem', 'Branco-nuvem', '#f4f3ef'), c('dourado-claro', 'Dourado-claro', '#ecdcc0'), c('azul-ceu', 'Azul-céu', '#c9dbe9')]
const C17P = [c('prateado', 'Prateado', '#e4e4e2'), c('laranja-cosmico', 'Laranja-cósmico', '#e0702b'), c('azul-profundo', 'Azul-profundo', '#2d3a55')]
const C18P = [c('borgonha', 'Borgonha', '#6b1f2e'), c('azul-claro', 'Azul-claro', '#b9d0e4'), c('prateado', 'Prateado', '#e4e4e2'), c('preto', 'Preto', '#2a2a2c')]

const F_FACE = 'Face ID'
const F_MAG = 'MagSafe'
const F_5G = '5G'
const F_IP68 = 'IP68'

export const MODELS: PhoneModel[] = [
  { id: 'iphone-12-mini', name: 'iPhone 12 mini', family: 12, year: 2020, screen: 5.4, chip: 'A14 Bionic', cameras: 'Dupla 12 MP (grande-angular + ultra-angular)', connector: 'Lightning', weight: 133, storages: [64, 128, 256], colors: C12, cam: 'vert2', front: 'notch', tier: 'mini', features: [F_5G, F_MAG, F_FACE, 'Ceramic Shield', F_IP68], basePrice: 2199 },
  { id: 'iphone-12', name: 'iPhone 12', family: 12, year: 2020, screen: 6.1, chip: 'A14 Bionic', cameras: 'Dupla 12 MP (grande-angular + ultra-angular)', connector: 'Lightning', weight: 164, storages: [64, 128, 256], colors: C12, cam: 'vert2', front: 'notch', tier: 'base', features: [F_5G, F_MAG, F_FACE, 'Ceramic Shield', F_IP68], basePrice: 2499 },
  { id: 'iphone-12-pro', name: 'iPhone 12 Pro', family: 12, year: 2020, screen: 6.1, chip: 'A14 Bionic', cameras: 'Tripla 12 MP + LiDAR (teleobjetiva 2x)', connector: 'Lightning', weight: 189, storages: [128, 256, 512], colors: C12P, cam: 'tri', front: 'notch', tier: 'pro', features: [F_5G, F_MAG, F_FACE, 'LiDAR', 'Aço inoxidável', F_IP68], basePrice: 2999 },
  { id: 'iphone-12-pro-max', name: 'iPhone 12 Pro Max', family: 12, year: 2020, screen: 6.7, chip: 'A14 Bionic', cameras: 'Tripla 12 MP + LiDAR (teleobjetiva 2,5x)', connector: 'Lightning', weight: 228, storages: [128, 256, 512], colors: C12P, cam: 'tri', front: 'notch', tier: 'promax', features: [F_5G, F_MAG, F_FACE, 'LiDAR', 'Aço inoxidável', F_IP68], basePrice: 3299 },

  { id: 'iphone-13-mini', name: 'iPhone 13 mini', family: 13, year: 2021, screen: 5.4, chip: 'A15 Bionic', cameras: 'Dupla 12 MP (grande-angular + ultra-angular)', connector: 'Lightning', weight: 140, storages: [128, 256, 512], colors: C13, cam: 'diag2', front: 'notch', tier: 'mini', features: [F_5G, F_MAG, F_FACE, 'Modo Cinema', F_IP68], basePrice: 2699 },
  { id: 'iphone-13', name: 'iPhone 13', family: 13, year: 2021, screen: 6.1, chip: 'A15 Bionic', cameras: 'Dupla 12 MP (grande-angular + ultra-angular)', connector: 'Lightning', weight: 173, storages: [128, 256, 512], colors: C13, cam: 'diag2', front: 'notch', tier: 'base', features: [F_5G, F_MAG, F_FACE, 'Modo Cinema', F_IP68], basePrice: 2999 },
  { id: 'iphone-13-pro', name: 'iPhone 13 Pro', family: 13, year: 2021, screen: 6.1, chip: 'A15 Bionic', cameras: 'Tripla 12 MP + LiDAR (teleobjetiva 3x)', connector: 'Lightning', weight: 204, storages: [128, 256, 512, 1024], colors: C13P, cam: 'tri', front: 'notch', tier: 'pro', features: [F_5G, F_MAG, F_FACE, 'ProMotion 120 Hz', 'LiDAR', F_IP68], basePrice: 3799 },
  { id: 'iphone-13-pro-max', name: 'iPhone 13 Pro Max', family: 13, year: 2021, screen: 6.7, chip: 'A15 Bionic', cameras: 'Tripla 12 MP + LiDAR (teleobjetiva 3x)', connector: 'Lightning', weight: 240, storages: [128, 256, 512, 1024], colors: C13P, cam: 'tri', front: 'notch', tier: 'promax', features: [F_5G, F_MAG, F_FACE, 'ProMotion 120 Hz', 'LiDAR', F_IP68], basePrice: 4199 },

  { id: 'iphone-14', name: 'iPhone 14', family: 14, year: 2022, screen: 6.1, chip: 'A15 Bionic (GPU 5 núcleos)', cameras: 'Dupla 12 MP (grande-angular + ultra-angular)', connector: 'Lightning', weight: 172, storages: [128, 256, 512], colors: C14, cam: 'diag2', front: 'notch', tier: 'base', features: [F_5G, F_MAG, F_FACE, 'Detecção de acidente', F_IP68], basePrice: 3399 },
  { id: 'iphone-14-plus', name: 'iPhone 14 Plus', family: 14, year: 2022, screen: 6.7, chip: 'A15 Bionic (GPU 5 núcleos)', cameras: 'Dupla 12 MP (grande-angular + ultra-angular)', connector: 'Lightning', weight: 203, storages: [128, 256, 512], colors: C14, cam: 'diag2', front: 'notch', tier: 'plus', features: [F_5G, F_MAG, F_FACE, 'Detecção de acidente', F_IP68], basePrice: 3699 },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', family: 14, year: 2022, screen: 6.1, chip: 'A16 Bionic', cameras: 'Tripla 48 MP + 12 MP + 12 MP + LiDAR', connector: 'Lightning', weight: 206, storages: [128, 256, 512, 1024], colors: C14P, cam: 'tri', front: 'island', tier: 'pro', features: [F_5G, F_MAG, 'Dynamic Island', 'Always-On', 'ProMotion 120 Hz', F_IP68], basePrice: 4499 },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', family: 14, year: 2022, screen: 6.7, chip: 'A16 Bionic', cameras: 'Tripla 48 MP + 12 MP + 12 MP + LiDAR', connector: 'Lightning', weight: 240, storages: [128, 256, 512, 1024], colors: C14P, cam: 'tri', front: 'island', tier: 'promax', features: [F_5G, F_MAG, 'Dynamic Island', 'Always-On', 'ProMotion 120 Hz', F_IP68], basePrice: 4899 },

  { id: 'iphone-15', name: 'iPhone 15', family: 15, year: 2023, screen: 6.1, chip: 'A16 Bionic', cameras: 'Dupla 48 MP + 12 MP ultra-angular', connector: 'USB-C', weight: 171, storages: [128, 256, 512], colors: C15, cam: 'diag2', front: 'island', tier: 'base', features: [F_5G, F_MAG, 'Dynamic Island', 'USB-C', F_IP68], basePrice: 4199 },
  { id: 'iphone-15-plus', name: 'iPhone 15 Plus', family: 15, year: 2023, screen: 6.7, chip: 'A16 Bionic', cameras: 'Dupla 48 MP + 12 MP ultra-angular', connector: 'USB-C', weight: 201, storages: [128, 256, 512], colors: C15, cam: 'diag2', front: 'island', tier: 'plus', features: [F_5G, F_MAG, 'Dynamic Island', 'USB-C', F_IP68], basePrice: 4599 },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', family: 15, year: 2023, screen: 6.1, chip: 'A17 Pro', cameras: 'Tripla 48 MP + 12 MP + 12 MP (3x) + LiDAR', connector: 'USB-C', weight: 187, storages: [128, 256, 512, 1024], colors: C15P, cam: 'tri', front: 'island', tier: 'pro', features: [F_5G, F_MAG, 'Titânio', 'Botão de Ação', 'USB 3', F_IP68], basePrice: 5299 },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', family: 15, year: 2023, screen: 6.7, chip: 'A17 Pro', cameras: 'Tripla 48 MP + 12 MP + 12 MP (5x) + LiDAR', connector: 'USB-C', weight: 221, storages: [256, 512, 1024], colors: C15P, cam: 'tri', front: 'island', tier: 'promax', features: [F_5G, F_MAG, 'Titânio', 'Botão de Ação', 'Zoom 5x', F_IP68], basePrice: 5999 },

  { id: 'iphone-16e', name: 'iPhone 16e', family: 16, year: 2025, screen: 6.1, chip: 'A18', cameras: 'Única 48 MP Fusion', connector: 'USB-C', weight: 167, storages: [128, 256, 512], colors: C16E, cam: 'single', front: 'notch', tier: 'e', features: [F_5G, F_FACE, 'Botão de Ação', 'Apple Intelligence', F_IP68], basePrice: 3999 },
  { id: 'iphone-16', name: 'iPhone 16', family: 16, year: 2024, screen: 6.1, chip: 'A18', cameras: 'Dupla 48 MP Fusion + 12 MP ultra-angular', connector: 'USB-C', weight: 170, storages: [128, 256, 512], colors: C16, cam: 'pill2', front: 'island', tier: 'base', features: [F_5G, F_MAG, 'Controle da Câmera', 'Botão de Ação', 'Apple Intelligence', F_IP68], basePrice: 5199 },
  { id: 'iphone-16-plus', name: 'iPhone 16 Plus', family: 16, year: 2024, screen: 6.7, chip: 'A18', cameras: 'Dupla 48 MP Fusion + 12 MP ultra-angular', connector: 'USB-C', weight: 199, storages: [128, 256, 512], colors: C16, cam: 'pill2', front: 'island', tier: 'plus', features: [F_5G, F_MAG, 'Controle da Câmera', 'Botão de Ação', 'Apple Intelligence', F_IP68], basePrice: 5799 },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', family: 16, year: 2024, screen: 6.3, chip: 'A18 Pro', cameras: 'Tripla 48 MP Fusion + 48 MP ultra-angular + 12 MP (5x)', connector: 'USB-C', weight: 199, storages: [128, 256, 512, 1024], colors: C16P, cam: 'tri', front: 'island', tier: 'pro', features: [F_5G, F_MAG, 'Titânio', 'Controle da Câmera', 'Vídeo 4K120', F_IP68], basePrice: 6999 },
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', family: 16, year: 2024, screen: 6.9, chip: 'A18 Pro', cameras: 'Tripla 48 MP Fusion + 48 MP ultra-angular + 12 MP (5x)', connector: 'USB-C', weight: 227, storages: [256, 512, 1024], colors: C16P, cam: 'tri', front: 'island', tier: 'promax', features: [F_5G, F_MAG, 'Titânio', 'Controle da Câmera', 'Vídeo 4K120', F_IP68], basePrice: 7999 },

  { id: 'iphone-17e', name: 'iPhone 17e', family: 17, year: 2026, screen: 6.1, chip: 'A19', cameras: 'Única 48 MP Fusion (zoom 2x qualidade óptica)', connector: 'USB-C', weight: null, storages: [256, 512], colors: C17E, cam: 'single', front: 'notch', tier: 'e', features: [F_5G, F_FACE, 'Botão de Ação', 'Apple Intelligence', F_IP68], basePrice: 4999 },
  { id: 'iphone-17', name: 'iPhone 17', family: 17, year: 2025, screen: 6.3, chip: 'A19', cameras: 'Dupla 48 MP Fusion + 48 MP ultra-angular', connector: 'USB-C', weight: 177, storages: [256, 512], colors: C17, cam: 'pill2', front: 'island', tier: 'base', features: [F_5G, F_MAG, 'ProMotion 120 Hz', 'Câmera frontal Center Stage', F_IP68], basePrice: 7999 },
  { id: 'iphone-air', name: 'iPhone Air', family: 17, year: 2025, screen: 6.5, chip: 'A19 Pro', cameras: 'Única 48 MP Fusion', connector: 'USB-C', weight: 165, storages: [256, 512, 1024], colors: CAIR, cam: 'air', front: 'island', tier: 'air', features: ['Apenas eSIM', F_MAG, 'Titânio', 'ProMotion 120 Hz', '5,64 mm de espessura'], basePrice: 10499 },
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', family: 17, year: 2025, screen: 6.3, chip: 'A19 Pro', cameras: 'Tripla 48 MP Fusion (teleobjetiva 4x)', connector: 'USB-C', weight: 204, storages: [256, 512, 1024], colors: C17P, cam: 'plateau', front: 'island', tier: 'pro', features: [F_5G, F_MAG, 'Alumínio unibody', 'Câmara de vapor', 'Zoom 8x qualidade óptica', F_IP68], basePrice: 11499 },
  { id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', family: 17, year: 2025, screen: 6.9, chip: 'A19 Pro', cameras: 'Tripla 48 MP Fusion (teleobjetiva 4x)', connector: 'USB-C', weight: 231, storages: [256, 512, 1024, 2048], colors: C17P, cam: 'plateau', front: 'island', tier: 'promax', features: [F_5G, F_MAG, 'Alumínio unibody', 'Câmara de vapor', 'Até 2 TB', F_IP68], basePrice: 12499 },

  { id: 'iphone-18-pro', name: 'iPhone 18 Pro', family: 18, year: 2026, screen: 6.3, chip: 'A20 Pro', cameras: 'Tripla 48 MP', connector: 'USB-C', weight: null, storages: [256, 512, 1024], colors: C18P, cam: 'plateau', front: 'island', tier: 'pro', features: [F_5G, F_MAG, 'Modem C2', 'iOS 27'], basePrice: 12999, verify: true },
  { id: 'iphone-18-pro-max', name: 'iPhone 18 Pro Max', family: 18, year: 2026, screen: 6.9, chip: 'A20 Pro', cameras: 'Tripla 48 MP', connector: 'USB-C', weight: null, storages: [256, 512, 1024], colors: C18P, cam: 'plateau', front: 'island', tier: 'promax', features: [F_5G, F_MAG, 'Modem C2', 'iOS 27'], basePrice: 13999, verify: true },
]

export const FAMILIES = [12, 13, 14, 15, 16, 17, 18]

export const modelById = (id: string) => MODELS.find((m) => m.id === id)

export const storageLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`)
