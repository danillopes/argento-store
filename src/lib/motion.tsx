import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null
export const getLenis = () => lenisInstance

// Lenis + ScrollTrigger sincronizados no mesmo ticker (sem travamentos)
export function SmoothScroll() {
  const loc = useLocation()
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.1 })
    lenisInstance = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
  useEffect(() => {
    if (lenisInstance) lenisInstance.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
    const t = setTimeout(() => ScrollTrigger.refresh(), 120)
    return () => clearTimeout(t)
  }, [loc.pathname])
  return null
}

// ---------- Animação de seleção: o card se expande até abrir o configurador ----------
interface Expand { rect: DOMRect; color: string; to: string }
const inset = (r: DOMRect, rad: number) => `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${rad}px)`
const ExpandCtx = createContext<(e: React.MouseEvent<HTMLElement>, to: string, color: string) => void>(() => {})
export const useExpandNav = () => useContext(ExpandCtx)

export function ExpandProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Expand | null>(null)
  const [phase, setPhase] = useState<'grow' | 'fade'>('grow')
  const nav = useNavigate()
  const busy = useRef(false)

  const start = useCallback(
    (e: React.MouseEvent<HTMLElement>, to: string, color: string) => {
      if (busy.current) return
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nav(to)
        return
      }
      busy.current = true
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setPhase('grow')
      setState({ rect, color, to })
    },
    [nav],
  )

  return (
    <ExpandCtx.Provider value={start}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            key="expand"
            className="expand-layer"
            style={{ background: `radial-gradient(120% 90% at 50% 30%, ${state.color}, var(--bg) 70%)` }}
            initial={{ clipPath: inset(state.rect, 28), opacity: 1 }}
            animate={phase === 'grow' ? { clipPath: 'inset(0px 0px 0px 0px round 0px)' } : { opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: phase === 'grow' ? 0.55 : 0.4, ease: [0.76, 0, 0.24, 1] }}
            onAnimationComplete={() => {
              if (phase === 'grow') {
                nav(state.to)
                setPhase('fade')
              } else {
                setState(null)
                busy.current = false
              }
            }}
          />
        )}
      </AnimatePresence>
    </ExpandCtx.Provider>
  )
}

export { gsap, ScrollTrigger }
