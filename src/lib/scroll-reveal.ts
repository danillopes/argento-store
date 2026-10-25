const smooth = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t) }
// Screen-space envelope around the existing pinned timeline, identical in both directions.
export function modelScrollReveal(scroll: number, start: number, end: number, height: number, viewport: number) {
  const top = scroll < start ? start - scroll : scroll > end ? end - scroll : 0
  const entering = smooth((scroll - start + viewport * .65) / (viewport * .8))
  const leaving = smooth((top + height) / (viewport * .55))
  return { opacity: entering * leaving, y: (1 - entering) * 28 - (1 - leaving) * 28 }
}
