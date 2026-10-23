// Baixa imagens de catálogo por modelo/cor. Nunca cria fotos de unidades físicas.
// Uso: node scripts/baixar-fotos-catalogo.mjs
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import ts from 'typescript'
import sharp from 'sharp'

const page = 'https://www.apple.com/iphone/compare/'
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) })
  if (!response.ok) throw new Error(`${response.status}: ${url}`)
  return response
}
const html = await (await get(page)).text()
const cssPath = html.match(/href="([^"]*\/iphone\/compare\/[^"]*overview\.built\.css)"/)?.[1]
if (!cssPath) throw new Error('CSS de imagens não encontrado na página da Apple.')
const cssUrl = new URL(cssPath, page).href
const css = await (await get(cssUrl)).text()
const images = new Map()
for (const match of css.matchAll(/\.image-compare-(iphone[^\s{]+)\{([^}]+)\}/g)) {
  const path = match[2].match(/background-image:url\("([^"]+_large_2x\.jpg)"\)/)?.[1]
  if (path) images.set(match[1], new URL(path, page).href)
}
const source = await readFile('src/data/models.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { MODELS } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const colors = {
  preto: 'black', branco: 'white', vermelho: 'red', verde: 'green', azul: 'blue', roxo: 'purple',
  grafite: 'graphite', prateado: 'silver', dourado: 'gold', 'azul-pacifico': 'pacificblue',
  'meia-noite': 'midnight', estelar: 'starlight', rosa: 'pink', 'azul-sierra': 'sierrablue',
  'verde-alpino': 'alpinegreen', 'preto-espacial': 'spaceblack', 'roxo-profundo': 'deeppurple',
  amarelo: 'yellow', 'titanio-natural': 'naturaltitanium', 'titanio-azul': 'bluetitanium',
  'titanio-branco': 'whitetitanium', 'titanio-preto': 'blacktitanium',
  'titanio-deserto': 'deserttitanium', 'verde-acinzentado': 'teal', ultramarino: 'ultramarine',
  'azul-nevoa': 'mistblue', salvia: 'sage', lavanda: 'lavender', 'rosa-suave': 'softpink',
  'branco-nuvem': 'cloudwhite', 'dourado-claro': 'lightgold', 'azul-ceu': 'skyblue',
  'laranja-cosmico': 'cosmicorange', 'azul-profundo': 'deepblue', borgonha: 'burgundy', 'azul-claro': 'glacier',
}
const records = []
for (const model of MODELS) {
  await mkdir(join('fotos-originais', 'modelos', model.id), { recursive: true })
  for (const color of model.colors) {
    const url = images.get(`${model.id}-${colors[color.id]}`)
    if (!url) throw new Error(`Foto oficial ausente: ${model.id}/${color.id}`)
    records.push({ model: model.id, color: color.id, file: `fotos-originais/modelos/${model.id}/${color.id}.jpg`, url, sourcePage: page })
  }
}
let next = 0
let count = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < records.length) {
    const record = records[next++]
    if (await access(record.file).then(() => true, () => false)) {
      // Preserva originais já existentes, inclusive fotos próprias do usuário.
      record.status = 'arquivo-existente-preservado'
    } else {
      const buffer = Buffer.from(await (await get(record.url)).arrayBuffer())
      const meta = await sharp(buffer).metadata()
      if (meta.format !== 'jpeg' || !meta.width || meta.width < 300) throw new Error(`Imagem inválida: ${record.url}`)
      await writeFile(record.file, buffer, { flag: 'wx' })
      record.status = 'baixado'
    }
    if (++count % 20 === 0 || count === records.length) console.log(`${count}/${records.length} fotos de catálogo`)
  }
}))
await mkdir('fotos-originais/unidades/ARG-1069', { recursive: true })
await writeFile('fontes-fotos.json', JSON.stringify({
  sourcePage: page, cssUrl, checkedAt: new Date().toISOString(),
  note: 'Imagens de catálogo da Apple; não são fotos de unidades do estoque. A disponibilidade pública não concede licença de uso comercial.',
  models: MODELS.length, photos: records,
}, null, 2) + '\n')
console.log(`${MODELS.length} modelos; fontes registradas em fontes-fotos.json`)
