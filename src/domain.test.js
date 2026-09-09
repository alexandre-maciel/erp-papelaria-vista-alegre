import test from "node:test";
import assert from "node:assert/strict";
import {
  activeSession,
  cashBalance,
  createDemo,
  dayKey,
  saleTotal,
  summarize,
  transact,
} from "./domain.js";

function initial() {
  return {
    version: 1,
    products: [
      {
        id: "p",
        name: "Caderno",
        code: "VA001",
        price: 2000,
        cost: 800,
        stock: 10,
        minimum: 2,
        type: "product",
      },
      {
        id: "s",
        name: "Cópia",
        code: "SERV1",
        price: 100,
        cost: 20,
        stock: 0,
        minimum: 0,
        type: "service",
      },
    ],
    sales: [],
    movements: [],
    bills: [],
    sessions: [
      {
        id: "cash",
        opening: 10000,
        openedAt: new Date().toISOString(),
        closedAt: null,
      },
    ],
  };
}
const sell = (state, payment = "Dinheiro") =>
  transact(state, {
    type: "sale",
    items: [{ id: "p", quantity: 2 }],
    payment,
    received: 5000,
  });

test("cash sale changes physical balance by total, not tender; stock and costs are captured", () => {
  const state = sell(initial());
  assert.equal(state.products[0].stock, 8);
  assert.equal(cashBalance(state, "cash"), 14000);
  assert.equal(state.sales[0].received - saleTotal(state.sales[0]), 1000);
  assert.deepEqual(summarize(state, dayKey()).byPayment, {
    Dinheiro: 4000,
    Pix: 0,
    Débito: 0,
    Crédito: 0,
  });
  assert.equal(summarize(state, dayKey()).profit, 2400);
});
test("noncash sales never inflate the physical cash balance", () => {
  for (const payment of ["Pix", "Débito", "Crédito"])
    assert.equal(cashBalance(sell(initial(), payment), "cash"), 10000);
});
test("insufficient stock, fractional quantities and insufficient tender are rejected without mutation", () => {
  const state = initial();
  for (const quantity of [11, 0, -1, 1.5])
    assert.throws(() =>
      transact(state, {
        type: "sale",
        items: [{ id: "p", quantity }],
        payment: "Pix",
      }),
    );
  assert.throws(() =>
    transact(state, {
      type: "sale",
      items: [{ id: "p", quantity: 1 }],
      payment: "Dinheiro",
      received: 1999,
    }),
  );
  assert.equal(state.products[0].stock, 10);
  assert.equal(state.sales.length, 0);
});
test("duplicate lines are aggregated before validating available stock", () => {
  assert.throws(
    () =>
      transact(initial(), {
        type: "sale",
        items: [
          { id: "p", quantity: 6 },
          { id: "p", quantity: 6 },
        ],
        payment: "Pix",
      }),
    /Estoque insuficiente/,
  );
});
test("services do not require or reduce stock", () => {
  const state = transact(initial(), {
    type: "sale",
    items: [{ id: "s", quantity: 100 }],
    payment: "Pix",
  });
  assert.equal(state.products[1].stock, 0);
  assert.equal(summarize(state, dayKey()).cost, 2000);
});
test("cancellation reverses stock and totals exactly once", () => {
  let state = sell(initial());
  const id = state.sales[0].id;
  state = transact(state, { type: "cancel", id });
  assert.equal(state.products[0].stock, 10);
  assert.equal(cashBalance(state, "cash"), 10000);
  assert.equal(summarize(state, dayKey()).profit, 0);
  assert.equal(state.sales.length, 1);
  assert.throws(() => transact(state, { type: "cancel", id }));
});
test("cannot sell or cancel after cash closure; closure preserves expected and counted balance", () => {
  const sold = sell(initial());
  const state = transact(sold, { type: "close", amount: 13900 });
  assert.equal(activeSession(state), undefined);
  assert.equal(state.sessions[0].expected, 14000);
  assert.equal(state.sessions[0].counted, 13900);
  assert.throws(() => sell(state));
  assert.throws(() =>
    transact(state, { type: "cancel", id: sold.sales[0].id }),
  );
  assert.ok(activeSession(transact(state, { type: "open", amount: 1000 })));
});
test("expenses reduce profit; personal withdrawals and supplies do not", () => {
  let state = sell(initial());
  for (const [kind, amount] of [
    ["expense", 1000],
    ["withdrawal", 500],
    ["supply", 300],
  ]) {
    state = transact(state, {
      type: "movement",
      movement: { description: kind, kind, amount, payment: "Dinheiro" },
    });
  }
  assert.equal(cashBalance(state, "cash"), 12800);
  assert.equal(summarize(state, dayKey()).profit, 1400);
});
test("bills only become expenses when paid and cannot be paid twice", () => {
  let state = transact(initial(), {
    type: "bill",
    bill: { description: "Internet", amount: 1000, due: dayKey() },
  });
  assert.equal(summarize(state, dayKey()).spent, 0);
  const action = {
    type: "movement",
    movement: {
      kind: "expense",
      description: "Internet",
      amount: 1000,
      payment: "Pix",
      billId: state.bills[0].id,
    },
  };
  state = transact(state, action);
  assert.ok(state.bills[0].paidAt);
  assert.equal(summarize(state, dayKey()).spent, 1000);
  assert.equal(cashBalance(state, "cash"), 10000);
  assert.throws(() => transact(state, action));
});
test("cannot remove more physical cash than available", () => {
  assert.throws(() =>
    transact(initial(), {
      type: "movement",
      movement: {
        kind: "expense",
        description: "Aluguel",
        amount: 10001,
        payment: "Dinheiro",
      },
    }),
  );
});
test("cost updates never rewrite historical sale profit", () => {
  let state = sell(initial());
  state = transact(state, {
    type: "product",
    product: { ...state.products[0], cost: 1900, price: 3000 },
  });
  assert.equal(summarize(state, dayKey()).profit, 2400);
});
test("duplicate codes and invalid prices are rejected", () => {
  const state = initial();
  assert.throws(() =>
    transact(state, {
      type: "product",
      product: { ...state.products[0], id: "other" },
    }),
  );
  for (const price of [0, -1, Infinity, 1.5])
    assert.throws(() =>
      transact(state, {
        type: "product",
        product: { ...state.products[0], price },
      }),
    );
});
test("demo includes consistent closures and only one open session", () => {
  const state = createDemo();
  assert.equal(state.sessions.filter((s) => !s.closedAt).length, 1);
  state.sessions
    .filter((s) => s.closedAt)
    .forEach((s) => assert.equal(s.expected, cashBalance(state, s.id)));
  assert.equal(summarize(state, dayKey()).sales.length, 8);
});
