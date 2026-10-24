import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, BatteryFull, Camera, Truck, Receipt, BadgeCheck, ArrowRight } from 'lucide-react'
import Scrolly from '../sections/Scrolly'
import Lancamento from '../sections/Lancamento'
import InsideTech from '../sections/InsideTech'
import { HorizontalGallery, InfiniteGallery, LayeredGallery } from '../sections/Gallery'
import ProductCard from '../components/ProductCard'
import { useStore } from '../store/Store'
import { summarize } from '../lib/utils'

function Rail({ title, eyebrow, to, items, condition }: { title: string; eyebrow: string; to: string; items: ReturnType<typeof summarize>; condition?: 'novo' | 'seminovo' }) {
  return (
    <section className="rail container">
      <div className="rail-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="h2">{title}</h2>
        </div>
        <Link to={to} className="link-arrow">Ver todos <ArrowRight size={16} /></Link>
      </div>
      <div className="grid-cards">
        {items.map((s) => <ProductCard key={s.model.id} s={s} condition={condition} />)}
      </div>
    </section>
  )
}

const BENEFITS = [
  { icon: BatteryFull, t: 'Bateria medida', d: 'Saúde exata de cada unidade, sem faixas arredondadas.' },
  { icon: Camera, t: 'Fotos da unidade', d: 'Imagens do aparelho que você recebe, incluindo marcas.' },
  { icon: ShieldCheck, t: 'Garantia da loja', d: '12 meses nos novos e 6 meses nos seminovos.' },
  { icon: BadgeCheck, t: '42 pontos testados', d: 'Face ID, câmeras, tela, áudio, sensores e rede.' },
  { icon: Truck, t: 'Entrega rastreada', d: 'Envio segurado e retirada na loja quando disponível.' },
  { icon: Receipt, t: 'Nota fiscal', d: 'Documento fiscal emitido por integração autorizada.' },
]

export default function Home() {
  const { inventory, available } = useStore()
  const sums = useMemo(() => summarize(inventory, available), [inventory, available])
  const offers = sums.filter((s) => s.maxPromo > 0).sort((a, b) => b.maxPromo - a.maxPromo).slice(0, 4)
  const used = sums.filter((s) => s.hasUsed).sort((a, b) => b.model.year - a.model.year).slice(0, 4)
  const news = sums.filter((s) => s.hasNew).sort((a, b) => b.model.basePrice - a.model.basePrice).slice(0, 4)
  const recent = [...sums].filter((s) => s.units.length).sort((a, b) => Math.max(...b.units.map((u) => u.createdAt)) - Math.max(...a.units.map((u) => u.createdAt))).slice(0, 4)

  return (
    <>
      <Scrolly />
      <Lancamento />
      <InsideTech />
      <HorizontalGallery />

      <section className="ig-wrap" aria-label="Galeria infinita">
        <div className="container center">
          <p className="eyebrow">Arraste para explorar</p>
          <h2 className="h2">Todas as cores, em movimento.</h2>
        </div>
        <InfiniteGallery />
        <InfiniteGallery reverse speed={30} />
      </section>

      <LayeredGallery />

      {offers.length > 0 && <Rail eyebrow="Ofertas" title="Preços especiais nesta semana." to="/ofertas" items={offers} />}
      <Rail eyebrow="Seminovos" title="Seminovos com procedência." to="/seminovos" items={used} condition="seminovo" />
      <Rail eyebrow="Novos" title="Lacrados, com nota fiscal." to="/iphones?cond=novo" items={news} condition="novo" />
      <Rail eyebrow="Recém-chegados" title="Acabaram de entrar no estoque." to="/iphones?sort=recentes" items={recent} />

      <section className="benefits container" aria-label="Benefícios">
        {BENEFITS.map(({ icon: I, t, d }, i) => (
          <motion.div key={t} className="benefit" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <I size={22} strokeWidth={1.5} />
            <strong>{t}</strong>
            <span>{d}</span>
          </motion.div>
        ))}
      </section>
    </>
  )
}
