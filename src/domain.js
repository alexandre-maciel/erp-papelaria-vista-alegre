export const payments = ["Dinheiro", "Pix", "Débito", "Crédito"];
export const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dayKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const uid = () => crypto.randomUUID();
export const cents = (value) => Math.round(Number(value) * 100);
const amountValid = (value) => Number.isSafeInteger(value) && value > 0;
export const activeSession = (state) => state.sessions.find((s) => !s.closedAt);
export const saleTotal = (sale) =>
  sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const saleCost = (sale) =>
  sale.items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
export function cashBalance(state, sessionId) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return 0;
  const sales = state.sales.filter(
    (s) =>
      s.sessionId === sessionId && !s.cancelled && s.payment === "Dinheiro",
  );
  return (
    session.opening +
    sales.reduce((n, s) => n + saleTotal(s), 0) +
    state.movements
      .filter((m) => m.sessionId === sessionId && m.payment === "Dinheiro")
      .reduce((n, m) => n + (m.kind === "supply" ? m.amount : -m.amount), 0)
  );
}
export function summarize(state, from, to = from) {
  const within = (date) => dayKey(date) >= from && dayKey(date) <= to;
  const sales = state.sales.filter((s) => !s.cancelled && within(s.at));
  const expenses = state.movements.filter(
    (m) => m.kind === "expense" && within(m.at),
  );
  const revenue = sales.reduce((n, s) => n + saleTotal(s), 0);
  const cost = sales.reduce((n, s) => n + saleCost(s), 0);
  const spent = expenses.reduce((n, m) => n + m.amount, 0);
  return {
    sales,
    revenue,
    cost,
    spent,
    profit: revenue - cost - spent,
    byPayment: Object.fromEntries(
      payments.map((p) => [
        p,
        sales
          .filter((s) => s.payment === p)
          .reduce((n, s) => n + saleTotal(s), 0),
      ]),
    ),
  };
}

