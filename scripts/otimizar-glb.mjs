import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, weld, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const [inp, out] = process.argv.slice(2)
const doc = await io.read(inp)
await doc.transform(dedup(), prune({ keepAttributes: false, keepLeaves: false }), weld(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [2048, 2048] }))
await io.write(out, doc)
