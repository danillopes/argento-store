import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, X, QrCode, CreditCard, Lock, Info, ShieldCheck, FileText, Package, Truck, CheckCircle2, Clock, Ban } from 'lucide-react'
import PhoneArt from '../components/PhoneArt'
import ProductCard from '../components/ProductCard'
import { Battery } from './Product'
import { MODELS, modelById, storageLabel } from '../data/models'
import { finalPrice, gradeName } from '../data/inventory'
import { useStore, type Order, type OrderStatus } from '../store/Store'
import { brl, brl2, summarize } from '../lib/utils'

// ---------------- Comparador ----------------
export function Compare() {
  const { compare, toggleCompare, inventory, available } = useStore()
  const sums = summarize(inventory, available)
  const list = compare.map((id) => sums.find((s) => s.model.id === id)!).filter(Boolean)
  const [adding, setAdding] = useState('')
  const rows: [string, (s: (typeof list)[0]) => string][] = [
    ['Preço', (s) => (s.minPrice != null ? `a partir de ${brl(s.minPrice)}` : 'Sem estoque')],
    ['Tela', (s) => `${s.model.screen}"`],
    ['Processador', (s) => s.model.chip],
    ['Câmeras', (s) => s.model.cameras],
    ['Capacidades', (s) => s.model.storages.map(storageLabel).join(', ')],
    ['Peso', (s) => (s.model.weight ? `${s.model.weight} g` : '—')],
    ['Conector', (s) => s.model.connector],
    ['Recursos', (s) => s.model.features.join(' · ')],
    ['Disponíveis', (s) => `${s.units.filter((u) => u.condition === 'novo').length} novos · ${s.units.filter((u) => u.condition === 'seminovo').length} seminovos`],
    ['Melhor bateria', (s) => (s.units.length ? `${Math.max(...s.units.map((u) => u.battery))}%` : '—')],
  ]
  return (
    <div className="page container">
      <header className="page-head"><p className="eyebrow">Comparador</p><h1 className="h1">Lado a lado.</h1><p className="lead">Selecione de dois a quatro modelos. Diferenças ficam destacadas.</p></header>
      <div className="row gap-s wrap">
        <select className="input input-sm" value={adding} onChange={(e) => { if (e.target.value) toggleCompare(e.target.value); setAdding('') }} aria-label="Adicionar modelo">
          <option value="">+ Adicionar modelo</option>
          {MODELS.filter((m) => !compare.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      {list.length < 2 ? (
        <div className="empty"><p>Adicione pelo menos dois modelos para comparar.</p><Link to="/iphones" className="btn btn-primary">Escolher no catálogo</Link></div>
      ) : (
        <div className="cmp-wrap" data-lenis-prevent>
          <table className="cmp">
            <thead>
              <tr>
                <th />
                {list.map((s) => (
                  <th key={s.model.id}>
                    <motion.div layout className="cmp-head">
                      <button className="icon-btn cmp-x" onClick={() => toggleCompare(s.model.id)} aria-label="Remover"><X size={14} /></button>
                      <PhoneArt model={s.model} hex={s.model.colors[0].hex} />
                      <Link to={`/produto/${s.model.id}`}>{s.model.name}</Link>
                    </motion.div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn]) => {
                const vals = list.map(fn)
                const diff = new Set(vals).size > 1
                return (
                  <tr key={label} className={diff ? 'is-diff' : ''}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i}>{v}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------- Favoritos ----------------
export function Favorites() {
  const { favorites, inventory, available } = useStore()
  const sums = summarize(inventory, available).filter((s) => favorites.includes(s.model.id))
  return (
    <div className="page container">
      <header className="page-head"><p className="eyebrow">Lista de desejos</p><h1 className="h1">Favoritos</h1></header>
      {sums.length ? <div className="grid-cards">{sums.map((s) => <ProductCard key={s.model.id} s={s} />)}</div> : <div className="empty"><p>Você ainda não salvou nenhum iPhone.</p><Link to="/iphones" className="btn btn-primary">Explorar</Link></div>}
    </div>
  )
}

// ---------------- Carrinho ----------------
const COUPONS: Record<string, number> = { ARGENTO5: 5 }

export function Cart() {
  const { cart, inventory, removeFromCart } = useStore()
  const nav = useNavigate()
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [cErr, setCErr] = useState('')
  const items = cart.map((id) => inventory.find((u) => u.id === id)!).filter(Boolean)
  const unavailable = items.filter((u) => u.status !== 'disponivel' || !u.published)
  const subtotal = items.reduce((s, u) => s + finalPrice(u), 0)
  const discount = applied ? Math.round(subtotal * (COUPONS[applied] / 100)) : 0
  return (
    <div className="page container">
      <header className="page-head"><p className="eyebrow">Carrinho</p><h1 className="h1">Sua sacola.</h1></header>
      {!items.length ? (
        <div className="empty"><p>Seu carrinho está vazio.</p><Link to="/iphones" className="btn btn-primary">Continuar comprando</Link></div>
      ) : (
        <div className="cart">
          <div className="cart-list">
            <AnimatePresence>
              {items.map((u) => {
                const m = modelById(u.modelId)!
                const c = m.colors.find((x) => x.id === u.colorId)!
                const bad = unavailable.includes(u)
                return (
                  <motion.div key={u.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className={`cart-item ${bad ? 'is-bad' : ''}`}>
                    <PhoneArt model={m} hex={c.hex} className="cart-art" />
                    <div className="cart-info">
                      <Link to={`/produto/${m.id}`}><strong>{m.name}</strong></Link>
                      <span className="muted small">{storageLabel(u.storage)} · {c.name} · {gradeName(u.grade)}</span>
                      <span className="row gap-s small"><Battery value={u.battery} size="sm" /> <span className="muted">Unidade {u.id} · quantidade máx. 1</span></span>
                      {bad && <span className="err small">Esta unidade não está mais disponível.</span>}
                    </div>
                    <div className="cart-price"><strong>{brl(finalPrice(u))}</strong><button className="icon-btn" aria-label="Remover" onClick={() => removeFromCart(u.id)}><Trash2 size={16} /></button></div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
          <aside className="cart-sum">
            <div className="row gap-s">
              <input className="input" placeholder="Cupom" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} aria-label="Cupom de desconto" />
              <button className="btn btn-ghost" onClick={() => { if (COUPONS[coupon]) { setApplied(coupon); setCErr('') } else setCErr('Cupom inválido.') }}>Aplicar</button>
            </div>
            {cErr && <p className="err small">{cErr}</p>}
            <p className="muted small">Cupom de teste: ARGENTO5</p>
            <div className="price-row"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            {discount > 0 && <div className="price-row hot"><span>Cupom {applied}</span><span>−{brl(discount)}</span></div>}
            <div className="price-row muted"><span>Frete</span><span>calculado no checkout</span></div>
            <div className="price-total"><span>Total</span><strong>{brl(subtotal - discount)}</strong></div>
            <button className="btn btn-primary btn-lg w-full" disabled={unavailable.length > 0} onClick={() => nav('/checkout', { state: { coupon: applied } })}>Finalizar pedido</button>
            <Link to="/iphones" className="btn btn-ghost w-full">Continuar comprando</Link>
            <p className="muted small"><Lock size={13} /> Adicionar ao carrinho não reserva o aparelho. A reserva de 15 min começa ao finalizar o pedido.</p>
          </aside>
        </div>
      )}
    </div>
  )
}

// ---------------- Checkout ----------------
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

export function Checkout() {
  const { cart, inventory, placeOrder, toast } = useStore()
  const nav = useNavigate()
  const items = cart.map((id) => inventory.find((u) => u.id === id)!).filter(Boolean)
  const [f, setF] = useState({ name: '', email: '', phone: '', doc: '', cep: '', address: '', number: '', complement: '', district: '', city: '', uf: 'SP' })
  const [delivery, setDelivery] = useState<'retirada' | 'local' | 'correios'>('correios')
  const [method, setMethod] = useState<'pix' | 'cartao'>('pix')
  const [installments, setInstallments] = useState(1)
  const [err, setErr] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }))
  const subtotal = items.reduce((s, u) => s + finalPrice(u), 0)
  const shipping = delivery === 'retirada' ? 0 : delivery === 'local' ? 19.9 : subtotal > 3000 ? 0 : 39.9
  const pixTotal = method === 'pix' ? Math.round((subtotal * 0.95)) : subtotal

  const lookupCep = async (v: string) => {
    const c = v.replace(/\D/g, '')
    if (c.length !== 8) return
    setCepLoading(true)
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${c}/json/`)).json()
      if (!j.erro) setF((x) => ({ ...x, address: j.logradouro, district: j.bairro, city: j.localidade, uf: j.uf }))
    } catch { /* sem rede */ }
    setCepLoading(false)
  }

  const validDoc = (d: string) => { const n = d.replace(/\D/g, ''); return n.length === 11 || n.length === 14 }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.phone.replace(/\D/g, '').length < 10) return setErr('Confira nome, e-mail e telefone.')
    if (!validDoc(f.doc)) return setErr('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).')
    if (delivery !== 'retirada' && (!f.cep || !f.address || !f.number || !f.city)) return setErr('Preencha o endereço de entrega.')
    try {
      const o = placeOrder({ unitIds: items.map((u) => u.id), total: 0, shipping, method, installments: method === 'cartao' ? installments : 1, customer: f, delivery })
      toast('Pedido criado — aguardando pagamento')
      nav(`/conta?pedido=${o.id}`)
    } catch (ex) {
      setErr((ex as Error).message)
    }
  }

  if (!items.length) return <div className="page container empty"><p>Não há itens para finalizar.</p><Link to="/iphones" className="btn btn-primary">Ver iPhones</Link></div>

  return (
    <form className="page container checkout" onSubmit={submit} noValidate>
      <header className="page-head"><p className="eyebrow">Checkout</p><h1 className="h1">Finalizar pedido</h1></header>
      <div className="demo-banner"><Info size={16} /> Ambiente de demonstração: nenhum pagamento é processado e nenhum dado é enviado a terceiros. A confirmação real exige integração com Mercado Pago/Stripe via servidor e webhook.</div>
      <div className="co">
        <div className="co-main">
          <fieldset className="co-step">
            <legend>1. Seus dados</legend>
            <div className="form-grid">
              <label>Nome completo<input className="input" value={f.name} onChange={set('name')} autoComplete="name" required /></label>
              <label>CPF ou CNPJ<input className="input" value={f.doc} onChange={set('doc')} inputMode="numeric" required /></label>
              <label>E-mail<input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
              <label>Telefone<input className="input" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" required /></label>
            </div>
          </fieldset>
          <fieldset className="co-step">
            <legend>2. Entrega</legend>
            <div className="opts">
              {([['correios', 'Transportadora / Correios', subtotal > 3000 ? 'Grátis' : brl2(39.9)], ['local', 'Entrega local', brl2(19.9)], ['retirada', 'Retirada na loja', 'Grátis']] as const).map(([v, l, p]) => (
                <button type="button" key={v} className={`opt ${delivery === v ? 'is-on' : ''}`} onClick={() => setDelivery(v)}><strong>{l}</strong><small>{p}</small></button>
              ))}
            </div>
            {delivery !== 'retirada' && (
              <div className="form-grid">
                <label>CEP {cepLoading && <small className="muted">buscando…</small>}<input className="input" value={f.cep} inputMode="numeric" autoComplete="postal-code" onChange={(e) => { const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9); setF((x) => ({ ...x, cep: v })); lookupCep(v) }} /></label>
                <label className="span-2">Endereço<input className="input" value={f.address} onChange={set('address')} autoComplete="address-line1" /></label>
                <label>Número<input className="input" value={f.number} onChange={set('number')} /></label>
                <label>Complemento<input className="input" value={f.complement} onChange={set('complement')} /></label>
                <label>Bairro<input className="input" value={f.district} onChange={set('district')} /></label>
                <label>Cidade<input className="input" value={f.city} onChange={set('city')} autoComplete="address-level2" /></label>
                <label>Estado<select className="input" value={f.uf} onChange={set('uf')}>{UFS.map((u) => <option key={u}>{u}</option>)}</select></label>
              </div>
            )}
          </fieldset>
          <fieldset className="co-step">
            <legend>3. Pagamento</legend>
            <div className="opts">
              <button type="button" className={`opt ${method === 'pix' ? 'is-on' : ''}`} onClick={() => setMethod('pix')}><strong><QrCode size={16} /> Pix</strong><small>5% de desconto</small></button>
              <button type="button" className={`opt ${method === 'cartao' ? 'is-on' : ''}`} onClick={() => setMethod('cartao')}><strong><CreditCard size={16} /> Cartão de crédito</strong><small>até 10x sem juros</small></button>
            </div>
            {method === 'cartao' ? (
              <div className="form-grid">
                <label>Parcelas
                  <select className="input" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x de {brl2((subtotal + shipping) / n)} sem juros</option>)}
                  </select>
                </label>
                <p className="muted small span-2"><Lock size={13} /> Os dados do cartão são digitados no checkout seguro do provedor de pagamento — a loja nunca armazena número do cartão ou CVV.</p>
              </div>
            ) : (
              <p className="muted small">Ao finalizar, o QR Code Pix seria gerado pelo provedor. A confirmação acontece somente quando o provedor notifica o pagamento.</p>
            )}
          </fieldset>
        </div>
        <aside className="cart-sum">
          {items.map((u) => {
            const m = modelById(u.modelId)!
            return <div key={u.id} className="price-row"><span>{m.name} · {storageLabel(u.storage)}</span><span>{brl(finalPrice(u))}</span></div>
          })}
          <div className="price-row"><span>Frete</span><span>{shipping ? brl2(shipping) : 'Grátis'}</span></div>
          {method === 'pix' && <div className="price-row hot"><span>Desconto Pix</span><span>−{brl(subtotal - pixTotal)}</span></div>}
          <div className="price-total"><span>Total</span><strong>{brl2(pixTotal + shipping)}</strong></div>
          {err && <p className="err small" role="alert">{err}</p>}
          <button className="btn btn-primary btn-lg w-full" type="submit"><Lock size={16} /> Finalizar pedido</button>
          <p className="muted small">Preço e disponibilidade são revalidados ao finalizar. As unidades ficam reservadas por 15 minutos.</p>
        </aside>
      </div>
    </form>
  )
}

// ---------------- Conta / Meus pedidos ----------------
const FLOW: { id: OrderStatus; label: string; icon: typeof Package }[] = [
  { id: 'aguardando_pagamento', label: 'Pedido recebido', icon: Clock },
  { id: 'pagamento_confirmado', label: 'Pagamento confirmado', icon: CheckCircle2 },
  { id: 'preparando', label: 'Preparando envio', icon: Package },
  { id: 'enviado', label: 'Enviado', icon: Truck },
  { id: 'entregue', label: 'Entregue', icon: CheckCircle2 },
]
export const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_confirmado: 'Pagamento confirmado',
  preparando: 'Preparando envio',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  expirado: 'Reserva expirada',
}

function Timeline({ o }: { o: Order }) {
  const idx = FLOW.findIndex((s) => s.id === o.status)
  if (o.status === 'cancelado' || o.status === 'expirado') return <p className="status-bad"><Ban size={16} /> {STATUS_LABEL[o.status]}</p>
  return (
    <ol className="timeline">
      {FLOW.map((s, i) => (
        <li key={s.id} className={i <= idx ? 'is-done' : ''}>
          <motion.span className="tl-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 }}><s.icon size={14} /></motion.span>
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function Account() {
  const { orders, inventory, cancelOrder } = useStore()
  const [params] = useSearchParams()
  const [open, setOpen] = useState<string | null>(() => params.get('pedido'))
  const now = Date.now()
  return (
    <div className="page container">
      <header className="page-head"><p className="eyebrow">Minha conta</p><h1 className="h1">Meus pedidos</h1><p className="lead">Acompanhe pagamento, envio, garantia e documentos fiscais.</p></header>
      <div className="demo-banner"><Info size={16} /> Login com e-mail/senha e Google, perfil e endereços dependem da conexão com o Supabase. Nesta demonstração, os pedidos ficam salvos apenas neste navegador.</div>
      {!orders.length ? (
        <div className="empty"><p>Nenhum pedido por aqui ainda.</p><Link to="/iphones" className="btn btn-primary">Começar a comprar</Link></div>
      ) : (
        <div className="orders">
          {orders.map((o) => {
            const units = inventory.filter((u) => o.unitIds.includes(u.id))
            const left = units[0]?.reservedUntil ? Math.max(0, Math.round((units[0].reservedUntil - now) / 60000)) : 0
            return (
              <motion.article layout key={o.id} className="order">
                <button className="order-head" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>
                  <strong>{o.id}</strong>
                  <span className="muted">{new Date(o.createdAt).toLocaleString('pt-BR')}</span>
                  <span className={`pill pill-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  <strong>{brl2(o.total)}</strong>
                </button>
                <AnimatePresence initial={false}>
                  {open === o.id && (
                    <motion.div className="order-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <Timeline o={o} />
                      {o.status === 'aguardando_pagamento' && (
                        <div className="note"><Clock size={14} /> Reserva ativa por mais {left} min. {o.method === 'pix' ? 'O QR Code Pix seria exibido aqui pelo provedor.' : 'O link do checkout seguro do cartão seria exibido aqui.'} Nesta demonstração o pagamento não pode ser confirmado.</div>
                      )}
                      <ul className="order-items">
                        {units.map((u) => {
                          const m = modelById(u.modelId)!
                          return <li key={u.id}><PhoneArt model={m} hex={m.colors.find((c) => c.id === u.colorId)!.hex} className="mini-art" /> {m.name} · {storageLabel(u.storage)} · {u.id} <span className="muted">· garantia de {u.warrantyMonths} meses</span></li>
                        })}
                      </ul>
                      <div className="order-grid">
                        <div><h4><Truck size={15} /> Entrega</h4><p className="small">{o.delivery === 'retirada' ? 'Retirada na loja' : `${o.customer.address}, ${o.customer.number} — ${o.customer.city}/${o.customer.uf}`}</p><p className="small muted">{o.tracking ? `Rastreio: ${o.tracking}` : 'Código de rastreio disponível após o envio.'}</p></div>
                        <div><h4><ShieldCheck size={15} /> Garantia</h4><p className="small">Cobertura de defeitos de funcionamento. Não cobre quedas, líquidos ou mau uso. Acione pelo suporte com o número do pedido.</p></div>
                        <div><h4><FileText size={15} /> Documento fiscal</h4><p className="small muted">A NF-e/NFC-e é disponibilizada para download após autorização pela SEFAZ, via integração fiscal do vendedor.</p></div>
                      </div>
                      {o.status === 'aguardando_pagamento' && <button className="btn btn-ghost" onClick={() => cancelOrder(o.id)}>Cancelar pedido</button>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------- Sobre ----------------
export function About() {
  const facts = useMemo(() => [
    ['Independente', 'A Argento é uma revenda independente. Não somos loja oficial nem revenda autorizada da Apple. iPhone é marca registrada da Apple Inc.'],
    ['Garantia', 'Novos: 12 meses pela loja. Seminovos: 6 meses pela loja, cobrindo defeitos de funcionamento.'],
    ['Devolução', 'Até 7 dias corridos após o recebimento para compras online, conforme o Código de Defesa do Consumidor.'],
    ['Inspeção', '42 pontos testados: tela, toque, Face ID, câmeras, áudio, sensores, conectividade, carregamento e bateria.'],
    ['Graus', 'A+ impecável, A excelente, B muito bom, C bom. As fotos reais de cada unidade prevalecem sobre a classificação.'],
    ['Privacidade', 'IMEI e número de série ficam protegidos e nunca aparecem completos publicamente.'],
  ], [])
  return (
    <div className="page container">
      <header className="page-head"><p className="eyebrow">Sobre nós</p><h1 className="h1">Transparência como acabamento.</h1><p className="lead">Vendemos iPhones novos e seminovos com informação completa sobre cada unidade.</p></header>
      <div className="about-grid">
        {facts.map(([t, d], i) => (
          <motion.div key={t} className="benefit" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <strong>{t}</strong><span>{d}</span>
          </motion.div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 32 }}>Projeto demonstrativo. <Link to="/admin">Acessar painel do vendedor</Link></p>
    </div>
  )
}

