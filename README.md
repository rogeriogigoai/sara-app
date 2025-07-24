# SARA - Sistema Avançado de Rastreamento Automotivo

SARA é uma Progressive Web App (PWA) de nível profissional, construída com uma mentalidade "mobile-first", projetada para ser a ferramenta definitiva no controle e prevenção de fraudes de pneus em frotas de veículos.

Sua missão é digitalizar, rastrear e proteger cada pneu individualmente, eliminando perdas por roubo ou trocas não autorizadas através de um sistema inteligente de verificação e alertas.

---

## Funcionalidades Principais (MVP)

O MVP do SARA é focado em um ciclo completo de gestão de pneus, desde o cadastro até a verificação e gerenciamento de alertas.

### 1. Gestão de Acesso por Permissão
O sistema possui um controle de acesso hierárquico com 5 níveis de permissão:
- **Nível 5 (Admin Master):** Controle total, incluindo a gestão de outros usuários.
- **Nível 4 (Admin):** Nível administrativo com permissões amplas.
- **Nível 3 (Gerente):** Acesso a relatórios, histórico e dashboards.
- **Nível 2 (Operador):** Permissão para cadastrar veículos e realizar verificações.
- **Nível 1 (Leitura):** Acesso somente para visualização.

### 2. Dashboard Dinâmico
A tela inicial apresenta KPIs em tempo real, buscando dados diretamente do Firestore:
- Total de Veículos na Frota
- Total de Alertas de Fraude Pendentes
- Total de Verificações Realizadas
- Lista de "Atividades Recentes" com os últimos veículos cadastrados e links diretos para a página de verificação.

### 3. Cadastro Inteligente de Veículos
- **Validação de Placa Única:** O sistema verifica em tempo real no Firestore se a placa já está cadastrada, prevenindo duplicidade.
- **Leitura de Placa por IA:** O operador pode tirar uma foto da placa do veículo, e a IA do Google (Gemini 1.5 Flash) extrai o texto e preenche o campo automaticamente.
- **Cadastro de Pneus com IA:** Para cada um dos 5 pneus, o operador tira uma foto. Uma Cloud Function processa a imagem e retorna:
  - O código **DOT** completo.
  - A **Marca** do pneu.
  - A **Semana (WW)** e o **Ano (YY)** de fabricação (a "impressão digital" do pneu).
  - A **Condição** aparente do pneu.
- **Input Manual:** Se a IA falhar ou cometer um erro, o operador pode corrigir ou preencher manualmente todos os campos, garantindo 100% de precisão dos dados.
- **Otimização de Imagem:** Todas as fotos são comprimidas no lado do cliente (navegador) antes do upload, economizando custos de armazenamento e tráfego de rede, e garantindo performance em conexões móveis.

### 4. Fluxo de Verificação Completo
Este é o coração do SARA, dividido em duas etapas claras:
- **Etapa 1: Validação:** O operador tira fotos dos 5 pneus atuais do veículo. O sistema compara a "impressão digital" (semana/ano) de cada pneu escaneado com o registro original no banco de dados.
- **Etapa 2: Resultados e Ação:**
  - **Fraude Detectada:** Se um pneu escaneado não pertence ao conjunto original, um **alerta de fraude** de severidade crítica é criado automaticamente.
  - **Rodízio Detectado:** Se todos os pneus pertencem ao conjunto, mas estão em posições diferentes, um **alerta informativo de rodízio** é criado, e o registro do veículo é **automaticamente atualizado** com as novas posições.
  - **Tudo OK:** Se os pneus estão corretos e nas posições certas, o sistema confirma a conformidade.
- **Atualização de Registro:** Após uma validação bem-sucedida, o operador tem a opção de registrar um novo conjunto de pneus para o veículo (em caso de troca), seguindo o mesmo fluxo de captura por IA.

### 5. Gestão de Alertas e Histórico
- **Central de Alertas:** Uma tela dedicada lista todos os alertas gerados, permitindo filtrar e ordenar.
- **Detalhes do Alerta:** Ao clicar em um alerta, o gestor vê uma tela de **comparativo visual**, mostrando as fotos e os dados dos pneus originais lado a lado com os pneus irregulares encontrados.
- **Histórico de Verificações:** Uma tela de auditoria permite buscar por uma placa e ver o histórico completo de todas as verificações já realizadas para aquele veículo, com acesso aos detalhes e fotos de cada uma.

### 6. Gestão de Usuários (Admin Master)
- Uma tela segura, acessível apenas por usuários com permissão nível 5, permite criar, editar e desativar outros usuários, definindo seus respectivos níveis de permissão.

### 7. Perfil de Usuário
- Cada usuário pode acessar seu próprio perfil para **alterar sua senha**, garantindo as boas práticas de segurança.

---

## Stack de Tecnologia

- **Frontend:** React com Vite (TypeScript, JSX)
- **Estilização:** TailwindCSS
- **Roteamento:** React Router
- **Formulários:** Formik & Yup
- **Backend & Banco de Dados:** Plataforma Firebase (Firestore, Authentication, Cloud Storage)
- **Computação Serverless:** Firebase Cloud Functions (Node.js)
- **Inteligência Artificial:** Google AI - Gemini 1.5 Flash
- **Hospedagem:** Firebase Hosting

---

## Como Rodar o Projeto Localmente

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/rogeriogigoai/sara-app.git
    cd sara-app
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Configure o Firebase:**
    - Crie um arquivo `src/firebase.ts`.
    - Adicione as credenciais do seu projeto Firebase neste arquivo.
4.  **Execute o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
5.  Abra o navegador no endereço `http://localhost:5173` (ou a porta indicada).