export function transact(state, action) {
  const now = new Date().toISOString();
  const session = activeSession(state);
  switch (action.type) {
    case "product": {
      const p = action.product;
      if (!p.name.trim() || !/^[\x20-\x7E]{1,40}$/.test(p.code))
        throw Error(
          "Informe nome e código válido (até 40 caracteres, sem acentos).",
        );
      if (!amountValid(p.price) || !Number.isSafeInteger(p.cost) || p.cost < 0)
        throw Error("Informe preço maior que zero e custo válido.");
      if (![p.stock, p.minimum].every((n) => Number.isSafeInteger(n) && n >= 0))
        throw Error("O estoque e o mínimo devem ser inteiros não negativos.");
      if (
        state.products.some(
          (other) => other.code === p.code && other.id !== p.id,
        )
      )
        throw Error("Este código já pertence a outro produto.");
      return {
        ...state,
        products: state.products.some((other) => other.id === p.id)
          ? state.products.map((other) => (other.id === p.id ? p : other))
          : [...state.products, p],
      };
    }
    case "open":
      if (session) throw Error("Já existe um caixa aberto.");
      if (!Number.isSafeInteger(action.amount) || action.amount < 0)
        throw Error("Informe um valor inicial válido.");
      return {
        ...state,
        sessions: [
          ...state.sessions,
          { id: uid(), opening: action.amount, openedAt: now, closedAt: null },
        ],
      };
    case "close":
      if (!session) throw Error("Não há caixa aberto.");
      if (!Number.isSafeInteger(action.amount) || action.amount < 0)
        throw Error("Informe a contagem em dinheiro.");
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === session.id
            ? {
                ...s,
                closedAt: now,
                counted: action.amount,
                expected: cashBalance(state, s.id),
              }
            : s,
        ),
      };
    case "sale": {
      if (!session) throw Error("Abra o caixa antes de registrar uma venda.");
      if (!payments.includes(action.payment))
        throw Error("Selecione uma forma de pagamento.");
      if (!action.items.length)
        throw Error("Adicione pelo menos um produto ou serviço.");
      const quantities = new Map();
      action.items.forEach((i) => {
        if (!Number.isSafeInteger(i.quantity) || i.quantity < 1)
          throw Error("Quantidade inválida.");
        quantities.set(i.id, (quantities.get(i.id) || 0) + i.quantity);
      });
      const items = [...quantities].map(([id, quantity]) => {
        const p = state.products.find((p) => p.id === id);
        if (!p) throw Error("Produto não encontrado.");
        if (p.type !== "service" && quantity > p.stock)
          throw Error(`Estoque insuficiente: ${p.name}.`);
        return {
          id,
          name: p.name,
          price: p.price,
          cost: p.cost,
          type: p.type,
          quantity,
        };
      });
      const total = saleTotal({ items });
      if (
        action.payment === "Dinheiro" &&
        (!Number.isSafeInteger(action.received) || action.received < total)
      )
        throw Error("O valor recebido é menor que o total da venda.");
      return {
        ...state,
        products: state.products.map((p) => ({
          ...p,
          stock:
            p.type === "service"
              ? p.stock
              : p.stock - (quantities.get(p.id) || 0),
        })),
        sales: [
          {
            id: uid(),
            number: Math.max(1000, ...state.sales.map((s) => s.number)) + 1,
            at: now,
            sessionId: session.id,
            items,
            payment: action.payment,
            received: action.payment === "Dinheiro" ? action.received : total,
            cancelled: false,
          },
          ...state.sales,
        ],
      };
    }
    case "cancel": {
      const sale = state.sales.find((s) => s.id === action.id);
      if (!sale || sale.cancelled)
        throw Error("Esta venda não pode ser cancelada.");
      if (!session || sale.sessionId !== session.id)
        throw Error(
          "Só é possível cancelar vendas do caixa que ainda está aberto.",
        );
      if (
        sale.payment === "Dinheiro" &&
        cashBalance(state, session.id) < saleTotal(sale)
      )
        throw Error("Dinheiro insuficiente no caixa para devolver esta venda.");
      return {
        ...state,
        sales: state.sales.map((s) =>
          s.id === sale.id ? { ...s, cancelled: true, cancelledAt: now } : s,
        ),
        products: state.products.map((p) => ({
          ...p,
          stock:
            p.stock +
            sale.items
              .filter((i) => i.id === p.id && i.type !== "service")
              .reduce((n, i) => n + i.quantity, 0),
        })),
      };
    }
    case "movement": {
      if (!session)
        throw Error("Abra o caixa antes de registrar uma movimentação.");
      const m = action.movement;
      if (
        !["expense", "supply", "withdrawal"].includes(m.kind) ||
        !payments.includes(m.payment) ||
        !amountValid(m.amount) ||
        !m.description.trim()
      )
        throw Error("Preencha a descrição e um valor maior que zero.");
      if (
        m.payment === "Dinheiro" &&
        m.kind !== "supply" &&
        m.amount > cashBalance(state, session.id)
      )
        throw Error("O valor ultrapassa o dinheiro disponível no caixa.");
      const bill = m.billId && state.bills.find((b) => b.id === m.billId);
      if (m.billId && (!bill || bill.paidAt))
        throw Error("Conta não encontrada ou já paga.");
      if (bill && (m.amount !== bill.amount || m.kind !== "expense"))
        throw Error("O pagamento deve corresponder ao valor da conta.");
      return {
        ...state,
        movements: [
          { ...m, id: uid(), at: now, sessionId: session.id },
          ...state.movements,
        ],
        bills: state.bills.map((b) =>
          b.id === m.billId ? { ...b, paidAt: now } : b,
        ),
      };
    }
    case "bill":
      if (
        !action.bill.description.trim() ||
        !amountValid(action.bill.amount) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(action.bill.due)
      )
        throw Error("Preencha a descrição, o valor e o vencimento.");
      return {
        ...state,
        bills: [{ ...action.bill, id: uid(), paidAt: null }, ...state.bills],
      };
    default:
      throw Error("Operação desconhecida.");
  }
}

