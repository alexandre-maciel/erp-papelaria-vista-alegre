import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Barcode,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  Menu,
  Minus,
  Package,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import JsBarcode from "jsbarcode";
import {
  activeSession,
  cashBalance,
  cents,
  createDemo,
  dayKey,
  money,
  payments,
  saleTotal,
  summarize,
  transact,
  uid,
} from "./domain.js";

const STORAGE_KEY = "vista-alegre-demo-v1";
const pages = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "sales", label: "Vendas", icon: ShoppingCart },
  { id: "stock", label: "Produtos e estoque", icon: Package },
  { id: "cash", label: "Fluxo de caixa", icon: Wallet },
  { id: "bills", label: "Contas a pagar", icon: ReceiptText },
  { id: "labels", label: "Etiquetas", icon: Barcode },
  { id: "reports", label: "Relatórios", icon: TrendingUp },
];
const categories = [
  "Papelaria",
  "Eletrônicos",
  "Bolsas e acessórios",
  "Serviços",
  "Outros",
];
const formatDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
const time = (value) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const paymentIcon = (p) =>
  p === "Dinheiro" ? Banknote : p === "Pix" ? Sparkles : CreditCard;

function ProductIcon({ product, small = false }) {
  const Icon =
    product.type === "service"
      ? Printer
      : product.category === "Eletrônicos"
        ? Tag
        : product.category === "Bolsas e acessórios"
          ? ShoppingBag
          : BookOpen;
  return (
    <span
      className={`product-icon ${product.color || "purple"} ${small ? "small" : ""}`}
    >
      <Icon size={small ? 17 : 22} strokeWidth={1.7} />
    </span>
  );
}
function Badge({ children, tone = "green" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({ children }) {
  return (
    <div className="empty">
      <Package size={30} />
      <p>{children}</p>
    </div>
  );
}
function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function BarcodeImage({ code, compact = false }) {
  const ref = useRef(null);
  useEffect(() => {
    try {
      JsBarcode(ref.current, code, {
        format: "CODE128",
        height: compact ? 30 : 46,
        width: 1.5,
        displayValue: false,
        margin: 16,
        background: "#fff",
      });
    } catch {
      ref.current.replaceChildren();
    }
  }, [code, compact]);
  return <svg ref={ref} role="img" aria-label={`Código de barras ${code}`} />;
}
function Modal({ title, subtitle, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-inner">
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Fechar janela"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return createDemo();
      const parsed = JSON.parse(saved);
      if (
        parsed.version !== 1 ||
        !["products", "sales", "sessions", "movements", "bills"].every((key) =>
          Array.isArray(parsed[key]),
        )
      )
        throw Error("invalid");
      return parsed;
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [lowOnly, setLowOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayKey());
  const [chartPeriod, setChartPeriod] = useState("week");
  const [reportFrom, setReportFrom] = useState(
    dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [reportTo, setReportTo] = useState(dayKey());
  const [labelSelection, setLabelSelection] = useState({});
  const [labelWidth, setLabelWidth] = useState(50);
  const [labelHeight, setLabelHeight] = useState(30);
  const [printReady, setPrintReady] = useState(false);
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timeout);
    }
  }, [toast]);
  useEffect(() => {
    const clear = () => setPrintReady(false);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);
  useEffect(() => {
    if (printReady) {
      const timeout = setTimeout(() => window.print(), 200);
      return () => clearTimeout(timeout);
    }
  }, [printReady]);

  function commit(action, message) {
    try {
      const next = transact(state, action);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setToast(message);
      return true;
    } catch (error) {
      throw Error(
        error.name === "QuotaExceededError" || error.name === "SecurityError"
          ? "Não foi possível salvar no navegador. Exporte seus dados e verifique o armazenamento."
          : error.message,
      );
    }
  }
  function navigate(id) {
    setPage(id);
    setMenu(false);
    setQuery("");
    setLowOnly(false);
    setCategory("Todas as categorias");
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `vista-alegre-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Cópia dos dados exportada. Guarde em um local seguro.");
  }
  if (!state)
    return (
      <main className="recovery">
        <Store size={40} />
        <h1>Não foi possível carregar os dados locais</h1>
        <p>
          Os dados existentes não foram substituídos. Verifique o armazenamento
          do navegador antes de continuar.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </main>
    );

  const session = activeSession(state);
  const today = summarize(state, selectedDate);
  const lowProducts = state.products.filter(
    (p) => p.type !== "service" && p.stock <= p.minimum,
  );
  const dueBills = state.bills
    .filter((b) => !b.paidAt)
    .sort((a, b) => a.due.localeCompare(b.due));
  const visibleProducts = state.products.filter(
    (p) =>
      `${p.name} ${p.code}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (category === "Todas as categorias" || p.category === category) &&
      (!lowOnly || (p.type !== "service" && p.stock <= p.minimum)),
  );
  const currentPage = pages.find((p) => p.id === page);
  const totalLabels = Object.values(labelSelection).reduce((n, q) => n + q, 0);
  const labelProducts = state.products.filter((p) => labelSelection[p.id] > 0);

  function salesTable(sales, full = false) {
    return sales.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Venda / Produto</th>
              <th>Pagamento</th>
              <th>{full ? "Data e hora" : "Horário"}</th>
              <th className="align-right">Valor</th>
              <th>Status</th>
              {full && <th aria-label="Ações" />}
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="sale-cell">
                    <span className="sale-symbol">
                      <ShoppingBag size={17} />
                    </span>
                    <div>
                      <strong>Venda #{s.number}</strong>
                      <small>
                        {s.items.length > 1
                          ? `${s.items[0].name} + ${s.items.length - 1}`
                          : s.items[0].name}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="payment-label">
                    {(() => {
                      const Icon = paymentIcon(s.payment);
                      return <Icon size={15} />;
                    })()}
                    {s.payment}
                  </span>
                </td>
                <td className="muted">
                  {full ? `${formatDate(dayKey(s.at))}, ` : ""}
                  {time(s.at)}
                </td>
                <td className="align-right amount">{money(saleTotal(s))}</td>
                <td>
                  <Badge tone={s.cancelled ? "gray" : "green"}>
                    {s.cancelled ? "Cancelada" : "Concluída"}
                  </Badge>
                </td>
                {full && (
                  <td>
                    {!s.cancelled && s.sessionId === session?.id && (
                      <button
                        className="text-button danger"
                        onClick={() => setModal({ type: "cancel", sale: s })}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty>Nenhuma venda neste período. Registre sua primeira venda.</Empty>
    );
  }

  function chart() {
    const count = chartPeriod === "week" ? 7 : 14;
    const days = Array.from({ length: count }, (_, index) => {
      const d = new Date(`${selectedDate}T12:00:00`);
      d.setDate(d.getDate() - (count - 1 - index));
      return { date: dayKey(d), ...summarize(state, dayKey(d)) };
    });
    const max = Math.max(10000, ...days.flatMap((d) => [d.revenue, d.spent]));
    const ceiling = Math.ceil(max / 10000) * 10000;
    return (
      <div className="chart">
        <div className="chart-y">
          {[1, 0.75, 0.5, 0.25, 0].map((n) => (
            <span key={n}>{money(ceiling * n).replace(",00", "")}</span>
          ))}
        </div>
        <div className="chart-main">
          <div className="chart-grid">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} />
            ))}
          </div>
          <div className="chart-bars">
            {days.map((d, i) => (
              <div
                className={`chart-day ${i === count - 1 ? "current" : ""}`}
                key={d.date}
              >
                <div
                  className="bars"
                  title={`${formatDate(d.date)}: vendas ${money(d.revenue)}, despesas ${money(d.spent)}`}
                >
                  <span
                    className="bar income"
                    style={{ height: `${(d.revenue / ceiling) * 100}%` }}
                  />
                  <span
                    className="bar expense"
                    style={{ height: `${(d.spent / ceiling) * 100}%` }}
                  />
                </div>
                <span className="chart-x">
                  {count === 7
                    ? new Date(`${d.date}T12:00:00`)
                        .toLocaleDateString("pt-BR", { weekday: "short" })
                        .replace(".", "")
                    : new Date(`${d.date}T12:00:00`).getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-shell">
        {menu && <div className="nav-scrim" onClick={() => setMenu(false)} />}
        <aside id="sidebar" className={`sidebar ${menu ? "is-open" : ""}`}>
          <a
            href="#"
            className="brand"
            aria-label="Papelaria Vista Alegre, visão geral"
            title="Papelaria Vista Alegre"
            onClick={(e) => {
              e.preventDefault();
              navigate("dashboard");
            }}
          >
            <span className="brand-mark">
              v<span />
            </span>
            <span className="sidebar-label brand-name">
              vista alegre<small>Papelaria & variedades</small>
            </span>
          </a>
          <span className="nav-caption sidebar-label">Gerenciar</span>
          <nav aria-label="Navegação principal">
            {pages.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-link ${page === id ? "active" : ""}`}
                onClick={() => navigate(id)}
                aria-label={label}
                title={label}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="sidebar-label">{label}</span>
                {id === "bills" && dueBills.length > 0 && (
                  <span className="nav-count sidebar-label">
                    {dueBills.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button
              className="nav-link"
              aria-label="Ajuda"
              title="Ajuda"
              onClick={() => setModal({ type: "help" })}
            >
              <CircleHelp size={20} strokeWidth={1.8} />
              <span className="sidebar-label">Ajuda</span>
            </button>
            <button
              className="nav-link"
              aria-label="Configurações"
              title="Configurações"
              onClick={() => setModal({ type: "settings" })}
            >
              <Settings2 size={20} strokeWidth={1.8} />
              <span className="sidebar-label">Configurações</span>
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Abrir menu"
                aria-controls="sidebar"
                aria-expanded={menu}
                onClick={() => setMenu(true)}
              >
                <Menu size={22} />
              </button>
              <span>Minha loja</span>
              <ChevronRight size={14} />
              <strong>{currentPage.label}</strong>
            </div>
            <div className="topbar-actions">
              <span className="demo-tag">
                <span />
                Modo demonstração
              </span>
              <button
                className="icon-button notification"
                aria-label="Ver alertas de estoque e contas"
                onClick={() => setModal({ type: "alerts" })}
              >
                <Bell size={20} />
                <i />
              </button>
              <span className="topbar-divider" />
              <span className="avatar small-avatar">VA</span>
            </div>
          </header>
          <main className="main-content">
            <div className="page-heading">
              <div>
                <div className="heading-kicker">
                  {page === "dashboard"
                    ? "Um novo dia, novas possibilidades"
                    : "Papelaria Vista Alegre"}
                </div>
                <h1>
                  {page === "dashboard"
                    ? "Sua loja, em dia."
                    : currentPage.label}
                  {page === "dashboard" && (
                    <span className="sun-doodle">✳</span>
                  )}
                </h1>
                <p>
                  {
                    {
                      dashboard:
                        "Acompanhe o movimento e cuide do que importa.",
                      sales:
                        "Cada venda registrada. Cada detalhe sob controle.",
                      stock: "Organize seus produtos, custos e serviços.",
                      cash: "Acompanhe cada entrada e saída do seu dia.",
                      bills: "Organize os vencimentos e evite surpresas.",
                      labels:
                        "Do cadastro para a prateleira, com tudo identificado.",
                      reports: "Entenda os números por trás do seu negócio.",
                    }[page]
                  }
                </p>
              </div>
              <div className="heading-actions">
                {page === "dashboard" && (
                  <label className="date-control">
                    <CalendarDays size={17} />
                    <input
                      aria-label="Data do painel"
                      type="date"
                      value={selectedDate}
                      onChange={(e) =>
                        e.target.value && setSelectedDate(e.target.value)
                      }
                    />
                  </label>
                )}
                {["dashboard", "sales"].includes(page) && (
                  <button
                    className="button primary"
                    onClick={() => setModal({ type: "sale" })}
                  >
                    <Plus size={19} />
                    Nova venda
                  </button>
                )}
                {page === "stock" && (
                  <button
                    className="button primary"
                    onClick={() => setModal({ type: "product" })}
                  >
                    <Plus size={18} />
                    Cadastrar produto
                  </button>
                )}
                {page === "bills" && (
                  <button
                    className="button primary"
                    onClick={() => setModal({ type: "bill" })}
                  >
                    <Plus size={18} />
                    Nova conta
                  </button>
                )}
                {page === "cash" && (
                  <button
                    className="button primary"
                    onClick={() => setModal({ type: "movement" })}
                  >
                    <Plus size={18} />
                    Nova movimentação
                  </button>
                )}
              </div>
            </div>

            {page === "dashboard" && (
              <>
                <div className="metric-grid">
                  <Metric
                    label="Vendas do dia"
                    value={money(today.revenue)}
                    icon={ShoppingBag}
                    color="purple"
                    footer={
                      <>
                        <span className="metric-tag purple">
                          {today.sales.length} vendas
                        </span>
                        <span>registradas no dia</span>
                      </>
                    }
                  />
                  <Metric
                    label="Despesas do dia"
                    value={money(today.spent)}
                    icon={ArrowDownRight}
                    color="orange"
                    footer={
                      <>
                        <span className="tiny-dot orange" />
                        Despesas efetivamente pagas
                      </>
                    }
                  />
                  <Metric
                    label="Lucro estimado"
                    value={money(today.profit)}
                    icon={TrendingUp}
                    color="green"
                    footer={
                      <>
                        <span className="tiny-dot green" />
                        Após custos e despesas
                      </>
                    }
                  />
                  <Metric
                    label="Dinheiro em caixa"
                    value={money(session ? cashBalance(state, session.id) : 0)}
                    icon={Wallet}
                    color="purple"
                    featured
                    footer={
                      <>
                        <span
                          className={`status-dot ${session ? "" : "closed"}`}
                        />
                        {session
                          ? `Caixa aberto às ${time(session.openedAt)}`
                          : "Caixa fechado"}
                        <button
                          aria-label="Ver fluxo de caixa"
                          onClick={() => navigate("cash")}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      </>
                    }
                  />
                </div>
                <div className="dashboard-columns">
                  <div className="dashboard-primary">
                    <section className="panel chart-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Movimento da loja</h2>
                          <p>Vendas e despesas, lado a lado</p>
                        </div>
                        <select
                          aria-label="Período do gráfico"
                          className="small-select"
                          value={chartPeriod}
                          onChange={(e) => setChartPeriod(e.target.value)}
                        >
                          <option value="week">Últimos 7 dias</option>
                          <option value="fortnight">Últimos 14 dias</option>
                        </select>
                      </div>
                      <div className="chart-legend">
                        <span>
                          <i className="legend-dot income" />
                          Vendas
                        </span>
                        <span>
                          <i className="legend-dot expense" />
                          Despesas
                        </span>
                      </div>
                      {chart()}
                    </section>
                    <section className="panel recent-panel">
                      <div className="panel-heading">
                        <div className="inline-heading">
                          <h2>Últimas vendas</h2>
                          <span className="count-bubble">
                            {today.sales.length}
                          </span>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("sales")}
                        >
                          Ver todas <ArrowRight size={15} />
                        </button>
                      </div>
                      {salesTable(today.sales.slice(0, 5))}
                    </section>
                  </div>
                  <div className="dashboard-secondary">
                    <section className="panel shortcuts-panel">
                      <h2>Vamos facilitar seu dia?</h2>
                      <p>O que você precisa fazer agora?</p>
                      <div className="shortcut-grid">
                        <button onClick={() => setModal({ type: "product" })}>
                          <span className="purple">
                            <Package size={21} />
                          </span>
                          Cadastrar produto
                        </button>
                        <button onClick={() => navigate("labels")}>
                          <span className="blue">
                            <Barcode size={22} />
                          </span>
                          Imprimir etiquetas
                        </button>
                        <button
                          onClick={() =>
                            setModal({ type: "movement", kind: "expense" })
                          }
                        >
                          <span className="orange">
                            <ArrowDownLeft size={22} />
                          </span>
                          Registrar despesa
                        </button>
                        <button
                          onClick={() =>
                            setModal({ type: session ? "close" : "open" })
                          }
                        >
                          <span className="green">
                            <Wallet size={21} />
                          </span>
                          {session ? "Fechar caixa" : "Abrir caixa"}
                        </button>
                      </div>
                    </section>
                    <section className="panel stock-alert">
                      <div className="panel-heading">
                        <h2>
                          <span className="alert-dot" />
                          Estoque pedindo atenção
                        </h2>
                        <span className="count-bubble amber">
                          {lowProducts.length}
                        </span>
                      </div>
                      <p>Vale colocar na próxima reposição.</p>
                      <div className="low-list">
                        {lowProducts.slice(0, 3).map((p) => (
                          <div key={p.id}>
                            <ProductIcon product={p} small />
                            <div>
                              <strong>{p.name}</strong>
                              <small>Mínimo: {p.minimum} unidades</small>
                            </div>
                            <span className="stock-quantity">
                              {p.stock}
                              <small>un.</small>
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="full-link"
                        onClick={() => {
                          navigate("stock");
                          setLowOnly(true);
                        }}
                      >
                        Conferir estoque <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="little-note">
                      <span className="note-icon">
                        <CalendarDays size={21} />
                      </span>
                      <div>
                        <strong>De olho nos vencimentos</strong>
                        <p>
                          {dueBills.length ? (
                            <>
                              {dueBills.length} contas em aberto. A próxima
                              vence em <b>{formatDate(dueBills[0].due)}</b>.
                            </>
                          ) : (
                            "Nenhuma conta pendente. Tudo em dia!"
                          )}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => navigate("bills")}
                        >
                          Ver contas a pagar <ArrowRight size={14} />
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
                <div className="payment-strip">
                  <span className="payment-strip-title">
                    Recebimentos do dia
                  </span>
                  {payments.map((p) => {
                    const Icon = paymentIcon(p);
                    return (
                      <div key={p}>
                        <Icon size={18} />
                        <span>{p}</span>
                        <strong>{money(today.byPayment[p])}</strong>
                      </div>
                    );
                  })}
                  <span className="payment-footnote">
                    Cartões: total vendido,
                    <br />
                    não saldo bancário.
                  </span>
                </div>
              </>
            )}

            {page === "stock" && (
              <>
                <div className="inventory-summary">
                  <span>
                    <b>
                      {
                        state.products.filter((p) => p.type !== "service")
                          .length
                      }
                    </b>{" "}
                    produtos cadastrados
                  </span>
                  <span>
                    <b>
                      {
                        state.products.filter((p) => p.type === "service")
                          .length
                      }
                    </b>{" "}
                    serviços
                  </span>
                  <button
                    className={lowOnly ? "selected" : ""}
                    onClick={() => setLowOnly(!lowOnly)}
                  >
                    <span className="alert-dot" />
                    <b>{lowProducts.length}</b> com estoque baixo
                  </button>
                  <span>
                    Estoque a custo:{" "}
                    <b>
                      {money(
                        state.products
                          .filter((p) => p.type !== "service")
                          .reduce((n, p) => n + p.stock * p.cost, 0),
                      )}
                    </b>
                  </span>
                </div>
                <section className="panel">
                  <div className="table-toolbar">
                    <label className="search-field">
                      <Search size={18} />
                      <input
                        placeholder="Buscar nome ou código de barras..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filtrar categoria"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option>Todas as categorias</option>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {visibleProducts.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Produto / Serviço</th>
                            <th>Categoria</th>
                            <th>Custo</th>
                            <th>Preço de venda</th>
                            <th>Estoque</th>
                            <th aria-label="Editar" />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleProducts.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="sale-cell">
                                  <ProductIcon product={p} />
                                  <div>
                                    <strong>{p.name}</strong>
                                    <small>{p.code}</small>
                                  </div>
                                </div>
                              </td>
                              <td className="muted">{p.category}</td>
                              <td>{money(p.cost)}</td>
                              <td className="amount">{money(p.price)}</td>
                              <td>
                                {p.type === "service" ? (
                                  <Badge tone="purple">Serviço</Badge>
                                ) : (
                                  <Badge
                                    tone={
                                      p.stock <= p.minimum ? "amber" : "gray"
                                    }
                                  >
                                    {p.stock} un.
                                  </Badge>
                                )}
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={`Editar ${p.name}`}
                                  onClick={() =>
                                    setModal({ type: "product", product: p })
                                  }
                                >
                                  <Pencil size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty>
                      Nenhum produto encontrado. Ajuste a busca ou cadastre um
                      produto.
                    </Empty>
                  )}
                </section>
              </>
            )}

            {page === "sales" && (
              <section className="panel">
                <div className="table-toolbar">
                  <label className="search-field">
                    <Search size={18} />
                    <input
                      placeholder="Buscar venda ou produto..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <span className="muted">
                    {state.sales.length} vendas no histórico
                  </span>
                </div>
                {salesTable(
                  state.sales.filter((s) =>
                    `${s.number} ${s.items.map((i) => i.name).join(" ")}`
                      .toLocaleLowerCase("pt-BR")
                      .includes(query.toLocaleLowerCase("pt-BR")),
                  ),
                  true,
                )}
              </section>
            )}

            {page === "cash" && (
              <>
                <section className="cash-banner">
                  <div>
                    <Badge tone={session ? "green" : "gray"}>
                      <span className="status-dot" />
                      {session ? "Caixa aberto" : "Caixa fechado"}
                    </Badge>
                    <h2>
                      {money(session ? cashBalance(state, session.id) : 0)}
                    </h2>
                    <p>Dinheiro físico esperado no caixa atual</p>
                  </div>
                  <div className="cash-banner-detail">
                    <span>
                      Fundo de abertura
                      <strong>{money(session?.opening || 0)}</strong>
                    </span>
                    {session && (
                      <span>
                        Aberto em
                        <strong>
                          {formatDate(dayKey(session.openedAt))} às{" "}
                          {time(session.openedAt)}
                        </strong>
                      </span>
                    )}
                    <button
                      className="button primary"
                      onClick={() =>
                        setModal({ type: session ? "close" : "open" })
                      }
                    >
                      {session ? "Conferir e fechar caixa" : "Abrir caixa"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Movimentações do dia</h2>
                      <p>Aportes e retiradas pessoais não alteram o lucro.</p>
                    </div>
                    <input
                      aria-label="Data das movimentações"
                      type="date"
                      value={selectedDate}
                      onChange={(e) =>
                        e.target.value && setSelectedDate(e.target.value)
                      }
                    />
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Tipo</th>
                          <th>Pagamento</th>
                          <th>Horário</th>
                          <th className="align-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...state.sales
                            .filter(
                              (s) =>
                                dayKey(s.at) === selectedDate && !s.cancelled,
                            )
                            .map((s) => ({
                              id: s.id,
                              description: `Venda #${s.number}`,
                              kind: "sale",
                              payment: s.payment,
                              at: s.at,
                              amount: saleTotal(s),
                            })),
                          ...state.movements.filter(
                            (m) => dayKey(m.at) === selectedDate,
                          ),
                        ]
                          .sort((a, b) => b.at.localeCompare(a.at))
                          .map((m) => (
                            <tr key={m.id}>
                              <td>
                                <strong>{m.description}</strong>
                              </td>
                              <td>
                                <Badge
                                  tone={
                                    ["sale", "supply"].includes(m.kind)
                                      ? "green"
                                      : "orange"
                                  }
                                >
                                  {
                                    {
                                      sale: "Venda",
                                      supply: "Aporte",
                                      withdrawal: "Retirada pessoal",
                                      expense: "Despesa",
                                    }[m.kind]
                                  }
                                </Badge>
                              </td>
                              <td>{m.payment}</td>
                              <td className="muted">{time(m.at)}</td>
                              <td
                                className={`align-right amount ${["sale", "supply"].includes(m.kind) ? "text-green" : "text-orange"}`}
                              >
                                {["sale", "supply"].includes(m.kind)
                                  ? "+"
                                  : "-"}{" "}
                                {money(m.amount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="panel section-gap">
                  <div className="panel-heading">
                    <h2>Histórico de fechamentos</h2>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Fechamento</th>
                          <th>Esperado em dinheiro</th>
                          <th>Dinheiro contado</th>
                          <th>Diferença</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.sessions
                          .filter((s) => s.closedAt)
                          .slice()
                          .reverse()
                          .map((s) => (
                            <tr key={s.id}>
                              <td>
                                {formatDate(dayKey(s.closedAt))},{" "}
                                {time(s.closedAt)}
                              </td>
                              <td>{money(s.expected)}</td>
                              <td>{money(s.counted)}</td>
                              <td>
                                <Badge
                                  tone={
                                    s.counted === s.expected ? "green" : "amber"
                                  }
                                >
                                  {money(s.counted - s.expected)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {page === "bills" && (
              <>
                <div className="metric-grid three">
                  <Metric
                    label="Total em aberto"
                    value={money(dueBills.reduce((n, b) => n + b.amount, 0))}
                    icon={ReceiptText}
                    color="purple"
                    footer={`${dueBills.length} contas aguardando pagamento`}
                  />
                  <Metric
                    label="Vencem hoje"
                    value={money(
                      dueBills
                        .filter((b) => b.due === dayKey())
                        .reduce((n, b) => n + b.amount, 0),
                    )}
                    icon={CalendarDays}
                    color="orange"
                    footer="Confira os vencimentos do dia"
                  />
                  <Metric
                    label="Contas pagas"
                    value={money(
                      state.bills
                        .filter((b) => b.paidAt)
                        .reduce((n, b) => n + b.amount, 0),
                    )}
                    icon={CheckCircle2}
                    color="green"
                    footer="Total de pagamentos registrados"
                  />
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Suas contas</h2>
                    <span className="muted">
                      A despesa entra no caixa quando você paga.
                    </span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Vencimento</th>
                          <th>Valor</th>
                          <th>Situação</th>
                          <th aria-label="Ação" />
                        </tr>
                      </thead>
                      <tbody>
                        {[...state.bills]
                          .sort((a, b) => a.due.localeCompare(b.due))
                          .map((b) => (
                            <tr key={b.id}>
                              <td>
                                <div className="sale-cell">
                                  <span className="sale-symbol">
                                    <FileText size={18} />
                                  </span>
                                  <strong>{b.description}</strong>
                                </div>
                              </td>
                              <td>
                                {new Date(
                                  `${b.due}T12:00:00`,
                                ).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="amount">{money(b.amount)}</td>
                              <td>
                                <Badge
                                  tone={
                                    b.paidAt
                                      ? "green"
                                      : b.due <= dayKey()
                                        ? "amber"
                                        : "gray"
                                  }
                                >
                                  {b.paidAt
                                    ? "Paga"
                                    : b.due < dayKey()
                                      ? "Vencida"
                                      : b.due === dayKey()
                                        ? "Vence hoje"
                                        : "Em aberto"}
                                </Badge>
                              </td>
                              <td>
                                {!b.paidAt && (
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      setModal({
                                        type: "movement",
                                        bill: b,
                                        kind: "expense",
                                      })
                                    }
                                  >
                                    Registrar pagamento <ArrowRight size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {page === "labels" && (
              <div className="labels-layout">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Selecione os produtos</h2>
                      <p>Escolha quantas etiquetas deseja imprimir.</p>
                    </div>
                    <Barcode size={24} className="muted" />
                  </div>
                  <div className="table-toolbar">
                    <label className="search-field">
                      <Search size={18} />
                      <input
                        placeholder="Buscar produto..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="label-product-list">
                    {visibleProducts
                      .filter((p) => p.type !== "service")
                      .map((p) => (
                        <div key={p.id}>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${p.name}`}
                            checked={!!labelSelection[p.id]}
                            onChange={(e) =>
                              setLabelSelection({
                                ...labelSelection,
                                [p.id]: e.target.checked ? 1 : 0,
                              })
                            }
                          />
                          <ProductIcon product={p} />
                          <div className="grow">
                            <strong>{p.name}</strong>
                            <small>{p.code}</small>
                          </div>
                          <input
                            className="quantity-input"
                            aria-label={`Quantidade de etiquetas de ${p.name}`}
                            type="number"
                            min="0"
                            max="100"
                            value={labelSelection[p.id] || 0}
                            onChange={(e) =>
                              setLabelSelection({
                                ...labelSelection,
                                [p.id]: Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Math.floor(Number(e.target.value)),
                                  ),
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                  </div>
                </section>
                <section className="panel label-preview">
                  <h2>Prontas para a prateleira</h2>
                  <p>Somente o código de barras, como você pediu.</p>
                  <div className="label-paper">
                    {labelProducts[0] ? (
                      <BarcodeImage code={labelProducts[0].code} />
                    ) : (
                      <>
                        <Barcode size={90} strokeWidth={1} />
                        <small>Selecione um produto para visualizar</small>
                      </>
                    )}
                  </div>
                  <Badge tone="purple">Código 128</Badge>
                  <div className="form-grid">
                    <Field label="Largura (mm)">
                      <select
                        value={labelWidth}
                        onChange={(e) => setLabelWidth(Number(e.target.value))}
                      >
                        <option value={50}>50 mm</option>
                        <option value={60}>60 mm</option>
                        <option value={80}>80 mm</option>
                      </select>
                    </Field>
                    <Field label="Altura (mm)">
                      <select
                        value={labelHeight}
                        onChange={(e) => setLabelHeight(Number(e.target.value))}
                      >
                        <option value={30}>30 mm</option>
                        <option value={40}>40 mm</option>
                      </select>
                    </Field>
                  </div>
                  <div className="label-total">
                    <span>Total de etiquetas</span>
                    <strong>{totalLabels}</strong>
                  </div>
                  <button
                    className="button primary full-width"
                    disabled={!totalLabels || totalLabels > 300}
                    onClick={() => setPrintReady(true)}
                  >
                    <Printer size={18} />
                    Imprimir etiquetas
                  </button>
                  <p className="fine-print">
                    Folha A4 sem margens adesivas predefinidas. Use escala de
                    100% e desative cabeçalhos. Máximo de 300 etiquetas por
                    lote. O alinhamento final depende da impressora e da folha
                    escolhidas.
                  </p>
                </section>
              </div>
            )}

            {page === "reports" &&
              (() => {
                const report = summarize(state, reportFrom, reportTo);
                const ranking = {};
                report.sales.forEach((s) =>
                  s.items.forEach((i) => {
                    ranking[i.id] ||= { name: i.name, quantity: 0, revenue: 0 };
                    ranking[i.id].quantity += i.quantity;
                    ranking[i.id].revenue += i.price * i.quantity;
                  }),
                );
                return (
                  <>
                    <section className="report-filter">
                      <Field label="De">
                        <input
                          type="date"
                          value={reportFrom}
                          max={reportTo}
                          onChange={(e) =>
                            e.target.value && setReportFrom(e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Até">
                        <input
                          type="date"
                          value={reportTo}
                          min={reportFrom}
                          onChange={(e) =>
                            e.target.value && setReportTo(e.target.value)
                          }
                        />
                      </Field>
                      <span>
                        <ShieldCheck size={17} />
                        Vendas canceladas não entram no resultado.
                      </span>
                    </section>
                    <div className="metric-grid three">
                      <Metric
                        label="Receita de vendas"
                        value={money(report.revenue)}
                        icon={ShoppingBag}
                        color="purple"
                        footer={`${report.sales.length} vendas no período`}
                      />
                      <Metric
                        label="Custos e despesas"
                        value={money(report.cost + report.spent)}
                        icon={ArrowDownRight}
                        color="orange"
                        footer={`Produtos e serviços: ${money(report.cost)}`}
                      />
                      <Metric
                        label="Lucro estimado"
                        value={money(report.profit)}
                        icon={TrendingUp}
                        color="green"
                        footer="Receita menos custos e despesas pagas"
                      />
                    </div>
                    <div className="report-columns">
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Produtos e serviços mais vendidos</h2>
                        </div>
                        {Object.values(ranking).length ? (
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>Produto / Serviço</th>
                                  <th>Quantidade</th>
                                  <th className="align-right">Receita</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.values(ranking)
                                  .sort((a, b) => b.revenue - a.revenue)
                                  .map((p) => (
                                    <tr key={p.name}>
                                      <td>
                                        <strong>{p.name}</strong>
                                      </td>
                                      <td>{p.quantity}</td>
                                      <td className="align-right amount">
                                        {money(p.revenue)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <Empty>Sem vendas no período selecionado.</Empty>
                        )}
                      </section>
                      <section className="panel result-panel">
                        <h2>Como chegamos ao resultado</h2>
                        <dl>
                          <div>
                            <dt>Vendas</dt>
                            <dd>{money(report.revenue)}</dd>
                          </div>
                          <div>
                            <dt>Custo dos itens vendidos</dt>
                            <dd>- {money(report.cost)}</dd>
                          </div>
                          <div>
                            <dt>Despesas pagas</dt>
                            <dd>- {money(report.spent)}</dd>
                          </div>
                          <div className="result-total">
                            <dt>Lucro estimado</dt>
                            <dd>{money(report.profit)}</dd>
                          </div>
                        </dl>
                        <p className="info-note">
                          Esta é uma estimativa gerencial, não um demonstrativo
                          contábil. Taxas de cartão e impostos não são
                          calculados automaticamente. Contas pendentes, aportes
                          e retiradas pessoais não entram neste resultado.
                        </p>
                      </section>
                    </div>
                  </>
                );
              })()}

            <footer className="page-footer">
              <span>
                <span className="mini-brand">v</span>Papelaria Vista Alegre{" "}
                <span className="footer-separator">/</span> Seu negócio bem
                cuidado.
              </span>
              <span>
                <span className="local-dot" />
                Dados de demonstração salvos neste navegador
              </span>
            </footer>
          </main>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button aria-label="Dispensar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            {
              sale: "Nova venda",
              product: modal.product
                ? "Editar produto"
                : "Cadastrar produto ou serviço",
              open: "Abrir caixa",
              close: "Conferir e fechar caixa",
              movement: modal.bill
                ? "Registrar pagamento"
                : "Nova movimentação",
              bill: "Nova conta a pagar",
              cancel: "Cancelar venda",
              settings: "Configurações da loja",
              help: "Seu sistema, sem complicação",
              alerts: "O que precisa de atenção",
            }[modal.type]
          }
          subtitle={
            modal.type === "sale"
              ? "Adicione produtos pelo nome ou use o leitor de código de barras."
              : undefined
          }
          close={() => setModal(null)}
          wide={modal.type === "sale"}
        >
          {modal.type === "sale" ? (
            <SaleForm
              state={state}
              commit={commit}
              close={() => setModal(null)}
            />
          ) : [
              "product",
              "open",
              "close",
              "movement",
              "bill",
              "cancel",
            ].includes(modal.type) ? (
            <RecordForm
              modal={modal}
              state={state}
              commit={commit}
              close={() => setModal(null)}
            />
          ) : modal.type === "settings" ? (
            <>
              <div className="settings-store">
                <span className="brand-mark">
                  v<span />
                </span>
                <div>
                  <h3>Papelaria Vista Alegre</h3>
                  <p>Uma loja. Um lugar para organizar tudo.</p>
                </div>
              </div>
              <div className="info-note">
                <strong>Versão demonstrativa local</strong>
                <p>
                  Os dados ficam apenas neste navegador. Ainda não há login,
                  sincronização entre dispositivos ou backup automático. Não use
                  como único registro financeiro da loja.
                </p>
              </div>
              <h3 className="section-gap">Cópia dos dados</h3>
              <p className="muted">
                Exporte um arquivo JSON com os cadastros e o histórico. A
                restauração e a migração para o banco online serão implementadas
                na etapa de publicação.
              </p>
              <button className="button secondary" onClick={exportData}>
                <Download size={17} />
                Exportar dados locais
              </button>
              <h3 className="section-gap">Próxima etapa: sua loja online</h3>
              <p className="muted">
                Hospedagem, banco de dados gerenciado, acesso com senha e
                backups automáticos. A contratação será definida com você antes
                de gerar qualquer custo.
              </p>
            </>
          ) : modal.type === "help" ? (
            <div className="help-content">
              <p>O básico para começar a testar a sua loja:</p>
              {[
                [
                  "Abra o caixa",
                  "Informe o dinheiro de troco no início do expediente. A demonstração já começa com um caixa aberto.",
                ],
                [
                  "Cadastre seus produtos",
                  "Informe nome, código, preço de venda, custo e estoque. Serviços não precisam de estoque.",
                ],
                [
                  "Registre as vendas e despesas",
                  "As vendas baixam o estoque automaticamente. Registre também gastos, aportes e retiradas.",
                ],
                [
                  "Confira o dia",
                  "No fechamento, conte o dinheiro físico. Pix e cartões aparecem separados.",
                ],
                [
                  "Imprima as etiquetas",
                  "Selecione os produtos e as quantidades. Teste o tamanho antes de comprar a impressora.",
                ],
              ].map(([title, text]) => (
                <div key={title}>
                  <CheckCircle2 size={21} />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
              <p className="info-note">
                Todos os produtos e lançamentos iniciais são fictícios. Os
                comprovantes e controles deste sistema não substituem documentos
                fiscais.
              </p>
            </div>
          ) : (
            <>
              <h3>Reposição de estoque</h3>
              {lowProducts.map((p) => (
                <div className="alert-item" key={p.id}>
                  <ProductIcon product={p} small />
                  <span>{p.name}</span>
                  <Badge tone="amber">{p.stock} un.</Badge>
                </div>
              ))}
              <h3 className="section-gap">Próximas contas</h3>
              {dueBills.map((b) => (
                <div className="alert-item" key={b.id}>
                  <CalendarDays size={19} />
                  <span>
                    {b.description}
                    <small>{formatDate(b.due)}</small>
                  </span>
                  <strong>{money(b.amount)}</strong>
                </div>
              ))}
              <button
                className="button secondary section-gap"
                onClick={() => {
                  setModal(null);
                  navigate("bills");
                }}
              >
                Ver contas a pagar
              </button>
            </>
          )}
        </Modal>
      )}
      {printReady && (
        <div className="print-sheet">
          {labelProducts.flatMap((p) =>
            Array.from({ length: labelSelection[p.id] }, (_, i) => (
              <div
                className="printed-label"
                style={{ width: `${labelWidth}mm`, height: `${labelHeight}mm` }}
                key={`${p.id}-${i}`}
              >
                <BarcodeImage code={p.code} />
              </div>
            )),
          )}
        </div>
      )}
    </>
  );
}

function Metric({ label, value, icon: Icon, color, footer, featured = false }) {
  return (
    <section className={`metric ${featured ? "featured" : ""}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${color}`}>
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-footer">{footer}</div>
    </section>
  );
}

function RecordForm({ modal, state, commit, close }) {
  const p = modal.product;
  const [error, setError] = useState("");
  const [type, setType] = useState(p?.type || "product");
  const [kind, setKind] = useState(modal.kind || "expense");
  const [counted, setCounted] = useState("");
  const session = activeSession(state);
  function submit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const get = (name) => String(form.get(name) || "").trim();
    try {
      let action, message;
      if (modal.type === "product") {
        action = {
          type: "product",
          product: {
            id: p?.id || uid(),
            name: get("name"),
            code: get("code"),
            category: type === "service" ? "Serviços" : get("category"),
            price: cents(get("price")),
            cost: cents(get("cost")),
            stock: type === "service" ? 0 : Number(get("stock")),
            minimum: type === "service" ? 0 : Number(get("minimum")),
            type,
            color: p?.color || "purple",
          },
        };
        message = p
          ? "Cadastro atualizado."
          : "Cadastro realizado com sucesso.";
      } else if (modal.type === "open" || modal.type === "close") {
        action = { type: modal.type, amount: cents(get("amount")) };
        message =
          modal.type === "open"
            ? "Caixa aberto. Boas vendas!"
            : "Caixa fechado e conferência registrada.";
      } else if (modal.type === "bill") {
        action = {
          type: "bill",
          bill: {
            description: get("description"),
            amount: cents(get("amount")),
            due: get("due"),
          },
        };
        message = "Conta a pagar cadastrada.";
      } else if (modal.type === "movement") {
        action = {
          type: "movement",
          movement: {
            description: get("description"),
            amount: cents(get("amount")),
            kind,
            payment: get("payment"),
            ...(modal.bill ? { billId: modal.bill.id } : {}),
          },
        };
        message = modal.bill
          ? "Pagamento registrado no caixa."
          : "Movimentação registrada.";
      } else {
        action = { type: "cancel", id: modal.sale.id };
        message = "Venda cancelada. Estoque e caixa atualizados.";
      }
      if (commit(action, message)) close();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <form onSubmit={submit} className="record-form">
      {modal.type === "product" && (
        <>
          <div className="segmented">
            <button
              type="button"
              disabled={!!p}
              className={type === "product" ? "selected" : ""}
              onClick={() => setType("product")}
            >
              <Package size={17} />
              Produto
            </button>
            <button
              type="button"
              disabled={!!p}
              className={type === "service" ? "selected" : ""}
              onClick={() => setType("service")}
            >
              <Printer size={17} />
              Serviço
            </button>
          </div>
          <Field label="Nome">
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={p?.name}
              placeholder={
                type === "service"
                  ? "Ex.: Impressão colorida"
                  : "Ex.: Caderno universitário"
              }
            />
          </Field>
          <div className="form-grid">
            <Field
              label="Código de barras / interno"
              hint="Use o código de fábrica ou mantenha o gerado."
            >
              <input
                name="code"
                required
                maxLength={40}
                pattern="[\x20-\x7E]+"
                defaultValue={p?.code || `VA${Date.now().toString().slice(-9)}`}
              />
            </Field>
            <Field label="Categoria">
              <select
                name="category"
                defaultValue={p?.category || "Papelaria"}
                disabled={type === "service"}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Custo unitário (R$)">
              <input
                name="cost"
                required
                type="number"
                min="0"
                step="0.01"
                defaultValue={p ? p.cost / 100 : ""}
                placeholder="0,00"
              />
            </Field>
            <Field label="Preço de venda (R$)">
              <input
                name="price"
                required
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={p ? p.price / 100 : ""}
                placeholder="0,00"
              />
            </Field>
            {type === "product" && (
              <>
                <Field label="Estoque atual">
                  <input
                    name="stock"
                    required
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={p?.stock || 0}
                  />
                </Field>
                <Field label="Estoque mínimo">
                  <input
                    name="minimum"
                    required
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={p?.minimum || 0}
                  />
                </Field>
              </>
            )}
          </div>
          {p && (
            <p className="info-note">
              A alteração de custo e preço vale para as próximas vendas. O
              histórico mantém os valores originais. Ajuste o estoque conforme
              sua contagem física.
            </p>
          )}
        </>
      )}
      {["open", "close"].includes(modal.type) && (
        <>
          {modal.type === "close" ? (
            <>
              <div className="closing-expected">
                <span>Dinheiro esperado em caixa</span>
                <strong>
                  {money(session ? cashBalance(state, session.id) : 0)}
                </strong>
              </div>
              <p className="muted">
                Conte somente as notas e moedas. Não inclua Pix ou cartões.
              </p>
            </>
          ) : (
            <p className="muted">
              Informe o dinheiro em espécie disponível para troco no início do
              expediente.
            </p>
          )}
          <Field
            label={
              modal.type === "close"
                ? "Dinheiro contado (R$)"
                : "Fundo de abertura (R$)"
            }
          >
            <input
              name="amount"
              required
              type="number"
              min="0"
              step="0.01"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          {modal.type === "close" && counted !== "" && (
            <div className="closing-difference">
              Diferença{" "}
              <strong>
                {money(
                  cents(counted) -
                    (session ? cashBalance(state, session.id) : 0),
                )}
              </strong>
            </div>
          )}
        </>
      )}
      {["movement", "bill"].includes(modal.type) && (
        <>
          {modal.type === "movement" && !modal.bill && (
            <Field label="Tipo de movimentação">
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="expense">Despesa da loja</option>
                <option value="withdrawal">Retirada pessoal</option>
                <option value="supply">Aporte de dinheiro</option>
              </select>
            </Field>
          )}
          <Field label="Descrição">
            <input
              name="description"
              required
              maxLength={120}
              defaultValue={modal.bill?.description}
              readOnly={!!modal.bill}
              placeholder="Ex.: Material de limpeza"
            />
          </Field>
          <div className="form-grid">
            <Field label="Valor (R$)">
              <input
                name="amount"
                required
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={modal.bill ? modal.bill.amount / 100 : ""}
                readOnly={!!modal.bill}
                placeholder="0,00"
              />
            </Field>
            {modal.type === "bill" ? (
              <Field label="Vencimento">
                <input
                  name="due"
                  type="date"
                  required
                  defaultValue={dayKey()}
                />
              </Field>
            ) : (
              <Field label="Forma de pagamento">
                <select name="payment">
                  <option>Dinheiro</option>
                  <option>Pix</option>
                  <option>Débito</option>
                </select>
              </Field>
            )}
          </div>
          {modal.type === "movement" && (
            <p className="info-note">
              {kind === "expense"
                ? "A despesa será descontada do resultado do dia. Apenas pagamentos em dinheiro reduzem o caixa físico."
                : "Aportes e retiradas alteram o saldo disponível, mas não representam receita ou despesa no cálculo do lucro."}
            </p>
          )}
        </>
      )}
      {modal.type === "cancel" && (
        <>
          <p>
            Cancelar a venda <strong>#{modal.sale.number}</strong> de{" "}
            <strong>{money(saleTotal(modal.sale))}</strong>?
          </p>
          <p className="info-note">
            Os produtos voltarão ao estoque e o valor será retirado dos totais
            de vendas. A devolução do pagamento deve ser feita por você, fora do
            sistema. O histórico será preservado.
          </p>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={close}>
          Voltar
        </button>
        <button
          type="submit"
          className={`button ${modal.type === "cancel" ? "danger-button" : "primary"}`}
        >
          <Check size={17} />
          {
            {
              product: "Salvar cadastro",
              open: "Abrir caixa",
              close: "Confirmar fechamento",
              movement: modal.bill
                ? "Confirmar pagamento"
                : "Registrar movimentação",
              bill: "Cadastrar conta",
              cancel: "Confirmar cancelamento",
            }[modal.type]
          }
        </button>
      </div>
    </form>
  );
}

function SaleForm({ state, commit, close }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("Pix");
  const [received, setReceived] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const products = state.products.filter((p) =>
    `${p.name} ${p.code}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const total = cart.reduce(
    (n, i) => n + state.products.find((p) => p.id === i.id).price * i.quantity,
    0,
  );
  function add(product) {
    setError("");
    const existing = cart.find((i) => i.id === product.id);
    if (
      product.type !== "service" &&
      (existing?.quantity || 0) >= product.stock
    ) {
      setError(`Estoque insuficiente: ${product.name}.`);
      return;
    }
    setCart(
      existing
        ? cart.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...cart, { id: product.id, quantity: 1 }],
    );
    setQuery("");
    inputRef.current?.focus();
  }
  function checkout(e) {
    e.preventDefault();
    try {
      if (
        commit(
          { type: "sale", items: cart, payment, received: cents(received) },
          "Venda concluída. Estoque e caixa atualizados.",
        )
      )
        close();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <form onSubmit={checkout}>
      <div className="sale-layout">
        <div className="sale-catalog">
          <label className="search-field">
            <Search size={19} />
            <input
              ref={inputRef}
              autoFocus
              placeholder="Nome ou código de barras"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const found = state.products.find(
                    (p) => p.code === query.trim(),
                  );
                  if (found) add(found);
                  else
                    setError(
                      "Código não encontrado. Selecione um produto da lista.",
                    );
                }
              }}
            />
            <Barcode size={20} />
          </label>
          <div className="catalog-list">
            {products.map((p) => (
              <button
                type="button"
                className="catalog-product"
                key={p.id}
                onClick={() => add(p)}
                disabled={p.type !== "service" && p.stock === 0}
              >
                <ProductIcon product={p} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.type === "service" ? "Serviço" : `${p.stock} em estoque`}{" "}
                    · {p.code}
                  </small>
                </span>
                <b>{money(p.price)}</b>
                <Plus size={16} />
              </button>
            ))}
            {!products.length && <Empty>Nenhum produto encontrado.</Empty>}
          </div>
        </div>
        <div className="sale-cart">
          <h3>
            <ShoppingBag size={18} />
            Resumo da venda
            <span>{cart.reduce((n, i) => n + i.quantity, 0)} itens</span>
          </h3>
          <div className="cart-items">
            {cart.length ? (
              cart.map((i) => {
                const p = state.products.find((p) => p.id === i.id);
                return (
                  <div className="cart-item" key={i.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover ${p.name}`}
                        onClick={() =>
                          setCart(cart.filter((item) => item.id !== i.id))
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div>
                      <div className="stepper">
                        <button
                          type="button"
                          aria-label={`Diminuir ${p.name}`}
                          onClick={() =>
                            setCart(
                              cart
                                .map((item) =>
                                  item.id === i.id
                                    ? { ...item, quantity: item.quantity - 1 }
                                    : item,
                                )
                                .filter((item) => item.quantity > 0),
                            )
                          }
                        >
                          <Minus size={13} />
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Aumentar ${p.name}`}
                          onClick={() => add(p)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <b>{money(p.price * i.quantity)}</b>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="cart-empty">
                <ShoppingBag size={36} />
                <p>Sua venda começa aqui.</p>
                <small>Selecione um produto ao lado.</small>
              </div>
            )}
          </div>
          <div className="cart-total">
            <span>Total da venda</span>
            <strong>{money(total)}</strong>
          </div>
          <Field label="Forma de pagamento">
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            >
              {payments.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          {payment === "Dinheiro" && (
            <>
              <Field label="Valor recebido (R$)">
                <input
                  type="number"
                  min={total / 100}
                  step="0.01"
                  required
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <div className="change-line">
                <span>Troco</span>
                <strong>{money(Math.max(0, cents(received) - total))}</strong>
              </div>
            </>
          )}
          <p className="fine-print">
            {payment === "Pix"
              ? "Confirme o Pix na sua conta antes de concluir."
              : payment === "Dinheiro"
                ? "O troco já será considerado no saldo do caixa."
                : "Confirme o pagamento na maquininha. Sem integração ou cálculo automático de taxas."}
          </p>
        </div>
      </div>
      {!activeSession(state) && (
        <p className="form-error">
          O caixa está fechado. Abra o caixa em Fluxo de caixa para vender.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={close}>
          Cancelar
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={!cart.length || !activeSession(state)}
        >
          <Check size={18} />
          Concluir venda · {money(total)}
        </button>
      </div>
    </form>
  );
}
