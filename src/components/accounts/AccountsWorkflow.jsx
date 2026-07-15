import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bank,
  CaretDown,
  ChartLineUp,
  Check,
  CheckCircle,
  CircleNotch,
  Coins,
  CreditCard,
  DotsThree,
  FileCsv,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Receipt,
  ShieldCheck,
  Target,
  Trash,
  TrendDown,
  TrendUp,
  UploadSimple,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./accounts-workflow.css";

const FX_TO_CHF = { CHF: 1, EUR: 0.93, USD: 0.82 };
const ACCOUNT_TYPES = [
  { id: "bank", label: "Bank account", group: "everyday", icon: Bank },
  { id: "cash", label: "Cash", group: "everyday", icon: Coins },
  { id: "savings", label: "Savings", group: "savings", icon: Wallet },
  { id: "liability", label: "Credit or debt", group: "debt", icon: CreditCard },
  { id: "investment", label: "Investment", group: "other", icon: ChartLineUp },
  { id: "pillar", label: "Pillar 3a", group: "other", icon: Target },
];
const TYPE_MAP = Object.fromEntries(ACCOUNT_TYPES.map((item) => [item.id, item]));
const INSTITUTIONS = [
  "UBS",
  "Zürcher Kantonalbank",
  "Raiffeisen",
  "PostFinance",
  "Neon",
  "Yuh",
  "VIAC",
  "Swissquote",
  "BCV",
  "Berner Kantonalbank",
  "Migros Bank",
  "Bank Cler",
];
const GROUPS = [
  { id: "everyday", title: "Everyday money", description: "Accounts used for daily spending", icon: Wallet },
  { id: "savings", title: "Savings", description: "Cash set aside for the future", icon: Target },
  { id: "debt", title: "Credit and debt", description: "Credit cards and liabilities", icon: CreditCard },
  { id: "other", title: "Other assets", description: "Investments and retirement assets", icon: ChartLineUp },
];
const RANGE_OPTIONS = [{ id: "1", label: "1M" }, { id: "3", label: "3M" }, { id: "6", label: "6M" }, { id: "12", label: "1Y" }];

const formatMoney = (value, currency = "CHF", digits = 0) => new Intl.NumberFormat("en-CH", {
  style: "currency",
  currency,
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
}).format(Number(value) || 0);

const formatSignedMoney = (value, currency = "CHF", digits = 0) => {
  const numeric = Number(value) || 0;
  if (!numeric) return formatMoney(0, currency, digits);
  return `${currency} ${numeric > 0 ? "+" : "-"}${new Intl.NumberFormat("en-CH", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(numeric))}`;
};

const accountDisplayBalance = (account) => account.type === "liability" ? -Math.abs(Number(account.balance) || 0) : Number(account.balance) || 0;
const toChf = (account) => accountDisplayBalance(account) * (FX_TO_CHF[account.currency] || 1);
const transactionDate = (transaction) => transaction.dateValue || transaction.date || "";
const transactionTouchesAccount = (transaction, id) => transaction.accountId === id || transaction.fromAccountId === id || transaction.toAccountId === id;
const transactionDelta = (transaction, id) => {
  if (transaction.status === "Scheduled" || transaction.archived) return 0;
  const amount = Math.abs(Number(transaction.amount) || 0);
  if (transaction.type === "income" && transaction.accountId === id) return amount;
  if (transaction.type === "expense" && transaction.accountId === id) return -amount;
  if (transaction.type === "transfer") {
    if (transaction.fromAccountId === id) return -amount;
    if (transaction.toAccountId === id) return amount;
  }
  return 0;
};

const accountGroup = (account) => {
  const lowered = `${account.name} ${account.institution}`.toLowerCase();
  if (account.type === "liability" || Number(account.balance) < 0 || /credit|card|loan|debt/.test(lowered)) return "debt";
  return TYPE_MAP[account.type]?.group || "other";
};

const accountStatus = (account, transactions) => {
  if (account.balanceConfirmed === false) return { label: "Balance not confirmed", tone: "warning" };
  const linked = transactions.filter((transaction) => transactionTouchesAccount(transaction, account.id));
  if (account.createdVia === "csv" && !linked.length) return { label: "Import required", tone: "warning" };
  if (!linked.length) return { label: "No transactions", tone: "neutral" };
  const date = account.balanceDate || account.updatedAt?.slice(0, 10);
  if (date) {
    const age = (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000;
    if (age > 45) return { label: "Needs update", tone: "danger" };
  }
  return { label: "Up to date", tone: "success" };
};

const monthKey = (date) => date?.slice(0, 7) || "";
const latestMonth = (transactions) => transactions.map((item) => monthKey(transactionDate(item))).filter(Boolean).sort().at(-1) || new Date().toISOString().slice(0, 7);
const monthKeys = (count, endKey) => {
  const [year, month] = endKey.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - count + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
};

const historyData = (accounts, transactions, count, accountId = null, adjustment = 0) => {
  const relevant = accountId ? accounts.filter((item) => item.id === accountId) : accounts.filter((item) => item.includeInNetWorth !== false);
  const end = latestMonth(transactions);
  const keys = monthKeys(count, end);
  const flowByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
  transactions.forEach((transaction) => {
    const key = monthKey(transactionDate(transaction));
    if (!(key in flowByMonth)) return;
    relevant.forEach((account) => { flowByMonth[key] += transactionDelta(transaction, account.id) * (FX_TO_CHF[account.currency] || 1); });
  });
  let running = relevant.reduce((sum, account) => sum + toChf(account), 0) + adjustment;
  return keys.map((key) => key).reverse().map((key) => {
    const point = { key, value: Math.round(running) };
    running -= flowByMonth[key] || 0;
    return point;
  }).reverse().map((point) => ({ ...point, label: new Intl.DateTimeFormat("en-GB", { month: count > 6 ? "narrow" : "short" }).format(new Date(`${point.key}-15T12:00:00`)) }));
};

function InstitutionMark({ account, size = "normal" }) {
  const text = account.institution || account.name || "Account";
  if (account.institutionLogo) return <span className={`account-institution-mark ${size}`}><img src={account.institutionLogo} alt="" /></span>;
  const initials = text.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`account-institution-mark ${size}`} aria-hidden="true">{initials || "A"}</span>;
}

