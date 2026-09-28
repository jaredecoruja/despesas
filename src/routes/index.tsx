import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  Filter,
  Home,
  Lightbulb,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({ component: App });

type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  value: number;
  payment: string;
  note: string;
};

const initialExpenses: Expense[] = [
  { id: "001", date: "2026-09-28", description: "Supermercado", category: "Alimentação", value: 350, payment: "Cartão de crédito", note: "Compra do mês" },
  { id: "002", date: "2026-09-28", description: "Conta de luz", category: "Luz", value: 120, payment: "Pix", note: "" },
  { id: "003", date: "2026-09-27", description: "Combustível", category: "Outros", value: 180, payment: "Cartão de crédito", note: "" },
  { id: "004", date: "2026-09-26", description: "Netflix", category: "Assinaturas", value: 39.9, payment: "Cartão de crédito", note: "" },
];

const defaultCategories = [
  ["Alimentação", "🛒"], ["Água", "💧"], ["Luz", "💡"], ["Gás", "🔥"],
  ["Internet", "🌐"], ["Vestuário", "👕"], ["Assinaturas", "📺"], ["Supérfluos", "✨"],
  ["Saúde", "💊"], ["Lazer", "🎮"], ["Compras", "🛍️"], ["Outros", "📦"], ["Cartão de crédito", "💳"],
];

const payments = ["Cartão de crédito", "Pix", "Dinheiro", "Débito", "Transferência", "Boleto"];
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = "2026-09-28";

function App() {
  const [page, setPage] = useState("home");
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try { return JSON.parse(localStorage.getItem("despesas-expenses") || "null") || initialExpenses; } catch { return initialExpenses; }
  });
  const [categories, setCategories] = useState(defaultCategories);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [toast, setToast] = useState("");

  const saveExpenses = (next: Expense[]) => {
    setExpenses(next);
    localStorage.setItem("despesas-expenses", JSON.stringify(next));
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };

  const openNew = () => { setEditing(null); setShowExpenseForm(true); };
  const openEdit = (expense: Expense) => { setEditing(expense); setShowExpenseForm(true); };
  const closeForm = () => { setShowExpenseForm(false); setEditing(null); };
  const handleSave = (expense: Expense) => {
    const exists = expenses.some((item) => item.id === expense.id);
    const next = exists ? expenses.map((item) => item.id === expense.id ? expense : item) : [expense, ...expenses];
    saveExpenses(next);
    closeForm();
    notify(exists ? "Despesa atualizada!" : "Despesa salva!");
  };
  const remove = (id: string) => {
    if (window.confirm("Excluir esta despesa?")) { saveExpenses(expenses.filter((item) => item.id !== id)); notify("Despesa excluída."); }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><WalletCards size={22} /></div><div><strong>DESPESAS</strong><span>Controle financeiro</span></div></div>
        <nav>
          <NavItem icon={<Home size={19} />} label="Início" active={page === "home"} onClick={() => setPage("home")} />
          <NavItem icon={<CircleDollarSign size={19} />} label="Gastos" active={page === "expenses"} onClick={() => setPage("expenses")} />
          <button className="new-expense side-new" onClick={openNew}><Plus size={18} /> Nova despesa</button>
          <NavItem icon={<FileBarChart size={19} />} label="Relatórios" active={page === "reports"} onClick={() => setPage("reports")} />
          <NavItem icon={<Menu size={19} />} label="Categorias" active={page === "categories"} onClick={() => setPage("categories")} />
        </nav>
        <div className="sidebar-bottom"><NavItem icon={<Settings size={19} />} label="Configurações" active={page === "settings"} onClick={() => setPage("settings")} /></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><WalletCards size={20} /><strong>DESPESAS</strong></div><div className="topbar-actions"><button className="icon-btn"><Bell size={19} /></button><button className="avatar">JC</button></div></header>
        {page === "home" && <Dashboard expenses={expenses} onNew={openNew} onNavigate={setPage} />}
        {page === "expenses" && <ExpensesPage expenses={expenses} onNew={openNew} onEdit={openEdit} onRemove={remove} />}
        {page === "reports" && <Reports expenses={expenses} />}
        {page === "categories" && <Categories categories={categories} setCategories={setCategories} notify={notify} />}
        {page === "settings" && <SettingsPage />}
      </main>

      <nav className="bottom-nav">
        <NavItem icon={<Home size={20} />} label="Início" active={page === "home"} onClick={() => setPage("home")} />
        <NavItem icon={<CircleDollarSign size={20} />} label="Gastos" active={page === "expenses"} onClick={() => setPage("expenses")} />
        <button className="bottom-add" onClick={openNew}><Plus size={24} /></button>
        <NavItem icon={<FileBarChart size={20} />} label="Relatórios" active={page === "reports"} onClick={() => setPage("reports")} />
        <NavItem icon={<Menu size={20} />} label="Categorias" active={page === "categories"} onClick={() => setPage("categories")} />
      </nav>
      {showExpenseForm && <ExpenseModal initial={editing} categories={categories} onClose={closeForm} onSave={handleSave} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Dashboard({ expenses, onNew, onNavigate }: { expenses: Expense[]; onNew: () => void; onNavigate: (page: string) => void }) {
  const total = expenses.filter(e => e.date.startsWith("2026-09")).reduce((sum, e) => sum + e.value, 0);
  const monthExpenses = expenses.filter(e => e.date.startsWith("2026-09")).length;
  return <div className="page-container">
    <div className="page-heading"><div><p className="eyebrow">VISÃO GERAL</p><h1>Boa tarde! 👋</h1><p>Aqui está seu resumo financeiro.</p></div><button className="month-chip"><CalendarDays size={16} /> Setembro 2026 <ChevronDown size={15} /></button></div>
    <section className="stats-grid">
      <StatCard icon={<CircleDollarSign />} title="DESPESAS" value={money(total)} subtitle="Setembro 2026" />
      <StatCard icon={<FileBarChart />} title="LANÇAMENTOS" value={String(monthExpenses)} subtitle="este mês" />
      <div className="card chart-card"><div className="card-label"><span>DESPESAS DO MÊS</span><MoreHorizontal size={18} /></div><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#2563eb 0 45%, #10b981 45% 66%, #f59e0b 66% 82%, #8b5cf6 82% 100%)` }}><div><strong>{money(total)}</strong><span>total</span></div></div><div className="legend"><span><i className="dot blue" />Alimentação</span><span><i className="dot green" />Moradia</span><span><i className="dot orange" />Lazer</span></div></div></div>
    </section>
    <div className="section-title"><div><p className="eyebrow">MOVIMENTAÇÕES</p><h2>Últimos lançamentos</h2></div><button className="link-btn" onClick={() => onNavigate("expenses")}>Ver todos</button></div>
    <div className="card recent-card">{expenses.slice(0, 5).map((expense) => <ExpenseRow key={expense.id} expense={expense} />)}{expenses.length === 0 && <EmptyState text="Nenhuma despesa cadastrada." />}</div>
    <button className="new-expense large-new" onClick={onNew}><Plus size={19} /> Nova despesa</button>
  </div>;
}

function StatCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string; subtitle: string }) {
  return <div className="card stat-card"><div className="stat-icon">{icon}</div><span className="card-label">{title}</span><strong>{value}</strong><small>{subtitle}</small></div>;
}

