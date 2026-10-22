import { useId } from 'react'

// Símbolo original da Argento: esfera prateada com anel orbital e reflexo diagonal.
export function LogoMark({ size = 30 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id={`m${id}`} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" stopColor="#d9dbdf" />
          <stop offset=".62" stopColor="#a9adb4" />
          <stop offset="1" stopColor="#e8e9ec" />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8d9199" />
          <stop offset=".5" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#6f737b" />
        </linearGradient>
        <radialGradient id={`h${id}`} cx=".32" cy=".28" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="25" rx="22" ry="8.5" transform="rotate(-24 24 25)" fill="none" stroke={`url(#r${id})`} strokeWidth="2.2" />
      <circle cx="24" cy="24" r="14.5" fill={`url(#m${id})`} stroke="#7d8189" strokeWidth=".9" />
      <circle cx="24" cy="24" r="14.5" fill={`url(#h${id})`} />
      <path d="M12.5 31.5 C 18 22, 25 15.5, 35.5 12.8" fill="none" stroke="#8a8e96" strokeWidth="1.1" strokeLinecap="round" opacity=".75" />
      <path d="M12.9 32.4 C 18.4 23, 25.4 16.4, 35.8 13.6" fill="none" stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".9" />
      <path d="M41.5 17.5 A 22 8.5 -24 0 1 6.5 32.6" fill="none" stroke={`url(#r${id})`} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={compact ? 28 : 32} />
      <span className="logo-word">argento</span>
    </span>
  )
}
