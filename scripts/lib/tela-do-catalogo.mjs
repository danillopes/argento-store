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
  const img = sharp(frente).extract(corte).resize({ height: ALTURA })
  const meta = await img.clone().metadata()
  return { webp: await img.clone().webp({ quality: 72 }).toBuffer(), largura: meta.width, altura: meta.height }
}
