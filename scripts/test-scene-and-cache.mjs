import test from 'node:test'
import assert from 'node:assert/strict'
import { colorAt, batteryPercent } from '../src/lib/scene-motion.ts'

test('cor acompanha a posicao na hora e bateria responde nos dois sentidos', () => {
  const paleta = ['#000000', '#ff0000', '#ffffff']
  assert.equal(colorAt(paleta, 0), '#000000')
  assert.equal(colorAt(paleta, 1), '#ff0000')
  assert.equal(colorAt(paleta, 2), '#ffffff')
  assert.equal(colorAt(paleta, 0.5), '#800000')
  assert.equal(colorAt(paleta, 9), '#ffffff')
  assert.equal(colorAt(['#123456'], 2), '#123456')
  assert.equal(batteryPercent(5), 0)
  assert.equal(batteryPercent(5.9), 97)
  assert.ok(batteryPercent(5.4) < batteryPercent(5.7))
})

test('cache deduplica, persiste entre visitas e renova somente pelo hash', async () => {
  const savedFetch = globalThis.fetch
  const savedCaches = globalThis.caches
  const disk = new Map()
  let downloads = 0
  globalThis.caches = { open: async () => ({
    match: async key => disk.get(key)?.clone(),
    put: async (key, response) => { disk.set(key, response.clone()) },
  }) }
  globalThis.fetch = async () => { downloads++; return new Response(new Uint8Array([1, 2, 3])) }
  try {
    const firstVisit = await import('../src/lib/model-cache.ts?visit=1')
    const url = 'https://example.test/models/iphone-17-pro.glb?v=abc'
    const [one, two] = await Promise.all([firstVisit.readModelAsset(url), firstVisit.readModelAsset(url)])
    assert.deepEqual(new Uint8Array(one), new Uint8Array([1, 2, 3]))
    assert.equal(one, two)
    assert.equal(downloads, 1)
    const nextVisit = await import('../src/lib/model-cache.ts?visit=2')
    await nextVisit.readModelAsset(url)
    assert.equal(downloads, 1, 'uma nova visita lê do cache persistente')
    await nextVisit.readModelAsset(url.replace('abc', 'def'))
    assert.equal(downloads, 2, 'uma versão diferente é baixada')
    globalThis.fetch = async () => { downloads++; return new Response('', { status: 503 }) }
    await assert.rejects(nextVisit.readModelAsset(url.replace('abc', 'erro')))
    globalThis.fetch = async () => { downloads++; return new Response(new Uint8Array([4])) }
    await nextVisit.readModelAsset(url.replace('abc', 'erro'))
    assert.equal(downloads, 4, 'uma falha não fica presa em memória')
  } finally {
    globalThis.fetch = savedFetch
    if (savedCaches) globalThis.caches = savedCaches
    else delete globalThis.caches
  }
})