function StatusBadge({ status }) {
  return <span className={`account-status ${status.tone}`}><i />{status.label}</span>;
}

function BalanceChart({ data, compact = false, toneValue = 0, chartId = "overview" }) {
  const chartColor = Number(toneValue) < 0 ? "#e45f44" : "#168c6b";
  const gradientId = `accountFill-${chartId}`;
  return <div className={compact ? "account-chart compact" : "account-chart"}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 5, left: compact ? -26 : -12, bottom: 0 }}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity=".16"/><stop offset="100%" stopColor={chartColor} stopOpacity=".015"/></linearGradient></defs>
        <CartesianGrid stroke="#eceae6" vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={18} />
        {compact ? null : <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />}
        <Tooltip formatter={(value) => formatMoney(value, "CHF")} labelFormatter={(_, payload) => payload?.[0]?.payload?.key || ""} />
        <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2.25} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

function parseCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function parseTransactionCsv(text, accountId, currency) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV needs a header row and at least one transaction.");
  const headers = parseCsvLine(lines[0]).map((item) => item.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
  return rows.map((row, index) => {
    const rawAmount = Number(String(row.amount || "").replace(/['\s]/g, ""));
    if (!Number.isFinite(rawAmount) || !row.date) throw new Error(`Check the amount and date on CSV row ${index + 2}.`);
    const type = rawAmount >= 0 ? "income" : "expense";
    return {
      id: crypto.randomUUID(), type, flowKind: "regular", accountId, amount: Math.abs(rawAmount),
      merchant: row.merchant || row.title || "Imported transaction", category: row.category || (type === "income" ? "Other" : "Other"),
      dateValue: row.date, timeValue: row.time || "12:00", status: row.status || "Cleared", notes: row.notes || "Imported from CSV",
      recurring: false, frequency: "Monthly", currency, icon: (row.merchant || row.title || "I").slice(0, 1).toUpperCase(), tone: type === "income" ? "green" : "red",
    };
  });
}

function SummaryCard({ label, value, detail, icon: Icon, tone = "neutral" }) {
  return <section className="card stat-card account-summary-card">
    <div className="stat-top"><span>{label}</span><Icon size={21} /></div>
    <div className="stat-bottom"><div>
      <strong className={`account-summary-value ${tone}`}>{value}</strong>
      <small>{detail}</small>
    </div></div>
  </section>;
}

function AccountRow({ account, transactions, monthlyChange, onOpen, onMenu }) {
  const type = TYPE_MAP[account.type] || TYPE_MAP.bank;
  const status = accountStatus(account, transactions);
  const displayBalance = accountDisplayBalance(account);
  return <div className="account-workflow-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}>
    <InstitutionMark account={account} />
    <div className="account-row-name"><strong>{account.name}</strong><span>{account.institution} · {type.label}</span></div>
    <div className="account-row-balance"><strong className={displayBalance < 0 ? "negative" : displayBalance > 0 ? "positive" : ""}>{formatSignedMoney(displayBalance, account.currency)}</strong><span>Current balance</span></div>
    <div className="account-row-change"><strong className={monthlyChange < 0 ? "negative" : monthlyChange > 0 ? "positive" : ""}>{formatSignedMoney(monthlyChange, account.currency)}</strong><span>This month</span></div>
    <div className="account-row-updated"><strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${account.balanceDate || account.updatedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)}T12:00:00`))}</strong><span>Last updated</span></div>
    <StatusBadge status={status} />
    <button className="account-row-menu" type="button" aria-label={`More options for ${account.name}`} onClick={(event) => { event.stopPropagation(); onMenu(); }}><DotsThree size={20} weight="bold" /></button>
    <ArrowRight className="account-row-arrow" size={17} />
  </div>;
}

function DebtAccountRow({ debt, transactions, onOpen }) {
  const currentMonth = latestMonth(transactions);
  const payments = transactions.filter((transaction) => monthKey(transactionDate(transaction)) === currentMonth && transaction.type === "expense" && (transaction.flowKind === "debt_payment" || transaction.category === "Debt payments" || transaction.category === "Debt payment") && String(transaction.merchant || "").toLowerCase().includes(String(debt.creditor || "").toLowerCase()));
  const monthlyReduction = payments.reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0);
  const lastPayment = payments.map(transactionDate).filter(Boolean).sort().at(-1);
  const status = payments.length ? { label: "Up to date", tone: "success" } : { label: "No payments yet", tone: "neutral" };
  return <div className="account-workflow-row debt-account-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}>
    <InstitutionMark account={{ institution: debt.creditor }} />
    <div className="account-row-name"><strong>{debt.creditor}</strong><span>{debt.type} · Debt account</span></div>
    <div className="account-row-balance"><strong className="negative">{formatSignedMoney(-Math.abs(Number(debt.balance) || 0))}</strong><span>Current balance</span></div>
    <div className="account-row-change"><strong className={monthlyReduction > 0 ? "positive" : ""}>{formatSignedMoney(monthlyReduction)}</strong><span>Paid this month</span></div>
    <div className="account-row-updated"><strong>{lastPayment ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${lastPayment}T12:00:00`)) : debt.dueDate ? `Due ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${debt.dueDate}T12:00:00`))}` : "Not updated"}</strong><span>Last activity</span></div>
    <StatusBadge status={status} />
    <button className="account-row-menu" type="button" aria-label={`View ${debt.creditor} debt`} onClick={(event) => { event.stopPropagation(); onOpen(); }}><DotsThree size={20} weight="bold" /></button>
    <ArrowRight className="account-row-arrow" size={17} />
  </div>;
}

function MethodCard({ selected, disabled, icon: Icon, title, description, badge, onClick }) {
  return <button type="button" disabled={disabled} className={`account-method-card ${selected ? "selected" : ""}`} onClick={onClick}>
    <span><Icon size={22} /></span><div><strong>{title}</strong><small>{description}</small></div>{badge ? <em>{badge}</em> : null}{selected ? <CheckCircle size={19} weight="fill" /> : null}
  </button>;
}

function WizardProgress({ step }) {
  const labels = ["Method", "Institution", "Details", "Preferences", "Review"];
  return <><div className="account-wizard-progress-mobile"><span>Step {step} of 5</span><div><i style={{ width: `${step * 20}%` }} /></div></div><aside className="account-wizard-rail"><span className="eyebrow">Add account</span><h3>A clear setup, step by step.</h3><ol>{labels.map((label, index) => <li key={label} className={index + 1 === step ? "active" : index + 1 < step ? "complete" : ""}><b>{index + 1 < step ? <Check size={13} weight="bold" /> : index + 1}</b><span>{label}</span></li>)}</ol></aside></>;
}

const initialWizardForm = () => ({
  method: "", institution: "", customInstitution: "", institutionLogo: "", name: "", type: "bank", currency: "CHF", balance: "", balanceDate: new Date().toISOString().slice(0, 10),
  includeInAvailableCash: true, includeInNetWorth: true, includeTransactionsInBudgets: true, isPrimarySpending: false, balanceConfirmed: true, csvName: "", csvRows: [],
});

function AccountWizard({ accounts, onClose, onCreate, onAddTransaction, onOpenAccount, onImportTransactions }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialWizardForm);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const fileRef = useRef(null);
  const logoRef = useRef(null);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "", _form: "" })); };
  const validate = () => {
    const next = {};
    if (step === 1 && !form.method) next.method = "Choose how you want to add this account.";
    if (step === 1 && form.method === "csv" && !form.csvName) next.csv = "Choose a CSV file to continue.";
    if (step === 2 && !form.institution) next.institution = "Choose an institution.";
    if (step === 2 && form.institution === "custom" && !form.customInstitution.trim()) next.customInstitution = "Enter the institution name.";
    if (step === 3) {
      if (!form.name.trim()) next.name = "Enter an account name.";
      if (form.balance === "" || !Number.isFinite(Number(form.balance))) next.balance = "Enter a valid current balance.";
      if (!form.balanceDate) next.balanceDate = "Choose the balance date.";
    }
    setErrors(next);
    return !Object.keys(next).length;
  };
  const next = () => { if (validate()) setStep((current) => Math.min(5, current + 1)); };
  const chooseType = (type) => setForm((current) => ({ ...current, type, includeInAvailableCash: ["bank", "cash", "savings"].includes(type), includeInNetWorth: true, includeTransactionsInBudgets: !["investment", "pillar"].includes(type) }));
  const readLogo = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrors((current) => ({ ...current, institutionLogo: "Choose a PNG, JPG, WebP, or SVG image." })); return; }
    const reader = new FileReader();
    reader.onload = () => update("institutionLogo", String(reader.result));
    reader.readAsDataURL(file);
  };
  const readCsv = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      update("csvName", file.name);
      update("csvRows", text);
    } catch { setErrors((current) => ({ ...current, csv: "Kalsoon could not read that CSV file." })); }
  };
  const create = async () => {
    setSaving(true);
    setErrors((current) => ({ ...current, _form: "" }));
    try {
      const institution = form.institution === "custom" ? form.customInstitution.trim() : form.institution;
      const account = {
        id: crypto.randomUUID(), type: form.type, institution, institutionLogo: form.institutionLogo, name: form.name.trim(), currency: form.currency, balance: form.type === "liability" ? -Math.abs(Number(form.balance)) : Number(form.balance), lastFour: "",
        balanceDate: form.balanceDate, includeInAvailableCash: form.includeInAvailableCash, includeInNetWorth: form.includeInNetWorth,
        includeTransactionsInBudgets: form.includeTransactionsInBudgets, isPrimarySpending: form.isPrimarySpending, createdVia: form.method, balanceConfirmed: form.balanceConfirmed,
        archived: false, order: accounts.length,
      };
      onCreate(account);
      if (form.method === "csv") {
        const rows = parseTransactionCsv(form.csvRows, account.id, account.currency);
        await onImportTransactions(account, rows);
      }
      setCreated(account);
    } catch (error) { setErrors((current) => ({ ...current, _form: error.message || "The account could not be created." })); }
    finally { setSaving(false); }
  };
  const filteredInstitutions = INSTITUTIONS.filter((institution) => institution.toLowerCase().includes(query.toLowerCase()));

  if (created) return <div className="modal-backdrop account-wizard-backdrop"><div className="account-wizard-success" role="dialog" aria-modal="true" aria-labelledby="account-created-title">
    <span className="success-icon"><CheckCircle size={34} weight="fill" /></span><span className="eyebrow">Account created</span><h2 id="account-created-title">{created.name} is ready</h2><p>{form.method === "csv" ? `The account and ${parseTransactionCsv(form.csvRows, created.id, created.currency).length} transactions were imported.` : "Your account now appears in the right group and is included in connected totals."}</p>
    <div className="account-created-balance"><span>Current balance</span><strong className={created.balance < 0 ? "negative" : created.balance > 0 ? "positive" : ""}>{formatSignedMoney(created.balance, created.currency, 2)}</strong></div>
    <div className="account-created-actions"><button className="secondary-button" onClick={() => onOpenAccount(created.id)}>Return to accounts</button><button className="secondary-button" onClick={() => fileRef.current?.click()}><UploadSimple size={16}/>Import CSV</button><button className="primary-button" onClick={() => onAddTransaction(created.id)}><Plus size={16}/>Add transaction</button></div>
    <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const rows = parseTransactionCsv(await file.text(), created.id, created.currency); await onImportTransactions(created, rows); }} />
  </div></div>;

  return <div className="modal-backdrop account-wizard-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><div className="account-wizard" role="dialog" aria-modal="true" aria-labelledby="account-wizard-title">
    <WizardProgress step={step} />
    <main className="account-wizard-main">
      <header><div><span className="eyebrow">Step {step} of 5</span><h2 id="account-wizard-title">{["How would you like to begin?", "Choose your institution", "Tell us about the account", "Choose how Kalsoon uses it", "Review your account"][step - 1]}</h2><p>{["Create an account manually or begin with a transaction file.", "Search Swiss institutions or add your own.", "Use the balance shown by your institution today.", "You can change these settings at any time.", "Check everything before adding it to your financial picture."][step - 1]}</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={19}/></button></header>
      <section className="account-wizard-content">
        {step === 1 ? <div className="account-methods"><MethodCard icon={PencilSimple} title="Create manually" description="Enter the account and starting balance yourself." selected={form.method === "manual"} onClick={() => update("method", "manual")} /><MethodCard icon={FileCsv} title="Import from CSV" description="Create the account and add its transaction history." selected={form.method === "csv"} onClick={() => update("method", "csv")} /><MethodCard icon={Bank} title="Connect bank" description="Automatic bank connections are being prepared." badge="Coming later" disabled />{form.method === "csv" ? <div className="account-csv-drop"><FileCsv size={24}/><div><strong>{form.csvName || "Choose a CSV file"}</strong><small>Required columns: date and amount. Merchant, category, time, status and notes are optional.</small></div><button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>{form.csvName ? "Replace" : "Choose file"}</button><input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => readCsv(event.target.files?.[0])}/></div> : null}<small className="field-error">{errors.method || errors.csv}</small></div> : null}
        {step === 2 ? <div className="institution-picker"><label className="institution-search"><MagnifyingGlass size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search institutions" /></label><div className="institution-picker-grid">{filteredInstitutions.map((institution) => <button type="button" className={form.institution === institution ? "selected" : ""} key={institution} onClick={() => update("institution", institution)}><InstitutionMark account={{ institution }} /><strong>{institution}</strong>{form.institution === institution ? <CheckCircle size={18} weight="fill"/> : null}</button>)}<button type="button" className={form.institution === "custom" ? "selected" : ""} onClick={() => update("institution", "custom")}><span className="account-institution-mark">+</span><strong>Add a custom institution</strong>{form.institution === "custom" ? <CheckCircle size={18} weight="fill"/> : null}</button></div>{form.institution === "custom" ? <div className="custom-institution-fields"><label><span>Institution name</span><input value={form.customInstitution} onChange={(event) => update("customInstitution", event.target.value)} placeholder="e.g. Banque Cantonale de Fribourg"/><small className="field-error">{errors.customInstitution}</small></label><div className="custom-logo-upload"><InstitutionMark account={{ institution: form.customInstitution || "Custom", institutionLogo: form.institutionLogo }} size="large"/><div><strong>Custom logo</strong><small>Optional. A fallback initial is always available.</small></div><button type="button" className="secondary-button" onClick={() => logoRef.current?.click()}><UploadSimple size={16}/>{form.institutionLogo ? "Replace" : "Upload"}</button><input ref={logoRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => readLogo(event.target.files?.[0])}/></div></div> : null}<small className="field-error">{errors.institution || errors.institutionLogo}</small></div> : null}
        {step === 3 ? <div className="account-wizard-form"><label><span>Account name</span><input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Everyday account"/><small className="field-error">{errors.name}</small></label><div className="account-form-grid"><label><span>Account type</span><select value={form.type} onChange={(event) => chooseType(event.target.value)}>{ACCOUNT_TYPES.map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}</select></label><label><span>Currency</span><select value={form.currency} onChange={(event) => update("currency", event.target.value)}><option value="CHF">CHF — Swiss franc</option><option value="EUR">EUR — Euro</option><option value="USD">USD — US dollar</option></select></label><label><span>Current balance</span><div className="account-amount-input"><b>{form.currency}</b><input type="number" step="0.01" value={form.balance} onChange={(event) => update("balance", event.target.value)} placeholder="0.00"/></div><small className="field-error">{errors.balance}</small></label><label><span>Balance date</span><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.balanceDate} onChange={(event) => update("balanceDate", event.target.value)}/><small className="field-error">{errors.balanceDate}</small></label></div></div> : null}
        {step === 4 ? <div className="account-config-list">{[
          ["includeInAvailableCash", "Include in available cash", "Use this balance when Kalsoon shows money available to spend.", Coins],
          ["includeInNetWorth", "Include in net worth", "Include this account in your complete financial position.", ChartLineUp],
          ["includeTransactionsInBudgets", "Include transactions in budgets", "Use categorized spending from this account in monthly budgets.", Receipt],
          ["isPrimarySpending", "Set as primary spending account", "Preselect this account when you add everyday expenses.", CreditCard],
        ].map(([field, title, description, Icon]) => <label key={field}><span><Icon size={19}/></span><div><strong>{title}</strong><small>{description}</small></div><input type="checkbox" checked={form[field]} onChange={(event) => update(field, event.target.checked)}/></label>)}</div> : null}
        {step === 5 ? <div className="account-review-panel"><div className="account-review-identity"><InstitutionMark account={{ institution: form.institution === "custom" ? form.customInstitution : form.institution, institutionLogo: form.institutionLogo }} size="large"/><div><span>{form.institution === "custom" ? form.customInstitution : form.institution}</span><h3>{form.name}</h3><small>{TYPE_MAP[form.type]?.label} · {form.currency}</small></div><strong className={form.type === "liability" || Number(form.balance) < 0 ? "negative" : Number(form.balance) > 0 ? "positive" : ""}>{formatSignedMoney(form.type === "liability" ? -Math.abs(Number(form.balance)) : Number(form.balance), form.currency, 2)}</strong></div><dl><div><dt>Balance date</dt><dd>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${form.balanceDate}T12:00:00`))}</dd></div><div><dt>Available cash</dt><dd>{form.includeInAvailableCash ? "Included" : "Not included"}</dd></div><div><dt>Net worth</dt><dd>{form.includeInNetWorth ? "Included" : "Not included"}</dd></div><div><dt>Budget tracking</dt><dd>{form.includeTransactionsInBudgets ? "Included" : "Not included"}</dd></div><div><dt>Primary spending</dt><dd>{form.isPrimarySpending ? "Yes" : "No"}</dd></div><div><dt>Created with</dt><dd>{form.method === "csv" ? form.csvName : "Manual balance"}</dd></div></dl><div className="account-review-note"><ShieldCheck size={20}/><p>Kalsoon stores only the account information you provide. No bank connection is created.</p></div><small className="field-error">{errors._form}</small></div> : null}
      </section>
      <footer><button className="secondary-button" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)} disabled={saving}>{step === 1 ? "Cancel" : "Back"}</button><button className="primary-button" onClick={step === 5 ? create : next} disabled={saving}>{saving ? <><CircleNotch className="spin" size={17}/>Creating…</> : step === 5 ? "Create account" : "Continue"}</button></footer>
    </main>
  </div></div>;
}

