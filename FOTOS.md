# Como adicionar fotos reais

## 1. Organize as fotos originais (JPG/PNG/HEIC do celular)

Crie a pasta `fotos-originais/` na raiz do projeto:

```
fotos-originais/
  modelos/                         ← foto de catálogo de cada cor (aparece nos cards e na aba "Foto")
    iphone-15-pro/
      titanio-azul.jpg
      titanio-natural.jpg
    iphone-13/
      meia-noite.jpg
  unidades/                        ← fotos reais de cada aparelho do estoque
    ARG-1069/
      01-frente.jpg
      02-traseira.jpg
      03-laterais.jpg
      04-detalhe-arranhao.jpg
```

- O nome da pasta do modelo e da cor segue o código usado no site (`src/data/models.ts`), ex.: `titanio-azul`, `meia-noite`, `azul-profundo`.
- O ID da unidade (`ARG-1069`) aparece no painel → Estoque e na própria página do produto.
- O número no começo do arquivo define a ordem; o resto vira a legenda ("04-detalhe-arranhao" → "Detalhe arranhao").

## 2. Converta

```bash
npm run fotos
```

O script gera, para cada foto, versões **AVIF** e **WebP** em 3 tamanhos (o navegador baixa só a que serve para a tela),
corrige a rotação do celular e cria uma miniatura borrada que aparece na hora enquanto a foto carrega.
Uma foto de 4 MB vira ~40–120 KB.

## 3. Envie

```bash
git add public/fotos src/data/photos.json
git commit -m "Fotos novas"
git push
```

A pasta `fotos-originais/` não vai para o GitHub (fica só no seu computador); vão apenas as versões otimizadas.

## Dicas de foto
- Fundo neutro (branco ou cinza), luz difusa de janela, sem flash.
- Fotografe a unidade real: tela acesa e apagada, traseira, as 4 laterais e close de qualquer marca.
- Não use imagens oficiais da Apple ou de outros sites: são protegidas por direitos autorais.
