const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * t)
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')
}

// Cor do aparelho na posição `pos` da paleta (0 = primeira cor, 1 = segunda, 1,5 = meio do caminho entre a segunda e a
// terceira). É só conta, sem estado nem animação própria: a cor muda no mesmo quadro em que o scroll move, sem atraso.
export function colorAt(palette: string[], pos: number) {
  const ultimo = palette.length - 1
  if (ultimo < 1) return palette[0]
  const p = Math.max(0, Math.min(ultimo, pos))
  const i = Math.min(ultimo - 1, Math.floor(p))
  return mixHex(palette[i], palette[i + 1], p - i)
}

export function batteryPercent(time: number) {
  return Math.round(Math.max(0, Math.min(1, (time - 5) / 0.9)) * 97)
}

// Mola da Dynamic Island, ajustada quadro a quadro em gravações de tela do iPhone (vídeos do Daniel, 120 fps):
// abrir leva ~0,18 s até o tamanho final, passa menos de 1% e volta; fechar é mais rápido, ~0,13 s, e não passa do
// ponto. Guardamos a velocidade entre os quadros, então o movimento tem impulso de verdade, não só uma aproximação.
const ABRIR = { freq: 27.5, amort: 0.86 }
const FECHAR = { freq: 50, amort: 1 }

export function avancarIlha(valor: number, velocidade: number, alvo: number, dt: number): [number, number] {
  // o alvo é cheio (abrindo) ou vazio (fechando); a mola é a mesma do começo ao fim, inclusive na passadinha
  const { freq, amort } = alvo > 0.5 ? ABRIR : FECHAR
  let resta = Math.min(Math.max(dt, 0), 0.1)
  while (resta > 0) {
    const passo = Math.min(resta, 1 / 240) // sub-passo fixo: a mola fica igual em qualquer taxa de quadros
    velocidade += (-2 * amort * freq * velocidade - freq * freq * (valor - alvo)) * passo
    valor += velocidade * passo
    resta -= passo
  }
  // encosta no alvo quando a sobra é imperceptível, senão o canvas da tela fica redesenhando à toa
  if (Math.abs(valor - alvo) < 0.0015 && Math.abs(velocidade) < 0.02) return [alvo, 0]
  return [valor, velocidade]
}
