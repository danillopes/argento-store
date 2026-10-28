// Monta os links de atendimento no WhatsApp. O número vem das configurações da loja (painel), nunca fixo no
// código, e a mensagem é montada com o que o visitante está realmente vendo na tela.
import { gradeName, finalPrice, type Unit } from '../data/inventory'
import { storageLabel, type PhoneModel } from '../data/models'
import { brl } from './utils'

/** Link do aparelho, absoluto, para a pessoa do outro lado abrir o mesmo que o visitante estava vendo. */
export const linkDoProduto = (modelId: string) => `${location.origin}${location.pathname}#/produto/${modelId}`

const limpar = (numero: string) => numero.replace(/\D/g, '')

/** `undefined` quando a loja ainda não configurou o número — quem chama decide o que mostrar. */
export function linkWhatsApp(numero: string, mensagem: string): string | undefined {
  const n = limpar(numero)
  if (n.length < 10) return undefined
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`
}

interface Escolha {
  model: PhoneModel
  storage?: number | null
  colorName?: string | null
  unit?: Unit | null
}

// "iPhone 16 Pro, 256 GB, na cor Titânio Natural"
function descrever({ model, storage, colorName, unit }: Escolha) {
  const partes = [model.name]
  const cap = storage ?? unit?.storage
  if (cap) partes.push(storageLabel(cap))
  const cor = colorName ?? (unit ? model.colors.find((c) => c.id === unit.colorId)?.name : null)
  if (cor) partes.push(`na cor ${cor}`)
  return partes.join(', ')
}

/** Mensagem do botão principal: o visitante já escolheu um aparelho e quer falar sobre ele. */
export function mensagemInteresse(escolha: Escolha) {
  const { model, unit } = escolha
  const linhas = [
    `Olá! Estava explorando o catálogo de vocês e me interessei pelo ${descrever(escolha)}. ` +
      'Gostaria de consultar a disponibilidade e as condições de pagamento.',
  ]
  const detalhes: string[] = []
  if (unit) {
    detalhes.push(`Unidade: ${unit.id}`)
    detalhes.push(`Estado: ${unit.condition === 'novo' ? 'Novo lacrado' : gradeName(unit.grade)}`)
    if (unit.condition === 'seminovo') detalhes.push(`Saúde da bateria: ${unit.battery}%`)
    detalhes.push(`Preço anunciado: ${brl(finalPrice(unit))}`)
  }
  detalhes.push(`Link: ${linkDoProduto(model.id)}`)
  linhas.push('', ...detalhes)
  return linhas.join('\n')
}

/** Mensagem do botão secundário: quer atendimento sobre o aparelho, sem ter fechado uma escolha. */
export function mensagemEspecialista(escolha: Escolha) {
  return [
    `Olá! Estou vendo o ${descrever(escolha)} no site e gostaria de falar com um especialista antes de decidir.`,
    '',
    `Link: ${linkDoProduto(escolha.model.id)}`,
  ].join('\n')
}

/** Mensagem do comparador: a pessoa está em dúvida entre os modelos que escolheu. */
export function mensagemComparacao(escolhas: Escolha[]) {
  return [
    'Olá! Estou comparando estes iPhones no site de vocês e gostaria de ajuda para escolher:',
    '',
    ...escolhas.map((e) => `• ${descrever(e)}`),
    '',
    `Link da comparação: ${location.origin}${location.pathname}#/comparar`,
  ].join('\n')
}

/** Contato geral da loja: garantia, troca, pagamento — sem aparelho escolhido. Fica no rodapé e no Sobre nós,
 *  longe da página do produto, para não disputar com a ação principal de lá. */
export function mensagemLoja() {
  return 'Olá! Vim pelo site e gostaria de falar com a loja — tenho dúvidas sobre atendimento, garantia e formas de pagamento.'
}
