// Modo de operação da loja. O Argento nasceu como e-commerce e hoje opera como showroom: o visitante explora,
// compara e fala com a loja pelo WhatsApp. Toda a estrutura de carrinho, checkout, frete e pagamento continua
// no código, desligada por aqui — é só virar o modo para ela voltar.
export type StoreMode = 'showroom' | 'ecommerce'

export interface StoreFeatures {
  cart: boolean
  checkout: boolean
  shipping: boolean
  payments: boolean
  favorites: boolean
  compare: boolean
  whatsappContact: boolean
  product3D: boolean
}

export interface StoreConfig {
  mode: StoreMode
  /** Número de atendimento, só dígitos com DDI (ex.: 5511999998888). Vazio = sem WhatsApp configurado. */
  whatsapp: string
  /** Nome público usado nas mensagens de contato. */
  nomePublico: string
}

// O que cada modo liga e desliga. Ficar aqui, e não espalhado em `if` pelas páginas, é o que garante que virar
// o modo não deixe um caminho de compra aberto por esquecimento.
export const FEATURES: Record<StoreMode, StoreFeatures> = {
  showroom: {
    cart: false,
    checkout: false,
    shipping: false,
    payments: false,
    favorites: true,
    compare: true,
    whatsappContact: true,
    product3D: true,
  },
  ecommerce: {
    cart: true,
    checkout: true,
    shipping: true,
    payments: true,
    favorites: true,
    compare: true,
    whatsappContact: true,
    product3D: true,
  },
}

export const DEFAULT_CONFIG: StoreConfig = {
  mode: 'showroom',
  whatsapp: '',
  nomePublico: 'Argento',
}
