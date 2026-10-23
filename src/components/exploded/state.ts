// Estado da desmontagem (sem three.js, para não pesar o carregamento inicial)
export interface ExplodeState {
  progress: number // 0..1 desmontagem
  lens: number // 0..1 separação das lentes / foco nas câmeras
  focus: number // 0..1 aproximação da câmera virtual no módulo de câmeras (seção da home)
  selected: string | null // nó selecionado
  spin: number // rotação de apresentação (rad)
}

export const newExplodeState = (): ExplodeState => ({ progress: 0, lens: 0, focus: 0, selected: null, spin: 0 })

