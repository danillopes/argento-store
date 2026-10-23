export function advanceColor(current: number, target: number, deltaSeconds: number) {
  const step = Math.max(0, Math.min(deltaSeconds, 0.1)) / 3.4
  return current + Math.sign(target - current) * Math.min(Math.abs(target - current), step)
}
export function batteryPercent(time: number) {
  return Math.round(Math.max(0, Math.min(1, (time - 5) / 0.9)) * 97)
}