function AccountDetailPanel({ account, accounts, transactions, budgets, debts, goals, initialMode = "details", onClose, onUpdate, onDelete, onAddTransaction, onImportTransactions }) {
  const [mode, setMode] = useState(initialMode);
  const [draft, setDraft] = useState({ ...account, balance: String(account.balance), balanceDate: account.balanceDate || new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => { const close = (event) => { if (event.key === "Escape" && !saving) onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose, saving]);
  const linkedTransactions = transactions.filter((transaction) => transactionTouchesAccount(transaction, account.id)).sort((a, b) => `${transactionDate(b)}${b.timeValue || ""}`.localeCompare(`${transactionDate(a)}${a.timeValue || ""}`));
  const linkedDebts = debts.filter((debt) => debt.linkedAccountId === account.id);
  const linkedGoals = goals.filter((goal) => goal.linkedAccountId === account.id);
  const canDelete = !linkedTransactions.length && !linkedDebts.length && !linkedGoals.length;
  const monthlyKey = latestMonth(transactions);
  const monthly = linkedTransactions.filter((transaction) => monthKey(transactionDate(transaction)) === monthlyKey);
  const moneyIn = monthly.reduce((sum, transaction) => sum + Math.max(0, transactionDelta(transaction, account.id)), 0);
  const moneyOut = Math.abs(monthly.reduce((sum, transaction) => sum + Math.min(0, transactionDelta(transaction, account.id)), 0));
  const monthlyChange = moneyIn - moneyOut;
  const displayBalance = accountDisplayBalance(account);
  const budgetImpact = Array.from(new Map(budgets.filter((budget) => !budget.month || monthKey(budget.month) === monthlyKey).map((budget) => ({ ...budget, actual: linkedTransactions.filter((transaction) => transaction.type === "expense" && transaction.category === (budget.transactionCategory || budget.category) && monthKey(transactionDate(transaction)) === monthlyKey).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0) })).filter((budget) => budget.actual > 0).map((budget) => [budget.category, budget])).values()).sort((a, b) => b.actual - a.actual).slice(0, 3);
  const saveEdit = () => {
    if (!draft.name.trim() || draft.balance === "" || !Number.isFinite(Number(draft.balance))) { setError("Check the account name and balance."); return; }
    setSaving(true);
    onUpdate({ ...account, ...draft, name: draft.name.trim(), balance: draft.type === "liability" ? -Math.abs(Number(draft.balance)) : Number(draft.balance) });
    window.setTimeout(() => { setSaving(false); setMode("details"); }, 300);
  };
  const importCsv = async (file) => {
    if (!file) return;
    setSaving(true); setError("");
    try { const rows = parseTransactionCsv(await file.text(), account.id, account.currency); await onImportTransactions(account, rows); setMode("details"); }
    catch (importError) { setError(importError.message || "The CSV could not be imported."); }
    finally { setSaving(false); }
  };
  return <div className="account-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><aside className="account-detail-panel" role="dialog" aria-modal="true" aria-labelledby="account-detail-title">
    <header><div><span className="eyebrow">{mode === "details" ? TYPE_MAP[account.type]?.label || "Account" : mode === "delete" ? "Delete account" : mode === "balance" ? "Update balance" : "Edit account"}</span><h2 id="account-detail-title">{account.name}</h2></div><button className="icon-button" aria-label="Close account details" onClick={onClose}><X size={19}/></button></header>
    {mode === "details" ? <div className="account-detail-scroll">
      <section className="account-detail-hero"><div className="account-detail-identity"><InstitutionMark account={account} size="large"/><div><span>{account.institution}</span><StatusBadge status={accountStatus(account, transactions)} /></div></div><strong className={displayBalance < 0 ? "negative" : displayBalance > 0 ? "positive" : ""}>{formatSignedMoney(displayBalance, account.currency, 2)}</strong><small>Updated {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${account.balanceDate || new Date().toISOString().slice(0, 10)}T12:00:00`))}</small><div className="account-detail-metrics"><div><span>Monthly change</span><strong className={monthlyChange < 0 ? "negative" : monthlyChange > 0 ? "positive" : ""}>{formatSignedMoney(monthlyChange, account.currency)}</strong></div><div><span>Money in</span><strong className="positive">{formatMoney(moneyIn, account.currency)}</strong></div><div><span>Money out</span><strong className="negative">{formatMoney(moneyOut, account.currency)}</strong></div></div></section>
      <section className="account-detail-section"><div className="account-detail-section-head"><div><h3>Balance history</h3><p>Account balance after recorded activity</p></div></div><BalanceChart data={historyData(accounts, transactions, 6, account.id)} compact toneValue={displayBalance} chartId={`detail-${account.id}`} /></section>
      <section className="account-detail-section"><div className="account-detail-section-head"><div><h3>Recent transactions</h3><p>{linkedTransactions.length ? `${linkedTransactions.length} linked movements` : "No transactions yet"}</p></div><button className="text-button" onClick={() => onAddTransaction(account.id)}>Add <ArrowRight size={14}/></button></div>{linkedTransactions.length ? <div className="account-detail-transactions">{linkedTransactions.slice(0, 5).map((transaction) => { const delta = transactionDelta(transaction, account.id); return <div key={transaction.id}><span>{(transaction.merchant || "T").slice(0, 1).toUpperCase()}</span><div><strong>{transaction.merchant}</strong><small>{transaction.category} · {transactionDate(transaction)}</small></div><b className={delta < 0 ? "negative" : delta > 0 ? "positive" : ""}>{formatSignedMoney(delta, account.currency, 2)}</b></div>; })}</div> : <div className="account-detail-empty"><Receipt size={22}/><p>Add or import transactions to see money in, money out, and monthly change.</p></div>}</section>
      <section className="account-detail-section"><div className="account-detail-section-head"><div><h3>Budget impact</h3><p>Spending from this account this month</p></div></div>{account.includeTransactionsInBudgets === false ? <div className="account-detail-empty"><p>This account is excluded from monthly budget calculations.</p></div> : budgetImpact.length ? <div className="account-budget-impact">{budgetImpact.map((budget) => <div key={budget.id}><div><strong>{budget.category}</strong><span>{formatMoney(budget.actual)} of {formatMoney(budget.planned)}</span></div><i><b style={{ width: `${Math.min(100, budget.planned ? budget.actual / budget.planned * 100 : 0)}%` }}/></i></div>)}</div> : <div className="account-detail-empty"><p>No spending from this account is affecting a budget yet.</p></div>}</section>
    </div> : null}
    {mode === "balance" ? <div className="account-detail-form"><div className="account-update-note"><Coins size={20}/><p>Use this when the institution balance differs from Kalsoon. This does not create a transaction.</p></div><label><span>Current balance</span><div className="account-amount-input"><b>{account.currency}</b><input autoFocus type="number" step="0.01" value={draft.balance} onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))}/></div></label><label><span>Balance date</span><input type="date" value={draft.balanceDate} onChange={(event) => setDraft((current) => ({ ...current, balanceDate: event.target.value }))}/></label><small className="field-error">{error}</small></div> : null}
    {mode === "edit" ? <div className="account-detail-form"><label><span>Account name</span><input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}/></label><div className="account-form-grid"><label><span>Type</span><select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}>{ACCOUNT_TYPES.map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}</select></label><label><span>Currency</span><select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}><option>CHF</option><option>EUR</option><option>USD</option></select></label></div><div className="account-config-list compact">{[["includeInAvailableCash", "Include in available cash"], ["includeInNetWorth", "Include in net worth"], ["includeTransactionsInBudgets", "Include transactions in budgets"], ["isPrimarySpending", "Primary spending account"]].map(([field, label]) => <label key={field}><div><strong>{label}</strong></div><input type="checkbox" checked={draft[field] !== false} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.checked }))}/></label>)}</div><small className="field-error">{error}</small></div> : null}
    {mode === "delete" ? <div className="account-detail-delete"><span><Trash size={25}/></span><h3>{canDelete ? `Delete ${account.name}?` : "This account cannot be deleted safely"}</h3><p>{canDelete ? "The account will be removed from Kalsoon. Your financial institution is not affected." : `Remove or reassign ${[linkedTransactions.length ? `${linkedTransactions.length} transaction${linkedTransactions.length === 1 ? "" : "s"}` : "", linkedDebts.length ? `${linkedDebts.length} debt${linkedDebts.length === 1 ? "" : "s"}` : "", linkedGoals.length ? `${linkedGoals.length} goal${linkedGoals.length === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ")} before deleting this account.`}</p></div> : null}
    <footer>{mode === "details" ? <><button className="danger-button" onClick={() => setMode("delete")}><Trash size={16}/>Delete</button><div><button className="secondary-button" onClick={() => fileRef.current?.click()}><UploadSimple size={16}/>Import CSV</button><button className="secondary-button" onClick={() => setMode("edit")}><PencilSimple size={16}/>Edit</button><button className="primary-button" onClick={() => setMode("balance")}>Update balance</button></div></> : <><button className="secondary-button" onClick={() => { setMode("details"); setError(""); }}>Back</button>{mode === "delete" ? <button className="danger-button filled" disabled={!canDelete || saving} onClick={() => onDelete(account.id)}>{saving ? "Deleting…" : "Delete account"}</button> : <button className="primary-button" disabled={saving} onClick={saveEdit}>{saving ? "Saving…" : "Save changes"}</button>}</>}<input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])}/></footer>
  </aside></div>;
}

