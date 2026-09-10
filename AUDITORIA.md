# Auditoria do ERP Vista Alegre

Data: 09/09/2026. Escopo: código, sete telas, formulários, regras financeiras, persistência, testes e preparação para operação real.

## Resumo

O aplicativo é uma demonstração funcional de operação de balcão, com boa base de interface. A próxima prioridade é integridade de dados e fechamento financeiro. Novos módulos devem vir depois dessas correções.

Verificações executadas: 14 testes de domínio aprovados, 10 testes de interface aprovados e build de produção aprovado. Também foram executados cenários adicionais em contexto de navegador isolado, sem usar o armazenamento do navegador do usuário. Os cenários adicionais revelaram problemas não cobertos pela suíte atual. Impressora, scanner físico, integração bancária e operação em vários dispositivos não foram validados.

## Problemas reproduzidos

### P0 — perda de venda entre abas

- Duas abas carregam o mesmo estado. Cada uma conclui uma venda.
- Reprodução: 41 vendas iniciais; esperado 43; armazenamento terminou com 42.
- Causa: cada `commit` salva uma cópia completa do estado em memória sem revisão de versão, sincronização ou exclusão mútua.
- Local: `src/App.jsx:221–225`.
- Ação: no estágio local, detectar/bloquear instâncias concorrentes e verificar revisão antes de gravar; no servidor, usar transações atômicas e identificador idempotente por operação.
- Aceite: ambas as vendas persistem uma única vez, ou a segunda operação é recusada explicitamente antes de confirmar.

### P1 — dinheiro duplicado ao reabrir no mesmo dia

- Abrir com R$ 100, fechar contando R$ 100 e abrir novamente com os mesmos R$ 100.
- Reprodução: `dailyCash` retorna R$ 200 em dinheiro, embora a sessão atual tenha R$ 100.
- Causa: soma de todos os saldos/contagens das sessões atribuídas ao dia.
- Local: `src/domain.js:57–69`.
- Ação: definir saldo final do dia e transferência de fundo entre sessões, sem somar saldos transportados como novas entradas. Testar também sessões que cruzam a meia-noite.

### P1 — valores pendentes desaparecem

- No caixa, preencher PIX com R$ 999 e trocar para Produtos; ao voltar, retorna o valor anterior, R$ 119,90 no cenário demonstrativo.
- Montar um carrinho e trocar de página também elimina os itens.
- Causa: estados locais de componentes desmontados pela navegação.
- Locais: `src/App.jsx:236–242`, `DailyClosing` e `SaleForm`.
- O seletor superior de data salva antes de navegar; sair pelo menu, usar a segunda data em Movimentações ou fechar a sessão não passa por essa proteção.
- Ação: preservar rascunhos, explicitar salvar/descartar e tratar mudança de data/fechamento com a mesma regra.

### P1 — sugestão de caixa fica desatualizada

- Registrar despesa em dinheiro de R$ 1 com a tela de fluxo aberta.
- Reprodução: saldo operacional passa de R$ 194,30 para R$ 193,30; campo Dinheiro em caixa permanece R$ 194,30.
- Causa: valores sugeridos entram em `useState` apenas na montagem do formulário.
- Local: `src/App.jsx:2086–2108`.
- Ação: atualizar sugestões quando não houver edição; quando houver valor conferido, indicar necessidade de reconferência sem sobrescrever silenciosamente o que foi digitado.

### P1 — recuperação incompleta de dados inválidos

- A validação inicial verifica versão e existência de arrays, mas não valida seus itens nem os novos fechamentos diários.
- Reprodução isolada: `products: [null]` passa na validação inicial e provoca erro ao ler `type`; a tela de recuperação não aparece.
- Local: `src/App.jsx:168–183`.
- Ação: validar estrutura completa, incluir migrações de versão, oferecer exportação dos dados originais e restauração validada; adicionar tratamento de erro de renderização.

## Regras financeiras que precisam ser definidas

1. **Caixa atual versus dia fechado:** hoje qualquer sessão aberta permite editar totais de datas passadas e futuras. O bloqueio com todas as sessões fechadas funciona. Falta decidir quando um dia fica definitivamente fechado, quem pode reabri-lo e como registrar a correção.
2. **Dinheiro em caixa:** a fórmula solicitada permanece `(PIX + dinheiro) − (Transurc + CardMais)`. Definir se o dinheiro informado inclui fundo de troco e se é medido antes ou depois das saídas. Essa definição evita resultados divergentes sem alterar a fórmula.
3. **Transurc e CardMais:** os campos são totais manuais por data, não lançamentos detalhados em `movements`. Falta definir conciliação, comprovantes e origem dos valores. Lançar a mesma saída também como despesa em dinheiro pode produzir desconto duplicado na sugestão/fórmula.
4. **Salvar versus fechar:** salvar o resumo diário e fechar a sessão física são ações independentes. O histórico da sessão guarda esperado/contado, mas não uma cópia imutável dos seis totais e do lucro. Proposta: conferência integrada, salvamento atômico e comprovante do fechamento completo.
5. **Data de operação:** a data selecionada começa na montagem; vendas e movimentações usam a hora atual, enquanto sessões podem permanecer abertas por vários dias. Definir virada de dia e vínculo entre sessão, data e lançamentos.