export function createDemo() {
  const today = dayKey();
  const at = (days, hour, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const products = [
    {
      id: "p1",
      name: "Caderno universitário",
      category: "Papelaria",
      code: "7891000000017",
      price: 2490,
      cost: 1350,
      stock: 24,
      minimum: 5,
      color: "purple",
    },
    {
      id: "p2",
      name: "Caneta esferográfica azul",
      category: "Papelaria",
      code: "VA000002",
      price: 250,
      cost: 90,
      stock: 86,
      minimum: 20,
      color: "blue",
    },
    {
      id: "p3",
      name: "Lápis de cor · 12 cores",
      category: "Papelaria",
      code: "VA000003",
      price: 1890,
      cost: 980,
      stock: 4,
      minimum: 8,
      color: "pink",
    },
    {
      id: "p4",
      name: "Mochila casual",
      category: "Bolsas e acessórios",
      code: "VA000004",
      price: 8990,
      cost: 4800,
      stock: 8,
      minimum: 3,
      color: "orange",
    },
    {
      id: "p5",
      name: "Cabo USB-C · 1 metro",
      category: "Eletrônicos",
      code: "VA000005",
      price: 1990,
      cost: 650,
      stock: 3,
      minimum: 5,
      color: "green",
    },
    {
      id: "p6",
      name: "Resma de papel A4",
      category: "Papelaria",
      code: "VA000006",
      price: 3290,
      cost: 2400,
      stock: 12,
      minimum: 5,
      color: "blue",
    },
    {
      id: "p7",
      name: "Óculos de sol",
      category: "Bolsas e acessórios",
      code: "VA000007",
      price: 3990,
      cost: 1500,
      stock: 2,
      minimum: 3,
      color: "pink",
    },
    {
      id: "s1",
      name: "Impressão preto e branco",
      category: "Serviços",
      code: "SERV001",
      price: 100,
      cost: 20,
      stock: 0,
      minimum: 0,
      type: "service",
      color: "purple",
    },
    {
      id: "s2",
      name: "Impressão colorida",
      category: "Serviços",
      code: "SERV002",
      price: 300,
      cost: 70,
      stock: 0,
      minimum: 0,
      type: "service",
      color: "orange",
    },
    {
      id: "s3",
      name: "Atendimento online",
      category: "Serviços",
      code: "SERV003",
      price: 1500,
      cost: 0,
      stock: 0,
      minimum: 0,
      type: "service",
      color: "green",
    },
  ].map((p) => ({ type: "product", ...p }));
  const sales = [];
  const sessions = [];
  let number = 1000;
  for (let day = 6; day >= 0; day--) {
    const sessionId = `session-${day}`;
    sessions.push({
      id: sessionId,
      openedAt: at(day, 8),
      opening: 15000,
      closedAt: day ? at(day, 18) : null,
      ...(day ? { expected: 15000, counted: 15000 } : {}),
    });
    const combinations = [
      ["p1", 2],
      ["p4", 1],
      ["s1", 18],
      ["p6", 2],
      ["p2", 5],
      ["s3", 2],
      ["p5", 1],
      ["p3", 1],
    ];
    combinations
      .slice(0, day === 0 ? 8 : 4 + (day % 4))
      .forEach(([id, quantity], index) => {
        const p = products.find((p) => p.id === id);
        sales.unshift({
          id: `demo-${number}`,
          number: ++number,
          at: at(day, 9 + Math.floor(index / 2), index % 2 ? 35 : 12),
          sessionId,
          items: [
            {
              id,
              name: p.name,
              price: p.price,
              cost: p.cost,
              type: p.type,
              quantity: quantity + (day % 2),
            },
          ],
          payment: payments[index % 4],
          cancelled: false,
        });
      });
  }
  const state = {
    version: 1,
    products,
    sales,
    sessions,
    movements: [
      {
        id: "m1",
        at: at(0, 10, 20),
        sessionId: "session-0",
        kind: "expense",
        description: "Material de limpeza",
        amount: 1800,
        payment: "Dinheiro",
      },
    ],
    bills: [
      {
        id: "b1",
        description: "Internet da loja",
        amount: 9990,
        due: today,
        paidAt: null,
      },
      {
        id: "b2",
        description: "Energia elétrica",
        amount: 18640,
        due: dayKey(new Date(Date.now() + 3 * 86400000)),
        paidAt: null,
      },
      {
        id: "b3",
        description: "Aluguel da loja",
        amount: 85000,
        due: dayKey(new Date(Date.now() + 6 * 86400000)),
        paidAt: null,
      },
    ],
  };
  state.sessions = sessions.map((s) =>
    s.closedAt
      ? {
          ...s,
          expected: cashBalance(state, s.id),
          counted: cashBalance(state, s.id),
        }
      : s,
  );
  return state;
}
