// Empacota o GLB fornecido pelo usuário com as mesmas malhas e texturas sem perda.
// O original fica em fotos-originais/modelos3d/iphone-17-pro-original.glb.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const input = 'fotos-originais/modelos3d/iphone-17-pro-original.glb'
const output = 'public/models/iphone-17-pro.glb'
const original = await readFile(input)
if (original.readUInt32LE(0) !== 0x46546c67) throw new Error('O arquivo não é um GLB.')
const jsonLength = original.readUInt32LE(12)
const doc = JSON.parse(original.subarray(20, 20 + jsonLength).toString())
const oldBin = original.subarray(28 + jsonLength)
const imageViews = new Map(doc.images.map((image) => [image.bufferView, image]))
const chunks = []
let length = 0
for (const [index, view] of doc.bufferViews.entries()) {
  if (view.buffer !== 0) throw new Error('GLB com múltiplos buffers não suportado.')
  const bytes = oldBin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
  let packed = bytes
  const image = imageViews.get(index)
  if (image) {
    packed = await sharp(bytes).webp({ lossless: true, effort: 6 }).toBuffer()
    // Confirma igualdade dos pixels decodificados, incluindo os mapas de normais.
    const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer()
    const decoded = await sharp(packed).ensureAlpha().raw().toBuffer()
    // WebP pode normalizar o RGB de pixels transparentes. Nesse caso, conserva
    // a imagem original integralmente, inclusive os valores ocultos pelo alfa.
    if (pixels.equals(decoded) && packed.length < bytes.length) image.mimeType = 'image/webp'
    else packed = bytes
    console.log(`${image.name}: ${Math.round(bytes.length / 1024)} → ${Math.round(packed.length / 1024)} KB (sem perda)`)
  }
  view.byteOffset = length
  view.byteLength = packed.length
  chunks.push(packed)
  length += packed.length
  const pad = (4 - (length % 4)) % 4
  if (pad) { chunks.push(Buffer.alloc(pad)); length += pad }
}
// EXT_texture_webp é o mecanismo glTF para imagens WebP embutidas.
for (const texture of doc.textures) {
  if (doc.images[texture.source]?.mimeType === 'image/webp') {
    texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } }
    delete texture.source
  }
}
doc.extensionsUsed = [...new Set([...(doc.extensionsUsed ?? []), 'EXT_texture_webp'])]
doc.extensionsRequired = [...new Set([...(doc.extensionsRequired ?? []), 'EXT_texture_webp'])]
doc.buffers = [{ byteLength: length }]
const json = Buffer.from(JSON.stringify(doc))
const jsonPad = Buffer.alloc((4 - json.length % 4) % 4, 0x20)
const jsonChunk = Buffer.concat([json, jsonPad])
const bin = Buffer.concat(chunks)
const header = Buffer.alloc(20)
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4)
header.writeUInt32LE(28 + jsonChunk.length + bin.length, 8)
header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
const binHeader = Buffer.alloc(8)
binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4)
const result = Buffer.concat([header, jsonChunk, binHeader, bin])
await writeFile(output, result)
await writeFile('public/models/iphone-17-pro-fonte.json', JSON.stringify({
  source: 'iphone-17-pro.zip / source/iPhone 17 Pro.glb',
  originalSha256: createHash('sha256').update(original).digest('hex'),
  outputSha256: createHash('sha256').update(result).digest('hex'),
  originalBytes: original.length, outputBytes: result.length,
  processing: 'Geometria e materiais originais preservados. Texturas WebP sem perda; igualdade dos pixels validada.',
}, null, 2) + '\n')
console.log(`${(original.length / 1048576).toFixed(1)} → ${(result.length / 1048576).toFixed(1)} MB; ${output}`)
