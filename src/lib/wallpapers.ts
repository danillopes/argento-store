// Papel de parede de cada geração de iPhone, desenhado em canvas e tingido com a cor que o cliente escolheu.
//
// As formas vêm do papel de parede que a Apple põe de fábrica em cada linha — dá para conferir nas próprias
// fotos de catálogo, que mostram a tela de cada modelo. O desenho é nosso; o que se repete é o gesto de cada
// geração, para o 3D não mostrar a mesma tela em todos os aparelhos.
export interface Tinta {
  primary: string
  secondary: string
  glow: string
  deep: string
  isLight: boolean
}

type Papel = (g: CanvasRenderingContext2D, CW: number, CH: number, t: Tinta) => void

const claro = (a: number) => `rgba(255,255,255,${a})`

// Ladrilho de ruído, montado uma vez e reaproveitado. A tela é redesenhada a cada quadro enquanto a Dynamic
// Island se mexe; sorteio novo a cada quadro faria o granulado piscar, e um ladrilho fixo não pisca nem custa.
let ladrilho: CanvasPattern | null | undefined
function granulado(g: CanvasRenderingContext2D) {
  if (ladrilho !== undefined) return ladrilho
  const c = document.createElement('canvas')
  c.width = c.height = 96
  const gg = c.getContext('2d')
  if (!gg) return (ladrilho = null)
  let semente = 20240917
  const sorteio = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 900; i++) {
    gg.fillStyle = i % 2 ? '#fff' : '#000'
    gg.fillRect(sorteio() * 96, sorteio() * 96, 1.6, 1.6)
  }
  return (ladrilho = g.createPattern(c, 'repeat'))
}
const escuro = (a: number) => `rgba(5,6,12,${a})`

// iPhone 12 · iOS 14 — círculos concêntricos translúcidos, o núcleo claro fora do centro
const doze: Papel = (g, CW, CH, t) => {
  const fundo = g.createLinearGradient(0, 0, CW, CH)
  fundo.addColorStop(0, '#ebd7c4')
  fundo.addColorStop(0.45, t.secondary)
  fundo.addColorStop(1, t.primary)
  g.fillStyle = fundo
  g.fillRect(0, 0, CW, CH)
  for (const [cx, cy, r, c0, c1, c2, traco] of [
    [256, 545, 385, claro(0.28), t.glow, claro(0.85), 0.55],
    [224, 575, 305, t.primary, t.glow, 'rgba(255,225,185,0.92)', 0.45],
    [208, 560, 212, t.deep, t.primary, t.glow, 0.5],
    [268, 585, 138, t.primary, t.glow, '#ffe3b8', 0.6],
  ] as const) {
    g.beginPath()
    g.arc(cx, cy, r, 0, Math.PI * 2)
    const rg = g.createRadialGradient(cx - r * 0.24, cy - r * 0.18, r * 0.05, cx, cy, r)
    rg.addColorStop(0, c0)
    rg.addColorStop(0.64, c1)
    rg.addColorStop(1, c2)
    g.fillStyle = rg
    g.fill()
    g.strokeStyle = claro(traco)
    g.lineWidth = 2
    g.stroke()
  }
}

