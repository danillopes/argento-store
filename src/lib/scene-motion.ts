// A velocidade da sequência não depende do tamanho de um evento de roda do mouse.
export const SCENE_SECONDS = 14
export function advanceScene(current: number, target: number, deltaSeconds: number, sequenceSeconds = SCENE_SECONDS) {
  const destination = Math.max(0, Math.min(1, target))
  const dt = Math.max(0, Math.min(deltaSeconds, 1 / 20))
  const distance = destination - current
  const eased = Math.abs(distance) * (1 - Math.exp(-dt / 0.18))
  const step = Math.min(Math.abs(distance), dt / sequenceSeconds, eased)
  return current + Math.sign(distance) * step
}
