import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceScene, SCENE_SECONDS } from '../src/lib/scene-motion.ts'

test('rolagem extrema respeita a velocidade máxima e aceita reversão', () => {
  let position = 0
  for (let i = 0; i < 60; i++) {
    const next = advanceScene(position, 1, 1 / 60)
    assert.ok(next - position <= 1 / (60 * SCENE_SECONDS) + 1e-12)
    position = next
  }
  assert.ok(position < 0.08, 'um salto do scroll não pula as cenas')
  assert.ok(advanceScene(position, 0, 1 / 60) < position, 'inverte sem reiniciar')
  assert.ok(advanceScene(0, 1, 10) <= 0.05 / SCENE_SECONDS, 'voltar de uma aba suspensa não causa salto')
  for (let i = 0; i < 60 * 20; i++) position = advanceScene(position, 1, 1 / 60)
  assert.ok(Math.abs(position - 1) < 1e-6)
})

test('mais tempo nas cores preserva a velocidade das cenas anteriores', () => {
  const oldDuration = 9.1
  const extendedDuration = 14.2
  const previous = advanceScene(0, 1, 1 / 60) * oldDuration
  const extended = advanceScene(0, 1, 1 / 60, SCENE_SECONDS * extendedDuration / oldDuration) * extendedDuration
  assert.ok(Math.abs(previous - extended) < 1e-12)
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
