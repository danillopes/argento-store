import { MODELS } from '../data/models'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_RULES, finalPrice, seedInventory, type PricingRules, type Unit } from '../data/inventory'
import { DEFAULT_CONFIG, FEATURES, type StoreConfig, type StoreFeatures } from '../data/store-config'

export type PayMethod = 'pix' | 'cartao'
export type OrderStatus = 'aguardando_pagamento' | 'pagamento_confirmado' | 'preparando' | 'enviado' | 'entregue' | 'cancelado' | 'expirado'

export interface Order {
  id: string
  createdAt: number
  unitIds: string[]
  total: number
  shipping: number
  method: PayMethod
  installments: number
  status: OrderStatus
  customer: { name: string; email: string; phone: string; doc: string; cep: string; address: string; number: string; complement: string; district: string; city: string; uf: string }
  delivery: 'retirada' | 'local' | 'correios'
  history: { at: number; text: string }[]
  tracking?: string
}

interface Toast { id: number; text: string }

/** Um clique num botão de atendimento. É interesse, não conversa nem venda — o site não tem como saber se a
 *  pessoa chegou a mandar a mensagem do outro lado. */
export interface Interesse {
  at: number
  tipo: 'interesse' | 'especialista' | 'comparacao'
  modelId: string
  unitId?: string
}

interface StoreCtx {
  /** Modo de operação e dados públicos da loja (editáveis no painel). */
  config: StoreConfig
  setConfig: (patch: Partial<StoreConfig>) => void
  /** O que está ligado no modo atual. Ler daqui em vez de comparar o modo em cada tela. */
  features: StoreFeatures
  interesses: Interesse[]
  registrarInteresse: (i: Omit<Interesse, 'at'>) => void
  inventory: Unit[]
  setInventory: (fn: (u: Unit[]) => Unit[]) => void
  rules: PricingRules
  setRules: (r: PricingRules) => void
  cart: string[]
  addToCart: (id: string) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  favorites: string[] // modelIds
  toggleFav: (modelId: string) => void
  compare: string[]
  toggleCompare: (modelId: string) => void
  orders: Order[]
  placeOrder: (o: Omit<Order, 'id' | 'createdAt' | 'status' | 'history'>) => Order
  cancelOrder: (id: string) => void
  updateOrder: (id: string, patch: Partial<Order>, note?: string) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  toasts: Toast[]
  toast: (text: string) => void
  resetDemo: () => void
  available: (u: Unit) => boolean
}

const Ctx = createContext<StoreCtx>(null!)
export const useStore = () => useContext(Ctx)

const RESERVE_MS = 15 * 60 * 1000
const K = 'argento:v1:'

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(K + key)
    if (raw) return JSON.parse(raw) as T
  } catch { /* storage indisponível */ }
  return fallback()
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(K + key, JSON.stringify(v)) } catch { /* ignore */ }
}

