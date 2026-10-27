// Prepara as fotos de catálogo para a vitrine: tira o fundo branco, deixa o aparelho recortado com transparência
// e devolve todas no mesmo enquadramento, para o card mostrar a foto de ponta a ponta sem esticar nada.
//
// Três regras guiam o trabalho:
//  1. o fundo sai por preenchimento a partir da borda, nunca por limiar simples — num aparelho branco o limiar
//     abriria buracos no meio da traseira, e no tema escuro esses buracos apareceriam como manchas;
//  2. o recorte é o MESMO para todas as fotos (a união das áreas ocupadas), senão um 12 mini recortado justo
//     apareceria do tamanho de um Pro Max e o catálogo perderia a noção de tamanho entre os modelos;
//  3. uma foto que veio em outro tamanho de tela (acontece quando a Apple troca o arquivo) é reescalada para a
//     escala das outras cores do mesmo modelo antes de entrar na conta.
import sharp from 'sharp'

const CLARO = 243 // a partir deste valor nos três canais o pixel pode ser fundo
const FOLGA = 0.012 // respiro em volta, em fração da largura da tela
const LARGO_DEMAIS = 1.25 // acima disto em relação à largura típica, a foto ganha recorte próprio
const SOBRA = 1024 // margem de trabalho para encaixar fotos que vieram maiores que a tela de referência

// Fundo = claro (ou já transparente) e ligado à borda da imagem. Partir da borda preserva o branco de dentro do
// aparelho: a traseira de um modelo branco, a tela acesa, os reflexos do vidro.
function apagarFundo(dados, L, A, canais) {
  const fundo = new Uint8Array(L * A)
  const pilha = []
  const ehFundo = (i) => {
    const p = i * canais
    return dados[p + 3] < 16 || (dados[p] >= CLARO && dados[p + 1] >= CLARO && dados[p + 2] >= CLARO)
  }
  const empilhar = (i) => { if (!fundo[i] && ehFundo(i)) { fundo[i] = 1; pilha.push(i) } }
  for (let x = 0; x < L; x++) { empilhar(x); empilhar((A - 1) * L + x) }
  for (let y = 0; y < A; y++) { empilhar(y * L); empilhar(y * L + L - 1) }
  while (pilha.length) {
    const i = pilha.pop(), x = i % L, y = (i - (i % L)) / L
    if (x > 0) empilhar(i - 1)
    if (x < L - 1) empilhar(i + 1)
    if (y > 0) empilhar(i - L)
    if (y < A - 1) empilhar(i + L)
  }
  // engorda o fundo em 1 px: come a franja clara da borda do aparelho, que viraria um halo branco no tema escuro
  const borda = []
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = y * L + x
      if (fundo[i]) continue
      if ((x > 0 && fundo[i - 1]) || (x < L - 1 && fundo[i + 1]) || (y > 0 && fundo[i - L]) || (y < A - 1 && fundo[i + L])) borda.push(i)
    }
  }
  for (const i of borda) fundo[i] = 1
  for (let i = 0; i < L * A; i++) if (fundo[i]) dados[i * canais + 3] = 0
}

// Devolve a foto com o fundo já transparente, em RGBA cru.
async function recortada(entrada) {
  const { data, info } = await sharp(entrada, { failOn: 'none' }).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  apagarFundo(data, info.width, info.height, info.channels)
  return { data, info }
}

const caixaDe = ({ data, info }) => {
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return [0, 0, info.width - 1, info.height - 1]
  return [x0, y0, x1, y1]
}

// Mesma coisa, pronta para gravar: PNG com o fundo transparente (a tela inteira, sem recortar).
export async function recortarFundo(entrada) {
  const { data, info } = await recortada(entrada)
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer()
}

// Área ocupada pelo aparelho numa foto, depois de tirado o fundo.
export async function medir(entrada) {
  const r = await recortada(entrada)
  return { tela: [r.info.width, r.info.height], caixa: caixaDe(r) }
}

const media = (ns) => ns.reduce((s, n) => s + n, 0) / ns.length

// recorte justo em volta de uma foto só, com a mesma folga do recorte comum
const proprioCorte = (m, folga) => ({
  left: m.caixa[0] - folga,
  top: m.caixa[1] - folga,
  width: m.caixa[2] + 1 + folga - (m.caixa[0] - folga),
  height: m.caixa[3] + 1 + folga - (m.caixa[1] - folga),
})

// Recebe [{ chave, modelo, entrada }] e devolve um Map chave → Buffer PNG com fundo transparente, todos no mesmo
// enquadramento (menos os largos demais, que ganham o próprio).
export async function enquadrarCatalogo(itens) {
  const medidas = new Map()
  const pecas = new Map()
  for (const it of itens) {
    const r = await recortada(it.entrada)
    medidas.set(it.chave, { tela: [r.info.width, r.info.height], caixa: caixaDe(r) })
    pecas.set(it.chave, await sharp(r.data, { raw: { width: r.info.width, height: r.info.height, channels: r.info.channels } }).png().toBuffer())
  }

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

  // Um dobrável aberto é quase duas vezes mais largo que um iPhone. Se ele entrasse na união, o recorte comum
  // ficaria largo demais e todos os outros apareceriam pequenos no meio de um quadro vazio — então quem passa
  // muito da largura típica ganha o próprio recorte, e o card acompanha a proporção da foto.
  const larguras = [...medidas.values()].map((m) => m.caixa[2] - m.caixa[0] + 1).sort((a, b) => a - b)
  const limite = larguras[Math.floor(larguras.length / 2)] * LARGO_DEMAIS
  const aParte = new Set([...medidas].filter(([, m]) => m.caixa[2] - m.caixa[0] + 1 > limite).map(([k]) => k))

  // união das áreas ocupadas, com uma folga igual em volta
  let X0 = TELA_L, Y0 = TELA_A, X1 = 0, Y1 = 0
  for (const [chave, m] of medidas) {
    if (aParte.has(chave)) continue
    X0 = Math.min(X0, m.caixa[0]); Y0 = Math.min(Y0, m.caixa[1])
    X1 = Math.max(X1, m.caixa[2]); Y1 = Math.max(Y1, m.caixa[3])
  }
  const folga = Math.round(TELA_L * FOLGA)
  const corte = { left: X0 - folga, top: Y0 - folga }
  corte.width = X1 + 1 + folga - corte.left
  corte.height = Y1 + 1 + folga - corte.top

  const saida = new Map()
  for (const it of itens) {
    const ajuste = ajustes.get(it.chave)
    let peca = pecas.get(it.chave)
    let esq = 0, topo = 0
    if (ajuste) {
      peca = await sharp(peca).resize({ width: ajuste.larg, height: ajuste.alt, fit: 'fill' }).png().toBuffer()
      esq = ajuste.esq
      topo = ajuste.topo
    }
    // tudo é montado numa tela com folga em volta: sharp não compõe fora dos limites nem recorta em negativo,
    // e tanto o reescalonamento quanto o recorte podem sair da tela de referência
    const montada = await sharp({ create: { width: TELA_L + 2 * SOBRA, height: TELA_A + 2 * SOBRA, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: peca, left: esq + SOBRA, top: topo + SOBRA }])
      .png().toBuffer()
    const base = aParte.has(it.chave) ? proprioCorte(medidas.get(it.chave), folga) : corte
    const recorte = { ...base, left: base.left + SOBRA, top: base.top + SOBRA }
    saida.set(it.chave, await sharp(montada).extract(recorte).png().toBuffer())
  }
  return { fotos: saida, corte, tela: [TELA_L, TELA_A] }
}
