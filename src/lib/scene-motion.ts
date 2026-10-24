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
