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
