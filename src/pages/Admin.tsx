import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Boxes, ReceiptText, Users, BadgePercent, FileText, Plus, Trash2, Eye, EyeOff, RotateCcw, Lock, Info, LogOut, Settings, MessageCircle } from 'lucide-react'
import { Logo } from '../components/Logo'
import { FAMILIES, MODELS, modelById, storageLabel } from '../data/models'
import { BATTERY_BANDS, GRADES, finalPrice, suggestPrice, type Condition, type Grade, type Unit } from '../data/inventory'
import { useStore } from '../store/Store'
import { brl, brl2 } from '../lib/utils'
import { STATUS_LABEL } from './Shop'

type Tab = 'dash' | 'estoque' | 'pedidos' | 'clientes' | 'precos' | 'fiscal' | 'config'
const TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: 'dash', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'estoque', label: 'Estoque', icon: Boxes },
  { id: 'pedidos', label: 'Pedidos', icon: ReceiptText },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'precos', label: 'Preços', icon: BadgePercent },
  { id: 'fiscal', label: 'Notas fiscais', icon: FileText },
  { id: 'config', label: 'Configurações', icon: Settings },
]

export default function Admin() {
  const [authed, setAuthed] = useState(() => { try { return sessionStorage.getItem('argento-admin') === '1' } catch { return false } })
  const [tab, setTab] = useState<Tab>('dash')

  if (!authed) {
    return (
      <div className="adm-login">
        <motion.div className="adm-login-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Logo />
          <h1 className="h2">Painel do vendedor</h1>
          <p className="muted">Em produção, o acesso exige login com papel de administrador e políticas RLS no Supabase.</p>
          <button className="btn btn-primary btn-lg w-full" onClick={() => { try { sessionStorage.setItem('argento-admin', '1') } catch { /* */ } setAuthed(true) }}><Lock size={16} /> Entrar como administrador (demo)</button>
          <Link to="/" className="btn btn-ghost w-full">Voltar à loja</Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link to="/" className="adm-brand"><Logo compact /><small>Painel</small></Link>
        <nav>
          {TABS.map(({ id, label, icon: I }) => (
            <button key={id} className={`adm-tab ${tab === id ? 'is-on' : ''}`} onClick={() => setTab(id)}>
              {tab === id && <motion.span layoutId="adm-pill" className="adm-pill" />}
              <I size={17} strokeWidth={1.6} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="adm-tab" onClick={() => { try { sessionStorage.removeItem('argento-admin') } catch { /* */ } setAuthed(false) }}><LogOut size={17} strokeWidth={1.6} /> <span>Sair</span></button>
      </aside>
      <main className="adm-main">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {tab === 'dash' && <Dashboard />}
            {tab === 'estoque' && <Stock />}
            {tab === 'pedidos' && <Orders />}
            {tab === 'clientes' && <Customers />}
            {tab === 'precos' && <Pricing />}
            {tab === 'fiscal' && <Fiscal />}
            {tab === 'config' && <Config />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="kpi"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
}

function Dashboard() {
  const { inventory, orders, resetDemo } = useStore()
  const [period, setPeriod] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes')
  const since = Date.now() - { dia: 1, semana: 7, mes: 30, ano: 365 }[period] * 86400000
  const os = orders.filter((o) => o.createdAt >= since)
  const paid = os.filter((o) => ['pagamento_confirmado', 'preparando', 'enviado', 'entregue'].includes(o.status))
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const byFam = FAMILIES.map((f) => ({ f, n: inventory.filter((u) => modelById(u.modelId)!.family === f && u.status === 'disponivel').length }))
  const maxFam = Math.max(...byFam.map((x) => x.n), 1)
  const stockValue = inventory.filter((u) => u.status === 'disponivel').reduce((s, u) => s + finalPrice(u), 0)
  return (
    <>
      <div className="adm-head">
        <h1 className="h2">Visão geral</h1>
        <div className="seg">{(['dia', 'semana', 'mes', 'ano'] as const).map((p) => <button key={p} className={period === p ? 'is-on' : ''} onClick={() => setPeriod(p)}>{{ dia: 'Diário', semana: 'Semanal', mes: 'Mensal', ano: 'Anual' }[p]}</button>)}</div>
      </div>
      <div className="kpis">
        <Kpi label="Faturamento confirmado" value={brl(revenue)} sub="somente pagamentos validados pelo provedor" />
        <Kpi label="Pedidos recebidos" value={String(os.length)} />
        <Kpi label="Aguardando pagamento" value={String(os.filter((o) => o.status === 'aguardando_pagamento').length)} />
        <Kpi label="Vendas concluídas" value={String(paid.length)} />
        <Kpi label="Produtos disponíveis" value={String(inventory.filter((u) => u.status === 'disponivel').length)} sub={`valor ${brl(stockValue)}`} />
        <Kpi label="Reservados" value={String(inventory.filter((u) => u.status === 'reservado').length)} />
        <Kpi label="Vendidos" value={String(inventory.filter((u) => u.status === 'vendido').length)} />
        <Kpi label="Ticket médio" value={paid.length ? brl(revenue / paid.length) : '—'} />
      </div>
      <div className="adm-card">
        <h3 className="h3">Estoque por geração</h3>
        <div className="bars">
          {byFam.map(({ f, n }) => (
            <div key={f} className="bar">
              <motion.i initial={{ height: 0 }} animate={{ height: `${(n / maxFam) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
              <b>{n}</b>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-ghost" onClick={resetDemo}><RotateCcw size={15} /> Restaurar dados de demonstração</button>
    </>
  )
}

function Stock() {
  const { inventory, setInventory, rules, toast } = useStore()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const list = useMemo(() => inventory.filter((u) => `${u.id} ${modelById(u.modelId)!.name}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt), [inventory, q])
  const patch = (id: string, p: Partial<Unit>) => setInventory((inv) => inv.map((u) => (u.id === id ? { ...u, ...p } : u)))
  return (
    <>
      <div className="adm-head">
        <h1 className="h2">Estoque <small className="muted">{inventory.length} unidades</small></h1>
        <div className="row gap-s">
          <input className="input input-sm" placeholder="Buscar por ID ou modelo" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}><Plus size={16} /> Adicionar iPhone</button>
        </div>
      </div>
      <AnimatePresence>{adding && <AddUnit onDone={() => { setAdding(false); toast('Unidade cadastrada') }} />}</AnimatePresence>
      <div className="table-wrap" data-lenis-prevent>
        <table className="table">
          <thead><tr><th>ID</th><th>Modelo</th><th>Cap.</th><th>Cor</th><th>Cond.</th><th>Bateria</th><th>Grau</th><th>IMEI</th><th>Preço (R$)</th><th>Oferta %</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((u) => {
              const m = modelById(u.modelId)!
              return (
                <tr key={u.id} className={u.published ? '' : 'is-off'}>
                  <td className="mono">{u.id}</td>
                  <td>{m.name}</td>
                  <td>{storageLabel(u.storage)}</td>
                  <td><span className="dot" style={{ background: m.colors.find((c) => c.id === u.colorId)?.hex }} /> {m.colors.find((c) => c.id === u.colorId)?.name}</td>
                  <td>{u.condition}</td>
                  <td>{u.battery}%{u.batteryReplaced ? ' ↻' : ''}</td>
                  <td>{u.grade}</td>
                  <td className="mono muted">{u.imeiMasked}</td>
                  <td><input className="input input-xs" type="number" value={u.price} onChange={(e) => patch(u.id, { price: Number(e.target.value) || 0 })} aria-label="Preço" title={`Sugerido: ${brl(suggestPrice(rules, u.modelId, u.storage, u.condition, u.battery, u.grade))}`} /></td>
                  <td><input className="input input-xs" type="number" min={0} max={50} value={u.promo} onChange={(e) => patch(u.id, { promo: Math.min(50, Math.max(0, Number(e.target.value) || 0)) })} aria-label="Oferta" /></td>
                  <td><span className={`pill pill-${u.status}`}>{u.status}</span></td>
                  <td className="row gap-s">
                    <button className="icon-btn" title={u.published ? 'Desativar anúncio' : 'Publicar'} onClick={() => patch(u.id, { published: !u.published })}>{u.published ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                    <button className="icon-btn" title="Remover" disabled={u.status !== 'disponivel'} onClick={() => setInventory((inv) => inv.filter((x) => x.id !== u.id))}><Trash2 size={15} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function AddUnit({ onDone }: { onDone: () => void }) {
  const { setInventory, rules, inventory } = useStore()
  const [modelId, setModelId] = useState(MODELS[MODELS.length - 3].id)
  const m = modelById(modelId)!
  const [storage, setStorage] = useState(m.storages[0])
  const [colorId, setColorId] = useState(m.colors[0].id)
  const [condition, setCondition] = useState<Condition>('seminovo')
  const [battery, setBattery] = useState(92)
  const [grade, setGrade] = useState<Grade>('A')
  const [replaced, setReplaced] = useState(false)
  const [imei, setImei] = useState('')
  const [repairs, setRepairs] = useState('')
  const [warranty, setWarranty] = useState(6)
  const [notes, setNotes] = useState('')
  const sugg = suggestPrice(rules, modelId, storage, condition, condition === 'novo' ? 100 : battery, condition === 'novo' ? 'novo' : grade)
  const [price, setPrice] = useState<number | ''>('')
  const changeModel = (id: string) => { const mm = modelById(id)!; setModelId(id); setStorage(mm.storages[0]); setColorId(mm.colors[0].id) }
  const save = () => {
    const nextN = Math.max(1000, ...inventory.map((u) => Number(u.id.split('-')[1]) || 0)) + 1
    const digits = imei.replace(/\D/g, '')
    setInventory((inv) => [{
      id: `ARG-${nextN}`, modelId, storage, colorId, condition,
      battery: condition === 'novo' ? 100 : battery, batteryReplaced: replaced, grade: condition === 'novo' ? 'novo' : grade,
      price: price === '' ? sugg : price, promo: 0, warrantyMonths: warranty,
      imeiMasked: digits.length >= 6 ? `${digits.slice(0, 2)}${'•'.repeat(9)}${digits.slice(-4)}` : '—',
      repairs: repairs || 'Nenhum reparo conhecido.', notes, published: true, status: 'disponivel', createdAt: Date.now(),
    }, ...inv])
    onDone()
  }
  return (
    <motion.div className="adm-card add-unit" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
      <div className="form-grid form-grid-4">
        <label>Modelo<select className="input" value={modelId} onChange={(e) => changeModel(e.target.value)}>{MODELS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Armazenamento<select className="input" value={storage} onChange={(e) => setStorage(Number(e.target.value))}>{m.storages.map((s) => <option key={s} value={s}>{storageLabel(s)}</option>)}</select></label>
        <label>Cor<select className="input" value={colorId} onChange={(e) => setColorId(e.target.value)}>{m.colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Condição<select className="input" value={condition} onChange={(e) => setCondition(e.target.value as Condition)}><option value="novo">Novo</option><option value="seminovo">Seminovo</option></select></label>
        {condition === 'seminovo' && <>
          <label>Saúde exata da bateria (%)<input className="input" type="number" min={1} max={100} value={battery} onChange={(e) => setBattery(Math.min(100, Math.max(1, Number(e.target.value))))} /></label>
          <label>Aparência<select className="input" value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.id} — {g.name}</option>)}</select></label>
          <label className="check"><input type="checkbox" checked={replaced} onChange={(e) => setReplaced(e.target.checked)} /> Bateria substituída</label>
        </>}
        <label>IMEI (uso interno)<input className="input" value={imei} onChange={(e) => setImei(e.target.value)} inputMode="numeric" /></label>
        <label>Garantia (meses)<input className="input" type="number" value={warranty} onChange={(e) => setWarranty(Number(e.target.value))} /></label>
        <label className="span-2">Histórico de reparos<input className="input" value={repairs} onChange={(e) => setRepairs(e.target.value)} /></label>
        <label className="span-2">Observações / testes<input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <label>Preço final (R$)<input className="input" type="number" placeholder={String(sugg)} value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} /></label>
      </div>
      <p className="muted small">Preço sugerido pela política atual: <strong>{brl(sugg)}</strong>. Fotos reais: upload para o Supabase Storage na versão com backend.</p>
      <div className="row gap-s"><button className="btn btn-primary" onClick={save}>Salvar e publicar</button><button className="btn btn-ghost" onClick={onDone}>Cancelar</button></div>
    </motion.div>
  )
}

function Orders() {
  const { orders, inventory, cancelOrder, updateOrder } = useStore()
  return (
    <>
      <div className="adm-head"><h1 className="h2">Pedidos</h1></div>
      <div className="note"><Info size={14} /> O status de pagamento só muda por webhook autenticado do provedor. O painel não permite marcar um pedido como pago manualmente.</div>
      {!orders.length ? <div className="empty"><p>Nenhum pedido ainda. Faça um pedido pela loja para vê-lo aqui.</p></div> : (
        <div className="table-wrap" data-lenis-prevent>
          <table className="table">
            <thead><tr><th>Pedido</th><th>Data</th><th>Comprador</th><th>Contato</th><th>Unidades</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Rastreio</th><th /></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{o.customer.name}<br /><small className="muted">{o.delivery === 'retirada' ? 'Retirada' : `${o.customer.city}/${o.customer.uf}`}</small></td>
                  <td><small>{o.customer.email}<br />{o.customer.phone}</small></td>
                  <td><small>{o.unitIds.map((id) => { const u = inventory.find((x) => x.id === id); return u ? `${modelById(u.modelId)!.name} (${id})` : id }).join(', ')}</small></td>
                  <td>{brl2(o.total)}</td>
                  <td>{o.method === 'pix' ? 'Pix' : `Cartão ${o.installments}x`}</td>
                  <td><span className={`pill pill-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td><input className="input input-xs" placeholder="código" disabled={!['preparando', 'enviado'].includes(o.status)} value={o.tracking ?? ''} onChange={(e) => updateOrder(o.id, { tracking: e.target.value })} /></td>
                  <td>{o.status === 'aguardando_pagamento' && <button className="btn btn-ghost btn-sm" onClick={() => cancelOrder(o.id)}>Cancelar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Customers() {
  const { orders } = useStore()
  const map = new Map<string, { name: string; email: string; phone: string; n: number; total: number; last: number }>()
  orders.forEach((o) => {
    const c = map.get(o.customer.email) ?? { name: o.customer.name, email: o.customer.email, phone: o.customer.phone, n: 0, total: 0, last: 0 }
    c.n++; c.total += o.total; c.last = Math.max(c.last, o.createdAt)
    map.set(o.customer.email, c)
  })
  const list = [...map.values()]
  return (
    <>
      <div className="adm-head"><h1 className="h2">Clientes</h1></div>
      {!list.length ? <div className="empty"><p>Os clientes aparecem aqui após o primeiro pedido.</p></div> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Pedidos</th><th>Total</th><th>Último pedido</th></tr></thead>
          <tbody>{list.map((c) => <tr key={c.email}><td>{c.name}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.n}</td><td>{brl2(c.total)}</td><td>{new Date(c.last).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>
      )}
    </>
  )
}

function Pricing() {
  const { rules, setRules, setInventory, toast } = useStore()
  const [r, setR] = useState(rules)
  const [sim, setSim] = useState({ modelId: 'iphone-13-pro', storage: 128, battery: 95, grade: 'A+' as Grade })
  const sm = modelById(sim.modelId)!
  return (
    <>
      <div className="adm-head"><h1 className="h2">Política de preços</h1></div>
      <div className="adm-cols">
        <div className="adm-card">
          <div className="form-grid">
            <label>Adicional por degrau de armazenamento (%)<input className="input" type="number" value={r.storageStep} onChange={(e) => setR({ ...r, storageStep: Number(e.target.value) })} /></label>
            <label>Depreciação por ano — seminovos (%)<input className="input" type="number" value={r.usedFactorPerYear} onChange={(e) => setR({ ...r, usedFactorPerYear: Number(e.target.value) })} /></label>
            <label>Margem (%)<input className="input" type="number" value={r.margin} onChange={(e) => setR({ ...r, margin: Number(e.target.value) })} /></label>
          </div>
          <h4>Ajuste por saúde da bateria (R$)</h4>
          <div className="form-grid form-grid-5">{BATTERY_BANDS.map((b) => <label key={b.id}>{b.label}<input className="input" type="number" value={r.batteryAdj[b.id]} onChange={(e) => setR({ ...r, batteryAdj: { ...r.batteryAdj, [b.id]: Number(e.target.value) } })} /></label>)}</div>
          <h4>Ajuste por conservação (R$)</h4>
          <div className="form-grid form-grid-4">{GRADES.map((g) => <label key={g.id}>{g.id} — {g.name}<input className="input" type="number" value={r.gradeAdj[g.id]} onChange={(e) => setR({ ...r, gradeAdj: { ...r.gradeAdj, [g.id]: Number(e.target.value) } })} /></label>)}</div>
          <div className="row gap-s">
            <button className="btn btn-primary" onClick={() => { setRules(r); toast('Política salva (novos cadastros usam esta regra)') }}>Salvar política</button>
            <button className="btn btn-ghost" onClick={() => { setRules(r); setInventory((inv) => inv.map((u) => (u.status === 'disponivel' ? { ...u, price: suggestPrice(r, u.modelId, u.storage, u.condition, u.battery, u.grade) } : u))); toast('Preços recalculados para unidades disponíveis') }}>Salvar e recalcular estoque</button>
          </div>
        </div>
        <div className="adm-card">
          <h3 className="h3">Simulação antes de publicar</h3>
          <div className="form-grid">
            <label>Modelo<select className="input" value={sim.modelId} onChange={(e) => { const mm = modelById(e.target.value)!; setSim({ ...sim, modelId: mm.id, storage: mm.storages[0] }) }}>{MODELS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>Capacidade<select className="input" value={sim.storage} onChange={(e) => setSim({ ...sim, storage: Number(e.target.value) })}>{sm.storages.map((s) => <option key={s} value={s}>{storageLabel(s)}</option>)}</select></label>
            <label>Bateria (%)<input className="input" type="number" value={sim.battery} onChange={(e) => setSim({ ...sim, battery: Number(e.target.value) })} /></label>
            <label>Grau<select className="input" value={sim.grade} onChange={(e) => setSim({ ...sim, grade: e.target.value as Grade })}>{GRADES.map((g) => <option key={g.id}>{g.id}</option>)}</select></label>
          </div>
          <div className="price-total"><span>Seminovo</span><strong>{brl(suggestPrice(r, sim.modelId, sim.storage, 'seminovo', sim.battery, sim.grade))}</strong></div>
          <div className="price-row"><span>Novo (referência)</span><span>{brl(suggestPrice(r, sim.modelId, sim.storage, 'novo', 100, 'novo'))}</span></div>
          <p className="muted small">Valores demonstrativos. O vendedor pode definir manualmente o valor final de cada unidade no estoque.</p>
        </div>
      </div>
    </>
  )
}

function Fiscal() {
  const { orders } = useStore()
  return (
    <>
      <div className="adm-head"><h1 className="h2">Notas fiscais</h1></div>
      <div className="adm-card">
        <p><strong>Integração fiscal não configurada.</strong></p>
        <p className="muted">A emissão de NF-e (modelo 55) ou NFC-e (modelo 65) exige um provedor fiscal homologado, certificado digital, CNPJ, inscrição estadual, regime tributário e parametrização de NCM, CFOP e CST/CSOSN definida com sua contabilidade. Nenhuma nota é gerada nesta demonstração.</p>
        <ul className="checklist">
          {['Dados fiscais da empresa', 'Certificado digital A1', 'Provedor fiscal (homologação e produção)', 'Parametrização tributária validada pela contabilidade', 'Regras para mercadoria usada e devolução'].map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>
      <div className="table-wrap">
        <table className="table"><thead><tr><th>Pedido</th><th>Status do pedido</th><th>Documento</th><th>Ações</th></tr></thead>
          <tbody>
            {orders.length ? orders.map((o) => (
              <tr key={o.id}><td className="mono">{o.id}</td><td>{STATUS_LABEL[o.status]}</td><td className="muted">Não emitido</td>
                <td className="row gap-s"><button className="btn btn-ghost btn-sm" disabled title="Requer pagamento confirmado e integração fiscal">Emitir</button><button className="btn btn-ghost btn-sm" disabled>XML</button><button className="btn btn-ghost btn-sm" disabled>DANFE</button></td></tr>
            )) : <tr><td colSpan={4} className="muted">Sem pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}


// ============ Configurações: modo de operação e atendimento ============
function Config() {
  const { config, setConfig, interesses, toast } = useStore()
  const [numero, setNumero] = useState(config.whatsapp)
  const [nome, setNome] = useState(config.nomePublico)
  const digitos = numero.replace(/\D/g, '')
  const valido = digitos.length >= 10

  return (
    <section className="adm-sec">
      <h2 className="h3">Modo de operação da loja</h2>
      <p className="muted small">
        No showroom o visitante explora, compara e fala com a loja pelo WhatsApp. Carrinho, checkout, frete e
        pagamento continuam no sistema, desligados — e as rotas de compra ficam fechadas, não só escondidas.
      </p>
      <div className="adm-modos">
        {([
          ['showroom', 'Showroom digital', 'Contato pelo WhatsApp. Sem carrinho, checkout, frete nem pagamento.'],
          ['ecommerce', 'E-commerce completo', 'Reativa a experiência de compra que já existe no código.'],
        ] as const).map(([id, titulo, desc]) => (
          <button
            key={id}
            type="button"
            className={`adm-modo ${config.mode === id ? 'is-on' : ''}`}
            aria-pressed={config.mode === id}
            onClick={() => {
              setConfig({ mode: id })
              toast(id === 'showroom' ? 'Modo showroom ativado' : 'Modo e-commerce ativado')
            }}
          >
            <strong>{titulo}</strong>
            <span className="muted small">{desc}</span>
          </button>
        ))}
      </div>
      {config.mode === 'ecommerce' && (
        <p className="note">
          A compra pelo site volta a aparecer. O checkout é uma simulação de demonstração: não há pagamento real
          nem emissão fiscal ligados a ele.
        </p>
      )}

      <h2 className="h3" style={{ marginTop: 32 }}>Atendimento</h2>
      <div className="form-grid">
        <label className="field">
          <span className="f-label">Nome público da loja</span>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Argento" />
        </label>
        <label className="field">
          <span className="f-label">WhatsApp com DDI e DDD</span>
          <input
            className="input"
            inputMode="tel"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="55 11 99999-8888"
          />
          <small className="muted">{valido ? `Link: wa.me/${digitos}` : 'Informe o número completo, com DDI (55) e DDD.'}</small>
        </label>
      </div>
      <button
        className="btn btn-primary"
        disabled={!valido && numero.trim() !== ''}
        onClick={() => {
          setConfig({ whatsapp: digitos, nomePublico: nome.trim() || 'Argento' })
          toast('Configurações salvas')
        }}
      >
        Salvar
      </button>

      <h2 className="h3" style={{ marginTop: 32 }}>Interesses registrados</h2>
      <p className="muted small">
        Cliques nos botões de atendimento. É interesse, não conversa nem venda: o site não tem como saber se a
        mensagem chegou a ser enviada do outro lado.
      </p>
      {interesses.length === 0 ? (
        <p className="muted">Nenhum clique registrado neste navegador ainda.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Quando</th><th scope="col">Botão</th><th scope="col">Modelo</th><th scope="col">Unidade</th></tr></thead>
            <tbody>
              {[...interesses].reverse().slice(0, 40).map((i) => (
                <tr key={`${i.at}-${i.modelId}`}>
                  <td>{new Date(i.at).toLocaleString('pt-BR')}</td>
                  <td><MessageCircle size={13} /> {i.tipo === 'interesse' ? 'Tenho interesse' : i.tipo === 'especialista' ? 'Falar com especialista' : 'Comparação'}</td>
                  <td>{modelById(i.modelId)?.name ?? i.modelId}</td>
                  <td>{i.unitId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