// iPhone 13 · iOS 15 — a diagonal: um canto claro em cima, a faixa funda no meio, o degradê quente embaixo
const treze: Papel = (g, CW, CH, t) => {
  const faixa = (pts: [number, number][], de: string, para: string, p0: [number, number], p1: [number, number]) => {
    g.beginPath()
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    const lg = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1])
    lg.addColorStop(0, de)
    lg.addColorStop(1, para)
    g.fillStyle = lg
    g.fill()
  }
  faixa([[0, 0], [CW, 0], [CW, CH], [0, CH]], t.deep, escuro(1), [0, 0], [0, CH])
  // canto de cima, do lado claro da diagonal
  faixa([[0, 0], [CW, 0], [0, CH * 0.62]], t.glow, t.primary, [0, 0], [CW * 0.7, CH * 0.5])
  // base quente, do outro lado
  faixa([[CW, CH * 0.34], [CW, CH], [0, CH]], t.primary, t.glow, [CW * 0.2, CH], [CW, CH * 0.4])
  // brilho fino acompanhando o corte
  g.save()
  g.globalCompositeOperation = 'screen'
  const borda = g.createLinearGradient(0, CH * 0.62, CW, CH * 0.34)
  borda.addColorStop(0, 'rgba(0,0,0,0)')
  borda.addColorStop(0.5, claro(0.18))
  borda.addColorStop(1, 'rgba(0,0,0,0)')
  g.strokeStyle = borda
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(0, CH * 0.62)
  g.lineTo(CW, CH * 0.34)
  g.stroke()
  g.restore()
}

// iPhone 14 · iOS 16 — blocos orgânicos que se cruzam, cada um com o seu degradê
const catorze: Papel = (g, CW, CH, t) => {
  g.fillStyle = t.deep
  g.fillRect(0, 0, CW, CH)
  const bloco = (cx: number, cy: number, rx: number, ry: number, giro: number, de: string, para: string) => {
    g.save()
    g.translate(cx, cy)
    g.rotate(giro)
    g.beginPath()
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    const lg = g.createLinearGradient(-rx, -ry, rx, ry)
    lg.addColorStop(0, de)
    lg.addColorStop(1, para)
    g.fillStyle = lg
    g.fill()
    g.restore()
  }
  bloco(190, 215, 300, 230, -0.5, t.glow, t.primary)
  bloco(430, 470, 250, 300, 0.45, claro(0.55), t.glow)
  bloco(150, 830, 300, 250, 0.35, t.primary, t.secondary)
  bloco(430, 1010, 240, 220, -0.3, t.glow, t.primary)
}

// iPhone 15 · iOS 17 — pedras foscas, claras, levemente granuladas
const quinze: Papel = (g, CW, CH, t) => {
  const fundo = g.createLinearGradient(0, 0, CW, CH)
  fundo.addColorStop(0, t.isLight ? claro(0.92) : t.glow)
  fundo.addColorStop(1, t.primary)
  g.fillStyle = fundo
  g.fillRect(0, 0, CW, CH)
  for (const [cx, cy, rx, ry, giro, luz] of [
    [300, 420, 215, 265, -0.25, 0.5],
    [205, 760, 230, 270, 0.3, 0.38],
  ] as const) {
    g.save()
    g.translate(cx, cy)
    g.rotate(giro)
    g.beginPath()
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    const rg = g.createRadialGradient(-rx * 0.3, -ry * 0.35, 12, 0, 0, rx * 1.2)
    rg.addColorStop(0, claro(luz + 0.3))
    rg.addColorStop(0.55, t.glow)
    rg.addColorStop(1, t.secondary)
    g.fillStyle = rg
    g.fill()
    g.restore()
  }
  // granulado fino, que é o que dá o aspecto fosco
  const grao = granulado(g)
  if (grao) {
    g.save()
    g.globalAlpha = 0.05
    g.fillStyle = grao
    g.fillRect(0, 0, CW, CH)
    g.restore()
  }
}

// iPhone 16 · iOS 18 — dois funis simétricos, claros no miolo e fundos na borda
const dezesseis: Papel = (g, CW, CH, t) => {
  // em cor clara o papel de parede é claro com o funil escuro; em cor escura é o contrário
  g.fillStyle = t.isLight ? claro(0.86) : t.deep
  g.fillRect(0, 0, CW, CH)
  for (const cy of [CH * 0.3, CH * 0.74]) {
    const rg = g.createRadialGradient(CW / 2, cy, 6, CW / 2, cy, CW * 0.8)
    rg.addColorStop(0, t.isLight ? t.deep : claro(0.95))
    rg.addColorStop(0.1, t.glow)
    rg.addColorStop(0.34, t.primary)
    rg.addColorStop(0.72, t.secondary)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = rg
    g.fillRect(0, 0, CW, CH)
  }
  // a cintura entre os dois funis, que é o que fecha o desenho
  const cinta = g.createLinearGradient(0, CH * 0.42, 0, CH * 0.62)
  cinta.addColorStop(0, 'rgba(0,0,0,0)')
  cinta.addColorStop(0.5, t.isLight ? claro(0.5) : escuro(0.62))
  cinta.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = cinta
  g.fillRect(0, CH * 0.42, CW, CH * 0.2)
}

