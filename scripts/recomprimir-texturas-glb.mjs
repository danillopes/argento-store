// Recomprime as texturas de um GLB já pronto, sem mexer na geometria. Serve para arquivos que chegaram com imagens
// pesadas (PNG sem perda, normal map lossless) e que não têm um gerador aqui no projeto.
//
// Uso: node scripts/recomprimir-texturas-glb.mjs <entrada.glb> <saida.glb> [qualidade]
//
// A qualidade padrão é 95: nos mapas de dados (ORM, normal) o erro fica abaixo de 2 em 255, invisível na tela, e o
// arquivo cai bastante porque PNG sem perda é o pior formato possível para esse tipo de imagem.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { textureCompress } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const [entrada, saida, qualidade = '95'] = process.argv.slice(2)
if (!entrada || !saida) {
  console.error('uso: node scripts/recomprimir-texturas-glb.mjs <entrada.glb> <saida.glb> [qualidade]')
  process.exit(1)
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  // sem isto o leitor recusa os arquivos comprimidos com Meshopt (é o caso do modelo interno do 17 Pro)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const doc = await io.read(entrada)
const antes = doc.getRoot().listTextures().reduce((s, t) => s + (t.getImage()?.byteLength ?? 0), 0)
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: Number(qualidade) }))
const depois = doc.getRoot().listTextures().reduce((s, t) => s + (t.getImage()?.byteLength ?? 0), 0)
const bytes = await io.writeBinary(doc)
await (await import('node:fs/promises')).writeFile(saida, bytes)

const mb = (n) => (n / 1048576).toFixed(2) + ' MB'
console.log(`✓ ${saida}  ${mb(bytes.length)}`)
console.log(`  texturas ${mb(antes)} → ${mb(depois)} (qualidade ${qualidade})`)
