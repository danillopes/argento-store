import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Photo, { type PhotoInfo } from './Photo'
import { getLenis } from '../lib/motion'

// Visualização ampliada: setas, teclado, arraste lateral e fechar ao tocar fora
export default function Lightbox({ list, index, onIndex, onClose, title }: { list: PhotoInfo[]; index: number | null; onIndex: (i: number) => void; onClose: () => void; title: string }) {
  const open = index != null
  const go = (d: number) => index != null && onIndex((index + d + list.length) % list.length)

  useEffect(() => {
    if (!open) return
    getLenis()?.stop()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      getLenis()?.start()
    }
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="lb" role="dialog" aria-modal="true" aria-label={`Fotos — ${title}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <button className="lb-btn lb-close" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
          {list.length > 1 && <button className="lb-btn lb-prev" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1) }}><ChevronLeft size={22} /></button>}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.figure
              key={index}
              className="lb-fig"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              drag={list.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={(_, i) => { const proj = i.offset.x + i.velocity.x * 0.2; if (proj < -80) go(1); else if (proj > 80) go(-1) }}
              onClick={(e) => e.stopPropagation()}
            >
              <Photo p={list[index]} alt={`${title} — ${list[index].label ?? ''}`} sizes="92vw" priority />
              <figcaption>{list[index].label} · {index + 1}/{list.length}</figcaption>
            </motion.figure>
          </AnimatePresence>
          {list.length > 1 && <button className="lb-btn lb-next" aria-label="Próxima" onClick={(e) => { e.stopPropagation(); go(1) }}><ChevronRight size={22} /></button>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
