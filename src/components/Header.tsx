import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Home, Smartphone, RefreshCcw, Tag, Info, Search, Heart, User, ShoppingBag, Menu, X, Moon, Sun } from 'lucide-react'
import { Logo } from './Logo'
import { useStore } from '../store/Store'
import { searchModels } from '../lib/search'
import PhoneArt from './PhoneArt'

const NAV = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/iphones', label: 'iPhones', icon: Smartphone },
  { to: '/seminovos', label: 'Seminovos', icon: RefreshCcw },
  { to: '/ofertas', label: 'Ofertas', icon: Tag },
  { to: '/sobre', label: 'Sobre nós', icon: Info },
]

// mola criticamente amortecida (sem overshoot), resposta ~0.35 s
const spring = { type: 'spring', bounce: 0, duration: 0.35 } as const

function SearchBox({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const nav = useNavigate()
  const results = useMemo(() => {
    return searchModels(q).slice(0, 6)
  }, [q])

  const go = (path: string) => {
    nav(path)
    setQ('')
    setFocus(false)
    onDone?.()
  }

  return (
    <motion.form
      className={`hdr-search ${focus ? 'is-focus' : ''}`}
      role="search"
      animate={{ width: focus ? 280 : 210 }}
      transition={spring}
      onSubmit={(e) => {
        e.preventDefault()
        go(`/iphones?q=${encodeURIComponent(q)}`)
      }}
    >
      <Search size={16} strokeWidth={1.6} aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder="Buscar iPhone..."
        aria-label="Buscar iPhone"
        autoFocus={autoFocus}
      />
      <AnimatePresence>
        {focus && results.length > 0 && (
          <motion.ul
            className="hdr-suggest"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {results.map((m) => (
              <li key={m.id}>
                <button type="button" onMouseDown={() => go(`/produto/${m.id}`)}>
                  <PhoneArt model={m} hex={m.colors[0].hex} className="sug-art" />
                  <span>
                    <strong>{m.name}</strong>
                    <small>{m.chip} · {m.screen}"</small>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.form>
  )
}

export default function Header() {
  const { cart, favorites, theme, toggleTheme } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [mSearch, setMSearch] = useState(false)
  const { scrollY } = useScroll()
  const loc = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24))
  useEffect(() => {
    setOpen(false)
    setMSearch(false)
  }, [loc.pathname])

  return (
    <motion.header
      className={`hdr ${scrolled ? 'is-scrolled' : ''}`}
      initial={false}
      animate={{ height: scrolled ? 60 : 70 }}
      transition={spring}
    >
      <div className="hdr-inner">
        <Link to="/" className="hdr-logo" aria-label="Argento — início">
          <Logo />
        </Link>

        <nav className="hdr-nav" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="hdr-link">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill" className="hdr-pill" transition={spring} />}
                  <Icon size={16} strokeWidth={1.6} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hdr-actions">
          <div className="only-desk"><SearchBox /></div>
          <button className="hdr-icon only-mob" aria-label="Buscar" onClick={() => setMSearch((v) => !v)}>
            <Search size={19} strokeWidth={1.6} />
          </button>
          <button className="hdr-icon only-desk" aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={toggleTheme}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} style={{ display: 'grid' }}>
                {theme === 'dark' ? <Sun size={19} strokeWidth={1.6} /> : <Moon size={19} strokeWidth={1.6} />}
              </motion.span>
            </AnimatePresence>
          </button>
          <Link to="/favoritos" className="hdr-icon only-desk" aria-label={`Favoritos (${favorites.length})`}>
            <Heart size={19} strokeWidth={1.6} />
            {favorites.length > 0 && <span className="hdr-dot" />}
          </Link>
          <Link to="/conta" className="hdr-icon only-desk" aria-label="Minha conta">
            <User size={19} strokeWidth={1.6} />
          </Link>
          <Link to="/carrinho" className="hdr-icon" aria-label={`Carrinho com ${cart.length} itens`}>
            <ShoppingBag size={19} strokeWidth={1.6} />
            <AnimatePresence>
              {cart.length > 0 && (
                <motion.span key={cart.length} className="hdr-badge" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring}>
                  {cart.length}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button className="hdr-icon only-mob" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={21} strokeWidth={1.6} /> : <Menu size={21} strokeWidth={1.6} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mSearch && (
          <motion.div className="hdr-msearch only-mob" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <SearchBox autoFocus onDone={() => setMSearch(false)} />
          </motion.div>
        )}
        {open && (
          <motion.div
            ref={panelRef}
            className="hdr-panel only-mob"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {NAV.map(({ to, label, icon: Icon }, i) => (
              <motion.div key={to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                <NavLink to={to} end={to === '/'} className="panel-link">
                  <Icon size={18} strokeWidth={1.6} /> {label}
                </NavLink>
              </motion.div>
            ))}
            <div className="panel-row">
              <Link to="/favoritos" className="panel-chip"><Heart size={16} strokeWidth={1.6} /> Favoritos</Link>
              <Link to="/conta" className="panel-chip"><User size={16} strokeWidth={1.6} /> Conta</Link>
              <button className="panel-chip" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={16} strokeWidth={1.6} /> : <Moon size={16} strokeWidth={1.6} />} Tema
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
