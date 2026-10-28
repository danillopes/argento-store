// Botão de atendimento pelo WhatsApp. Centraliza três coisas que não podem variar de tela para tela: o número
// vem das configurações da loja, a mensagem é montada a partir do que a pessoa está vendo, e o clique é
// registrado como interesse — que é diferente de conversa e de venda.
import { useStore } from '../store/Store'
import { linkWhatsApp, mensagemComparacao, mensagemEspecialista, mensagemInteresse, mensagemLoja } from '../lib/whatsapp'
import type { Unit } from '../data/inventory'
import type { PhoneModel } from '../data/models'
import type { ReactNode } from 'react'

export interface Escolha {
  model: PhoneModel
  storage?: number | null
  colorName?: string | null
  unit?: Unit | null
}

export type TipoContato = 'interesse' | 'especialista' | 'comparacao' | 'loja'

export default function Contato({
  tipo,
  escolha,
  escolhas,
  classe = 'btn btn-primary',
  children,
}: {
  tipo: TipoContato
  escolha?: Escolha
  escolhas?: Escolha[]
  classe?: string
  children: ReactNode
}) {
  const { config, registrarInteresse, toast } = useStore()
  const lista = escolhas ?? (escolha ? [escolha] : [])
  if (tipo !== 'loja' && !lista.length) return null

  const mensagem =
    tipo === 'loja' ? mensagemLoja()
    : tipo === 'comparacao' ? mensagemComparacao(lista)
    : tipo === 'especialista' ? mensagemEspecialista(lista[0])
    : mensagemInteresse(lista[0])
  const href = linkWhatsApp(config.whatsapp, mensagem)

  // Sem número configurado o botão continua visível, mas avisa em vez de abrir uma conversa com ninguém.
  if (!href) {
    return (
      <button type="button" className={classe} onClick={() => toast('A loja ainda não configurou o WhatsApp de atendimento.')}>
        {children}
      </button>
    )
  }
  return (
    <a
      className={classe}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrarInteresse({ tipo, modelId: lista[0]?.model.id ?? '—', unitId: lista[0]?.unit?.id })}
    >
      {children}
    </a>
  )
}
