# Papelaria Vista Alegre

Primeira versão funcional **demonstrativa** de um ERP de loja, em português.

## Executar

Requer Node.js 22 ou superior.

```sh
npm install
npm run dev
```

No Windows com bloqueio de scripts do PowerShell, use `npm.cmd` no lugar de `npm`. Acesse o endereço informado pelo Vite, normalmente `http://127.0.0.1:5173`.

```sh
npm run build
npm test
npm run test:e2e
```

Os testes de navegador precisam do Chromium do Playwright: `npx playwright install chromium`.

## Recursos

- Painel diário, gráfico de vendas/despesas e alertas de estoque.
- Cadastro de produtos e serviços com custo, preço, código e estoque mínimo.
- Venda por busca ou leitor USB configurado como teclado, com Enter ao final da leitura.
- Dinheiro, Pix, débito e crédito, uma forma de pagamento por venda.
- Baixa de estoque, bloqueio de saldo insuficiente e cálculo de troco.
- Cancelamento no caixa aberto, preservando histórico e revertendo estoque e totais.
- Abertura, conferência e fechamento do caixa físico.
- Despesas, aportes, retiradas pessoais e contas a pagar com baixa no pagamento.
- Relatórios por período, com custo histórico dos itens e lucro estimado.
- Etiquetas com código de barras CODE128, quantidades e tamanho selecionáveis.
- Exportação JSON dos dados locais em Configurações.

## Limites Importantes

Esta versão não é um ERP completo pronto para produção. Os dados de demonstração são fictícios, iniciados em relação à data do primeiro acesso. As quantidades em estoque representam o saldo inicial da demonstração após as vendas fictícias.

O armazenamento é local (`localStorage`), sem login, servidor, sincronização, restauração pela interface ou backup automático. Os dados são gravados ao realizar a primeira alteração. Não utilize como único registro real e não opere simultaneamente em várias abas: esta versão não resolve concorrência. Se o armazenamento falhar, a operação é recusada em vez de confirmar uma gravação inexistente. Limpar os dados do navegador remove os registros.

Os códigos das etiquetas usam CODE128, inclusive quando o conteúdo foi digitado a partir de um código de fábrica. Não são novos códigos EAN/GTIN registrados. Faça teste de leitura e impressão antes de uso operacional. A impressão é via navegador, em A4, com tamanho configurável das etiquetas; não há driver de impressora térmica nem suporte a folhas adesivas comerciais específicas. Prefira códigos curtos em etiquetas pequenas. A impressora e o papel precisam ser definidos para validar margens e legibilidade.

O relatório usa receita das vendas menos custo dos itens e despesas efetivamente pagas no período, sem apuração contábil, tributária ou cálculo automático de taxas de cartão. Cartões representam vendas registradas, não recebimentos bancários. Aportes e retiradas pessoais não entram no lucro. O custo de serviços é estimado por unidade. Não há emissão fiscal ou integração com bancos e maquininhas.

O ajuste de estoque é manual no cadastro; compras detalhadas, importação de lista e trilha de auditoria de ajustes ainda não foram implementadas. Cancelamentos de caixas já fechados e devoluções parciais exigem um fluxo posterior próprio.

## Caminho para Produção

1. Validar os fluxos com os dados de demonstração e definir a impressora e as etiquetas.
2. Adicionar backend e banco de dados gerenciado, com valores em centavos, transações atômicas, validação no servidor, histórico de estoque e permissões.
3. Implementar autenticação, HTTPS, sincronização entre loja e casa e proteção contra operações concorrentes/duplicadas.
4. Contratar hospedagem e banco após aprovação de custos; priorizar backup automático, retenção e restauração testada em vez de escolher apenas pelo plano pago.
5. Definir migração dos cadastros, excluir a base demonstrativa separadamente e testar restauração, impressão física e operação diária antes de usar dados reais.

Nenhum serviço pago foi contratado e nenhum dado foi enviado para um serviço externo. As fontes visuais são distribuídas junto com o aplicativo, sem dependência de carregamento do Google Fonts.