// iPhone 17 · iOS 26 — a flor de vidro: pétalas translúcidas saindo do centro
const dezessete: Papel = (g, CW, CH, t) => {
  const fundo = g.createLinearGradient(0, 0, 0, CH)
  fundo.addColorStop(0, t.isLight ? claro(0.92) : t.glow)
  fundo.addColorStop(0.5, t.primary)
  fundo.addColorStop(1, t.secondary)
  g.fillStyle = fundo
  g.fillRect(0, 0, CW, CH)
  const cx = CW / 2, cy = CH * 0.47
  g.save()
  g.translate(cx, cy)
  // numa cor clara o branco some no fundo: ali a pétala escurece em vez de iluminar
  g.globalCompositeOperation = t.isLight ? 'multiply' : 'screen'
  const forte = t.isLight ? t.secondary : claro(0.46)
  const fraco = t.isLight ? t.primary : t.glow
  for (let i = 0; i < 12; i++) {
    const comp = i % 2 ? 350 : 255
    g.save()
    g.rotate((i / 12) * Math.PI * 2)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(96, -comp * 0.5, 0, -comp)
    g.quadraticCurveTo(-96, -comp * 0.5, 0, 0)
    const pg = g.createLinearGradient(0, 0, 0, -comp)
    pg.addColorStop(0, i % 2 ? forte : fraco)
    pg.addColorStop(0.6, i % 2 ? fraco : forte)
    pg.addColorStop(1, t.isLight ? claro(1) : 'rgba(0,0,0,0)')
    g.fillStyle = pg
    g.fill()
    g.restore()
  }
  g.restore()
  // miolo luminoso por cima, sem mistura, para a flor ter um centro
  const miolo = g.createRadialGradient(cx, cy, 4, cx, cy, 170)
  miolo.addColorStop(0, claro(t.isLight ? 0.95 : 0.8))
  miolo.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = miolo
  g.beginPath()
  g.arc(cx, cy, 170, 0, Math.PI * 2)
  g.fill()
}

// iPhone 18 — fitas dobradas, em relevo suave, uma embaixo da outra
const dezoito: Papel = (g, CW, CH, t) => {
  const rg = g.createRadialGradient(390, 250, 10, 360, 280, 440)
  rg.addColorStop(0, claro(0.52))
  rg.addColorStop(0.4, t.glow)
  rg.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, CW, CH)
  for (let i = 0; i < 3; i++) {
    const y0 = 370 + i * 135
    g.beginPath()
    g.moveTo(-30, y0)
    g.bezierCurveTo(160, y0 - 130, 350, y0 + 130, 542, y0 - 30)
    g.lineTo(542, y0 + 150)
    g.bezierCurveTo(350, y0 + 270, 160, y0 + 20, -30, y0 + 140)
    g.closePath()
    const lg = g.createLinearGradient(0, y0 - 80, CW, y0 + 180)
    lg.addColorStop(0, claro(0.32 - i * 0.07))
    lg.addColorStop(0.55, i % 2 === 0 ? t.glow : t.primary)
    lg.addColorStop(1, escuro(0.05))
    g.fillStyle = lg
    g.fill()
  }
}

export const WALLPAPERS: Record<number, Papel> = {
  12: doze,
  13: treze,
  14: catorze,
  15: quinze,
  16: dezesseis,
  17: dezessete,
  18: dezoito,
}
