---
name: iziline
description: Caronas intermunicipais confiáveis — teal sereno sobre claro, plano e legível.
colors:
  teal: "#4f8f8c"
  teal-deep: "#3f7774"
  teal-wash: "#e7f1f0"
  ink: "#263647"
  ink-soft: "#31465b"
  muted: "#667678"
  page: "#f5f8f7"
  surface: "#ffffff"
  border: "#d7e1e0"
  danger: "#b42318"
typography:
  display:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  headline:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  sm: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.teal-deep}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.teal-deep}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  nav-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "42px"
---

# Design System: iziline

## 1. Overview

**Creative North Star: "A Estrada Tranquila"**

O iziline é uma viagem serena e bem sinalizada. O sistema respira sobre um fundo claro levemente esverdeado (`#f5f8f7`), com a tinta em azul-petróleo profundo (`#263647`) e um teal calmo (`#4f8f8c`) que funciona como o guia da estrada: aparece só onde há ação ou estado, nunca como enfeite. Cada informação — origem, destino, paradas, vagas, status da reserva — é um marco de estrada legível num relance. Nada grita, nada corre na frente do usuário.

A personalidade é **confiável, tranquila e direta**. Isso se traduz em superfícies planas em repouso, hierarquia clara, pesos de fonte contidos e muito espaço para respirar. O calor não vem de decoração, vem da clareza: o usuário sempre sabe o que está acontecendo e em que pé está. Como o produto vive **no celular, muitas vezes na estrada**, o sistema é pensado primeiro para a tela pequena e para o toque — legibilidade e alvos generosos antes de qualquer refinamento.

O sistema **rejeita** explicitamente três coisas, herdadas das anti-referências do produto: o visual de **super-app poluído** (banners, promoções, cores gritando, densidade caótica); o **template genérico de IA** (grades de cards idênticos, gradientes decorativos, eyebrow tracejado em toda seção); e o tom **lúdico / rede social** (emojis, gamificação, bolhas) que minaria a sensação de segurança.

**Key Characteristics:**
- Teal sereno sobre claro; azul-petróleo como tinta; teal reservado a ação e estado.
- Plano por padrão — profundidade só como resposta a estado (hover/foco).
- Cantos suaves e consistentes (8px em tudo).
- Mobile-first, alvos de toque ≥44–48px.
- Legibilidade e ausência de ambiguidade acima de ornamento.

## 2. Colors

Uma paleta calma e de baixa saturação: um teal como única voz de marca, azul-petróleo para texto, e neutros claros esverdeados para superfície e estrutura.

### Primary
- **Teal Sereno** (`#4f8f8c`): a única cor de marca. Botão primário, borda/anel de foco, estado ativo/selecionado, indicadores de status positivo. É o "guia da estrada".
- **Teal Profundo** (`#3f7774`): estado de hover/active do teal e texto sobre lavagem clara (eyebrows, valores em destaque).
- **Lavagem Teal** (`#e7f1f0`): fundo tonal para chips, item de navegação ativo, badges e superfícies de destaque suave.

### Neutral
- **Azul-Petróleo** (`#263647`): tinta principal — títulos, texto forte, rótulos. Nunca cinza claro para corpo.
- **Azul-Petróleo Suave** (`#31465b`): variação para camadas de tinta secundária.
- **Cinza-Estrada** (`#667678`): texto secundário/muted; passa contraste ≥4.5:1 sobre superfície branca.
- **Papel Esverdeado** (`#f5f8f7`): fundo do app (com o `pattern.png` em opacidade baixa).
- **Superfície** (`#ffffff`): cards, inputs, painéis.
- **Borda-Névoa** (`#d7e1e0`): bordas e divisores — a estrutura é feita de linhas de 1px, não de sombra.

### Tertiary
- **Vermelho-Sinal** (`#b42318`): exclusivo para erro de validação e ação destrutiva (cancelar/recusar). Nunca decorativo.

### Named Rules
**The One Voice Rule.** O teal é a única cor de marca. Em qualquer tela ele ocupa ≤10% da área e só marca **ação ou estado** (botão primário, foco, seleção, status). Decorar com teal é proibido.

**The Single Accent Rule.** Existe **um** sistema de cor: o teal-sobre-claro. O `--accent` azul (`#2563eb`) e o dark-mode herdados do template Vite em `frontend/src/index.css` são legado e devem ser consolidados para os tokens desta paleta. Nunca introduza um segundo azul de marca.

## 3. Typography

**Display / Body / Label Font:** `system-ui` (com fallback `'Segoe UI', Roboto, sans-serif`)

**Character:** Uma única família sans do sistema carrega tudo — títulos, corpo, rótulos, dados. Nativa em cada aparelho, rápida em redes modestas, invisível na tarefa. Sem pareamento display/serif: em UI de produto, uma sans bem ajustada basta e a consistência é virtude.

### Hierarchy
- **Display** (700, `2rem`/32px, lh 1.15): título de página/tela. Um por vista.
- **Headline** (700, `1.25rem`/20px, lh 1.2): título de card ou seção.
- **Title** (600, `1rem`/16px, lh 1.35): sub-cabeçalhos e valores fortes (origem/destino, horário).
- **Body** (400, `1rem`/16px, lh 1.45): texto corrido; máx. 65–75ch em prosa.
- **Label** (600, `0.875rem`/14px): rótulos de meta ("Saída", "Vagas", "Status"). Peso contido — **sem uppercase tracked**.

### Named Rules
**The Fixed-Scale Rule.** Em UI de produto o tamanho é fixo em `rem`, não fluido. Reserve `clamp()` para superfícies de marca; um h1 que encolhe dentro de um card fica pior, não melhor.

