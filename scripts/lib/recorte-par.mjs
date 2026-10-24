// A foto de catálogo de cada cor traz o par do mesmo aparelho: a traseira à esquerda e a frente à direita, sobre
// fundo branco, com a frente sobrepondo a traseira. Este módulo separa os dois e tira o fundo, devolvendo cada
// aparelho como uma imagem só, com transparência — é o que a galeria em camadas usa para montar o trio.
//
// A traseira sai cortada onde a frente a cobre (≈30% da largura dela), então ela só serve em cima de um lugar onde
// esse corte fique escondido por outro aparelho.
import sharp from 'sharp'

const BRANCO = 243 // a partir deste valor nos três canais o pixel conta como fundo

// Fundo = branco ligado à borda da imagem. Partir da borda preserva o branco de dentro do aparelho (tela, reflexos).
function marcarFundo(dados, L, A, canais) {
  const fundo = new Uint8Array(L * A)
  const pilha = []
  const claro = (i) => dados[i * canais] >= BRANCO && dados[i * canais + 1] >= BRANCO && dados[i * canais + 2] >= BRANCO
  const empilhar = (i) => { if (!fundo[i] && claro(i)) { fundo[i] = 1; pilha.push(i) } }
  for (let x = 0; x < L; x++) { empilhar(x); empilhar((A - 1) * L + x) }
  for (let y = 0; y < A; y++) { empilhar(y * L); empilhar(y * L + L - 1) }
  while (pilha.length) {
    const i = pilha.pop(), x = i % L, y = (i - (i % L)) / L
    if (x > 0) empilhar(i - 1)
    if (x < L - 1) empilhar(i + 1)
    if (y > 0) empilhar(i - L)
    if (y < A - 1) empilhar(i + L)
  }
  // engorda o fundo em 1 px: come a franja clara da borda do aparelho, que viraria um halo branco
  const engordado = Uint8Array.from(fundo)
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = y * L + x
      if (fundo[i]) continue
      if ((x > 0 && fundo[i - 1]) || (x < L - 1 && fundo[i + 1]) || (y > 0 && fundo[i - L]) || (y < A - 1 && fundo[i + L])) engordado[i] = 1
    }
  }
  return engordado
}

// Emenda entre os dois aparelhos. Da esquerda para a direita, no miolo da foto, as colunas seguem esta ordem:
// corpo da traseira · sombra da emenda · lateral clara da frente · moldura preta da tela. Achamos a moldura preta,
// voltamos até o alto da lateral e seguimos descendo até a sombra — é ali que um aparelho termina e o outro começa.
function colunaDoCorte(cinza, L, A, y0, y1) {
  const media = new Float64Array(L)
  for (let x = 0; x < L; x++) {
    let soma = 0
    for (let y = y0; y < y1; y++) soma += cinza[y * L + x]
    media[x] = soma / (y1 - y0)
  }
  const ini = Math.round(L * 0.3), fim = Math.round(L * 0.7)
  let moldura = -1
  for (let x = ini; x < fim; x++) if (media[x] < 25) { moldura = x; break }
  if (moldura < 0) { // sem moldura escura: fica no maior contraste
    let maior = -1, melhor = Math.round(L / 2)
    for (let x = ini; x < fim; x++) if (Math.abs(media[x] - media[x - 1]) > maior) { maior = Math.abs(media[x] - media[x - 1]); melhor = x }
    return melhor
  }
  let cume = moldura - 1
  for (let x = Math.max(ini, moldura - 8); x < moldura; x++) if (media[x] > media[cume]) cume = x
  let corte = cume
  while (corte - 1 >= ini && media[corte - 1] < media[corte]) corte--
  return corte
}

// No alto e embaixo, onde o canto arredondado do aparelho da frente se afasta, aparece a traseira por trás. Como o
// aparelho é simétrico, a borda esquerda de cada linha é o espelho da direita — o que estiver além disso é da traseira.
function limparSobraDaTraseira(fundo, L, A, corte) {
  const direita = new Int32Array(A).fill(-1)
  let maior = -1
  for (let y = 0; y < A; y++) {
    for (let x = L - 1; x >= corte; x--) if (!fundo[y * L + x]) { direita[y] = x; break }
    if (direita[y] > maior) maior = direita[y]
  }
  for (let y = 0; y < A; y++) {
    if (direita[y] < 0) continue
    const recuo = maior - direita[y]
    if (recuo < 4) continue // só os cantos; no trecho reto a borda já é a do próprio aparelho
    for (let x = corte; x < corte + recuo && x < L; x++) fundo[y * L + x] = 1
  }
  // repete a primeira coluna para a esquerda: a média 3×3 do alfa não enxerga a traseira, que ficaria como um fio
  // claro grudado na lateral da frente
  for (let y = 0; y < A; y++) for (let x = 0; x < corte; x++) fundo[y * L + x] = fundo[y * L + corte]
}

function caixa(fundo, L, A, x0, x1) {
  let eX = x1, dX = x0, cY = A, bY = 0
  for (let y = 0; y < A; y++) {
    for (let x = x0; x <= x1; x++) {
      if (fundo[y * L + x]) continue
      if (x < eX) eX = x
      if (x > dX) dX = x
      if (y < cY) cY = y
      if (y > bY) bY = y
    }
  }
  return { left: eX, top: cY, width: dX - eX + 1, height: bY - cY + 1 }
}

/** Separa a foto do par em { traseira, frente }: cada um é um PNG com fundo transparente. */
export async function recortarPar(entrada) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = info.width, A = info.height, canais = info.channels
  const fundo = marcarFundo(data, L, A, canais)
  const cinza = new Uint8Array(L * A)
  for (let i = 0; i < L * A; i++) cinza[i] = (data[i * canais] * 299 + data[i * canais + 1] * 587 + data[i * canais + 2] * 114) / 1000
  let y0 = A, y1 = 0
  for (let y = 0; y < A; y++) for (let x = 0; x < L; x++) if (!fundo[y * L + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; break }
  const corte = colunaDoCorte(cinza, L, A, y0 + 40, y1 - 40)
  // a coluna do corte é a sombra da emenda: fica com a traseira, senão vira um fio cinza na lateral da frente
  const inicioFrente = corte + 1
  const fundoFrente = Uint8Array.from(fundo)
  limparSobraDaTraseira(fundoFrente, L, A, inicioFrente)

  // alfa suavizado (média 3×3) para a borda não ficar serrilhada
  const comAlfa = (mascara) => {
    const rgba = Buffer.alloc(L * A * 4)
    for (let y = 0; y < A; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x
        let soma = 0, n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const vx = x + dx, vy = y + dy
            if (vx < 0 || vy < 0 || vx >= L || vy >= A) { n++; continue }
            soma += mascara[vy * L + vx] ? 0 : 255
            n++
          }
        }
        rgba[i * 4] = data[i * canais]
        rgba[i * 4 + 1] = data[i * canais + 1]
        rgba[i * 4 + 2] = data[i * canais + 2]
        rgba[i * 4 + 3] = Math.round(soma / n)
      }
    }
    return sharp(rgba, { raw: { width: L, height: A, channels: 4 } })
  }
  return {
    traseira: await comAlfa(fundo).extract(caixa(fundo, L, A, 0, corte)).png().toBuffer(),
    frente: await comAlfa(fundoFrente).extract(caixa(fundoFrente, L, A, inicioFrente, L - 1)).png().toBuffer(),
    corte,
  }
}
