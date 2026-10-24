// Busca de modelos compartilhada pela barra do topo e pelo catálogo.
// Reconhece o nome exato do modelo: "14 pro" traz só o iPhone 14 Pro (não o 14 Pro Max), "14" só o iPhone 14,
// "pro max" todos os Pro Max, "duo" o iPhone Duo. Os demais termos (cor, capacidade, chip, recurso, ano) filtram.
import { MODELS, frontLabel, storageLabel, type PhoneModel } from '../data/models'
import { normalize } from './utils'

// separa número seguido de letra ("14pro" → "14 pro", "16e" → "16 e", "256gb" → "256 gb"); chips como "a18" ficam inteiros
const tokens = (s: string) =>
  normalize(s).replace(/(\d)([a-z])/g, '$1 $2').split(/[^a-z0-9]+/).filter(Boolean)

const nameTokens = (m: PhoneModel) => tokens(m.name).filter((t) => t !== 'iphone')
const VOCAB = new Set(MODELS.flatMap(nameTokens))
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))

const haystack = (m: PhoneModel) =>
  normalize(`${m.name} ${m.chip} ${m.cameras} ${frontLabel(m)} ${m.features.join(' ')} ${m.colors.map((c) => c.name).join(' ')} ${m.storages.map((s) => storageLabel(s)).join(' ')} ${m.storages.join('gb ')}gb ${m.year}`)

/** modelos que correspondem à busca, com o modelo exato primeiro; lista vazia se a busca estiver vazia */
export function searchModels(q: string, models: PhoneModel[] = MODELS): PhoneModel[] {
  const qt = tokens(q).filter((t) => t !== 'iphone')
  if (!qt.length) return []
  const nome = new Set(qt.filter((t) => VOCAB.has(t)))
  const resto = qt.filter((t) => !VOCAB.has(t))
  // "gb"/"tb" soltos (de "256gb") viram parte da capacidade
  const termos = resto.filter((t) => t !== 'gb' && t !== 'tb')
  let base = models
  if (nome.size) {
    const exatos = models.filter((m) => same(new Set(nameTokens(m)), nome))
    base = exatos.length ? exatos : models.filter((m) => [...nome].every((t) => nameTokens(m).includes(t)))
  }
  return base.filter((m) => {
    const hay = haystack(m)
    return termos.every((t) => hay.includes(t))
  })
}
