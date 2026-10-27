// Prepara uma foto de catálogo que não veio da Apple (uma foto de revendedor, por exemplo) para entrar no mesmo
// conjunto das outras: recorta o fundo branco, coloca o aparelho na escala do catálogo e devolve a arte na tela de
// referência, com fundo transparente.
//
// Uso: node scripts/arte-catalogo-foto.mjs <modelo> <cor> <foto> <altura-do-aparelho-em-px>
//
// A altura em pixels é a medida do aparelho na tela de 612x760 das fotos oficiais — é ela que mantém a noção de
// tamanho entre os modelos do catálogo (um Pro Max tem de aparecer maior que um mini).
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const [modelo, cor, foto, alturaAlvo] = process.argv.slice(2)
if (!modelo || !cor || !foto || !alturaAlvo) {
  console.error('uso: node scripts/arte-catalogo-foto.mjs <modelo> <cor> <foto> <altura-do-aparelho-em-px>')
  process.exit(1)
}
const TELA = [612, 760]
const BASE = TELA[1] - 48 // os aparelhos das fotos oficiais apoiam nesta linha
const BRANCO = 244

const { data, info } = await sharp(foto).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels
    if (data[i] > BRANCO && data[i + 1] > BRANCO && data[i + 2] > BRANCO) { data[i + 3] = 0; continue }
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
}
const recortada = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .resize({ height: Number(alturaAlvo) })
  .png().toBuffer()

const { width: larg, height: alt } = await sharp(recortada).metadata()
const tela = [Math.max(TELA[0], larg), TELA[1] + Math.max(0, alt - BASE)]
const arte = await sharp({ create: { width: tela[0], height: tela[1], channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: recortada, left: Math.round((tela[0] - larg) / 2), top: Math.max(0, BASE - alt) }])
  .png().toBuffer()

await mkdir(join('fotos-render', 'modelos', modelo), { recursive: true })
const destino = join('fotos-render', 'modelos', modelo, `${cor}.png`)
await writeFile(destino, arte)
console.log(`✓ ${destino}  aparelho ${larg}x${alt} em ${tela[0]}x${tela[1]}`)
