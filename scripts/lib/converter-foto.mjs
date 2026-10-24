// Converte uma foto (caminho ou buffer) em AVIF + WebP nos tamanhos pedidos e devolve os dados do manifesto.
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

export async function converter(entrada, pasta, base, larguras) {
  await mkdir(pasta, { recursive: true })
  const img = sharp(entrada, { failOn: 'none' }).rotate() // respeita a orientação EXIF
  const meta = await img.metadata()
  const ratio = (meta.height ?? 1) / (meta.width ?? 1)
  const ws = larguras.filter((w) => w <= (meta.width ?? w))
  // a foto original quase sempre fica entre dois tamanhos da lista; serve ela inteira também, senão a tela grande
  // recebe uma imagem bem menor do que cabe (era o caso das fotos de catálogo, todas em 360 px)
  const nativa = Math.min(meta.width ?? 0, larguras[larguras.length - 1])
  if (nativa > (ws[ws.length - 1] ?? 0)) ws.push(nativa)
  if (!ws.length) ws.push(meta.width ?? larguras[0])
  for (const w of ws) {
    const r = img.clone().resize({ width: w, withoutEnlargement: true })
    await r.clone().avif({ quality: 52, effort: 4 }).toFile(join(pasta, `${base}-${w}.avif`))
    await r.clone().webp({ quality: 78 }).toFile(join(pasta, `${base}-${w}.webp`))
  }
  // miniatura borrada embutida no manifesto (aparece instantaneamente enquanto a foto carrega)
  const tiny = await img.clone().resize(16).webp({ quality: 40 }).toBuffer()
  return { w: ws, ratio: Math.round(ratio * 1000) / 1000, blur: `data:image/webp;base64,${tiny.toString('base64')}` }
}
