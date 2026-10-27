# fotos-render

Arte de catálogo dos aparelhos que não têm foto oficial da Apple. Ao contrário de `fotos-originais/`, que fica
só na máquina do Daniel, esta pasta entra no Git: a arte é preparada por nós e precisa existir em qualquer
máquina que rode `npm run fotos`.

As imagens aqui passam pelo mesmo enquadramento das fotos da Apple (`scripts/lib/enquadrar.mjs`), então já saem
na escala do catálogo — um aparelho maior aparece maior.

## iphone-duo

Foto de catálogo do iPhone Duo publicada pela iPlace (revendedora Apple Premium Partner), nas duas cores:

- fonte: https://www.iplace.com.br/iphone-duo/101081PR
- preparada com `node scripts/arte-catalogo-foto.mjs iphone-duo <cor> <foto> 570`

O 570 é a altura do aparelho em pixels na tela de 612x760 das fotos oficiais; é o que mantém o Duo no mesmo
tamanho relativo dos iPhones.

## Como gerar arte a partir do modelo 3D

Quando não houver nem foto de revendedor, dá para renderizar o próprio modelo 3D do site:

```
npm run build && npx vite preview --port 4178
node scripts/arte-catalogo-3d.mjs <id-do-modelo> 4178
```

O gerador fotografa a traseira e a frente na página do produto, tira o fundo e monta o par no enquadramento das
fotos oficiais, usando o iPhone 17 Pro Max como régua de escala.
