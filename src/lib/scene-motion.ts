// Uma única suavização curta para o gesto; cores têm seu próprio limite.
export function advanceScene(current: number, target: number, deltaSeconds: number) {
  const destination = Math.max(0, Math.min(1, target))
  const dt = Math.max(0, Math.min(deltaSeconds, 0.1))
  return current + (destination - current) * (1 - Math.exp(-dt / 0.09))
}
export function advanceColor(current: number, target: number, deltaSeconds: number) {
  const step = Math.max(0, Math.min(deltaSeconds, 0.1)) / 3.4
  return current + Math.sign(target - current) * Math.min(Math.abs(target - current), step)
}
export function batteryPercent(time: number) {
  return Math.round(Math.max(0, Math.min(1, (time - 5) / 0.9)) * 97)
}