## Situação por área

| Área | Implementado | Falta / próximo incremento |
| --- | --- | --- |
| Visão geral | Métricas por data, gráfico, atalhos e alertas | Conciliar números sugeridos/conferidos, indicar a origem dos valores e atualizar data na virada do dia |
| Vendas | Catálogo, categorias, carrinho, leitor como teclado, troco, quatro pagamentos, baixa e cancelamento | Preservar rascunho, detalhes completos e comprovante da venda; depois avaliar desconto, pagamento dividido e devolução parcial |
| Produtos | Cadastro/edição, código único, custo, preço, estoque mínimo | Entrada de mercadoria, histórico e motivo dos ajustes, arquivamento de produto, importação de cadastro; fornecedores/compras conforme necessidade |
| Fluxo de caixa | Três grupos, totais por data, fórmula, abertura/fechamento e bloqueio atual | Resolver inconsistências acima, fechamento integrado, histórico completo e registro de correções |
| Contas a pagar | Cadastro, vencimento, filtro e pagamento | Editar/cancelar conta, corrigir pagamento, recorrência; pagamentos parciais e anexos conforme rotina |
| Etiquetas | CODE128, seleção/quantidade, prévia e impressão A4 | Teste físico no papel e impressora reais; perfis de impressão e validação de códigos longos em etiquetas pequenas |
| Relatórios | Receita/custo/despesa, ranking e período | Relatório dos fechamentos manuais, Transurc/CardMais e pagamentos por período; exportação CSV/PDF e detalhamento |
| Configurações | Informações da demonstração e exportação JSON | Importação/restauração, dados da loja, configuração de impressora e separação entre demonstração e base real |

## Persistência e operação

- Todos os dados ficam no `localStorage`, em um navegador/origem. Não há API, banco central, autenticação, usuários, permissões ou sincronização entre dispositivos.
- Existe exportação JSON, mas não importação pela interface nem backup automático/restauração testada.
- A primeira utilização cria vendas/produtos fictícios. Falta iniciar uma base real vazia e migrar cadastros sem misturar a demonstração com o histórico real.
- A operação publicada precisa de hospedagem, HTTPS, banco com transações, controle de concorrência, backups e procedimento de recuperação. Definir se a loja precisa continuar vendendo sem internet antes de escolher a arquitetura de sincronização.
- Integrações com banco/maquininha e emissão fiscal não existem; incluir somente conforme necessidade operacional e escopo decidido.

## UX, manutenção e qualidade

- A interface tem padrões consistentes, versão móvel com registros em blocos, filtros, foco visível e mensagens úteis. A prioridade de UX agora é preservar o trabalho e deixar inequívoca a confirmação de operações.
- Validar venda completa por toque/teclado no celular, leitores de tela e diferentes navegadores; a suíte atual usa Chromium e testa navegação móvel, mas não todas as combinações de dispositivo e fluxo.
- Históricos carregam todos os registros; falta paginação/filtros e ensaio com base volumosa.
- `src/App.jsx` concentra páginas, modais, formulários e persistência em cerca de 2.400 linhas. Separar por módulo ao implementar os próximos incrementos.
- `styles.css` e `interface.css` têm camadas de sobrescrita. Consolidar tokens e estilos por componente para reduzir regressões.
- Não há scripts de lint, checagem de tipos ou pipeline de integração contínua no projeto revisado.
- O Git rastreia 6.211 arquivos de `node_modules` e seis de `dist`; revisar versionamento e `.gitignore`, preservando o código e o lockfile.
- README ainda descreve a primeira versão e precisa refletir os novos fechamentos e filtros.
- Acrescentar testes de regressão para todos os cenários reproduzidos, fechamento com rascunho, várias sessões/dias e restauração de dados.

## Sequência recomendada

### Etapa 1 — confiabilidade do caixa e das vendas

Corrigir concorrência, duplicação de saldo, sugestões desatualizadas e perda de rascunhos. Definir sessão/dia e integrar o fechamento. Aceite: duas vendas simultâneas seguras, reabertura sem duplicação, rascunhos preservados e histórico fechado rastreável.

### Etapa 2 — dados recuperáveis e início da base real

Validação completa, exportar/importar com prévia e testes de restauração, fluxo explícito para começar uma base vazia e migrar cadastros. Aceite: recuperar a base integral em outro ambiente de teste, sem misturar dados demonstrativos.

### Etapa 3 — publicação e acesso operacional

Backend, banco transacional, usuários/perfis, sincronização, HTTPS, backup automatizado e monitoramento de falhas. Definir necessidade de funcionamento offline. Aceite: loja e outro dispositivo consultam a mesma base, com operações consistentes e recuperação testada.

### Etapa 4 — completar a rotina da papelaria

Entrada e histórico de estoque, edição/recorrência de contas, recibo/detalhes da venda, relatório diário completo e impressão validada. Descontos, pagamentos divididos, fornecedores e devoluções conforme prioridade real do balcão.

### Etapa 5 — expansão

Integrações externas, emissão fiscal quando fizer parte do escopo, análises adicionais e otimização com base volumosa.

Recomendação imediata: começar pela Etapa 1; ampliar o visual ou adicionar módulos antes dela não resolve os problemas de integridade identificados.
