import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceScene, advanceColor, batteryPercent } from '../src/lib/scene-motion.ts'

test('giro responde em menos de meio segundo e reverte imediatamente', () => {
  let p = 0
  for (let i = 0; i < 30; i++) p = advanceScene(p, 1, 1 / 60)
  assert.ok(p > .99)
  assert.ok(advanceScene(p, 0, 1 / 60) < p)
})
test('cores mantem duracao minima e bateria responde nos dois sentidos', () => {
  assert.ok(advanceColor(0, 1, 1 / 60) <= 1 / (60 * 3.4))
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
