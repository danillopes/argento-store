import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, GitCompareArrows, ShoppingBag, Zap, ShieldCheck, Truck, Info, Camera, Rotate3d, Check, Power, Sparkles, Layers } from 'lucide-react'
import Phone3D, { defaultDrive, glbCandidates, type Drive } from '../components/Phone3D'
import PhoneArt from '../components/PhoneArt'
import Photo, { modelPhoto, unitPhotos } from '../components/Photo'
import Lightbox from '../components/Lightbox'
import ProductCard from '../components/ProductCard'
import { modelById, storageLabel } from '../data/models'
import { BATTERY_BANDS, GRADES, bandOf, breakdown, finalPrice, gradeName, type Unit } from '../data/inventory'
import { useStore } from '../store/Store'
import { brl, brl2, summarize } from '../lib/utils'
import { explodeFor } from '../data/explode-config'

const ExplodeModal = lazy(() => import('../components/exploded/ExplodeModal'))

const stepAnim = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-30px' }, transition: { duration: 0.45 } }

export function Battery({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const tone = value >= 90 ? 'good' : value >= 85 ? 'mid' : 'low'
  return (
    <span className={`batt batt-${size} batt-${tone}`} aria-label={`Saúde da bateria ${value}%`}>
      <span className="batt-body"><motion.i initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></span>
      <span className="batt-cap" />
      <b>{value}%</b>
    </span>
  )
}

function Step({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <motion.section className="step" {...stepAnim}>
      <header><span className="step-n">{n}</span><h2>{title}</h2></header>
      {hint && <p className="muted small">{hint}</p>}
      {children}
    </motion.section>
  )
}

export default function Product() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const m = modelById(id)
  const nav = useNavigate()
  const { inventory, available, rules, addToCart, cart, favorites, toggleFav, compare, toggleCompare } = useStore()
  const units = useMemo(() => inventory.filter((u) => u.modelId === id && available(u)), [inventory, id, available])

  const conds = (['novo', 'seminovo'] as const).filter((c) => units.some((u) => u.condition === c))
  const [cond, setCond] = useState<'novo' | 'seminovo'>((params.get('c') as 'novo') ?? conds[0] ?? 'novo')
  const [storage, setStorage] = useState<number | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [band, setBand] = useState<string | null>(null)
  const [grade, setGrade] = useState<string | null>(null)
  const [unitId, setUnitId] = useState<string | null>(null)
  const [view, setView] = useState<'3d' | 'foto' | 'front' | 'back' | 'side'>('3d')
  const [inside, setInside] = useState(false)
  const [screenOn, setScreenOn] = useState(true)
  const [islandOn, setIslandOn] = useState(false)
  const [lb, setLb] = useState<number | null>(null)
  const [cep, setCep] = useState('')
  const [ship, setShip] = useState<{ city: string; uf: string; price: number; days: string } | null>(null)
  const [shipErr, setShipErr] = useState('')
  const [inst, setInst] = useState(10)
  const drive = useRef<Drive>(defaultDrive())

  // Cada nível só oferece opções que existem no estoque considerando as escolhas anteriores
  const byCond = units.filter((u) => u.condition === cond)
  const byStorage = byCond.filter((u) => u.storage === storage)
  const byColor = byStorage.filter((u) => u.colorId === color)
  const byBand = cond === 'novo' ? byColor : byColor.filter((u) => bandOf(u.battery).id === band)
  const byGrade = cond === 'novo' ? byBand : byBand.filter((u) => u.grade === grade)
  const matches = [...byGrade].sort((a, b) => finalPrice(a) - finalPrice(b))
  const unit = matches.find((u) => u.id === unitId) ?? matches[0]

  // corrige seleções inválidas em cascata
  useEffect(() => { if (!conds.includes(cond) && conds[0]) setCond(conds[0]) }, [conds.join(), cond])
  useEffect(() => { if (!byCond.some((u) => u.storage === storage)) setStorage(byCond.map((u) => u.storage).sort((a, b) => a - b)[0] ?? null) }, [cond, byCond.length])
  useEffect(() => { if (!byStorage.some((u) => u.colorId === color)) setColor(byStorage[0]?.colorId ?? null) }, [storage, byStorage.length])
  useEffect(() => { if (cond === 'seminovo' && !byColor.some((u) => bandOf(u.battery).id === band)) setBand(byColor.map((u) => bandOf(u.battery).id).sort().reverse()[0] ?? null) }, [color, byColor.length, cond])
  useEffect(() => { if (cond === 'seminovo' && !byBand.some((u) => u.grade === grade)) setGrade(byBand[0]?.grade ?? null) }, [band, byBand.length, cond])
  useEffect(() => { setUnitId(null) }, [cond, storage, color, band, grade])
  useEffect(() => { setIslandOn(false); drive.current.island = 0 }, [id])

  const colorObj = m?.colors.find((c) => c.id === (color ?? '')) ?? m?.colors[0]
  const mPhoto = m && colorObj ? modelPhoto(m.id, colorObj.id) : undefined
  useEffect(() => { if (colorObj) drive.current.color = colorObj.hex }, [colorObj?.hex])
  useEffect(() => { if (view === 'foto' && !mPhoto) setView('3d') }, [view, mPhoto])
  useEffect(() => {
    drive.current.rotY = view === 'back' ? Math.PI : view === 'side' ? Math.PI / 2 : view === '3d' ? -0.34 : 0
    drive.current.rotX = view === '3d' ? 0.06 : 0
    drive.current.poseKey = (drive.current.poseKey ?? 0) + 1
  }, [view])
  useEffect(() => { drive.current.screen = screenOn ? 1 : 0 }, [screenOn])
  useEffect(() => { drive.current.island = islandOn ? 1 : 0 }, [islandOn])

  if (!m) return <div className="page container empty"><h1 className="h2">Modelo não encontrado.</h1><Link className="btn btn-primary" to="/iphones">Ver catálogo</Link></div>

  const price = unit ? finalPrice(unit) : null
  const uPhotos = unit ? unitPhotos(unit.id) : []
  const inCart = unit ? cart.includes(unit.id) : false
  const fav = favorites.includes(m.id)
  const cmp = compare.includes(m.id)
  const similar = summarize(inventory, available).filter((s) => s.model.id !== m.id && s.minPrice != null && price != null && Math.abs(s.minPrice - price) < price * 0.25).slice(0, 4)

  const calcShip = async () => {
    setShipErr('')
    setShip(null)
    const c = cep.replace(/\D/g, '')
    if (c.length !== 8) return setShipErr('Informe um CEP com 8 dígitos.')
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`)
      const j = await r.json()
      if (j.erro) return setShipErr('CEP não encontrado.')
      const near = ['SP', 'RJ', 'MG', 'PR'].includes(j.uf)
      setShip({ city: j.localidade, uf: j.uf, price: price && price > 3000 ? 0 : near ? 29.9 : 49.9, days: near ? '2 a 4 dias úteis' : '4 a 8 dias úteis' })
    } catch {
      setShipErr('Não foi possível consultar o CEP agora.')
    }
  }

  const instValue = price ? (inst <= 10 ? price / inst : (price * (0.0199 * Math.pow(1.0199, inst))) / (Math.pow(1.0199, inst) - 1)) : 0

  return (
    <div className="pdp">
      <div className="pdp-visual">
        <div className="pdp-stage" style={{ ['--tint' as string]: colorObj?.hex }}>
          <AnimatePresence mode="wait">
            {view === 'foto' && mPhoto ? (
              <motion.div key={'foto' + colorObj?.id} className="pdp-flat pdp-photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Photo p={mPhoto} alt={`${m.name} ${colorObj?.name}`} priority sizes="(max-width: 960px) 92vw, 50vw" />
              </motion.div>
            ) : (
              <motion.div key="3d" className="pdp-canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Phone3D drive={drive} model={m} cam={m.cam} interactive shadow fov={28} glb={glbCandidates(m)} />
                <div className="pdp-tools">
                  <button
                    type="button"
                    className={`pdp-tool ${screenOn ? 'is-on' : ''}`}
                    onClick={() => setScreenOn((s) => !s)}
                    aria-pressed={screenOn}
                  >
                    <Power size={13} /> {screenOn ? 'Tela ligada' : 'Tela apagada'}
                  </button>
                  {m.front === 'island' && (
                    <button
                      type="button"
                      className={`pdp-tool ${islandOn ? 'is-on' : ''}`}
                      onClick={() => {
                        const next = !islandOn
                        setIslandOn(next)
                        if (next) {
                          setScreenOn(true)
                          if (view === 'back' || view === 'side') setView('front')
                        }
                      }}
                      aria-pressed={islandOn}
                    >
                      <Sparkles size={13} /> Dynamic Island
                    </button>
                  )}
                </div>
                <span className="pdp-hint"><Rotate3d size={14} /> Arraste para girar em 360°</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="seg seg-center" role="tablist" aria-label="Visualização">
          {([['3d', '3D'], ['front', 'Frente'], ['back', 'Traseira'], ['side', 'Lateral'], ...(mPhoto ? [['foto', 'Foto']] : [])] as ['3d', string][]).map(([v, l]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className={view === v ? 'is-on' : ''}
              onClick={() => {
                setView(v)
                drive.current.poseKey = (drive.current.poseKey ?? 0) + 1
              }}
            >
              {l}
            </button>
          ))}
          {m && explodeFor(m.id) && (
            <button className="seg-inside" onClick={() => setInside(true)} aria-haspopup="dialog">
              <Layers size={14} /> Explorar por dentro
            </button>
          )}
        </div>
        <AnimatePresence>
          {inside && m && explodeFor(m.id) && (
            <Suspense fallback={null}>
              <ExplodeModal title={m.name} config={explodeFor(m.id)!} tint={colorObj?.hex} onClose={() => setInside(false)} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      <div className="pdp-config">
        <motion.header className="pdp-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow">{m.year} · {m.chip}</p>
          <h1 className="h1">{m.name}</h1>
          <p className="muted">{m.screen}" · {m.cameras} · {m.connector}</p>
          {m.verify && <p className="note"><Info size={14} /> Lançamento recente: especificações em verificação com a documentação oficial.</p>}
          <p className="pdp-from">{units.length ? <>A partir de <strong>{brl(Math.min(...units.map(finalPrice)))}</strong> · {units.length} {units.length === 1 ? 'unidade disponível' : 'unidades disponíveis'}</> : 'Sem unidades disponíveis no momento.'}</p>
        </motion.header>

        {units.length === 0 ? (
          <div className="empty"><p>Nenhuma unidade deste modelo está à venda agora. Salve nos favoritos para acompanhar.</p><button className="btn btn-primary" onClick={() => toggleFav(m.id)}>{fav ? 'Salvo nos favoritos' : 'Salvar nos favoritos'}</button></div>
        ) : (
          <>
            <Step n={1} title="Condição">
              <div className="seg">
                {(['novo', 'seminovo'] as const).map((c) => (
                  <button key={c} disabled={!conds.includes(c)} className={cond === c ? 'is-on' : ''} onClick={() => setCond(c)}>{c === 'novo' ? 'Novo lacrado' : 'Seminovo'}</button>
                ))}
              </div>
            </Step>

            <Step n={2} title="Armazenamento" hint="Somente capacidades que existem para este modelo.">
              <div className="opts">
                {m.storages.map((s) => {
                  const ok = byCond.some((u) => u.storage === s)
                  const p = byCond.filter((u) => u.storage === s).map(finalPrice)
                  return (
                    <button key={s} disabled={!ok} className={`opt ${storage === s ? 'is-on' : ''}`} onClick={() => setStorage(s)}>
                      <strong>{storageLabel(s)}</strong>
                      <small>{ok ? `a partir de ${brl(Math.min(...p))}` : 'Indisponível'}</small>
                    </button>
                  )
                })}
              </div>
            </Step>

            <Step n={3} title={`Cor${colorObj ? ` — ${colorObj.name}` : ''}`}>
              <div className="swatches-lg">
                {m.colors.map((c) => {
                  const ok = byStorage.some((u) => u.colorId === c.id)
                  return (
                    <button key={c.id} disabled={!ok} className={`swl ${color === c.id ? 'is-on' : ''}`} onClick={() => setColor(c.id)} aria-label={`${c.name}${ok ? '' : ' — indisponível'}`}>
                      <span style={{ background: c.hex }} />
                      <small>{c.name}</small>
                    </button>
                  )
                })}
              </div>
            </Step>

            {cond === 'seminovo' && (
              <>
                <Step n={4} title="Saúde da bateria" hint="A saúde indica a capacidade máxima atual em relação a uma bateria nova. Abaixo de 85%, a autonomia diária tende a ser perceptivelmente menor.">
                  <div className="opts">
                    {BATTERY_BANDS.map((b) => {
                      const ok = byColor.some((u) => bandOf(u.battery).id === b.id)
                      return (
                        <button key={b.id} disabled={!ok} className={`opt ${band === b.id ? 'is-on' : ''}`} onClick={() => setBand(b.id)}>
                          <strong>{b.label}</strong>
                          <small>{ok ? `${byColor.filter((u) => bandOf(u.battery).id === b.id).length} un.` : 'Indisponível'}</small>
                        </button>
                      )
                    })}
                  </div>
                </Step>
                <Step n={5} title="Estado de conservação" hint="A classificação reflete a situação real; as fotos da unidade prevalecem.">
                  <div className="grades">
                    {GRADES.map((g) => {
                      const ok = byBand.some((u) => u.grade === g.id)
                      return (
                        <button key={g.id} disabled={!ok} className={`grade ${grade === g.id ? 'is-on' : ''}`} onClick={() => setGrade(g.id)}>
                          <span className="grade-tag">{g.id}</span>
                          <strong>{g.name}</strong>
                          <small>{g.desc}</small>
                        </button>
                      )
                    })}
                  </div>
                </Step>
              </>
            )}

            <Step n={cond === 'seminovo' ? 6 : 4} title="Escolha a unidade" hint="Cada linha é um aparelho físico do estoque.">
              <div className="units" role="radiogroup">
                {matches.map((u) => (
                  <UnitRow key={u.id} u={u} on={unit?.id === u.id} onClick={() => setUnitId(u.id)} />
                ))}
              </div>
            </Step>

            {unit && (
              <>
                <Step n={cond === 'seminovo' ? 7 : 5} title="Fotos reais do aparelho">
                  {uPhotos.length ? (
                    <>
                      <div className="photos">
                        {uPhotos.map((p, i) => (
                          <button key={p.path} className="photo photo-real" onClick={() => setLb(i)} aria-label={`Ampliar: ${p.label}`}>
                            <Photo p={p} alt={`${m.name} ${unit.id} — ${p.label}`} sizes="(max-width: 960px) 45vw, 12vw" />
                            <span className="photo-cap">{p.label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="note"><Camera size={14} /> Fotos desta unidade ({unit.id}), sem retoques. Toque para ampliar.</p>
                      <Lightbox list={uPhotos} index={lb} onIndex={setLb} onClose={() => setLb(null)} title={`${m.name} ${unit.id}`} />
                    </>
                  ) : (
                    <>
                      <div className="photos">
                        {(['front', 'back', 'side'] as const).map((v) => (
                          <figure key={v} className="photo">
                            <PhoneArt model={m} hex={colorObj!.hex} view={v} />
                            <figcaption>{v === 'front' ? 'Tela' : v === 'back' ? 'Traseira' : 'Laterais'}</figcaption>
                          </figure>
                        ))}
                        <figure className="photo photo-empty"><Camera size={22} strokeWidth={1.4} /><figcaption>Detalhes de marcas</figcaption></figure>
                      </div>
                      <p className="note"><Camera size={14} /> As fotos reais desta unidade ainda não foram enviadas. Enquanto isso, exibimos ilustrações.</p>
                    </>
                  )}
                </Step>

                <motion.section className="price-box" layout {...stepAnim}>
                  <div className="price-rows">
                    {breakdown(rules, unit).map((r, i) => (
                      <div key={r.label} className="price-row"><span>{r.label}</span><span>{r.value >= 0 && i > 0 ? '+' : ''}{brl(r.value)}</span></div>
                    ))}
                    {Math.abs(unit.price - breakdown(rules, unit).reduce((s, r) => s + r.value, 0)) >= 20 && <div className="price-row muted"><span>Ajuste do vendedor para esta unidade</span><span>{brl(unit.price - breakdown(rules, unit).reduce((s, r) => s + r.value, 0))}</span></div>}
                    {unit.promo > 0 && <div className="price-row hot"><span>Oferta −{unit.promo}%</span><span>−{brl(unit.price - finalPrice(unit))}</span></div>}
                  </div>
                  <div className="price-total">
                    <span>Total</span>
                    <AnimatePresence mode="popLayout"><motion.strong key={price} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>{brl(price!)}</motion.strong></AnimatePresence>
                  </div>
                  <p className="muted small">Valores demonstrativos — não são preços de mercado.</p>
                </motion.section>

                <motion.section className="summary" {...stepAnim}>
                  <h2 className="h3">Resumo</h2>
                  <dl className="dl">
                    <dt>Modelo</dt><dd>{m.name}</dd>
                    <dt>Cor</dt><dd>{colorObj?.name}</dd>
                    <dt>Capacidade</dt><dd>{storageLabel(unit.storage)}</dd>
                    <dt>Bateria</dt><dd><Battery value={unit.battery} size="sm" />{unit.batteryReplaced && <small className="muted"> · substituída</small>}</dd>
                    <dt>Conservação</dt><dd>{gradeName(unit.grade)}</dd>
                    <dt>Condição</dt><dd>{unit.condition === 'novo' ? 'Novo' : 'Seminovo'}</dd>
                    <dt>Unidade</dt><dd>{unit.id} · IMEI {unit.imeiMasked}</dd>
                    <dt>Garantia</dt><dd>{unit.warrantyMonths} meses pela loja</dd>
                  </dl>

                  <div className="sim">
                    <label className="f-label" htmlFor="inst">Parcelamento: <strong>{inst}x de {brl2(instValue)}</strong> {inst <= 10 ? 'sem juros' : `· total ${brl2(instValue * inst)} (1,99% a.m.)`}</label>
                    <input id="inst" type="range" min={1} max={12} value={inst} onChange={(e) => setInst(Number(e.target.value))} />
                    <p className="muted small">Pix: {brl(Math.round(price! * 0.95))} (5% de desconto) · simulação demonstrativa</p>
                  </div>

                  <div className="ship">
                    <label className="f-label" htmlFor="cep">Frete estimado</label>
                    <div className="row gap-s">
                      <input id="cep" className="input" inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))} />
                      <button className="btn btn-ghost" onClick={calcShip}><Truck size={16} /> Calcular</button>
                    </div>
                    {shipErr && <p className="err small">{shipErr}</p>}
                    {ship && <p className="small"><Check size={14} /> {ship.city}/{ship.uf}: {ship.price ? brl2(ship.price) : 'Frete grátis'} · {ship.days}</p>}
                  </div>

                  <div className="cta">
                    <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary btn-lg" disabled={inCart} onClick={() => addToCart(unit.id)}><ShoppingBag size={18} /> {inCart ? 'No carrinho' : 'Adicionar ao carrinho'}</motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} className="btn btn-dark btn-lg" onClick={() => { if (!inCart) addToCart(unit.id); nav('/checkout') }}><Zap size={18} /> Comprar agora</motion.button>
                    <div className="row gap-s">
                      <button className={`btn btn-ghost ${fav ? 'is-on' : ''}`} onClick={() => toggleFav(m.id)}><Heart size={16} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Salvo' : 'Favoritar'}</button>
                      <button className={`btn btn-ghost ${cmp ? 'is-on' : ''}`} onClick={() => toggleCompare(m.id)}><GitCompareArrows size={16} /> {cmp ? 'Comparando' : 'Comparar'}</button>
                      {compare.length > 1 && <Link className="btn btn-ghost" to="/comparar">Ver comparação ({compare.length})</Link>}
                    </div>
                  </div>
                  <p className="muted small"><ShieldCheck size={14} /> Garantia, cobertura e assistência descritas na página <Link to="/sobre">Sobre nós</Link>.</p>
                </motion.section>
              </>
            )}
          </>
        )}

        <motion.section className="specs" {...stepAnim}>
          <h2 className="h3">Ficha técnica</h2>
          <dl className="dl">
            <dt>Tela</dt><dd>{m.screen} polegadas</dd>
            <dt>Chip</dt><dd>{m.chip}</dd>
            <dt>Câmeras</dt><dd>{m.cameras}</dd>
            <dt>Conector</dt><dd>{m.connector}</dd>
            <dt>Peso</dt><dd>{m.weight ? `${m.weight} g` : '—'}</dd>
            <dt>Capacidades</dt><dd>{m.storages.map(storageLabel).join(', ')}</dd>
            <dt>Cores</dt><dd>{m.colors.map((c) => c.name).join(', ')}</dd>
            <dt>Recursos</dt><dd>{m.features.join(' · ')}</dd>
          </dl>
        </motion.section>
      </div>

      {similar.length > 0 && (
        <section className="rail container pdp-similar">
          <h2 className="h2">Na mesma faixa de preço</h2>
          <div className="grid-cards">{similar.map((s) => <ProductCard key={s.model.id} s={s} />)}</div>
        </section>
      )}
    </div>
  )
}

function UnitRow({ u, on, onClick }: { u: Unit; on: boolean; onClick: () => void }) {
  return (
    <button role="radio" aria-checked={on} className={`unit ${on ? 'is-on' : ''}`} onClick={onClick}>
      <span className="unit-id">{u.id}</span>
      <Battery value={u.battery} size="sm" />
      <span className="unit-grade">{u.condition === 'novo' ? 'Lacrado' : `Grau ${u.grade}`}</span>
      <span className="unit-price">{u.promo > 0 && <s>{brl(u.price)}</s>}<strong>{brl(finalPrice(u))}</strong></span>
    </button>
  )
}