function ExpenseRow({ expense, actions = false, onEdit, onRemove }: { expense: Expense; actions?: boolean; onEdit?: () => void; onRemove?: () => void }) {
  const icon = defaultCategories.find(([name]) => name === expense.category)?.[1] || "📦";
  return <div className="expense-row"><div className="expense-icon">{icon}</div><div className="expense-info"><strong>{expense.description}</strong><span>{expense.category} · {new Date(`${expense.date}T12:00:00`).toLocaleDateString("pt-BR")}</span></div><div className="expense-value">{money(expense.value)}</div>{actions && <div className="row-actions"><button onClick={onEdit} aria-label="Editar"><Pencil size={16} /></button><button onClick={onRemove} aria-label="Excluir"><Trash2 size={16} /></button></div>}</div>;
}

function ExpensesPage({ expenses, onNew, onEdit, onRemove }: { expenses: Expense[]; onNew: () => void; onEdit: (e: Expense) => void; onRemove: (id: string) => void }) {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Todas");
  const filtered = expenses.filter(e => e.description.toLowerCase().includes(query.toLowerCase()) && (category === "Todas" || e.category === category));
  const cats = ["Todas", ...Array.from(new Set(expenses.map(e => e.category)))];
  return <div className="page-container"><div className="page-heading"><div><p className="eyebrow">CONTROLE</p><h1>Despesas</h1><p>Consulte e gerencie todos os lançamentos.</p></div><button className="new-expense" onClick={onNew}><Plus size={18} /> Nova despesa</button></div>
    <div className="filters"><label className="search-box"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar despesa..." /></label><label className="select-box"><Filter size={17} /><select value={category} onChange={e => setCategory(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={15} /></label></div>
    <div className="card list-card">{filtered.map(e => <ExpenseRow key={e.id} expense={e} actions onEdit={() => onEdit(e)} onRemove={() => onRemove(e.id)} />)}{filtered.length === 0 && <EmptyState text="Nenhum lançamento encontrado." />}</div>
  </div>;
}