**The Calm Weight Rule.** Peso máximo de rotina é **700** (títulos) e **600** (rótulos/botões). O peso 800 espalhado do código atual é ruído — dá para engrossar um dado pontual, não a tela inteira.

## 4. Elevation

**Plano por padrão.** As superfícies são planas em repouso: a estrutura vem de bordas de 1px (`#d7e1e0`) e das lavagens tonais, não de sombra. A sombra é **resposta a estado**, não decoração — aparece sutil no hover de um card clicável ou para elevar um elemento realmente flutuante (dropdown, modal). O drop-shadow difuso e pesado (`0 18px 40px`) usado hoje nos cards em repouso está **aposentado**.

### Shadow Vocabulary
- **Hover sutil** (`box-shadow: 0 6px 18px rgba(38, 54, 71, 0.10)`): realce leve de um card/linha interativo ao passar o mouse.
- **Flutuante** (`box-shadow: 0 10px 30px rgba(38, 54, 71, 0.16)`): apenas elementos que saem do plano (menu de sugestões, modal).

### Named Rules
**The Flat-At-Rest Rule.** Nada de sombra em card, input ou botão parado. Profundidade só quando o estado muda ou o elemento realmente flutua.

## 5. Components

Componentes refinados e leves: cantos de 8px, pesos contidos, foco sempre visível em teal. Vocabulário idêntico entre os fluxos de motorista e passageiro.

### Buttons
- **Shape:** cantos suaves (8px), altura 48px, `font-weight` 600, padding `0 18px`.
- **Primary:** fundo Teal Sereno (`#4f8f8c`), texto branco. Plano em repouso.
- **Hover / Focus:** hover escurece para Teal Profundo (`#3f7774`); foco = anel `outline: 3px solid rgba(79,143,140,0.28)` com `outline-offset: 2px`.
- **Secondary:** fundo branco, texto Azul-Petróleo, borda 1px `#d7e1e0`. Para ações neutras (voltar/cancelar navegação).
- **Destructive:** para recusar/cancelar reserva, use texto/borda Vermelho-Sinal (`#b42318`); nunca vermelho como primário decorativo.
- **Disabled:** `opacity: 0.72`, `cursor: not-allowed`.

### Inputs / Fields
- **Style:** altura 48px, fundo branco, borda 1px `#d7e1e0`, raio 8px, padding `10px 12px`, texto Azul-Petróleo.
- **Focus:** borda Teal Sereno + `box-shadow: 0 0 0 3px rgba(79,143,140,0.18)`, sem outline nativo.
- **Error:** borda Vermelho-Sinal e mensagem `0.9rem` abaixo do campo, com `aria-invalid`/`aria-describedby`.

### Chips / Status
- **Style:** fundo Lavagem Teal (`#e7f1f0`), texto Teal Profundo, raio 8px.
- **Status de reserva:** `pendente / confirmada / recusada / cancelada` sempre com **rótulo textual** além da cor — nunca só cor. Badges circulares (`999px`) só para marcadores pequenos.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** branco sobre o Papel Esverdeado.
- **Shadow Strategy:** plano em repouso (ver Elevation); sombra sutil só no hover de cards interativos.
- **Border:** 1px `#d7e1e0`.
- **Internal Padding:** 24px (16px em telas pequenas).

### Navigation
- **Style:** barra sticky, itens 42px, raio 8px, peso contido; ativo/hover usam Lavagem Teal com texto Teal Profundo. Em ≤540px empilha em coluna full-width.

### Signature: Trip Route / Stops
Trajeto exibido como pontos ordenados (origem → paradas → destino) ligados por um conector vertical em Lavagem Teal. É o componente que carrega a confiança: mostra explicitamente por onde a viagem passa. Mantê-lo legível e literal, sem enfeite.

## 6. Do's and Don'ts

### Do:
- **Do** usar o Teal Sereno (`#4f8f8c`) só para ação e estado, ≤10% da tela (The One Voice Rule).
- **Do** manter superfícies planas em repouso; sombra só em hover/estado ou elementos flutuantes.
- **Do** projetar **mobile-first**: layout parte da tela pequena; alvos de toque ≥44–48px (o desktop de 2 colunas é o realce, não o ponto de partida).
- **Do** rotular todo status de reserva com texto além da cor (daltonismo; WCAG AA).
- **Do** manter contraste ≥4.5:1 em corpo — texto em Azul-Petróleo ou Cinza-Estrada, nunca cinza claro "por elegância".
- **Do** respeitar `prefers-reduced-motion` com alternativa (crossfade/instantâneo); transições curtas de 150–250ms que comunicam estado.
- **Do** usar uma única sans do sistema em tamanhos `rem` fixos.

### Don't:
- **Don't** parecer um **super-app poluído**: sem banners promocionais, sem cores gritando, sem densidade caótica.
- **Don't** cair no **template genérico de IA**: sem grades de cards idênticos, sem gradientes decorativos, sem eyebrow uppercase tracejado em toda seção (o `.trip-review-card__eyebrow` atual é exatamente esse reflexo — evite).
- **Don't** usar tom **lúdico / rede social**: sem emojis, gamificação ou bolhas que minem a seriedade.
- **Don't** introduzir um segundo azul de marca; consolide o `--accent` `#2563eb` e o dark-mode legado do template Vite para esta paleta.
- **Don't** deixar drop-shadows pesados (`0 18px 40px`) em cards parados.
- **Don't** engrossar a tela inteira em peso 800; peso de rotina é 600–700.
- **Don't** criar qualquer ambiguidade sobre status, identidade do motorista ou trajeto — transparência é a feature.