// Modelos lançados depois que o estoque foi salvo neste aparelho (ex.: iPhone Duo) entram com as unidades
// de demonstração deles, uma única vez; o estoque já salvo e as edições do painel não são alterados.
function withNewModels(inv: Unit[]): Unit[] {
  const seeded = load<string[] | null>('seededModels', () => null) ?? Array.from(new Set(inv.map((u) => u.modelId)))
  const known = new Set(seeded)
  const ids = new Set(inv.map((u) => u.id))
  const extra = seedInventory().filter((u) => !known.has(u.modelId)).map((u) => (ids.has(u.id) ? { ...u, id: `${u.id}-${u.modelId}` } : u))
  save('seededModels', MODELS.map((m) => m.id))
  return extra.length ? [...inv, ...extra] : inv
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [inventory, setInv] = useState<Unit[]>(() => withNewModels(load('inventory', seedInventory)))
  const [rules, setRulesState] = useState<PricingRules>(() => load('rules', () => DEFAULT_RULES))
  const [config, setConfigState] = useState<StoreConfig>(() => ({ ...DEFAULT_CONFIG, ...load('config', () => ({}) as Partial<StoreConfig>) }))
  const [interesses, setInteresses] = useState<Interesse[]>(() => load('interesses', () => []))
  const [cart, setCart] = useState<string[]>(() => load('cart', () => []))
  const [favorites, setFavs] = useState<string[]>(() => load('favs', () => []))
  const [compare, setCompare] = useState<string[]>(() => load('compare', () => []))
  const [orders, setOrders] = useState<Order[]>(() => load('orders', () => []))
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    load('theme', () => (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')),
  )
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => save('inventory', inventory), [inventory])
  useEffect(() => save('rules', rules), [rules])
  useEffect(() => save('config', config), [config])
  useEffect(() => save('interesses', interesses), [interesses])
  useEffect(() => save('cart', cart), [cart])
  useEffect(() => save('favs', favorites), [favorites])
  useEffect(() => save('compare', compare), [compare])
  useEffect(() => save('orders', orders), [orders])
  useEffect(() => {
    save('theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Expiração de reservas: libera unidades e marca pedidos pendentes como expirados
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      setInv((inv) => {
        const expired = inv.filter((u) => u.status === 'reservado' && u.reservedUntil && u.reservedUntil < now)
        if (!expired.length) return inv
        const ids = new Set(expired.map((u) => u.id))
        setOrders((os) =>
          os.map((o) =>
            o.status === 'aguardando_pagamento' && o.unitIds.some((id) => ids.has(id))
              ? { ...o, status: 'expirado', history: [...o.history, { at: now, text: 'Reserva expirada sem confirmação de pagamento. Unidades liberadas.' }] }
              : o,
          ),
        )
        return inv.map((u) => (ids.has(u.id) ? { ...u, status: 'disponivel', reservedUntil: undefined } : u))
      })
    }
    tick()
    const t = setInterval(tick, 10000)
    return () => clearInterval(t)
  }, [])

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  const available = useCallback((u: Unit) => u.published && u.status === 'disponivel', [])

  const features = FEATURES[config.mode]

  const value = useMemo<StoreCtx>(
    () => ({
      config,
      setConfig: (patch) => setConfigState((c) => ({ ...c, ...patch })),
      features,
      interesses,
      // guarda os últimos 300 cliques, o suficiente para o painel mostrar tendência sem inchar o navegador
      registrarInteresse: (i) => setInteresses((xs) => [...xs, { ...i, at: Date.now() }].slice(-300)),
      inventory,
      setInventory: (fn) => setInv(fn),
      rules,
      setRules: setRulesState,
      cart,
      // No modo showroom a compra está desligada. O bloqueio fica aqui, no estado, e não só nos botões: assim
      // nenhuma tela, link antigo ou atalho consegue iniciar um pedido por engano.
      addToCart: (id) => {
        if (!features.cart) return toast('A compra pelo site está desativada. Fale com a loja pelo WhatsApp.')
        setCart((c) => (c.includes(id) ? c : [...c, id]))
        toast('Unidade adicionada ao carrinho')
      },
      removeFromCart: (id) => setCart((c) => c.filter((x) => x !== id)),
      clearCart: () => setCart([]),
      favorites,
      toggleFav: (mid) => setFavs((f) => (f.includes(mid) ? f.filter((x) => x !== mid) : [...f, mid])),
      compare,
      toggleCompare: (mid) =>
        setCompare((c) => {
          if (c.includes(mid)) return c.filter((x) => x !== mid)
          if (c.length >= 4) {
            toast('Compare até 4 modelos')
            return c
          }
          return [...c, mid]
        }),
      orders,
      placeOrder: (o) => {
        if (!features.checkout || !features.payments) throw new Error('Checkout desativado no modo showroom.')
        const now = Date.now()
        // revalida disponibilidade e preço a partir do estoque (não confia no carrinho)
        const units = inventory.filter((u) => o.unitIds.includes(u.id))
        if (units.length !== o.unitIds.length || units.some((u) => !(u.published && u.status === 'disponivel'))) {
          throw new Error('Uma das unidades acabou de ser reservada por outro cliente.')
        }
        const total = units.reduce((s, u) => s + finalPrice(u), 0) + o.shipping
        const order: Order = {
          ...o,
          total,
          id: `PED-${String(now).slice(-6)}`,
          createdAt: now,
          status: 'aguardando_pagamento',
          history: [{ at: now, text: 'Pedido recebido. Unidades reservadas por 15 minutos.' }],
        }
        setInv((inv) => inv.map((u) => (o.unitIds.includes(u.id) ? { ...u, status: 'reservado', reservedUntil: now + RESERVE_MS } : u)))
        setOrders((os) => [order, ...os])
        setCart([])
        return order
      },
      cancelOrder: (id) => {
        const o = orders.find((x) => x.id === id)
        if (!o) return
        setInv((inv) => inv.map((u) => (o.unitIds.includes(u.id) && u.status === 'reservado' ? { ...u, status: 'disponivel', reservedUntil: undefined } : u)))
        setOrders((os) => os.map((x) => (x.id === id ? { ...x, status: 'cancelado', history: [...x.history, { at: Date.now(), text: 'Pedido cancelado. Reserva liberada.' }] } : x)))
      },
      updateOrder: (id, patch, note) =>
        setOrders((os) => os.map((x) => (x.id === id ? { ...x, ...patch, history: note ? [...x.history, { at: Date.now(), text: note }] : x.history } : x))),
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      toasts,
      toast,
      resetDemo: () => {
        setInv(seedInventory())
        setRulesState(DEFAULT_RULES)
        setCart([])
        setOrders([])
        setFavs([])
        setCompare([])
        toast('Dados de demonstração restaurados')
      },
      available,
    }),
    [config, features, interesses, inventory, rules, cart, favorites, compare, orders, theme, toasts, toast, available],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
