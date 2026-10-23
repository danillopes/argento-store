# Modelos 3D (.glb)

Coloque aqui os arquivos baixados do Sketchfab (formato **glTF Binary / .glb**), com estes nomes:

```
iphone-12.glb          iphone-12-pro.glb      iphone-12-pro-max.glb   iphone-12-mini.glb
iphone-13.glb          iphone-13-pro.glb      iphone-13-pro-max.glb   iphone-13-mini.glb
iphone-14.glb          iphone-14-plus.glb     iphone-14-pro.glb       iphone-14-pro-max.glb
iphone-15.glb          iphone-15-plus.glb     iphone-15-pro.glb       iphone-15-pro-max.glb
iphone-16.glb          iphone-16-plus.glb     iphone-16-pro.glb       iphone-16-pro-max.glb   iphone-16e.glb
iphone-17.glb          iphone-air.glb         iphone-17-pro.glb       iphone-17-pro-max.glb   iphone-17e.glb
iphone-18-pro.glb      iphone-18-pro-max.glb
```

O site detecta cada arquivo sozinho. Se faltar algum:
- Pro Max usa o arquivo do Pro da mesma geração;
- mini, Plus e "e" usam o modelo base da geração;
- sem nenhum arquivo, aparece o iPhone 3D procedural do próprio site.

A animação da página inicial usa exclusivamente `iphone-17-pro.glb`.

O iPhone 17 Pro vem do arquivo `iphone-17-pro.zip` fornecido pelo usuário,
entrada `source/iPhone 17 Pro.glb`. Ele substitui o modelo simplificado anterior.
As malhas, os materiais e a resolução das texturas foram preservados; as texturas
foram reempacotadas em WebP sem perda, com igualdade dos pixels validada.
O acabamento de alumínio e o vidro traseiro acompanham a cor do configurador.

O original está em `fotos-originais/modelos3d/iphone-17-pro-original.glb`.
Para reimportar: `node scripts/importar-iphone-17-pro.mjs`.
Os hashes e os tamanhos ficam em `iphone-17-pro-fonte.json`.
O manifesto versiona o endereço de cada GLB pelo hash para renovar o cache PWA.

## Antes de publicar
- Use só modelos com licença que permita uso comercial (ex.: CC BY) e credite o autor no rodapé.
- Prefira arquivos leves (até ~5 MB). Para comprimir: `npx gltf-transform optimize entrada.glb saida.glb --texture-compress webp`.
- O GitHub recusa arquivos acima de 100 MB.