export function AccountsWorkflow({ accounts, setAccounts, transactions, budgets, debts, goals, onAddTransaction, onImportTransactions, onOpenDebt = () => {}, onOpenSettings = () => {} }) {
  const [range, setRange] = useState("6");
  const [collapsed, setCollapsed] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMode, setSelectedMode] = useState("details");
  const [menuId, setMenuId] = useState(null);
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => accounts.filter((account) => !account.archived).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)), [accounts]);
  const selected = visible.find((account) => account.id === selectedId);
  const month = latestMonth(transactions);
  const monthlyChangeFor = (account) => transactions.filter((transaction) => monthKey(transactionDate(transaction)) === month).reduce((sum, transaction) => sum + transactionDelta(transaction, account.id), 0);
  const availableCash = visible.filter((account) => account.includeInAvailableCash !== false && ["bank", "cash", "savings"].includes(account.type) && account.balance > 0).reduce((sum, account) => sum + toChf(account), 0);
  const linkedDebtAccountIds = new Set(debts.map((debt) => debt.linkedAccountId).filter(Boolean));
  const accountDebt = visible.filter((account) => accountGroup(account) === "debt" && !linkedDebtAccountIds.has(account.id)).reduce((sum, account) => sum + Math.abs(Math.min(0, toChf(account))), 0);
  const activeDebts = debts.filter((debt) => !debt.archived);
  const unlinkedDebts = activeDebts.filter((debt) => !debt.linkedAccountId || !visible.some((account) => account.id === debt.linkedAccountId));
  const unlinkedDebtTotal = unlinkedDebts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0);
  const totalDebt = accountDebt + activeDebts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0);
  const liabilityCount = visible.filter((account) => accountGroup(account) === "debt").length + unlinkedDebts.length;
  const netWorth = visible.filter((account) => account.includeInNetWorth !== false).reduce((sum, account) => sum + toChf(account), 0) - unlinkedDebtTotal;
  const monthlyChange = visible.filter((account) => account.includeInNetWorth !== false).reduce((sum, account) => sum + monthlyChangeFor(account) * (FX_TO_CHF[account.currency] || 1), 0);
  const attention = visible.map((account) => ({ account, status: accountStatus(account, transactions) })).filter(({ status }) => status.label !== "Up to date").slice(0, 4);
  if (availableCash < 500 && visible.length) attention.unshift({ account: null, status: { label: "Available cash is low", tone: "danger" } });
  const updateAccount = (account) => {
    setAccounts((current) => current.map((item) => item.id === account.id ? account : account.isPrimarySpending ? { ...item, isPrimarySpending: false } : item));
    setNotice(`${account.name} was updated.`);
  };
  const deleteAccount = (id) => {
    const name = accounts.find((account) => account.id === id)?.name || "Account";
    setAccounts((current) => current.filter((account) => account.id !== id));
    setSelectedId(null);
    setNotice(`${name} was deleted.`);
  };
  const importTransactions = async (account, rows) => {
    await onImportTransactions(rows);
    setNotice(`${rows.length} transaction${rows.length === 1 ? " was" : "s were"} imported into ${account.name}.`);
  };
  const grouped = Object.fromEntries(GROUPS.map((group) => [group.id, visible.filter((account) => accountGroup(account) === group.id)]));
  const debtRows = unlinkedDebts.map((debt) => ({ kind: "debt", debt }));
  const netWorthHistory = historyData(visible, transactions, Number(range), null, -unlinkedDebtTotal);

  return <div className="accounts-workflow">
    {notice ? <div className="account-notice" role="status"><CheckCircle size={18} weight="fill"/><span>{notice}</span><button className="icon-button" aria-label="Dismiss" onClick={() => setNotice("")}><X size={15}/></button></div> : null}
    <div className="accounts-summary-grid"><SummaryCard label="Available cash" value={formatSignedMoney(availableCash)} detail={`${visible.filter((account) => account.includeInAvailableCash !== false && ["bank", "cash", "savings"].includes(account.type)).length} accounts included`} icon={Coins} tone="positive"/><SummaryCard label="Total debt" value={formatSignedMoney(-totalDebt)} detail={`${liabilityCount} ${liabilityCount === 1 ? "liability" : "liabilities"} tracked`} icon={CreditCard} tone={totalDebt ? "negative" : "neutral"}/><SummaryCard label="Net worth" value={formatSignedMoney(netWorth)} detail="Included assets minus liabilities" icon={ChartLineUp} tone={netWorth > 0 ? "positive" : netWorth < 0 ? "negative" : "neutral"}/><SummaryCard label="Monthly change" value={formatSignedMoney(monthlyChange)} detail={`Across ${new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(`${month}-15T12:00:00`))}`} icon={monthlyChange >= 0 ? TrendUp : TrendDown} tone={monthlyChange > 0 ? "positive" : monthlyChange < 0 ? "negative" : "neutral"}/></div>
    <section className="card accounts-history-card"><div className="accounts-history-head"><div><span>Net worth history</span><strong className={netWorth < 0 ? "negative" : netWorth > 0 ? "positive" : ""}>{formatSignedMoney(netWorth)}</strong><p>Included assets minus connected liabilities</p></div><div className="account-range-tabs" aria-label="Net worth history range">{RANGE_OPTIONS.map((item) => <button className={range === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setRange(item.id)}>{item.label}</button>)}</div></div><BalanceChart data={netWorthHistory} compact toneValue={netWorth} chartId="net-worth" /></section>
    {attention.length ? <section className="accounts-attention"><div className="accounts-attention-head"><span><WarningCircle size={20} weight="fill"/></span><div><h3>Needs attention</h3><p>Small updates that keep your financial picture reliable.</p></div><b>{attention.length}</b></div><div>{attention.map(({ account, status }, index) => <div key={account?.id || `cash-${index}`}><div><strong>{account?.name || "Available cash"}</strong><span>{status.label}</span></div><button className="text-button" onClick={() => account ? setSelectedId(account.id) : onOpenSettings()}>{account ? status.label === "No transactions" || status.label === "Import required" ? "Import activity" : "Review account" : "Manage in Settings"}<ArrowRight size={14}/></button></div>)}</div></section> : null}
    <div className="account-groups">{GROUPS.map((group) => { const accountItems = grouped[group.id]; const items = group.id === "debt" ? [...accountItems.map((account) => ({ kind: "account", account })), ...debtRows] : accountItems.map((account) => ({ kind: "account", account })); const GroupIcon = group.icon; const subtotal = items.reduce((sum, item) => sum + (item.kind === "debt" ? -Math.abs(Number(item.debt.balance) || 0) : toChf(item.account)), 0); return <section className="card account-group" key={group.id}><button className="account-group-head" type="button" onClick={() => setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))}><span className="account-group-icon"><GroupIcon size={19}/></span><div><h3>{group.title}</h3><p>{group.description} · {items.length} {items.length === 1 ? "account" : "accounts"}</p></div><div><span>Subtotal</span><strong className={subtotal < 0 ? "negative" : subtotal > 0 ? "positive" : ""}>{formatSignedMoney(subtotal)}</strong></div><CaretDown className={collapsed[group.id] ? "collapsed" : ""} size={17}/></button>{!collapsed[group.id] ? <div className="account-group-body">{items.length ? items.map((item) => item.kind === "debt" ? <DebtAccountRow key={`debt-${item.debt.id}`} debt={item.debt} transactions={transactions} onOpen={onOpenDebt} /> : <AccountRow key={item.account.id} account={item.account} transactions={transactions} monthlyChange={monthlyChangeFor(item.account)} onOpen={() => setSelectedId(item.account.id)} onMenu={() => setMenuId(menuId === item.account.id ? null : item.account.id)} />) : <div className="account-group-empty"><span>No accounts in this group yet.</span><button className="text-button" onClick={() => group.id === "debt" ? onOpenDebt() : onOpenSettings()}>{group.id === "debt" ? "Add debt" : "Manage in Settings"} <ArrowRight size={14}/></button></div>}</div> : null}</section>; })}</div>
    {menuId ? <><button className="account-menu-scrim" aria-label="Close account menu" onClick={() => setMenuId(null)}/><div className="account-row-menu-sheet"><span /><button onClick={() => { setSelectedMode("details"); setSelectedId(menuId); setMenuId(null); }}>View account <ArrowRight size={16}/></button><button onClick={() => { setSelectedMode("edit"); setSelectedId(menuId); setMenuId(null); }}>Edit account <PencilSimple size={16}/></button><button onClick={() => { setSelectedMode("delete"); setSelectedId(menuId); setMenuId(null); }}>Delete account <Trash size={16}/></button></div></> : null}
    {selected ? <AccountDetailPanel account={selected} accounts={visible} transactions={transactions} budgets={budgets} debts={debts} goals={goals} initialMode={selectedMode} onClose={() => { setSelectedId(null); setSelectedMode("details"); }} onUpdate={updateAccount} onDelete={deleteAccount} onAddTransaction={(id) => { setSelectedId(null); onAddTransaction(id); }} onImportTransactions={importTransactions}/> : null}
  </div>;
}
