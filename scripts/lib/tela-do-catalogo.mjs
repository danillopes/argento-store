// Recorta a tela do aparelho da frente numa foto de catálogo e devolve só o papel de parede.
//
// É assim que cada modelo 3D mostra o papel de parede de verdade: a foto oficial de cada cor já traz a tela que
// a Apple põe de fábrica naquele aparelho, então em vez de desenhar uma imitação, usamos a própria.
import sharp from 'sharp'
import { recortarPar } from './recorte-par.mjs'

// Quanto entrar para dentro da borda do aparelho, em fração da largura dele. Cobre a moldura de alumínio e o
// contorno preto do vidro; menos que isto deixa um fio preto em volta do papel de parede.
const MOLDURA = 0.058
const ALTURA = 460 // pixels de altura da imagem final — a tela do 3D é pequena, não precisa de mais

export async function telaDoCatalogo(entrada) {
  if (!entrada) return null
  const { frente } = await recortarPar(entrada)
  const { data, info } = await sharp(frente).raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] < 40) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  const larg = x1 - x0 + 1
  const margem = Math.round(larg * MOLDURA)
  const corte = { left: x0 + margem, top: y0 + margem, width: larg - 2 * margem, height: y1 - y0 + 1 - 2 * margem }
  if (corte.width < 40 || corte.height < 40) return null
  // Só vale para a foto no formato de par (traseira à esquerda, frente à direita). Num dobrável aberto não há
  // esse par, e o recorte sai um retalho da lateral — a proporção denuncia e a gente desiste.
  const proporcao = corte.width / corte.height
  if (proporcao < 0.42 || proporcao > 0.52) return null
  const bruto = await sharp(frente).extract(corte).resize({ height: ALTURA }).raw().toBuffer({ resolveWithObject: true })
  apagarIlha(bruto.data, bruto.info.width, bruto.info.height, bruto.info.channels)
  const img = sharp(bruto.data, { raw: { width: bruto.info.width, height: bruto.info.height, channels: bruto.info.channels } })
  return { webp: await img.webp({ quality: 72 }).toBuffer(), largura: bruto.info.width, altura: bruto.info.height }
}

// A foto mostra a tela com a Dynamic Island (ou o entalhe) desenhada nela. No modelo 3D a ilha é geometria de
// verdade e se mexe, então a ilha da foto apareceria por baixo, como uma segunda ilha parada — foi o que deixou
// a tela com cara de print. Aqui ela some: o papel de parede continua por cima dela, espelhado a partir da
// primeira linha livre, que acompanha o degradê sem emenda visível.
function apagarIlha(dados, L, A, canais) {
  const preto = (x, y) => {
    const i = (y * L + x) * canais
    return dados[i] < 26 && dados[i + 1] < 26 && dados[i + 2] < 26
  }
  const copiar = (xd, yd, xo, yo) => {
    const d = (yd * L + xd) * canais, o = (yo * L + xo) * canais
    for (let c = 0; c < canais; c++) dados[d + c] = dados[o + c]
  }
  const limite = Math.round(A * 0.17) // a ilha fica no alto; abaixo disto é papel de parede
  const x0 = Math.round(L * 0.08), x1 = Math.round(L * 0.92)
  // última linha preta de cada coluna: a ilha não começa na borda, costuma ter um fio de vidro claro antes
  const fins = new Int32Array(L).fill(-1)
  for (let x = x0; x < x1; x++) for (let y = 0; y < limite; y++) if (preto(x, y)) fins[x] = y

  // engorda a área em volta: sobra um halo claro na beirada da ilha que não é preto e entregaria o contorno
  const FOLGA = 4
  const cheio = Int32Array.from(fins)
  for (let x = x0; x < x1; x++) {
    for (let k = -FOLGA; k <= FOLGA; k++) {
      const v = fins[x + k]
      if (v !== undefined && v + FOLGA > cheio[x]) cheio[x] = v + FOLGA
    }
  }
  for (let x = x0; x < x1; x++) {
    const fim = cheio[x]
    if (fim < 0) continue
    // espelha o que vem logo abaixo: para cima a partir da primeira linha livre, acompanhando o degradê
    for (let y = fim; y >= 0; y--) copiar(x, y, x, Math.min(A - 1, fim + 1 + (fim - y)))
  }
}
