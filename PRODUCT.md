# Product

## Register

product

## Users

O iziline conecta dois atores em **caronas intermunicipais** na região do Piauí/Maranhão (Teresina, Floriano, Timon e cidades próximas):

- **Motoristas** com vagas numa viagem já planejada, que querem dividir a estrada: cadastram origem/destino, pontos de embarque, data e nº de vagas, e gerenciam quem pede reserva (aceitar/recusar).
- **Passageiros** que precisam ir de uma cidade a outra: buscam viagens abertas na sua rota, veem o trajeto no mapa, escolhem pontos de embarque/desembarque e solicitam reserva, acompanhando o status.

Contexto de uso: majoritariamente **no celular**, muitas vezes na rua/estrada, em redes e aparelhos variados do interior. Os dois atores têm o mesmo peso — o produto os trata com igual cuidado e vocabulário visual consistente.

## Product Purpose

Facilitar a organização de **caronas intermunicipais confiáveis**: dar ao motorista uma forma simples de publicar e gerir sua viagem, e ao passageiro uma forma clara de encontrar, entender e reservar um lugar. Sucesso = uma viagem publicada em poucos passos, uma reserva solicitada com confiança (sabendo motorista, rota, paradas e vagas) e um status que nunca deixa dúvida (`pendente → confirmada/recusada`). O valor central é **confiança e segurança**: viajar com desconhecidos exige transparência total sobre quem, por onde e em que estado está cada reserva.

## Brand Personality

Confiável, tranquilo e direto. Voz sóbria e objetiva — sem gírias nem euforia de marketing: informa o que importa, na hora certa, com clareza. Transmite controle e previsibilidade; o usuário sempre sabe o que vai acontecer e em que pé está. O calor vem da clareza e do respeito ao usuário, não de decoração.

## Anti-references

- **Super-app poluído** (estilo app de corrida): sem banners promocionais, sem cores gritando, sem densidade caótica disputando atenção.
- **Template genérico de IA**: sem grades de cards idênticos, gradientes decorativos ou eyebrow tracejado em toda seção — nada que pareça scaffold.
- **Lúdico / rede social**: sem emojis, gamificação ou bolhas que minem a seriedade e a sensação de segurança.
- Qualquer coisa que crie **ambiguidade** sobre status, identidade do motorista ou trajeto.

## Design Principles

1. **Clareza acima de tudo** — em cada tela, o estado (vagas, status da reserva, motorista, trajeto) é inequívoco; nunca esconder informação crítica atrás de um toque.
2. **Confiança se constrói mostrando** — origem/destino, paradas, mapa e o ciclo `pendente→confirmada/recusada` explícitos; transparência é a feature.
3. **Fluxo sem fricção** — publicar ou reservar em poucos passos; validações que guiam, não que punem; caminhos previsíveis.
4. **Consistência entre atores** — motorista e passageiro compartilham o mesmo vocabulário visual (botões, cards, status), reduzindo carga cognitiva.
5. **Feito para o celular na estrada** — mobile-first, alvos de toque generosos, leve em redes/aparelhos modestos; funciona antes de ser bonito.

## Accessibility & Inclusion

- **WCAG AA**: contraste ≥4.5:1 em texto (≥3:1 em texto grande), foco visível, navegação por teclado, labels/aria corretos (o código já usa `aria-invalid`/`aria-describedby`).
- **Mobile-first + toque**: layout pensado primeiro para tela pequena; alvos de toque ≥44px (inputs já em 48px).
- **Baseline aplicado por padrão** (mesmo não citado explicitamente): status nunca só por cor (rótulo textual junto), e `prefers-reduced-motion` respeitado em toda animação.
