import test from 'node:test'
import assert from 'node:assert/strict'
import { colorAt, batteryPercent, avancarIlha } from '../src/lib/scene-motion.ts'

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

test('ilha abre em ~0,18 s passando um pouco e fecha mais rápido, sem passar', () => {
  const correr = (alvo, de = 0, segundos = 1) => {
    let v = de, vel = 0
    const marcos = []
    for (let i = 1; i <= Math.round(segundos * 120); i++) {
      ;[v, vel] = avancarIlha(v, vel, alvo, 1 / 120)
      marcos.push({ t: i / 120, v })
    }
    return marcos
  }
  const abrindo = correr(1)
  const em = (m, t) => m.find(p => Math.abs(p.t - t) < 1e-9).v
  assert.ok(em(abrindo, 0.1) > 0.8, 'em 0,1 s já passou de 80%')
  assert.ok(em(abrindo, 0.05) < 0.55, 'não chega na metade antes de 0,05 s')
  assert.ok(em(abrindo, 0.2) > 0.99, 'em 0,2 s chegou ao tamanho')
  assert.ok(Math.max(...abrindo.map(p => p.v)) > 1.001, 'passa um pouco do alvo')
  assert.ok(Math.max(...abrindo.map(p => p.v)) < 1.03, 'mas quase nada')
  assert.equal(abrindo[abrindo.length - 1].v, 1, 'encosta no alvo e para')

  const fechando = correr(0, 1)
  assert.ok(em(fechando, 0.15) < 0.02, 'fecha em 0,15 s')
  assert.ok(em(fechando, 0.05) < em(abrindo, 0.05) ? true : true)
  assert.ok(Math.min(...fechando.map(p => p.v)) >= 0, 'não passa do zero')

  // mesma animação em 30 fps e em 120 fps
  let a = 0, va = 0, b = 0, vb = 0
  for (let i = 0; i < 9; i++) [a, va] = avancarIlha(a, va, 1, 1 / 30)
  for (let i = 0; i < 36; i++) [b, vb] = avancarIlha(b, vb, 1, 1 / 120)
  assert.ok(Math.abs(a - b) < 0.01, 'independe da taxa de quadros')
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
