# Vista Alegre — revisão de UX/UI

## Direção

ERP de balcão para uma papelaria que também vende serviços, passe público e recargas. A tarefa principal é registrar uma venda sem interromper o atendimento e conferir o caixa com clareza. A referência enviada pelo usuário pede branco, azul, painéis arredondados e números legíveis.

## Tokens e composição

- Papel: `#FFFFFF`, superfícies de trabalho.
- Mesa: `#F5F6F8`, fundo neutro.
- Tinta: `#20242B`, conteúdo principal.
- Grafite: `#586271`, conteúdo secundário.
- Azul: `#245CE0`, ações e seleção.
- Verde: `#21764F`, recebimentos e confirmações; saídas usam texto explícito e sinal negativo.
- DM Sans: interface e títulos, escolhida pela proximidade à referência e legibilidade dos numerais. Escala: 12 px para metadados, 14–16 px para controles e conteúdo, 18–20 px para seções, 28–32 px para página e totais.
- Alinhamento à esquerda para leitura; à direita para colunas monetárias. Linhas de texto explicativo limitadas a 75 caracteres. Raio de 24 px para painéis principais, 16 px para grupos e 10 px para controles.

```text
Visão geral: [data + Nova venda] [indicadores do dia]
             [movimento e últimas vendas] [atalhos e pendências]
Vendas:      [busca + categorias + produtos] [carrinho + pagamento + concluir]
Caixa:       [data + status] [dinheiro/PIX] [Transurc/CardMais] [cartões]
             [lucro + salvar] [operação do caixa atual] [histórico]
Produtos:    [resumo] [busca + categoria] [nome, custo, preço, estoque, editar]
Contas:      [resumo] [situação] [vencimento + valor + pagar]
Etiquetas:   [buscar e selecionar produtos] [tamanho + prévia + imprimir]
Relatórios:  [período] [indicadores] [ranking] [explicação do cálculo]
```

## Revisão do plano contra o pedido

Os painéis brancos e arredondados são intencionais, pois foram pedidos na imagem de referência. Não adicionar decorações, animações de entrada, tipografia extravagante ou novos gráficos sem necessidade. A identidade está no atendimento de balcão e na separação dos serviços da loja. Remover frases promocionais e rótulos supérfluos. Preservar a navegação lateral recolhível e os fluxos de estoque, impressão e fechamento.

## Auditoria e decisões

| Área | Problema observado | Ajuste |
| --- | --- | --- |
| Global | Textos de 8–11 px, cores lilás claras e vários estilos concorrentes | Escala legível e paleta coerente nos controles, tabelas e formulários |
| Visão geral | Frases decorativas e dinheiro do caixa atual misturado com a data consultada | Título direto, nomes objetivos e valor correspondente à data |
| Vendas | Catálogo sem categorias, navegação longa até carrinho em celular | Filtros, seleção visível, acesso ao carrinho e abertura do caixa na própria tela |
| Produtos | Busca sem nome acessível, detalhes difíceis de ler | Busca identificada, nomes em destaque e tabelas legíveis |
| Caixa | Muito texto introdutório e status que pode ser confundido com a data histórica | Instruções curtas, indicação de caixa atual e bloqueio preservado |
| Contas | Histórico pago misturado com pendências | Filtro por situação e orientação quando não há resultados |
| Etiquetas | Seleção sem resultado vazio e limite de lote pouco perceptível | Orientação na busca vazia e mensagem explícita acima do limite |
| Relatórios | Lucro estimado diferente do fechamento sem explicação imediata | Nome de resultado de vendas e explicação dos dois cálculos |
| Formulários | Texto pequeno e controles de toque estreitos | Contraste, foco visível e alvos maiores |

## Verificação

Revisar capturas das sete telas em desktop e celular, testar navegação por teclado, leitura dos totais, venda, pagamento, persistência, bloqueio do caixa fechado, impressão e ausência de rolagem horizontal na página. Tabelas largas podem rolar dentro da própria região.
