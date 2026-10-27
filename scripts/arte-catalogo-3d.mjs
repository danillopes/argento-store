// Gera a arte de catálogo de um modelo que não tem foto oficial (é o caso do iPhone Duo) a partir do modelo 3D
// que o site já usa na página do produto. A saída imita o enquadramento das fotos da Apple: traseira à esquerda,
// frente à direita, fundo transparente.
//
// Uso: node scripts/arte-catalogo-3d.mjs <id-do-modelo> [porta]
// Precisa do site servido (npm run build && npx vite preview --port 4178).
//
// O resultado vai para fotos-render/, que entra no Git: ao contrário de fotos-originais/, esta arte é nossa e
// precisa existir em qualquer máquina que rode `npm run fotos`.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'

// O Playwright não é dependência do site (só deste gerador), então vem pelo require, que ainda enxerga a
// instalação global. Sem ele, a mensagem abaixo diz o que falta.
let chromium
try {
  ;({ chromium } = createRequire(import.meta.url)('playwright'))
} catch {
  console.error('este gerador precisa do Playwright instalado (npm i -g playwright)')
  process.exit(1)
}

const [idModelo, porta = '4178'] = process.argv.slice(2)
if (!idModelo) {
  console.error('uso: node scripts/arte-catalogo-3d.mjs <id-do-modelo> [porta]')
  process.exit(1)
}

// Referência de escala: nas fotos da Apple todos os aparelhos aparecem na mesma escala. Para a arte sair no mesmo
// tamanho relativo, um modelo conhecido é renderizado pela mesma página e serve de régua — a câmera da cena é a
// mesma para todos, então a altura em pixels já guarda a proporção certa entre os aparelhos.
const REFERENCIA = { id: 'iphone-17-pro-max', alturaDoConteudo: 709 } // px na tela de 612x760 das fotos oficiais
const TELA = [612, 760]
const BRANCO = 244

const modelos = await (async () => {
  const fonte = await readFile('src/data/models.ts', 'utf8')
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const { MODELS } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  return MODELS
})()
const modelo = modelos.find((m) => m.id === idModelo)
if (!modelo) throw new Error(`modelo desconhecido: ${idModelo}`)

// Recorta o que não é fundo branco e devolve o aparelho com fundo transparente.
// A cena desenha uma sombra de contato bem abaixo do aparelho; ela fica separada por uma faixa vazia, então o
// recorte fica só com o bloco de linhas onde o aparelho está — senão a sombra entraria na conta da altura e o
// aparelho sairia menor do que deveria, com uma elipse solta embaixo.
async function recortar(png) {
  const img = sharp(png)
  const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const porLinha = new Array(info.height).fill(0)
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels
      if (data[i] > BRANCO && data[i + 1] > BRANCO && data[i + 2] > BRANCO) { data[i + 3] = 0; continue }
      porLinha[y]++
    }
  }
  // blocos de linhas com conteúdo; fica o de maior área — a sombra é larga mas baixinha, o aparelho é o maior
  const blocos = []
  for (let y = 0; y < info.height; y++) {
    if (!porLinha[y]) continue
    const ini = y
    let area = 0
    while (y < info.height && porLinha[y]) area += porLinha[y++]
    blocos.push({ ini, fim: y - 1, area })
  }
  if (!blocos.length) throw new Error('render saiu vazio')
  const bloco = blocos.sort((a, b) => b.area - a.area)[0]
  const y0 = bloco.ini, y1 = bloco.fim
  let x0 = info.width, x1 = -1
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
    }
  }
  const limpo = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  return limpo.extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer()
}

const navegador = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

// Abre a página do produto, escolhe a cor e fotografa a traseira e a frente com fundo branco liso.
async function fotografar(id, nomeDaCor) {
  const pagina = await navegador.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2 })
  pagina.setDefaultTimeout(90000)
  await pagina.goto(`http://127.0.0.1:${porta}/#/produto/${id}`, { waitUntil: 'load' })
  await pagina.waitForTimeout(12000)
  await pagina.addStyleTag({ content: '.pdp-stage{background:#fff !important;border-color:transparent !important}.pdp-tools,.pdp-hint{display:none !important}' })
  if (nomeDaCor) {
    const botao = await pagina.$(`button.qc[title="${nomeDaCor}"]`)
    if (botao) { await botao.click(); await pagina.waitForTimeout(4000) }
  }
  const cdp = await pagina.context().newCDPSession(pagina)
  const caixa = await (await pagina.$('.pdp-stage')).boundingBox()
  const clip = { x: Math.round(caixa.x), y: Math.round(caixa.y), width: Math.round(caixa.width), height: Math.round(caixa.height), scale: 2 }
  const partes = {}
  for (const [vista, nome] of [['Traseira', 'traseira'], ['Frente', 'frente']]) {
    const botao = await pagina.$(`.seg-center button:has-text("${vista}")`)
    if (botao) { await botao.click(); await pagina.waitForTimeout(6000) }
    // captura pelo CDP porque a cena nunca para de animar e o screenshot comum fica esperando ela sossegar
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip })
    partes[nome] = await recortar(Buffer.from(data, 'base64'))
  }
  await pagina.close()
  return partes
}

// régua: o modelo de referência passa pela mesma câmera, e a altura dele em pixels dá a escala de todos
const regua = await fotografar(REFERENCIA.id, null)
const alturaRegua = (await sharp(regua.frente).metadata()).height
const escalaDaCena = REFERENCIA.alturaDoConteudo / alturaRegua
console.log(`régua ${REFERENCIA.id}: ${alturaRegua} px renderizados → fator ${escalaDaCena.toFixed(4)}`)

await mkdir(join('fotos-render', 'modelos', idModelo), { recursive: true })

for (const cor of modelo.colors) {
  const partes = await fotografar(idModelo, cor.name)
  const metaFrente = await sharp(partes.frente).metadata()
  const metaTras = await sharp(partes.traseira).metadata()
  const alturaFrente = Math.round(metaFrente.height * escalaDaCena)
  const alturaTras = Math.round(metaTras.height * escalaDaCena)
  const fr = await sharp(partes.frente).resize({ height: alturaFrente }).png().toBuffer()
  const tr = await sharp(partes.traseira).resize({ height: alturaTras }).png().toBuffer()
  const lFr = (await sharp(fr).metadata()).width
  const lTr = (await sharp(tr).metadata()).width
  const sobreposicao = Math.round(lTr * 0.34) // o mesmo encaixe das fotos oficiais da Apple
  const largura = lTr + lFr - sobreposicao
  const altura = Math.max(alturaFrente, alturaTras)
  const arte = await sharp({ create: { width: largura, height: altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: tr, left: 0, top: altura - alturaTras },
      { input: fr, left: largura - lFr, top: altura - alturaFrente },
    ])
    .png().toBuffer()

  // encaixe na tela de referência, na mesma base das fotos oficiais; um dobrável é mais largo (e pode ser mais
  // alto) que qualquer iPhone, então a tela cresce em vez de cortar o aparelho
  const base = TELA[1] - 48
  const topo = base - altura
  const tela = [Math.max(TELA[0], largura), TELA[1] + Math.max(0, -topo)]
  const final = await sharp({ create: { width: tela[0], height: tela[1], channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: arte, left: Math.round((tela[0] - largura) / 2), top: Math.max(0, topo) }])
    .png().toBuffer()
  const destino = join('fotos-render', 'modelos', idModelo, `${cor.id}.png`)
  await writeFile(destino, final)
  console.log(`✓ ${destino}  aparelho ${largura}x${altura} em ${tela[0]}x${tela[1]}`)
}
await navegador.close()
