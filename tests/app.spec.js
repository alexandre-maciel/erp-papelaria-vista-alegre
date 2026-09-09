import { test, expect } from "@playwright/test";

test("sidebar expands on hover and keyboard focus, then releases the page width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  const sidebar = page.locator(".sidebar");
  const content = page.locator(".main-shell");
  const sales = page
    .getByRole("navigation")
    .getByRole("button", { name: "Vendas", exact: true });
  await expect(sidebar).toHaveCSS("width", "72px");
  await expect(content).toHaveCSS("margin-left", "72px");
  await expect(sidebar.locator(".workspace")).toHaveCount(0);
  await expect(sales.locator(".sidebar-label")).toBeHidden();
  await sidebar.hover();
  await expect(sidebar).toHaveCSS("width", "240px");
  await expect(sales.locator(".sidebar-label")).toBeVisible();
  await expect(content).toHaveCSS("margin-left", "240px");
  await page.screenshot({ path: "test-results/sidebar-expanded.png" });
  await sales.click();
  await page.mouse.move(800, 300);
  await expect(sidebar).toHaveCSS("width", "72px");
  await expect(content).toHaveCSS("margin-left", "72px");
  await expect(
    page.getByRole("heading", { name: "Vendas", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/sidebar-collapsed.png" });
  await expect(sales).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    sidebar.getByRole("button", { name: "Produtos e estoque" }),
  ).toBeFocused();
  await expect(sidebar).toHaveCSS("width", "240px");
  await expect(sales.locator(".sidebar-label")).toBeVisible();
  await page.getByRole("button", { name: "Nova venda", exact: true }).focus();
  await expect(sidebar).toHaveCSS("width", "72px");
  for (const height of [768, 600, 480]) {
    await page.setViewportSize({ width: 1366, height });
    await sidebar.hover();
    await expect(sidebar).toHaveCSS("width", "240px");
    expect(
      await sidebar.evaluate((el) => el.scrollHeight <= el.clientHeight),
    ).toBe(true);
    await expect(
      sidebar.getByRole("button", { name: "Configurações" }),
    ).toBeInViewport();
    await page.mouse.move(800, 200);
    await expect(sidebar).toHaveCSS("width", "72px");
    expect(
      await sidebar.evaluate((el) => el.scrollHeight <= el.clientHeight),
    ).toBe(true);
  }
});

test("dashboard renders, all pages work, and desktop has no overflow or console errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sua loja, em dia." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  for (const name of [
    "Vendas",
    "Produtos e estoque",
    "Fluxo de caixa",
    "Contas a pagar",
    "Etiquetas",
    "Relatórios",
    "Visão geral",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("product creation, scanner sale, persistence and cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Produtos e estoque" })
    .click();
  await page
    .getByRole("button", { name: "Cadastrar produto", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Produto de teste");
  await dialog.getByLabel("Código de barras / interno").fill("TEST001");
  await dialog.getByLabel("Custo unitário").fill("4.20");
  await dialog.getByLabel("Preço de venda").fill("10");
  await dialog.getByLabel("Estoque atual").fill("8");
  await dialog.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Produto de teste", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Vendas", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova venda" }).click();
  await dialog.getByPlaceholder("Nome ou código de barras").fill("TEST00");
  await dialog.getByPlaceholder("Nome ou código de barras").press("Enter");
  await expect(dialog.getByRole("alert")).toContainText(
    "Código não encontrado",
  );
  await expect(
    dialog.getByRole("button", { name: /Concluir venda/ }),
  ).toBeDisabled();
  await dialog.getByPlaceholder("Nome ou código de barras").fill("TEST001");
  await dialog.getByPlaceholder("Nome ou código de barras").press("Enter");
  await dialog.getByLabel("Forma de pagamento").selectOption("Dinheiro");
  await dialog.getByLabel("Valor recebido").fill("20");
  await expect(dialog.locator(".change-line")).toContainText("10,00");
  await dialog.getByRole("button", { name: /Concluir venda/ }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Produtos e estoque" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Produto de teste" }),
  ).toContainText("7 un.");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Vendas", exact: true })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "Produto de teste" })
    .getByRole("button", { name: "Cancelar" })
    .click();
  await dialog.getByRole("button", { name: "Confirmar cancelamento" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Produto de teste" }),
  ).toContainText("Cancelada");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Produtos e estoque" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Produto de teste" }),
  ).toContainText("8 un.");
});

test("expense, bill payment, closure and opening", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Registrar despesa", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição").fill("Café da loja");
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("8");
  await dialog.getByRole("button", { name: "Registrar movimentação" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Contas a pagar" })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "Internet da loja" })
    .getByRole("button", { name: "Registrar pagamento" })
    .click();
  await dialog.getByLabel("Forma de pagamento").selectOption("Pix");
  await dialog.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Internet da loja" }),
  ).toContainText("Paga");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Fluxo de caixa" })
    .click();
  await expect(page.getByText("Café da loja")).toBeVisible();
  await page.getByRole("button", { name: "Conferir e fechar caixa" }).click();
  await dialog.getByLabel("Dinheiro contado").fill("186.30");
  await dialog.getByRole("button", { name: "Confirmar fechamento" }).click();
  await expect(page.getByText("Caixa fechado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Abrir caixa", exact: true }).click();
  await dialog.getByLabel("Fundo de abertura").fill("100");
  await dialog
    .getByRole("button", { name: "Abrir caixa", exact: true })
    .click();
  await expect(page.getByText("Caixa aberto", { exact: true })).toBeVisible();
});

test("label selection generates actual SVG barcodes and printable sheet", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Produtos e estoque" })
    .click();
  await page.getByLabel("Filtrar categoria").selectOption("Serviços");
  await page.evaluate(() => {
    window.print = () => {
      window.printCalled = true;
    };
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Etiquetas", exact: true })
    .click();
  await page.getByLabel("Selecionar Caderno universitário").check();
  await page
    .getByLabel("Quantidade de etiquetas de Caderno universitário")
    .fill("3");
  await expect(page.locator(".label-paper svg rect").first()).toBeAttached();
  await page.getByRole("button", { name: "Imprimir etiquetas" }).click();
  await expect(page.locator(".printed-label")).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => window.printCalled)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".app-shell")).toBeHidden();
  await expect(page.locator(".print-sheet")).toBeVisible();
});

test("mobile navigation, product form and dashboard remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sua loja, em dia." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Produtos e estoque" })
    .click();
  await page
    .getByRole("button", { name: "Cadastrar produto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill("Teste mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fechar janela" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  for (const name of [
    "Fluxo de caixa",
    "Contas a pagar",
    "Etiquetas",
    "Relatórios",
    "Vendas",
  ]) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Nova venda" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test("new bill, report period and local data export", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Contas a pagar" })
    .click();
  await page.getByRole("button", { name: "Nova conta", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição").fill("Fornecedor de teste");
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("45.60");
  await dialog.getByRole("button", { name: "Cadastrar conta" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Fornecedor de teste" }),
  ).toContainText("45,60");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Relatórios", exact: true })
    .click();
  await page.getByLabel("De", { exact: true }).fill("2020-01-01");
  await page.getByLabel("Até", { exact: true }).fill("2020-01-02");
  await expect(
    page.getByText("Sem vendas no período selecionado."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Configurações" }).click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exportar dados locais" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^vista-alegre-.*\.json$/);
});

test("storage errors refuse the transaction instead of silently losing data", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Registrar despesa", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição").fill("Não deve salvar");
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("5");
  await dialog.getByRole("button", { name: "Registrar movimentação" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  await expect(dialog).toBeVisible();
});
