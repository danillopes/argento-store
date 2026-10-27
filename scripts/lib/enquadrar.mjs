// Enquadra as fotos de catálogo: tira a margem branca que sobra em volta dos aparelhos e devolve todas no mesmo
// recorte, para o card da vitrine mostrar a foto de ponta a ponta sem esticar nada.
//
// Duas regras guiam o recorte:
//  1. o recorte é o MESMO para todas as fotos (a união das áreas ocupadas), senão um 12 mini recortado justo
//     apareceria do tamanho de um Pro Max e o catálogo perderia a noção de tamanho entre os modelos;
//  2. uma foto que veio em outro tamanho de tela (acontece quando a Apple troca o arquivo) é reescalada para a
//     escala das outras cores do mesmo modelo antes de entrar na conta.
import sharp from 'sharp'

const FUNDO = 244 // acima disto em R, G e B já é o branco do fundo da Apple
const FOLGA = 0.012 // respiro em volta, em fração da largura da tela
const SOBRA = 1024 // margem de trabalho para encaixar fotos que vieram maiores que a tela de referência

// Área ocupada pelo aparelho (ignora fundo branco e pixels transparentes).
export async function medir(entrada) {
  const img = sharp(entrada, { failOn: 'none' }).rotate()
  const { width, height } = await img.metadata()
  const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const canais = info.channels
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * canais
      const transparente = data[i + 3] < 16
      const branco = data[i] > FUNDO && data[i + 1] > FUNDO && data[i + 2] > FUNDO
      if (transparente || branco) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return { tela: [width, height], caixa: [0, 0, width - 1, height - 1] }
  return { tela: [width, height], caixa: [x0, y0, x1, y1] }
}

const media = (ns) => ns.reduce((s, n) => s + n, 0) / ns.length

// Recebe [{ chave, modelo, entrada }] e devolve um Map chave → Buffer já recortado, todos no mesmo enquadramento.
export async function enquadrarCatalogo(itens) {
  const medidas = new Map()
  for (const it of itens) medidas.set(it.chave, await medir(it.entrada))

  // tela dominante: a que a maioria das fotos usa, e que define a escala de referência
  const contagem = new Map()
  for (const m of medidas.values()) {
    const k = m.tela.join('x')
    contagem.set(k, (contagem.get(k) ?? 0) + 1)
  }
  const [padrao] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]
  const [TELA_L, TELA_A] = padrao.split('x').map(Number)

  // fotos fora do padrão entram na escala das outras cores do mesmo modelo (alinhadas pela base e pelo centro)
  const ajustes = new Map()
  for (const it of itens) {
    const m = medidas.get(it.chave)
    if (m.tela.join('x') === padrao) continue
    const irmas = itens
      .filter((o) => o.modelo === it.modelo && medidas.get(o.chave).tela.join('x') === padrao)
      .map((o) => medidas.get(o.chave).caixa)
    const [x0, y0, x1, y1] = m.caixa
    const alvoA = irmas.length ? media(irmas.map((c) => c[3] - c[1] + 1)) : (y1 - y0 + 1)
    const escala = alvoA / (y1 - y0 + 1)
    const cx = irmas.length ? media(irmas.map((c) => (c[0] + c[2] + 1) / 2)) : TELA_L / 2
    const base = irmas.length ? media(irmas.map((c) => c[3] + 1)) : TELA_A
    const larg = Math.round(m.tela[0] * escala)
    const alt = Math.round(m.tela[1] * escala)
    const esq = Math.round(cx - ((x0 + x1 + 1) / 2) * escala)
    const topo = Math.round(base - (y1 + 1) * escala)
    ajustes.set(it.chave, { larg, alt, esq, topo })
    medidas.set(it.chave, {
      tela: [TELA_L, TELA_A],
      caixa: [x0 * escala + esq, y0 * escala + topo, x1 * escala + esq, y1 * escala + topo].map(Math.round),
    })
  }

  // união das áreas ocupadas, com uma folga igual em volta
  let X0 = TELA_L, Y0 = TELA_A, X1 = 0, Y1 = 0
  for (const m of medidas.values()) {
    X0 = Math.min(X0, m.caixa[0]); Y0 = Math.min(Y0, m.caixa[1])
    X1 = Math.max(X1, m.caixa[2]); Y1 = Math.max(Y1, m.caixa[3])
  }
  // o recorte pode passar da tela de referência (um dobrável é mais largo que qualquer iPhone): o que sobra vira
  // margem transparente, nunca um corte no aparelho
  const folga = Math.round(TELA_L * FOLGA)
  const corte = { left: X0 - folga, top: Y0 - folga }
  corte.width = X1 + 1 + folga - corte.left
  corte.height = Y1 + 1 + folga - corte.top

  const saida = new Map()
  for (const it of itens) {
    const ajuste = ajustes.get(it.chave)
    let img = sharp(it.entrada, { failOn: 'none' }).rotate()
    // tudo é montado numa tela com folga em volta: sharp não compõe fora dos limites nem recorta em negativo,
    // e tanto o reescalonamento quanto o recorte comum podem sair da tela de referência
    let peca = await img.png().toBuffer()
    let esq = 0, topo = 0
    if (ajuste) {
      peca = await sharp(peca).resize({ width: ajuste.larg, height: ajuste.alt, fit: 'fill' }).png().toBuffer()
      esq = ajuste.esq
      topo = ajuste.topo
    }
    const montada = await sharp({ create: { width: TELA_L + 2 * SOBRA, height: TELA_A + 2 * SOBRA, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
      .composite([{ input: peca, left: esq + SOBRA, top: topo + SOBRA }])
      .png().toBuffer()
    const recorte = { ...corte, left: corte.left + SOBRA, top: corte.top + SOBRA }
    saida.set(it.chave, await sharp(montada).extract(recorte).png().toBuffer())
  }
  return { fotos: saida, corte, tela: [TELA_L, TELA_A] }
}
