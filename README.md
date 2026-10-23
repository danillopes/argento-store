# Argento — loja de iPhones (showroom digital)

Loja demonstrativa de iPhones novos e seminovos (iPhone 12 ao 18 Pro Max) com:

- **Scrollytelling cinematográfico** — GSAP + ScrollTrigger + Lenis, iPhone 3D (React Three Fiber) que gira, aproxima nas câmeras, muda de fundo e de cor com a rolagem.
- **Motion Gallery** — rolagem horizontal com parallax, galeria infinita arrastável, galeria em camadas, zoom no hover, inclinação 3D e animação de seleção que expande o card até o configurador.
- **Configurador** — condição, armazenamento, cor, saúde da bateria, conservação e escolha da unidade física; só existem combinações que estão no estoque.
- **Loja** — catálogo com busca e filtros, comparador, favoritos, carrinho, checkout (Pix/cartão em modo demonstração), meus pedidos com linha do tempo e reserva de 15 min.
- **Painel** (`#/admin`) — visão geral, estoque, pedidos, clientes, política de preços com simulação e área fiscal.
- Header com glassmorphism, modo claro/escuro e `prefers-reduced-motion`.

## Rodar

```bash
npm install
npm run dev
```

## Modelos 3D
Coloque arquivos `.glb` em `public/models/` (veja `public/models/LEIA-ME.md`). Sem eles, o site usa o iPhone 3D procedural.

## O que ainda é demonstrativo
Estoque, preços e pedidos ficam no navegador (localStorage). Para produção: Supabase (banco, auth, RLS, storage de fotos), Mercado Pago/Stripe com webhook, provedor fiscal para NF-e/NFC-e.

Revenda independente — não é loja oficial nem autorizada da Apple. iPhone é marca registrada da Apple Inc.

## Fotos reais
Veja **FOTOS.md**: coloque as fotos em `fotos-originais/`, rode `npm run fotos` e envie. As imagens viram AVIF/WebP responsivos com miniatura borrada.

## Desempenho e cache
- Service worker (PWA): da 2ª visita em diante a loja abre do cache do aparelho, inclusive offline; fotos e modelos 3D ficam guardados após o primeiro download.
- Páginas e o motor 3D são baixados sob demanda; a página inicial mostra uma ilustração enquanto o 3D carrega.
- O 3D pausa quando sai da tela ou a aba fica oculta e reduz a resolução sozinho se o FPS cair.
- Imagens com `loading="lazy"`, tamanhos responsivos e dimensões fixas (sem pulos de layout).

O GLB principal começa a baixar e decodificar junto da abertura do site. O binário
fica no Cache Storage mesmo na primeira visita, e o modelo decodificado é
compartilhado pelo preload e pelo configurador durante a sessão. O hash no endereço
faz baixar novamente somente quando o arquivo muda. A primeira visita ainda
precisa da transferência inicial; uma nova sessão também precisa preparar o modelo
na GPU. O navegador pode remover caches se faltar espaço.

A apresentação limita a velocidade da sequência independentemente dos saltos do
mouse e não reinicia ao trocar de tema. No mobile, o 3D só é revelado ao rolar e
fica numa área própria abaixo do texto. Os acabamentos têm pausas e transições
mais longas, preservando o ritmo das outras cenas. Teste de regressão:
`node --test scripts/test-scene-and-cache.mjs`.
