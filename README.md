# iziline 📍🛣️

## 📌 Sobre o Projeto
O **iziline** é uma plataforma de Carona Solidária Intermunicipal desenvolvida para conectar motoristas e passageiros que farão o mesmo trajeto entre cidades. O sistema atua como um intermediário inteligente para pessoas que desejam ratear os custos de combustível e pedágio. 

Nosso objetivo é oferecer uma alternativa viável, econômica e segura ao transporte rodoviário tradicional, ajudando a combater o monopólio das linhas convencionais e melhorando a experiência de deslocamento de estudantes e trabalhadores.

## 🎯 A Problemática
A criação do iziline foi motivada por problemas crônicos no transporte rodoviário brasileiro:
* **Falta de Opções:** Dados indicam que cerca de 73% das rotas interestaduais no Brasil são atendidas por apenas uma empresa.
* **Deslocamento Estudantil:** Milhões de estudantes viajam para estudar em outras cidades, e os maiores índices de deslocamento ocorrem no ensino superior e na pós-graduação.
* **Baixa Qualidade e Atrasos:** O modelo tradicional sofre com atrasos constantes (líder de reclamações na ANTT), infraestrutura rodoviária precária e frotas com defasagem tecnológica.

## 🚀 Como Funciona e Modelo de Negócio
A plataforma foi pensada para ser sustentável e justa para todos os usuários:
* **Rateio Justo:** Os usuários dividem o custo real da viagem (combustível e pedágio).
* **Monetização:** O aplicativo cobra uma taxa de serviço (10% a 15%) sobre o rateio de cada carona pontual.
* **Assinatura Mensal:** Usuários frequentes podem optar por um plano de assinatura que garante isenção das taxas de corrida.
* **Visibilidade para Motoristas:** Possibilidade de pagar por destaques e verificações premium, aumentando a confiança na plataforma.

## 💻 Tecnologias e Arquitetura
A arquitetura do sistema foi desenhada para lidar com desafios de geolocalização e rotas em tempo real:
* **Google Routes API:** Utilizada para calcular rotas (evitando pedágios), fornecer dados de emissão/combustível e desenhar o trajeto (polylines) no mapa do passageiro.
* **Bibliotecas de Geolocalização (GIS):** Essenciais para transformar coordenadas em objetos geográficos e realizar consultas espaciais complexas, permitindo encontrar motoristas que passarão a menos de 1 km de um passageiro na rodovia.

## 🗺️ Roadmap (Próximos Passos)

- [ ] **Fase 1: Desenvolvimento & Validação**
  - Finalização do MVP Técnico (API e algoritmo de roteirização).
  - Protótipo de alta fidelidade (UX/UI) no Figma.
  - Pesquisa de campo com passageiros frequentes na UFPI/Rodoviária.

- [ ] **Fase 2: Piloto & Legalidade**
  - Consultoria de compliance para o Novo Marco Regulatório do PI (Lei 8.911/2025).
  - *Alpha Test*: Lançamento da rota Teresina > Parnaíba com 5 motoristas parceiros.
  - Ajustes no sistema de *Split de Pagamento* e notificações.

- [ ] **Fase 3: Lançamento & Tração**
  - Expansão (Go-to-Market) para o eixo Teresina > Picos e Floriano.
  - Ações de Marketing de Guerrilha em grupos universitários.

## 🎓 Contexto Acadêmico e Equipe
Este projeto foi idealizado e desenvolvido como requisito para a disciplina de **Engenharia de Software II** na **Universidade Federal do Piauí (UFPI)**.

**Desenvolvedores:**
* Edson da Silva Lima Junior
* Eduardo Melo de Carvalho
* Jórdan Carvalho Araújo
* Micaías Carvalho Vieira
