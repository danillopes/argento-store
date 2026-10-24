import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import Footer from './components/Footer'
import { lazy, Suspense } from 'react'
import Home from './pages/Home'

// Cada página só é baixada quando o visitante chega nela
const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Admin = lazy(() => import('./pages/Admin'))
const Lancamento18Pro = lazy(() => import('./pages/Lancamento18Pro'))
const shop = () => import('./pages/Shop')
const About = lazy(() => shop().then((m) => ({ default: m.About })))
const Account = lazy(() => shop().then((m) => ({ default: m.Account })))
const Cart = lazy(() => shop().then((m) => ({ default: m.Cart })))
const Checkout = lazy(() => shop().then((m) => ({ default: m.Checkout })))
const Compare = lazy(() => shop().then((m) => ({ default: m.Compare })))
const Favorites = lazy(() => shop().then((m) => ({ default: m.Favorites })))

// pré-carrega as páginas mais prováveis quando o navegador estiver ocioso
if (typeof window !== 'undefined') {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2500))
  idle(() => { import('./pages/Product'); import('./pages/Catalog') })
}
import { ExpandProvider, SmoothScroll } from './lib/motion'
import { useStore } from './store/Store'

function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className="toast" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}>{t.text}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const loc = useLocation()
  const isAdmin = loc.pathname.startsWith('/admin')
  return (
    <ExpandProvider>
      <SmoothScroll />
      {!isAdmin && <Header />}
      <main id="conteudo" className={isAdmin ? undefined : 'has-hdr'}>
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/iphones" element={<Catalog key="todos" />} />
          <Route path="/seminovos" element={<Catalog key="semi" mode="seminovos" />} />
          <Route path="/ofertas" element={<Catalog key="ofertas" mode="ofertas" />} />
          <Route path="/produto/:id" element={<Product />} />
          <Route path="/comparar" element={<Compare />} />
          <Route path="/favoritos" element={<Favorites />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/conta" element={<Account />} />
          <Route path="/lancamento" element={<Lancamento18Pro />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      <Toasts />
    </ExpandProvider>
  )
}
