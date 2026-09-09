# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> sidebar expands on hover and keyboard focus, then releases the page width
- Location: tests\app.spec.js:3:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('.sidebar').getByRole('link')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" locator('.sidebar').getByRole('link') with timeout 5000ms
  - waiting for locator('.sidebar').getByRole('link')
    13 × locator resolved to <a href="#" class="brand" title="Papelaria Vista Alegre" aria-label="Papelaria Vista Alegre, visão geral">…</a>
       - unexpected value "inactive"

```

```yaml
- link "Papelaria Vista Alegre, visão geral":
  - /url: "#"
  - text: v
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test("sidebar expands on hover and keyboard focus, then releases the page width", async ({ page }) => {
  4   |   await page.setViewportSize({ width: 1366, height: 768 });
  5   |   await page.goto("/");
  6   |   const sidebar = page.locator(".sidebar");
  7   |   const content = page.locator(".main-shell");
  8   |   const sales = page.getByRole("navigation").getByRole("button", { name: "Vendas", exact: true });
  9   |   await expect(sidebar).toHaveCSS("width", "72px");
  10  |   await expect(content).toHaveCSS("margin-left", "72px");
  11  |   await expect(sidebar.locator(".workspace")).toHaveCount(0);
  12  |   await expect(sales.locator(".sidebar-label")).toBeHidden();
  13  |   await sidebar.hover();
  14  |   await expect(sidebar).toHaveCSS("width", "240px");
  15  |   await expect(sales.locator(".sidebar-label")).toBeVisible();
  16  |   await expect(content).toHaveCSS("margin-left", "240px");
  17  |   await page.screenshot({ path: "test-results/sidebar-expanded.png" });
  18  |   await sales.click();
  19  |   await page.mouse.move(800, 300);
  20  |   await expect(sidebar).toHaveCSS("width", "72px");
  21  |   await expect(content).toHaveCSS("margin-left", "72px");
  22  |   await expect(page.getByRole("heading", { name: "Vendas", exact: true })).toBeVisible();
  23  |   await page.screenshot({ path: "test-results/sidebar-collapsed.png" });
  24  |   await page.reload();
  25  |   await page.keyboard.press("Tab");
> 26  |   await expect(sidebar.getByRole("link")).toBeFocused();
      |                                           ^ Error: expect(locator).toBeFocused() failed
  27  |   await expect(sidebar).toHaveCSS("width", "240px");
  28  |   await expect(sales.locator(".sidebar-label")).toBeVisible();
  29  |   await page.getByRole("button", { name: "Nova venda", exact: true }).focus();
  30  |   await expect(sidebar).toHaveCSS("width", "72px");
  31  |   for (const height of [768, 600, 480]) {
  32  |     await page.setViewportSize({ width: 1366, height });
  33  |     await sidebar.hover();
  34  |     await expect(sidebar).toHaveCSS("width", "240px");
  35  |     expect(await sidebar.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
  36  |     await expect(sidebar.getByRole("button", { name: "Configurações" })).toBeInViewport();
  37  |     await page.mouse.move(800, 200);
  38  |     await expect(sidebar).toHaveCSS("width", "72px");
  39  |     expect(await sidebar.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
  40  |   }
  41  | });
  42  | 
  43  | test("dashboard renders, all pages work, and desktop has no overflow or console errors", async ({
  44  |   page,
  45  | }) => {
  46  |   const errors = [];
  47  |   page.on("pageerror", (error) => errors.push(error.message));
  48  |   await page.setViewportSize({ width: 1440, height: 1100 });
  49  |   await page.goto("/");
  50  |   await expect(
  51  |     page.getByRole("heading", { name: "Sua loja, em dia." }),
  52  |   ).toBeVisible();
  53  |   await page.screenshot({
  54  |     path: "test-results/dashboard-desktop.png",
  55  |     fullPage: true,
  56  |   });
  57  |   for (const name of [
  58  |     "Vendas",
  59  |     "Produtos e estoque",
  60  |     "Fluxo de caixa",
  61  |     "Contas a pagar",
  62  |     "Etiquetas",
  63  |     "Relatórios",
  64  |     "Visão geral",
  65  |   ]) {
  66  |     await page
  67  |       .getByRole("navigation")
  68  |       .getByRole("button", { name, exact: true })
  69  |       .click();
  70  |     await expect(page.locator("main h1")).toBeVisible();
  71  |     expect(
  72  |       await page.evaluate(
  73  |         () => document.documentElement.scrollWidth <= innerWidth,
  74  |       ),
  75  |     ).toBe(true);
  76  |   }
  77  |   expect(errors).toEqual([]);
  78  | });
  79  | 
  80  | test("product creation, scanner sale, persistence and cancellation", async ({
  81  |   page,
  82  | }) => {
  83  |   await page.goto("/");
  84  |   await page
  85  |     .getByRole("navigation")
  86  |     .getByRole("button", { name: "Produtos e estoque" })
  87  |     .click();
  88  |   await page
  89  |     .getByRole("button", { name: "Cadastrar produto", exact: true })
  90  |     .click();
  91  |   const dialog = page.getByRole("dialog");
  92  |   await dialog.getByLabel("Nome", { exact: true }).fill("Produto de teste");
  93  |   await dialog.getByLabel("Código de barras / interno").fill("TEST001");
  94  |   await dialog.getByLabel("Custo unitário").fill("4.20");
  95  |   await dialog.getByLabel("Preço de venda").fill("10");
  96  |   await dialog.getByLabel("Estoque atual").fill("8");
  97  |   await dialog.getByRole("button", { name: "Salvar cadastro" }).click();
  98  |   await expect(dialog).not.toBeVisible();
  99  |   await expect(
  100 |     page.getByText("Produto de teste", { exact: true }),
  101 |   ).toBeVisible();
  102 |   await page
  103 |     .getByRole("navigation")
  104 |     .getByRole("button", { name: "Vendas", exact: true })
  105 |     .click();
  106 |   await page.getByRole("button", { name: "Nova venda" }).click();
  107 |   await dialog.getByPlaceholder("Nome ou código de barras").fill("TEST00");
  108 |   await dialog.getByPlaceholder("Nome ou código de barras").press("Enter");
  109 |   await expect(dialog.getByRole("alert")).toContainText(
  110 |     "Código não encontrado",
  111 |   );
  112 |   await expect(
  113 |     dialog.getByRole("button", { name: /Concluir venda/ }),
  114 |   ).toBeDisabled();
  115 |   await dialog.getByPlaceholder("Nome ou código de barras").fill("TEST001");
  116 |   await dialog.getByPlaceholder("Nome ou código de barras").press("Enter");
  117 |   await dialog.getByLabel("Forma de pagamento").selectOption("Dinheiro");
  118 |   await dialog.getByLabel("Valor recebido").fill("20");
  119 |   await expect(dialog.locator(".change-line")).toContainText("10,00");
  120 |   await dialog.getByRole("button", { name: /Concluir venda/ }).click();
  121 |   await expect(dialog).not.toBeVisible();
  122 |   await page.reload();
  123 |   await page
  124 |     .getByRole("navigation")
  125 |     .getByRole("button", { name: "Produtos e estoque" })
  126 |     .click();
```