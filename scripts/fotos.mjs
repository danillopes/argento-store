// Converte as fotos de fotos-originais/ em AVIF + WebP responsivos e gera o manifesto.
// Uso: npm run fotos
//
// fotos-originais/
//   modelos/<id-do-modelo>/<id-da-cor>.jpg      → foto do catálogo (ex.: modelos/iphone-15-pro/titanio-azul.jpg)
//   unidades/<ID-da-unidade>/<ordem>-<nome>.jpg → fotos reais da unidade (ex.: unidades/ARG-1069/01-frente.jpg)
import { readdir, readFile, writeFile, stat, rm } from 'node:fs/promises'
import { join, parse } from 'node:path'
import { createHash } from 'node:crypto'
import { converter } from './lib/converter-foto.mjs'
import { recortarPar } from './lib/recorte-par.mjs'
import { enquadrarCatalogo } from './lib/enquadrar.mjs'

const SRC = 'fotos-originais'
const RENDER = 'fotos-render'
const OUT = 'public/fotos'
const MANIFEST = 'src/data/photos.json'
const EXT = /\.(jpe?g|png|webp|avif|heic|tiff?)$/i
const SIZES = { modelos: [360, 720, 1080], unidades: [480, 960, 1600] }

const exists = async (p) => !!(await stat(p).catch(() => null))
const dirs = async (p) => ((await exists(p)) ? (await readdir(p, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name) : [])
const files = async (p) => (await readdir(p)).filter((f) => EXT.test(f)).sort()

const label = (name) =>
  name.replace(/^\d+[-_ ]*/, '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) || 'Foto'

// Galeria em camadas (src/sections/Gallery.tsx): a foto oficial traz a traseira e a frente juntas e lá cada aparelho
// aparece sozinho, então estas cores também saem recortadas.
const RECORTES = {
  'iphone-16-pro': ['titanio-deserto', 'titanio-natural', 'titanio-preto'],
  'iphone-17': ['azul-nevoa', 'salvia', 'lavanda'],
  'iphone-18-pro-max': ['borgonha', 'azul-claro', 'prateado'],
}

// Sem a pasta de originais (ex.: no build do GitHub), mantém as fotos já convertidas
// e só atualiza a lista de modelos 3D.
const hasOriginals = await exists(SRC)
const previous = (await exists(MANIFEST)) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {}
const manifest = { modelos: hasOriginals ? {} : previous.modelos ?? {}, recortes: hasOriginals ? {} : previous.recortes ?? {}, unidades: hasOriginals ? {} : previous.unidades ?? {}, modelos3d: [], modelos3dVersoes: {} }
if (hasOriginals) await rm(OUT, { recursive: true, force: true })
let count = 0

// As fotos de catálogo passam antes pelo enquadramento: um único recorte, igual para todas, que tira a margem
// branca em volta dos aparelhos. É o que deixa a foto preencher o quadro do card sem precisar esticá-la.
// Além das fotos oficiais, entram as artes que geramos a partir do modelo 3D (fotos-render/, versionada) para os
// aparelhos sem foto de catálogo. Só rodam junto com os originais: o recorte comum precisa do conjunto inteiro.
const catalogo = []
if (hasOriginals) {
  for (const fonte of [SRC, RENDER]) {
    for (const model of await dirs(join(fonte, 'modelos'))) {
      for (const f of await files(join(fonte, 'modelos', model))) {
        catalogo.push({ chave: `${model}/${parse(f).name}`, modelo: model, cor: parse(f).name, entrada: join(fonte, 'modelos', model, f) })
      }
    }
  }
}
const enquadradas = catalogo.length ? (await enquadrarCatalogo(catalogo)).fotos : new Map()
for (const { chave, modelo: model, cor: color, entrada } of catalogo) {
  const foto = enquadradas.get(chave)
  const info = await converter(foto, join(OUT, 'modelos', model), color, SIZES.modelos)
  ;(manifest.modelos[model] ??= {})[color] = { path: `fotos/modelos/${model}/${color}`, ...info }
  count++
  if (!RECORTES[model]?.includes(color)) continue
  // o recorte em aparelhos separados sai da foto original, que ainda tem a moldura inteira para achar a emenda
  const partes = await recortarPar(entrada)
  for (const vista of ['frente', 'traseira']) {
    const corte = await converter(partes[vista], join(OUT, 'recortes', model), `${color}-${vista}`, SIZES.modelos)
    ;((manifest.recortes[model] ??= {})[color] ??= {})[vista] = { path: `fotos/recortes/${model}/${color}-${vista}`, ...corte }
    count++
  }
}
for (const unit of await dirs(join(SRC, 'unidades'))) {
  for (const f of await files(join(SRC, 'unidades', unit))) {
    const name = parse(f).name.toLowerCase().replace(/\s+/g, '-')
    const info = await converter(join(SRC, 'unidades', unit, f), join(OUT, 'unidades', unit), name, SIZES.unidades)
    ;(manifest.unidades[unit] ??= []).push({ path: `fotos/unidades/${unit}/${name}`, label: label(parse(f).name), ...info })
    count++
  }
}

// modelos 3D presentes em public/models (evita requisições de teste no navegador)
if (await exists('public/models')) manifest.modelos3d = (await readdir('public/models')).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)).sort()
for (const name of manifest.modelos3d) {
  manifest.modelos3dVersoes[name] = createHash('sha256').update(await readFile(join('public/models', `${name}.glb`))).digest('hex').slice(0, 12)
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
console.log(hasOriginals ? `✓ ${count} fotos convertidas → ${OUT}/` : '• sem fotos-originais/: fotos existentes mantidas')
console.log(`✓ ${manifest.modelos3d.length} modelos 3D encontrados · manifesto em ${MANIFEST}`)