function Reports({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((sum, e) => sum + e.value, 0);
  const groups = Object.entries(expenses.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.value; return acc; }, {})).sort((a,b) => b[1]-a[1]);
  const max = groups[0]?.[1] || 1;
  return <div className="page-container"><div className="page-heading"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1><p>Entenda para onde seu dinheiro está indo.</p></div><button className="month-chip"><CalendarDays size={16} /> Setembro 2026 <ChevronDown size={15} /></button></div>
    <div className="report-total card"><span>Total gasto</span><strong>{money(total)}</strong><small><TrendingUp size={14} /> Visão geral dos lançamentos cadastrados</small></div>
    <div className="reports-grid"><div className="card report-card"><div className="section-title compact"><h2>Gastos por categoria</h2></div>{groups.map(([name, value]) => <div className="bar-row" key={name}><div><span>{defaultCategories.find(c => c[0] === name)?.[1] || "📦"} {name}</span><strong>{money(value)}</strong></div><div className="bar"><i style={{ width: `${(value/max)*100}%` }} /></div></div>)}</div><div className="card report-card"><h2>Resumo</h2><div className="summary-line"><span>Maior categoria</span><strong>{groups[0]?.[0] || "—"}</strong></div><div className="summary-line"><span>Maior gasto</span><strong>{money(Math.max(...expenses.map(e => e.value), 0))}</strong></div><div className="summary-line"><span>Lançamentos</span><strong>{expenses.length}</strong></div><div className="summary-line"><span>Ticket médio</span><strong>{money(expenses.length ? total / expenses.length : 0)}</strong></div></div></div>
  </div>;
}

function Categories({ categories, setCategories, notify }: { categories: string[][]; setCategories: (c: string[][]) => void; notify: (m: string) => void }) {
  const add = () => { const name = window.prompt("Nome da nova categoria:"); if (!name?.trim()) return; if (categories.some(c => c[0].toLowerCase() === name.trim().toLowerCase())) return notify("Essa categoria já existe."); setCategories([...categories, [name.trim(), "🏷️"]]); notify("Categoria criada!"); };
  return <div className="page-container"><div className="page-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p>Personalize as categorias do seu controle financeiro.</p></div><button className="new-expense" onClick={add}><Plus size={18} /> Nova categoria</button></div><div className="category-grid">{categories.map(([name, icon]) => <div className="card category-card" key={name}><span className="category-emoji">{icon}</span><div><strong>{name}</strong><small>Categoria de despesas</small></div></div>)}</div></div>;
}

function SettingsPage() { return <div className="page-container"><div className="page-heading"><div><p className="eyebrow">PREFERÊNCIAS</p><h1>Configurações</h1><p>Conexões e preferências do aplicativo.</p></div></div><div className="settings-list card"><div><div className="setting-icon"><CreditCard /></div><div><strong>Google Sheets</strong><p>Conecte sua planilha para sincronizar os lançamentos.</p></div><span className="status-pill">Em breve</span></div><div><div className="setting-icon"><Bell /></div><div><strong>Notificações</strong><p>Receba lembretes e resumos financeiros.</p></div><span className="status-pill">Ativo</span></div><div><div className="setting-icon"><Settings /></div><div><strong>Preferências</strong><p>Mais opções de personalização serão adicionadas.</p></div></div></div></div>; }

function EmptyState({ text }: { text: string }) { return <div className="empty"><CircleDollarSign size={28} /><p>{text}</p></div>; }

function ExpenseModal({ initial, categories, onClose, onSave }: { initial: Expense | null; categories: string[][]; onClose: () => void; onSave: (e: Expense) => void }) {
  const [value, setValue] = useState(initial ? String(initial.value).replace(".", ",") : "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || categories[0][0]);
  const [date, setDate] = useState(initial?.date || today);
  const [payment, setPayment] = useState(initial?.payment || payments[0]);
  const [note, setNote] = useState(initial?.note || "");
  const submit = (event: React.FormEvent) => { event.preventDefault(); const numeric = Number(value.replace(/\./g, "").replace(",", ".")); if (!numeric || !description.trim()) return; onSave({ id: initial?.id || crypto.randomUUID(), value: numeric, description: description.trim(), category, date, payment, note: note.trim() }); };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">LANÇAMENTO</p><h2>{initial ? "Editar despesa" : "Nova despesa"}</h2></div><button className="icon-btn" onClick={onClose}><X size={19} /></button></div><form onSubmit={submit}><label>Quanto você gastou?<div className="amount-input"><span>R$</span><input autoFocus inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" /></div></label><label>Descrição<input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Supermercado" /></label><div className="form-grid"><label>Categoria<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c[0]}>{c[0]}</option>)}</select></label><label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div><label>Forma de pagamento<select value={payment} onChange={e => setPayment(e.target.value)}>{payments.map(p => <option key={p}>{p}</option>)}</select></label><label>Observação<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" rows={3} /></label><button className="save-btn" type="submit"><Check size={18} /> {initial ? "ATUALIZAR DESPESA" : "SALVAR DESPESA"}</button></form></div></div>;
}
