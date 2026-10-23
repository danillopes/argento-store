// Converte as fotos de fotos-originais/ em AVIF + WebP responsivos e gera o manifesto.
// Uso: npm run fotos
//
// fotos-originais/
//   modelos/<id-do-modelo>/<id-da-cor>.jpg      → foto do catálogo (ex.: modelos/iphone-15-pro/titanio-azul.jpg)
//   unidades/<ID-da-unidade>/<ordem>-<nome>.jpg → fotos reais da unidade (ex.: unidades/ARG-1069/01-frente.jpg)
import { readdir, readFile, mkdir, writeFile, stat, rm } from 'node:fs/promises'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const SRC = 'fotos-originais'
const OUT = 'public/fotos'
const MANIFEST = 'src/data/photos.json'
const EXT = /\.(jpe?g|png|webp|avif|heic|tiff?)$/i
const SIZES = { modelos: [360, 720, 1080], unidades: [480, 960, 1600] }

const exists = async (p) => !!(await stat(p).catch(() => null))
const dirs = async (p) => ((await exists(p)) ? (await readdir(p, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name) : [])
const files = async (p) => (await readdir(p)).filter((f) => EXT.test(f)).sort()

const label = (name) =>
  name.replace(/^\d+[-_ ]*/, '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) || 'Foto'

async function convert(input, outDir, base, widths) {
  await mkdir(outDir, { recursive: true })
  const img = sharp(input, { failOn: 'none' }).rotate() // respeita a orientação EXIF
  const meta = await img.metadata()
  const ratio = (meta.height ?? 1) / (meta.width ?? 1)
  const ws = widths.filter((w) => w <= (meta.width ?? w))
  if (!ws.length) ws.push(meta.width ?? widths[0])
  for (const w of ws) {
    const r = img.clone().resize({ width: w, withoutEnlargement: true })
    await r.clone().avif({ quality: 52, effort: 4 }).toFile(join(outDir, `${base}-${w}.avif`))
    await r.clone().webp({ quality: 78 }).toFile(join(outDir, `${base}-${w}.webp`))
  }
  // miniatura borrada embutida no manifesto (aparece instantaneamente enquanto a foto carrega)
  const tiny = await img.clone().resize(16).webp({ quality: 40 }).toBuffer()
  return { w: ws, ratio: Math.round(ratio * 1000) / 1000, blur: `data:image/webp;base64,${tiny.toString('base64')}` }
}

// Sem a pasta de originais (ex.: no build do GitHub), mantém as fotos já convertidas
// e só atualiza a lista de modelos 3D.
const hasOriginals = await exists(SRC)
const previous = (await exists(MANIFEST)) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {}
const manifest = { modelos: hasOriginals ? {} : previous.modelos ?? {}, unidades: hasOriginals ? {} : previous.unidades ?? {}, modelos3d: [] }
if (hasOriginals) await rm(OUT, { recursive: true, force: true })
let count = 0

for (const model of await dirs(join(SRC, 'modelos'))) {
  for (const f of await files(join(SRC, 'modelos', model))) {
    const color = parse(f).name
    const info = await convert(join(SRC, 'modelos', model, f), join(OUT, 'modelos', model), color, SIZES.modelos)
    ;(manifest.modelos[model] ??= {})[color] = { path: `fotos/modelos/${model}/${color}`, ...info }
    count++
  }
}
for (const unit of await dirs(join(SRC, 'unidades'))) {
  for (const f of await files(join(SRC, 'unidades', unit))) {
    const name = parse(f).name.toLowerCase().replace(/\s+/g, '-')
    const info = await convert(join(SRC, 'unidades', unit, f), join(OUT, 'unidades', unit), name, SIZES.unidades)
    ;(manifest.unidades[unit] ??= []).push({ path: `fotos/unidades/${unit}/${name}`, label: label(parse(f).name), ...info })
    count++
  }
}

// modelos 3D presentes em public/models (evita requisições de teste no navegador)
if (await exists('public/models')) manifest.modelos3d = (await readdir('public/models')).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)).sort()

await writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
console.log(hasOriginals ? `✓ ${count} fotos convertidas → ${OUT}/` : '• sem fotos-originais/: fotos existentes mantidas')
console.log(`✓ ${manifest.modelos3d.length} modelos 3D encontrados · manifesto em ${MANIFEST}`)
