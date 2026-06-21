import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CreditCard,
  Download,
  FileJson,
  PiggyBank,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  X
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { PageHeader } from './system/Layout';
import { usePersistentState } from '../lib/uiPersistence';

type TransactionType = 'Income' | 'Expense' | 'Bill' | 'Savings';

type Category = {
  id: string;
  name: string;
  type: TransactionType;
  expected: number;
  done?: boolean;
};

type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
};

type MonthBudget = {
  monthLabel: string;
  currency: 'JOD';
  rollover: number;
  categories: Category[];
  transactions: Transaction[];
};

type BudgetStore = Record<string, MonthBudget>;

type AmountRow = {
  id: string;
  category: string;
  expected: number;
  actual: number;
  progress: number;
};

type TransactionDraft = {
  type: TransactionType;
  category: string;
  amount: string;
  date: string;
  description: string;
};

type CategoryDraft = {
  name: string;
  type: TransactionType;
  expected: string;
};

const STORAGE_KEY = 'nova_finance_monthly_dashboard_v2';
const COLORS = ['#60a5fa', '#f43f5e', '#10b981', '#a855f7', '#fde047', '#22d3ee', '#fb7185', '#34d399'];
const transactionTypes: TransactionType[] = ['Income', 'Expense', 'Bill', 'Savings'];

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const todayIso = () => new Date().toISOString().split('T')[0];
const currentMonthKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabelFromKey = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
};
const money = (value: number) => `JOD ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number) => `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`;



const emptyMonth = (key: string): MonthBudget => ({
  monthLabel: monthLabelFromKey(key),
  currency: 'JOD',
  rollover: 0,
  categories: [],
  transactions: []
});

const defaultStore = (): BudgetStore => ({
  [currentMonthKey()]: emptyMonth(currentMonthKey())
});

const getActual = (budget: MonthBudget, type: TransactionType, category?: string) => budget.transactions
  .filter(tx => tx.type === type && (!category || tx.category === category))
  .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

const expectedByType = (budget: MonthBudget, type: TransactionType) => budget.categories
  .filter(category => category.type === type)
  .reduce((sum, category) => sum + Number(category.expected || 0), 0);

const rowsForType = (budget: MonthBudget, type: TransactionType): AmountRow[] => budget.categories
  .filter(category => category.type === type)
  .map(category => {
    const actual = getActual(budget, type, category.name);
    return {
      id: category.id,
      category: category.name,
      expected: Number(category.expected || 0),
      actual,
      progress: category.expected ? (actual / category.expected) * 100 : actual > 0 ? 100 : 0,
      done: category.done
    };
  });

const firstCategoryFor = (budget: MonthBudget, type: TransactionType) =>
  budget.categories.find(category => category.type === type)?.name || '';

const KpiCard = ({ label, value, tone, detail, icon: Icon }: { label: string; value: string; tone: string; detail: string; icon: React.ComponentType<{ size?: number }> }) => (
  <article className={`finance-kpi ${tone}`}>
    <div className="finance-kpi-icon"><Icon size={16} /></div>
    <small>{label}</small>
    <strong>{value}</strong>
    <span>{detail}</span>
  </article>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="finance-panel finance-chart-card">
    <div className="finance-section-title">{title}</div>
    <div className="finance-chart">{children}</div>
  </section>
);

const categoryStatus = (row: AmountRow, type: TransactionType) => {
  if (type === 'Income' || type === 'Savings') {
    if (row.actual >= row.expected && row.expected > 0) return 'Above Target';
    if (row.actual > 0) return 'On Track';
    return 'Needs Attention';
  }
  if (row.expected > 0 && row.actual > row.expected) return 'Over Budget';
  if (row.actual > 0) return 'On Track';
  return 'Needs Attention';
};

const SummaryDashboard = ({ title, type, rows, icon: Icon }: { title: string; type: TransactionType; rows: AmountRow[]; icon: React.ComponentType<{ size?: number }> }) => {
  const totalExpected = rows.reduce((sum, row) => sum + row.expected, 0);
  const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
  const completion = totalExpected ? (totalActual / totalExpected) * 100 : totalActual > 0 ? 100 : 0;

  return (
    <section className={`finance-panel finance-summary-card ${type.toLowerCase()}`}>
      <div className="finance-summary-card-head">
        <div>
          <div className="finance-section-title">{title}</div>
          <strong>{money(totalActual)}</strong>
        </div>
        <div className="finance-summary-icon"><Icon size={18} /></div>
      </div>
      <div className="finance-summary-metrics">
        <span>Total Expected <b>{money(totalExpected)}</b></span>
        <span>Total Actual <b>{money(totalActual)}</b></span>
        <span>Completion <b>{pct(completion)}</b></span>
      </div>
      <div className="finance-category-card-grid">
        {rows.map(row => {
          const status = categoryStatus(row, type);
          return (
            <article key={row.id} className={`finance-category-card ${status.toLowerCase().replace(' ', '-')}`}>
              <div className="finance-category-card-head">
                <strong>{row.category}</strong>
                <span>{status}</span>
              </div>
              <div className="finance-category-values">
                <small>Expected {money(row.expected)}</small>
                <small>Actual {money(row.actual)}</small>
              </div>
              <div className="finance-progress"><i style={{ width: `${Math.min(100, row.progress)}%` }} /></div>
              <b>{pct(row.progress)}</b>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export const FinanceManager: React.FC = () => {
  const [store, setStore] = useState<BudgetStore>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    try {
      return { ...defaultStore(), ...JSON.parse(raw) };
    } catch {
      return defaultStore();
    }
  });
  const [activeMonth, setActiveMonth] = usePersistentState('nova_finance_active_month_v1', currentMonthKey());
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategories, setShowCategories] = usePersistentState('nova_finance_categories_open_v1', false, 'session');
  const [draft, setDraft] = useState<TransactionDraft>({
    type: 'Expense',
    category: '',
    amount: '',
    date: todayIso(),
    description: ''
  });
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({ name: '', type: 'Expense', expected: '0' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const budget = store[activeMonth] || emptyMonth(activeMonth);

  const persist = (next: BudgetStore) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStore(next);
  };

  const updateBudget = (updates: Partial<MonthBudget>) => {
    persist({ ...store, [activeMonth]: { ...budget, ...updates } });
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    updateBudget({ categories: budget.categories.map(category => category.id === id ? { ...category, ...updates } : category) });
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    updateBudget({ transactions: budget.transactions.map(tx => tx.id === id ? { ...tx, ...updates } : tx) });
  };

  const totals = useMemo(() => {
    const income = getActual(budget, 'Income');
    const expenses = getActual(budget, 'Expense');
    const bills = getActual(budget, 'Bill');
    const savings = getActual(budget, 'Savings');
    const left = budget.rollover + income - expenses - bills - savings;
    return { income, expenses, bills, savings, left, outflow: expenses + bills + savings };
  }, [budget]);

  const cashFlowRows: AmountRow[] = [
    { id: 'rollover', category: 'Rollover', expected: budget.rollover, actual: budget.rollover, progress: 100 },
    { id: 'income', category: 'Total Income', expected: expectedByType(budget, 'Income'), actual: totals.income, progress: totals.income / Math.max(1, expectedByType(budget, 'Income')) * 100 },
    { id: 'expenses', category: 'Expenses', expected: expectedByType(budget, 'Expense'), actual: totals.expenses, progress: totals.expenses / Math.max(1, expectedByType(budget, 'Expense')) * 100 },
    { id: 'bills', category: 'Bills', expected: expectedByType(budget, 'Bill'), actual: totals.bills, progress: totals.bills / Math.max(1, expectedByType(budget, 'Bill')) * 100 },
    { id: 'savings', category: 'Savings', expected: expectedByType(budget, 'Savings'), actual: totals.savings, progress: totals.savings / Math.max(1, expectedByType(budget, 'Savings')) * 100 },
    { id: 'leftover', category: 'Amount Left', expected: budget.rollover + expectedByType(budget, 'Income') - expectedByType(budget, 'Expense') - expectedByType(budget, 'Bill') - expectedByType(budget, 'Savings'), actual: totals.left, progress: 100 }
  ];

  const topCategories = useMemo(() => {
    const grouped = new Map<string, number>();
    budget.transactions
      .filter(tx => tx.type !== 'Income')
      .forEach(tx => grouped.set(tx.category, (grouped.get(tx.category) || 0) + Number(tx.amount || 0)));
    const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(grouped.entries())
      .map(([category, actual]) => ({ category, actual, percentage: total ? (actual / total) * 100 : 0 }))
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 20);
  }, [budget.transactions]);

  const status = totals.left >= 0 && totals.outflow <= budget.rollover + totals.income ? 'On Track' : 'Over Budget';
  const savingsRate = totals.income ? (totals.savings / totals.income) * 100 : 0;
  const expenseRatio = totals.income ? ((totals.expenses + totals.bills) / totals.income) * 100 : 0;
  const healthScore = Math.round(Math.max(0, Math.min(100, 55 + savingsRate * 1.2 - Math.max(0, expenseRatio - 65) + (totals.left > 0 ? 12 : -18))));
  const topSpend = topCategories[0];
  const incomeRows = rowsForType(budget, 'Income');
  const allocationBreakdown = [
    { name: 'Expenses', value: totals.expenses },
    { name: 'Bills', value: totals.bills },
    { name: 'Savings', value: totals.savings },
    { name: 'Leftover', value: Math.max(0, totals.left) }
  ].filter(row => row.value > 0);
  const incomeBreakdown = incomeRows.filter(row => row.actual > 0).map(row => ({ name: row.category, value: row.actual }));

  const advisorInsights = [
    {
      title: 'Spending habits',
      priority: topSpend && topSpend.percentage > 30 ? 'High' : 'Medium',
      icon: CreditCard,
      action: topSpend ? `Set a weekly cap for ${topSpend.category}.` : 'Add more transactions to unlock pattern detection.',
      body: topSpend
        ? `${topSpend.category} is the highest spending category at ${money(topSpend.actual)} (${pct(topSpend.percentage)} of non-income activity).`
        : 'No spending pattern yet. Add Expense or Bill transactions to establish a baseline.'
    },
    {
      title: 'Income growth',
      priority: totals.income < expectedByType(budget, 'Income') ? 'High' : 'Medium',
      icon: TrendingUp,
      action: 'Create one paid follow-up and one new offer this week.',
      body: totals.income > expectedByType(budget, 'Income')
        ? 'Income is beating plan. Protect this by documenting what generated the extra cash and repeating that channel.'
        : 'Income is below or near plan. Prioritize one new freelance lead, one follow-up, and one higher-value offer this week.'
    },
    {
      title: 'Savings performance',
      priority: savingsRate >= 15 ? 'Low' : 'High',
      icon: PiggyBank,
      action: 'Automate savings before discretionary spending.',
      body: savingsRate >= 15
        ? `Savings rate is strong at ${pct(savingsRate)}. Keep automatic transfers active before discretionary spending.`
        : `Savings rate is ${pct(savingsRate)}. Move a small fixed amount into savings immediately after income arrives.`
    },
    {
      title: 'Business opportunities',
      priority: 'Medium',
      icon: Target,
      action: 'Turn one project into a monthly retainer proposal.',
      body: 'Package recurring motion/design work into retainers, upsell source-file packages, and track paid sources inside Work > Sources.'
    },
    {
      title: 'Actionable next steps',
      priority: healthScore >= 75 ? 'Low' : 'High',
      icon: Sparkles,
      action: 'Reconcile Apple Pay/iPhone spending every week.',
      body: `Score: ${healthScore}/100. Add missing Apple Pay/iPhone transactions weekly, review ${topSpend?.category || 'top categories'}, and keep leftover above zero.`
    }
  ];

  const openTransactionModal = () => {
    const type: TransactionType = 'Expense';
    setDraft({ type, category: firstCategoryFor(budget, type), amount: '', date: todayIso(), description: '' });
    setShowTransactionModal(true);
  };

  const openCategoryModal = () => {
    setCategoryDraft({ name: '', type: 'Expense', expected: '0' });
    setShowCategoryModal(true);
  };

  const saveCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const name = categoryDraft.name.trim();
    if (!name) return;
    const nextCategory: Category = {
      id: uid('cat'),
      name,
      type: categoryDraft.type,
      expected: Number(categoryDraft.expected) || 0,
      done: categoryDraft.type === 'Bill' ? false : undefined
    };
    updateBudget({ categories: [...budget.categories, nextCategory] });
    setShowCategoryModal(false);
  };

  const saveTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Math.abs(Number(draft.amount));
    if (!amount || !draft.category) return;
    const transaction: Transaction = {
      id: uid('tx'),
      type: draft.type,
      category: draft.category,
      amount,
      date: draft.date || todayIso(),
      description: draft.description.trim()
    };
    updateBudget({ transactions: [transaction, ...budget.transactions] });
    setShowTransactionModal(false);
  };

  const resetMonth = () => {
    updateBudget(emptyMonth(activeMonth));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nova-finance-budget.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        persist(parsed);
      } catch {
        alert('Invalid JSON budget export.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="finance-dashboard">
      <PageHeader title={budget.monthLabel} description="Monthly Financial Dashboard">
        <label className="finance-month-picker">
          <CalendarDays size={16} />
          <span>Month</span>
          <input type="month" value={activeMonth} onChange={event => {
            const nextMonth = event.target.value;
            if (!nextMonth) return;
            setActiveMonth(nextMonth);
            if (!store[nextMonth]) {
              persist({ ...store, [nextMonth]: emptyMonth(nextMonth) });
            }
          }} />
        </label>
        <select className="glass-input" value={budget.currency} onChange={() => updateBudget({ currency: 'JOD' })}>
          <option value="JOD">JOD</option>
        </select>
        <span className="badge badge-purple">Apple Pay sync ready</span>
      </PageHeader>

      <div className="page-body finance-body">
        <section className="finance-kpi-grid no-debt">
          <KpiCard icon={Wallet} label="Total Income" value={money(totals.income)} tone="cyan" detail={`Expected ${money(expectedByType(budget, 'Income'))}`} />
          <KpiCard icon={CreditCard} label="Expenses & Bills" value={money(totals.expenses + totals.bills)} tone="pink" detail={`Expenses ${money(totals.expenses)} / Bills ${money(totals.bills)}`} />
          <KpiCard icon={PiggyBank} label="Savings" value={money(totals.savings)} tone="green" detail={`${pct(savingsRate)} savings rate`} />
          <KpiCard icon={Target} label="Left to Spend" value={money(totals.left)} tone="yellow" detail={`Rollover ${money(budget.rollover)}`} />
          <KpiCard icon={status === 'On Track' ? CheckCircle2 : AlertTriangle} label="Status" value={status} tone={status === 'On Track' ? 'green' : 'pink'} detail={status === 'On Track' ? 'Budget is controlled' : 'Spending is above plan'} />
        </section>

        <section className="finance-chart-grid">
          <ChartCard title="Cash Flow Summary">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowRows} layout="vertical" margin={{ left: 26, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" width={92} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="actual" radius={[0, 6, 6, 0]}>
                  {cashFlowRows.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Income Breakdown">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incomeBreakdown} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78}>
                  {incomeBreakdown.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Actual Allocation Summary">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationBreakdown} dataKey="value" nameKey="name" innerRadius={42} outerRadius={78}>
                  {allocationBreakdown.map((_, index) => <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Top Spending Categories">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topCategories.slice(0, 8)} dataKey="actual" nameKey="category" innerRadius={42} outerRadius={78}>
                  {topCategories.slice(0, 8).map((_, index) => <Cell key={index} fill={COLORS[(index + 4) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="finance-panel finance-ai-advisor">
          <div className="finance-ai-head">
            <div>
              <div className="finance-section-title">AI Financial Advisor</div>
              <p>Analysis across spending habits, income trends, savings performance, allocations, and cash flow.</p>
            </div>
            <div className="finance-score"><Bot size={18} /> {healthScore}/100</div>
          </div>
          <div className="finance-advisor-grid">
            {advisorInsights.map(insight => {
              const InsightIcon = insight.icon;
              return (
              <article key={insight.title}>
                <div className="finance-advisor-card-head">
                  <InsightIcon size={17} />
                  <span className={`finance-priority ${insight.priority.toLowerCase()}`}>{insight.priority}</span>
                </div>
                <strong>{insight.title}</strong>
                <p>{insight.body}</p>
                <div className="finance-action-step"><ArrowRight size={13} /> {insight.action}</div>
              </article>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="finance-large-title">Financial Summaries</h3>
          <div className="finance-summary-dashboard-grid">
            <SummaryDashboard title="Income" type="Income" rows={rowsForType(budget, 'Income')} icon={Wallet} />
            <SummaryDashboard title="Expenses" type="Expense" rows={rowsForType(budget, 'Expense')} icon={CreditCard} />
            <SummaryDashboard title="Bills" type="Bill" rows={rowsForType(budget, 'Bill')} icon={CheckCircle2} />
            <SummaryDashboard title="Savings & Investments" type="Savings" rows={rowsForType(budget, 'Savings')} icon={PiggyBank} />
          </div>
        </section>

        <section className="finance-single-panel">
          <section className="finance-panel finance-table-panel">
            <div className="finance-panel-head">
              <button className="finance-collapse-title" type="button" onClick={() => setShowCategories(current => !current)}>
                <ChevronDown size={16} className={showCategories ? 'open' : ''} />
                <span>Categories</span>
              </button>
              {showCategories && (
                <button className="glass-btn" type="button" onClick={openCategoryModal}><Plus size={14} /> Add Category</button>
              )}
            </div>
            {showCategories && <div className="finance-table-wrap">
              <table className="finance-table">
                <thead><tr><th>Name</th><th>Type</th><th>Expected</th><th /></tr></thead>
                <tbody>
                  {budget.categories.map(category => (
                    <tr key={category.id}>
                      <td><input value={category.name} onChange={event => updateCategory(category.id, { name: event.target.value })} /></td>
                      <td>
                        <select value={category.type} onChange={event => updateCategory(category.id, { type: event.target.value as TransactionType })}>
                          {transactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </td>
                      <td><input type="number" value={category.expected} onChange={event => updateCategory(category.id, { expected: Number(event.target.value) })} /></td>
                      <td><button onClick={() => updateBudget({ categories: budget.categories.filter(item => item.id !== category.id) })}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </section>
        </section>

        <section className="finance-panel finance-table-panel">
          <div className="finance-panel-head">
            <div className="finance-section-title">Transactions List</div>
            <div className="finance-toolbar inline">
              <button className="glass-btn btn-cyan" onClick={openTransactionModal}><Plus size={15} /> Add Transaction</button>
              <button className="glass-btn" onClick={exportJson}><Download size={15} /> Export JSON</button>
              <button className="glass-btn" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Import JSON</button>
              <button className="glass-btn btn-magenta" onClick={resetMonth}><RotateCcw size={15} /> Reset Month</button>
              <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={importJson} />
            </div>
          </div>
          <div className="finance-table-wrap">
            <table className="finance-table transactions-table">
              <thead><tr><th>Date</th><th>Transaction Type</th><th>Category</th><th>Amount</th><th>Description</th><th /></tr></thead>
              <tbody>
                {budget.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td><input type="date" value={tx.date} onChange={event => updateTransaction(tx.id, { date: event.target.value })} /></td>
                    <td>
                      <select value={tx.type} onChange={event => {
                        const nextType = event.target.value as TransactionType;
                        updateTransaction(tx.id, { type: nextType, category: firstCategoryFor(budget, nextType) });
                      }}>
                        {transactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={tx.category} onChange={event => updateTransaction(tx.id, { category: event.target.value })}>
                        {budget.categories.filter(category => category.type === tx.type).map(category => (
                          <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><input type="number" value={tx.amount} onChange={event => updateTransaction(tx.id, { amount: Number(event.target.value) })} /></td>
                    <td><input value={tx.description} onChange={event => updateTransaction(tx.id, { description: event.target.value })} /></td>
                    <td><button onClick={() => updateBudget({ transactions: budget.transactions.filter(item => item.id !== tx.id) })}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="finance-import-note">
          <FileJson size={16} />
          <span>Transactions are saved locally and persist after refresh. Apple Pay iPhone sync can plug into this transaction model later.</span>
          {status === 'Over Budget' && <strong><AlertTriangle size={15} /> Review over-budget rows</strong>}
          {status === 'On Track' && <strong><CheckCircle2 size={15} /> Month is on track</strong>}
        </section>
      </div>

      {showTransactionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel finance-transaction-modal">
            <form onSubmit={saveTransaction}>
              <div className="finance-modal-head">
                <div>
                  <h3>Add Transaction</h3>
                  <p>Record income, expenses, bills, and savings for the current month.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setShowTransactionModal(false)}><X size={16} /></button>
              </div>

              <div className="finance-modal-grid">
                <label>
                  Transaction Type
                  <select className="glass-input" value={draft.type} onChange={event => {
                    const type = event.target.value as TransactionType;
                    setDraft(current => ({ ...current, type, category: firstCategoryFor(budget, type) }));
                  }}>
                    {transactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>
                  Amount
                  <input className="glass-input mono" type="number" step="0.01" value={draft.amount} onChange={event => setDraft({ ...draft, amount: event.target.value })} required />
                </label>
                <label>
                  Date
                  <input className="glass-input" type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} required />
                </label>
              </div>

              <label className="finance-modal-label">
                Category
                <div className="finance-category-inline">
                  <select className="glass-input compact-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>
                    {budget.categories.filter(category => category.type === draft.type).map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="finance-modal-label">
                Description
                <textarea className="glass-input" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} />
              </label>

              <div className="finance-modal-actions">
                <button className="glass-btn" type="button" onClick={() => setShowTransactionModal(false)}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><Plus size={16} /> Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel finance-transaction-modal">
            <form onSubmit={saveCategory}>
              <div className="finance-modal-head">
                <div>
                  <h3>Add Category</h3>
                  <p>Create a reusable category for transactions, summaries, and charts.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setShowCategoryModal(false)}><X size={16} /></button>
              </div>

              <div className="finance-modal-grid">
                <label>
                  Category Name
                  <input className="glass-input" value={categoryDraft.name} onChange={event => setCategoryDraft({ ...categoryDraft, name: event.target.value })} required />
                </label>
                <label>
                  Type
                  <select className="glass-input" value={categoryDraft.type} onChange={event => setCategoryDraft({ ...categoryDraft, type: event.target.value as TransactionType })}>
                    {transactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>
                  Expected Monthly Amount
                  <input className="glass-input mono" type="number" step="0.01" value={categoryDraft.expected} onChange={event => setCategoryDraft({ ...categoryDraft, expected: event.target.value })} />
                </label>
              </div>

              <div className="finance-modal-actions">
                <button className="glass-btn" type="button" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><Plus size={16} /> Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
