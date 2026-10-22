import { useId } from 'react'
import type { PhoneModel } from '../data/models'

// Ilustração vetorial original do aparelho (não é foto oficial).
// Os layouts de câmera seguem o arranjo de cada geração para facilitar a identificação.

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt } else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt }
  return `rgb(${r | 0},${g | 0},${b | 0})`
}
export const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150
}

type View = 'back' | 'front' | 'side'

export default function PhoneArt({ model, hex, view = 'back', className, style }: { model: PhoneModel; hex: string; view?: View; className?: string; style?: React.CSSProperties }) {
  const uid = useId().replace(/:/g, '')
  const w = model.tier === 'mini' ? 182 : model.tier === 'promax' || model.tier === 'plus' ? 200 : 192
  const h = 400
  const x0 = (200 - w) / 2
  const rad = model.family >= 16 ? 34 : model.family <= 14 && model.cam !== 'tri' ? 30 : 32
  const frame = model.tier === 'pro' || model.tier === 'promax' ? shade(hex, isLight(hex) ? -0.18 : 0.18) : shade(hex, -0.08)

  if (view === 'side') {
    return (
      <svg viewBox="0 0 200 400" className={className} style={style} role="img" aria-label={`${model.name} — lateral (ilustração)`}>
        <defs>
          <linearGradient id={`s${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor={shade(frame, -0.3)} />
            <stop offset=".45" stopColor={shade(frame, 0.35)} />
            <stop offset="1" stopColor={shade(frame, -0.25)} />
          </linearGradient>
        </defs>
        <rect x={model.tier === 'air' ? 94 : 88} y="2" width={model.tier === 'air' ? 12 : 24} height="396" rx={model.tier === 'air' ? 6 : 12} fill={`url(#s${uid})`} />
        <rect x={model.tier === 'air' ? 92 : 85} y="96" width="4" height="34" rx="2" fill={shade(frame, -0.2)} />
        <rect x={model.tier === 'air' ? 92 : 85} y="144" width="4" height="52" rx="2" fill={shade(frame, -0.2)} />
        <rect x={model.tier === 'air' ? 92 : 85} y="206" width="4" height="52" rx="2" fill={shade(frame, -0.2)} />
      </svg>
    )
  }

  if (view === 'front') {
    const sx = x0 + 7, sy = 7, sw = w - 14, sh = h - 14
    return (
      <svg viewBox="0 0 200 400" className={className} style={style} role="img" aria-label={`${model.name} — frente (ilustração)`}>
        <defs>
          <linearGradient id={`w${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shade(hex, isLight(hex) ? -0.35 : 0.25)} />
            <stop offset=".55" stopColor={shade(hex, -0.55)} />
            <stop offset="1" stopColor="#050506" />
          </linearGradient>
          <radialGradient id={`g${uid}`} cx=".75" cy=".2" r=".7">
            <stop offset="0" stopColor="#fff" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x={x0} y="0" width={w} height={h} rx={rad} fill={frame} />
        <rect x={x0 + 3} y="3" width={w - 6} height={h - 6} rx={rad - 3} fill="#050506" />
        <rect x={sx} y={sy} width={sw} height={sh} rx={rad - 7} fill={`url(#w${uid})`} />
        <rect x={sx} y={sy} width={sw} height={sh} rx={rad - 7} fill={`url(#g${uid})`} />
        <text x="100" y="92" textAnchor="middle" fill="#fff" opacity=".92" fontSize="44" fontWeight="300" fontFamily="Inter, system-ui">9:41</text>
        <text x="100" y="58" textAnchor="middle" fill="#fff" opacity=".7" fontSize="10" fontFamily="Inter, system-ui">quinta, 22 de outubro</text>
        {model.front === 'notch' ? (
          <path d={`M${100 - 38} ${sy} h76 v6 a12 12 0 0 1 -12 12 h-52 a12 12 0 0 1 -12 -12z`} fill="#050506" />
        ) : (
          <rect x="78" y="16" width="44" height="13" rx="6.5" fill="#050506" />
        )}
        <rect x="74" y="384" width="52" height="3" rx="1.5" fill="#fff" opacity=".6" />
      </svg>
    )
  }

  // ---- traseira ----
  const lens = (cx: number, cy: number, r: number, k: string) => (
    <g key={k}>
      <circle cx={cx} cy={cy} r={r + 2.6} fill={shade(frame, -0.15)} />
      <circle cx={cx} cy={cy} r={r + 1.2} fill="#0a0a0c" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#14161c" />
      <circle cx={cx} cy={cy} r={r * 0.34} fill="#223" />
      <circle cx={cx - r * 0.28} cy={cy - r * 0.3} r={r * 0.16} fill="#9ab" opacity=".55" />
    </g>
  )
  const mod = shade(hex, isLight(hex) ? -0.06 : 0.08)
  const cams: React.ReactNode[] = []
  const L = x0 + 12
  switch (model.cam) {
    case 'vert2':
      cams.push(<rect key="m" x={L} y="12" width="68" height="76" rx="20" fill={mod} stroke={shade(hex, -0.12)} strokeWidth=".8" />)
      cams.push(lens(L + 22, 32, 11, 'a'), lens(L + 22, 68, 11, 'b'))
      cams.push(<circle key="f" cx={L + 52} cy="50" r="5" fill="#f4e7c8" opacity=".9" />)
      break
    case 'diag2':
      cams.push(<rect key="m" x={L} y="12" width="76" height="76" rx="22" fill={mod} stroke={shade(hex, -0.12)} strokeWidth=".8" />)
      cams.push(lens(L + 22, 34, 12, 'a'), lens(L + 54, 66, 12, 'b'))
      cams.push(<circle key="f" cx={L + 56} cy="30" r="5" fill="#f4e7c8" opacity=".9" />)
      break
    case 'pill2':
      cams.push(<rect key="m" x={L} y="12" width="44" height="92" rx="22" fill={mod} stroke={shade(hex, -0.12)} strokeWidth=".8" />)
      cams.push(lens(L + 22, 36, 13, 'a'), lens(L + 22, 80, 13, 'b'))
      cams.push(<circle key="f" cx={L + 58} cy="32" r="5" fill="#f4e7c8" opacity=".9" />)
      break
    case 'single':
      cams.push(lens(L + 22, 34, 13, 'a'))
      cams.push(<circle key="f" cx={L + 50} cy="30" r="4" fill="#f4e7c8" opacity=".9" />)
      break
    case 'tri':
      cams.push(<rect key="m" x={L} y="12" width="96" height="96" rx="26" fill={mod} stroke={shade(hex, -0.14)} strokeWidth=".8" />)
      cams.push(lens(L + 26, 36, 15, 'a'), lens(L + 26, 84, 15, 'b'), lens(L + 68, 60, 15, 'c'))
      cams.push(<circle key="f" cx={L + 72} cy="26" r="6" fill="#f4e7c8" opacity=".9" />)
      cams.push(<circle key="l" cx={L + 72} cy="94" r="6" fill="#111" />)
      break
    case 'air':
      cams.push(<rect key="m" x={x0 + 8} y="14" width={w - 16} height="48" rx="24" fill={shade(hex, isLight(hex) ? -0.1 : 0.12)} />)
      cams.push(lens(x0 + 38, 38, 13, 'a'))
      cams.push(<circle key="f" cx={x0 + 72} cy="38" r="5" fill="#f4e7c8" opacity=".9" />)
      cams.push(<circle key="mic" cx={x0 + w - 30} cy="38" r="2" fill="#111" />)
      break
    case 'plateau':
      cams.push(<rect key="m" x={x0 + 4} y="8" width={w - 8} height="112" rx="28" fill={shade(hex, isLight(hex) ? -0.08 : 0.1)} />)
      cams.push(lens(L + 26, 36, 15, 'a'), lens(L + 26, 88, 15, 'b'), lens(L + 68, 62, 15, 'c'))
      cams.push(<circle key="f" cx={x0 + w - 40} cy="38" r="6" fill="#f4e7c8" opacity=".9" />)
      cams.push(<circle key="l" cx={x0 + w - 40} cy="84" r="6" fill="#111" />)
      break
  }

  return (
    <svg viewBox="0 0 200 400" className={className} style={style} role="img" aria-label={`${model.name} — traseira (ilustração)`}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(hex, 0.16)} />
          <stop offset=".5" stopColor={hex} />
          <stop offset="1" stopColor={shade(hex, -0.14)} />
        </linearGradient>
        <linearGradient id={`h${uid}`} x1="0" y1="0" x2="1" y2=".35">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={x0} y="0" width={w} height={h} rx={rad} fill={frame} />
      <rect x={x0 + 2.5} y="2.5" width={w - 5} height={h - 5} rx={rad - 2.5} fill={`url(#b${uid})`} />
      <rect x={x0 + 2.5} y="2.5" width={w - 5} height={h - 5} rx={rad - 2.5} fill={`url(#h${uid})`} />
      {cams}
      {/* símbolo genérico — sem marca de terceiros */}
      <circle cx="100" cy="210" r="16" fill="none" stroke={shade(hex, isLight(hex) ? -0.12 : 0.14)} strokeWidth="1.2" opacity=".6" />
    </svg>
  )
}
