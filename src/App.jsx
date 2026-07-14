import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUp,
  Archive,
  ArrowsLeftRight,
  Bank,
  Bell,
  CalendarBlank,
  CaretDown,
  ChartDonut,
  ChartLineUp,
  Check,
  CheckCircle,
  CircleNotch,
  Coins,
  Copy,
  DownloadSimple,
  Flag,
  Gear,
  HandCoins,
  House,
  List,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Receipt,
  SidebarSimple,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Target,
  TrendDown,
  TrendUp,
  Trash,
  UploadSimple,
  Wallet,
  X,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthGate } from "./components/AuthGate.jsx";
import { LandingPage } from "./components/LandingPage.jsx";
import { supabase } from "./lib/supabase.js";
import {
  deleteFinancialData,
  loadFinancialData,
  recordDebtPayment,
  recordGoalContribution,
  removeTransaction,
  saveSettings as saveRemoteSettings,
  saveTransaction as saveRemoteTransaction,
  syncAccounts,
  syncBudgets,
  syncCategories,
  syncDebts,
  syncGoals,
  syncTransactions,
} from "./lib/financialData.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", icon: House },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "budget", label: "Budget", icon: ChartDonut },
  { id: "debt", label: "Debt payoff", icon: HandCoins },
  { id: "goals", label: "Goals", icon: Target },
  { id: "reports", label: "Reports", icon: ChartLineUp },
];

const TRANSACTION_FILTERS = ["All", "Groceries", "Transport", "Salary", "Transfer"];
const APP_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(`2026-${String(index + 1).padStart(2, "0")}-15T12:00:00`);
  return { value: date.toISOString().slice(0, 7), label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date) };
});
const TRANSACTION_MONTH_OPTIONS = [{ value: "all", label: "All months" }, ...APP_MONTH_OPTIONS.slice().reverse()];
const CHART_PERIOD_OPTIONS = [{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }];
const ACCOUNT_RANGE_OPTIONS = [{ value: "6", label: "6 months" }, { value: "12", label: "12 months" }, { value: "24", label: "24 months" }];
const REPORT_RANGE_OPTIONS = [{ value: "year", label: "This year" }, { value: "six-months", label: "Last 6 months" }, { value: "quarter", label: "This quarter" }];

const MONTHLY_DATA = [
  { month: "Jan", income: 7200, expense: 4900, cash: 2300 },
  { month: "Feb", income: 7400, expense: 5150, cash: 2250 },
  { month: "Mar", income: 7100, expense: 4800, cash: 2300 },
  { month: "Apr", income: 7900, expense: 5300, cash: 2600 },
  { month: "May", income: 8000, expense: 5450, cash: 2550 },
  { month: "Jun", income: 8200, expense: 5280, cash: 2920 },
];

const INITIAL_TRANSACTIONS = [
  { id: 1, type: "expense", merchant: "Migros", category: "Groceries", dateValue: "2026-07-14", timeValue: "08:42", amount: 84.3, status: "Cleared", accountId: "acc-zkb", notes: "Weekly groceries", recurring: false, frequency: "Monthly", icon: "M", tone: "red", currency: "CHF" },
  { id: 2, type: "expense", merchant: "SBB Mobile", category: "Transport", dateValue: "2026-07-13", timeValue: "17:18", amount: 46, status: "Cleared", accountId: "acc-zkb", notes: "", recurring: false, frequency: "Monthly", icon: "S", tone: "dark", currency: "CHF" },
  { id: 3, type: "income", merchant: "Acme AG", category: "Salary", dateValue: "2026-06-30", timeValue: "07:00", amount: 8200, status: "Cleared", accountId: "acc-zkb", notes: "June salary", recurring: true, frequency: "Monthly", icon: "A", tone: "green", currency: "CHF" },
  { id: 4, type: "expense", merchant: "Swisscom", category: "Utilities", dateValue: "2026-06-29", timeValue: "10:12", amount: 79.9, status: "Pending", accountId: "acc-zkb", notes: "Mobile plan", recurring: true, frequency: "Monthly", icon: "S", tone: "blue", currency: "CHF" },
  { id: 5, type: "expense", merchant: "Café du Pont", category: "Dining out", dateValue: "2026-06-28", timeValue: "13:26", amount: 18.5, status: "Cleared", accountId: "acc-zkb", notes: "", recurring: false, frequency: "Monthly", icon: "C", tone: "orange", currency: "CHF" },
  { id: 6, type: "expense", merchant: "CSS Insurance", category: "Health", dateValue: "2026-06-27", timeValue: "09:00", amount: 324.1, status: "Cleared", accountId: "acc-zkb", notes: "Health insurance", recurring: true, frequency: "Monthly", icon: "C", tone: "pink", currency: "CHF" },
  { id: 7, type: "expense", merchant: "Wincasa", category: "Housing", dateValue: "2026-07-01", timeValue: "07:30", amount: 1950, status: "Cleared", accountId: "acc-zkb", notes: "July rent", recurring: true, frequency: "Monthly", icon: "W", tone: "red", currency: "CHF" },
  { id: 8, type: "expense", merchant: "Coop", category: "Groceries", dateValue: "2026-07-08", timeValue: "18:22", amount: 600, status: "Cleared", accountId: "acc-zkb", notes: "Monthly household shop", recurring: false, frequency: "Monthly", icon: "C", tone: "orange", currency: "CHF" },
  { id: 9, type: "expense", merchant: "Restaurants", category: "Dining out", dateValue: "2026-07-10", timeValue: "20:10", amount: 290, status: "Cleared", accountId: "acc-zkb", notes: "Dinner and lunches", recurring: false, frequency: "Monthly", icon: "R", tone: "pink", currency: "CHF" },
  { id: 10, type: "expense", merchant: "Netflix", category: "Subscriptions", dateValue: "2026-07-04", timeValue: "06:00", amount: 21.9, status: "Cleared", accountId: "acc-zkb", notes: "Streaming plan", recurring: true, frequency: "Monthly", icon: "N", tone: "red", currency: "CHF" },
  { id: 11, type: "transfer", merchant: "Emergency fund", category: "Transfer", dateValue: "2026-07-02", timeValue: "08:00", amount: 500, status: "Cleared", fromAccountId: "acc-zkb", toAccountId: "acc-neon", notes: "Monthly safety buffer", recurring: true, frequency: "Monthly", icon: "↔", tone: "blue", currency: "CHF" },
  { id: 12, type: "transfer", merchant: "Pillar 3a", category: "Transfer", dateValue: "2026-07-03", timeValue: "08:00", amount: 300, status: "Cleared", fromAccountId: "acc-zkb", toAccountId: "acc-viac", notes: "Retirement contribution", recurring: true, frequency: "Monthly", icon: "↔", tone: "blue", currency: "CHF" },
];

const ACCOUNT_TYPES = [
  { id: "bank", label: "Bank", description: "Everyday and current accounts", icon: Bank, tone: "coral" },
  { id: "savings", label: "Savings", description: "Savings and reserve accounts", icon: Wallet, tone: "rose" },
  { id: "cash", label: "Cash", description: "Cash you track manually", icon: Coins, tone: "sand" },
  { id: "investment", label: "Investment", description: "Brokerage and investment accounts", icon: ChartLineUp, tone: "blue" },
  { id: "pillar", label: "Pillar 3a", description: "Swiss retirement savings", icon: Target, tone: "green" },
];

const ACCOUNT_TYPE_MAP = Object.fromEntries(ACCOUNT_TYPES.map((type) => [type.id, type]));
const SWISS_INSTITUTIONS = ["UBS", "Zürcher Kantonalbank", "Raiffeisen", "PostFinance", "Neon", "Yuh", "VIAC", "Swissquote"];
const FX_TO_CHF = { CHF: 1, EUR: 0.93, USD: 0.82 };
const INITIAL_ACCOUNTS = [
  { id: "acc-zkb", type: "bank", institution: "Zürcher Kantonalbank", name: "Everyday account", currency: "CHF", balance: 4820.4, lastFour: "4821" },
  { id: "acc-neon", type: "savings", institution: "Neon", name: "Savings", currency: "CHF", balance: 18450, lastFour: "" },
  { id: "acc-swisscard", type: "bank", institution: "Swisscard", name: "Credit card", currency: "CHF", balance: -1240.7, lastFour: "7204" },
  { id: "acc-viac", type: "pillar", institution: "VIAC", name: "Pillar 3a", currency: "CHF", balance: 32750, lastFour: "" },
];

const TRANSACTION_CATEGORIES = {
  expense: ["Groceries", "Transport", "Dining out", "Health", "Utilities", "Housing", "Subscriptions", "Debt payment", "Shopping", "Entertainment", "Other"],
  income: ["Salary", "Freelance", "Refund", "Interest", "Gift", "Other"],
  transfer: ["Transfer"],
};
const TRANSACTION_STATUSES = ["Cleared", "Pending", "Scheduled"];
const TRANSACTION_TYPES = [
  { id: "expense", label: "Expense", description: "Money leaving an account", icon: ArrowDownLeft },
  { id: "income", label: "Income", description: "Money arriving in an account", icon: TrendUp },
  { id: "transfer", label: "Transfer", description: "Move money between accounts", icon: ArrowsLeftRight },
];

const BUDGET_GROUPS = {
  fixed: { label: "Fixed bills", description: "Recurring commitments and essentials", icon: Receipt, tone: "coral" },
  flexible: { label: "Flexible spending", description: "Categories you can adjust month to month", icon: Wallet, tone: "sand" },
  savings: { label: "Savings goals", description: "Money set aside for your future", icon: Target, tone: "green" },
};
const BUDGET_CATEGORIES = {
  fixed: ["Rent", "Insurance", "Subscriptions", "Debt payments", "Utilities"],
  flexible: ["Groceries", "Dining out", "Transport", "Shopping", "Entertainment"],
  savings: ["Emergency fund", "Holidays", "Pillar 3a"],
};
const EMPTY_CUSTOM_CATEGORIES = { fixed: [], flexible: [], savings: [] };
const INITIAL_BUDGET_ITEMS = [
  { id: "budget-rent", group: "fixed", category: "Rent", transactionCategory: "Housing", planned: 2100, frequency: "Monthly", dueDate: "2026-07-01", reminder: true, reminderDays: "3", custom: false },
  { id: "budget-insurance", group: "fixed", category: "Insurance", transactionCategory: "Health", planned: 620, frequency: "Monthly", dueDate: "2026-07-17", reminder: true, reminderDays: "3", custom: false },
  { id: "budget-subscriptions", group: "fixed", category: "Subscriptions", transactionCategory: "Subscriptions", planned: 80, frequency: "Monthly", dueDate: "2026-07-20", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-debt", group: "fixed", category: "Debt payments", transactionCategory: "Debt payment", planned: 320, frequency: "Monthly", dueDate: "2026-07-25", reminder: true, reminderDays: "3", custom: false },
  { id: "budget-utilities", group: "fixed", category: "Utilities", transactionCategory: "Utilities", planned: 180, frequency: "Monthly", dueDate: "2026-07-28", reminder: true, reminderDays: "3", custom: false },
  { id: "budget-groceries", group: "flexible", category: "Groceries", transactionCategory: "Groceries", planned: 850, frequency: "Monthly", dueDate: "2026-07-31", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-dining", group: "flexible", category: "Dining out", transactionCategory: "Dining out", planned: 250, frequency: "Monthly", dueDate: "2026-07-31", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-transport", group: "flexible", category: "Transport", transactionCategory: "Transport", planned: 480, frequency: "Monthly", dueDate: "2026-07-31", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-shopping", group: "flexible", category: "Shopping", transactionCategory: "Shopping", planned: 300, frequency: "Monthly", dueDate: "2026-07-31", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-entertainment", group: "flexible", category: "Entertainment", transactionCategory: "Entertainment", planned: 180, frequency: "Monthly", dueDate: "2026-07-31", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-emergency", group: "savings", category: "Emergency fund", transactionCategory: "Emergency fund", planned: 500, frequency: "Monthly", dueDate: "2026-07-24", reminder: true, reminderDays: "2", custom: false },
  { id: "budget-holidays", group: "savings", category: "Holidays", transactionCategory: "Holidays", planned: 350, frequency: "Monthly", dueDate: "2026-07-31", reminder: false, reminderDays: "3", custom: false },
  { id: "budget-pillar", group: "savings", category: "Pillar 3a", transactionCategory: "Pillar 3a", planned: 400, frequency: "Monthly", dueDate: "2026-07-24", reminder: true, reminderDays: "2", custom: false },
];

const DEBT_TYPES = ["Credit card", "Personal loan", "Car loan", "Salary advance", "Custom debt"];
const PAYMENT_FREQUENCIES = ["Monthly", "Fortnightly", "Weekly"];
const INITIAL_DEBTS = [
  { id: "debt-swisscard", type: "Credit card", creditor: "Swisscard", balance: 1240.7, interestRate: 12, minimumPayment: 120, dueDate: "2026-07-27", frequency: "Monthly", originalBalance: 3200 },
  { id: "debt-education", type: "Personal loan", creditor: "Education loan", balance: 8600, interestRate: 3.5, minimumPayment: 450, dueDate: "2026-07-25", frequency: "Monthly", originalBalance: 12000 },
  { id: "debt-family", type: "Salary advance", creditor: "Family advance", balance: 3500, interestRate: 0, minimumPayment: 250, dueDate: "2026-07-28", frequency: "Monthly", originalBalance: 5000 },
];

const GOAL_TYPES = ["Emergency fund", "Holiday", "Pillar 3a", "New car", "Home", "Custom goal"];
const INITIAL_GOALS = [
  { id: "goal-emergency", type: "Emergency fund", name: "Emergency fund", targetAmount: 15000, baseAmount: 8700, deadline: "2026-12-31", linkedAccountId: "acc-neon", monthlyContribution: 500, status: "Active", history: [{ id: "eh-1", type: "Contribution", amount: 500, date: "2026-06-02", source: "Recurring transfer", balance: 8200 }, { id: "eh-2", type: "Contribution", amount: 500, date: "2026-06-30", source: "Monthly top-up", balance: 8700 }] },
  { id: "goal-holiday", type: "Holiday", name: "Japan holiday", targetAmount: 6500, baseAmount: 3400, deadline: "2027-04-30", linkedAccountId: "acc-neon", monthlyContribution: 350, status: "Active", history: [{ id: "jh-1", type: "Contribution", amount: 350, date: "2026-05-31", source: "Monthly top-up", balance: 3050 }, { id: "jh-2", type: "Contribution", amount: 350, date: "2026-06-30", source: "Monthly top-up", balance: 3400 }] },
  { id: "goal-pillar", type: "Pillar 3a", name: "Pillar 3a", targetAmount: 7056, baseAmount: 3000, deadline: "2026-12-31", linkedAccountId: "acc-viac", monthlyContribution: 588, status: "Active", history: [{ id: "p3-1", type: "Contribution", amount: 588, date: "2026-05-31", source: "VIAC contribution", balance: 2412 }, { id: "p3-2", type: "Contribution", amount: 588, date: "2026-06-30", source: "VIAC contribution", balance: 3000 }] },
];

const SETTINGS_GROUPS = {
  fixed: "Fixed bills",
  flexible: "Flexible spending",
  income: "Income",
  savings: "Savings",
};
const INITIAL_SETTINGS = {
  profile: { firstName: "Lina", lastName: "Meier", email: "lina.meier@example.ch", photo: "/assets/lina-avatar.png" },
  preferences: { currency: "CHF", language: "English", dateFormat: "DD.MM.YYYY", firstDay: "Monday" },
  notifications: { weekly: true, budget: true, bills: true, goals: false },
  security: { twoFactor: false, passwordUpdated: "18 May 2026" },
  subscription: { plan: "Personal", price: "CHF 8 / month", renewal: "14 August 2026", card: "Visa •••• 4242" },
};

const settingsFromSession = (session) => {
  const saved = session.user.user_metadata?.kalsoon_settings || {};
  return {
    ...INITIAL_SETTINGS, ...saved,
    profile: {
      ...INITIAL_SETTINGS.profile, ...saved.profile,
      firstName: saved.profile?.firstName || session.user.user_metadata?.first_name || INITIAL_SETTINGS.profile.firstName,
      lastName: saved.profile?.lastName || session.user.user_metadata?.last_name || INITIAL_SETTINGS.profile.lastName,
      email: saved.profile?.email || session.user.email || INITIAL_SETTINGS.profile.email,
      photo: saved.profile?.photo || session.user.user_metadata?.avatar_url || INITIAL_SETTINGS.profile.photo,
    },
    preferences: { ...INITIAL_SETTINGS.preferences, ...saved.preferences },
    notifications: { ...INITIAL_SETTINGS.notifications, ...saved.notifications },
    security: { ...INITIAL_SETTINGS.security, ...saved.security },
    subscription: { ...INITIAL_SETTINGS.subscription, ...saved.subscription },
  };
};

const prepareProfilePhoto = (file) => new Promise((resolve, reject) => {
  if (!file.type.startsWith("image/")) { reject(new Error("Choose a JPG, PNG or WebP image.")); return; }
  if (file.size > 5 * 1024 * 1024) { reject(new Error("Choose an image smaller than 5 MB.")); return; }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("This image could not be read."));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("This image format is not supported."));
    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = 192; canvas.height = 192;
      canvas.getContext("2d").drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 192, 192);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const buildInitialCategorySettings = () => {
  const groups = {
    fixed: BUDGET_CATEGORIES.fixed,
    flexible: BUDGET_CATEGORIES.flexible,
    income: TRANSACTION_CATEGORIES.income.filter((name) => name !== "Other"),
    savings: BUDGET_CATEGORIES.savings,
  };
  return Object.entries(groups).flatMap(([group, names]) => names.map((name, index) => ({ id: `category-${group}-${index}`, name, group })));
};


const BUDGETS = [
  { name: "Housing", icon: House, spent: 1950, limit: 2100, color: "#e45f44" },
  { name: "Groceries", icon: Receipt, spent: 684, limit: 850, color: "#e88772" },
  { name: "Transport", icon: Bank, spent: 322, limit: 480, color: "#eaa192" },
  { name: "Health", icon: Sparkle, spent: 390, limit: 620, color: "#63b9a2" },
  { name: "Fun money", icon: Sparkle, spent: 268, limit: 400, color: "#e0a258" },
  { name: "Giving", icon: HandCoins, spent: 120, limit: 250, color: "#7998cb" },
];

const PAGE_META = {
  dashboard: ["Good morning, Lina", "Here’s where every franc is going this month."],
  accounts: ["Your accounts", "All your money, connected in one calm view."],
  transactions: ["Transactions", "Review, search, and categorise every movement."],
  budget: ["July budget", "Give every franc a job before you spend it."],
  debt: ["Debt payoff", "A clear plan from today to debt-free."],
  goals: ["Your goals", "Turn good intentions into monthly progress."],
  reports: ["Money reports", "See the patterns behind your progress."],
  settings: ["Settings", "Make Kalsoon work the way you do."],
};

const formatCHF = (value, decimals = 0) =>
  new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

const formatMoney = (value, currency = "CHF") =>
  new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

const formatSignedMoney = (value, currency = "CHF", decimals = 2, zeroSign = "") => {
  const amount = Number(value) || 0;
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : zeroSign;
  const number = new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount));
  return `${currency} ${sign}${number}`;
};

const formatSignedCHF = (value, decimals = 0, zeroSign = "") => formatSignedMoney(value, "CHF", decimals, zeroSign);
const moneyTone = (value) => Number(value) > 0 ? "money-positive" : Number(value) < 0 ? "money-negative" : "money-neutral";

const accountLabel = (account) => `${account.name}${account.lastFour ? ` •••• ${account.lastFour}` : ""} — ${formatSignedMoney(account.balance, account.currency)}`;

const formatTransactionDate = (dateValue, timeValue) => {
  if (!dateValue) return "Date not set";
  const date = new Date(`${dateValue}T12:00:00`);
  const label = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  return `${label}, ${timeValue || "00:00"}`;
};

const transactionImpact = (account, transaction, direction = 1) => {
  const amount = Math.abs(Number(transaction.amount) || 0) * direction;
  if (transaction.type === "expense" && account.id === transaction.accountId) return -amount;
  if (transaction.type === "income" && account.id === transaction.accountId) return amount;
  if (transaction.type === "transfer" && account.id === transaction.fromAccountId) return -amount;
  if (transaction.type === "transfer" && account.id === transaction.toAccountId) return amount;
  return 0;
};

const applyTransactionToAccounts = (accounts, transaction, direction = 1) =>
  accounts.map((account) => ({ ...account, balance: account.balance + transactionImpact(account, transaction, direction) }));

const getBudgetTransactions = (budget, transactions, month = new Date().toISOString().slice(0, 7)) =>
  transactions.filter((transaction) => {
    if (!transaction.dateValue?.startsWith(month) || transaction.status === "Scheduled") return false;
    if (budget.group === "savings") return transaction.type === "transfer" && (transaction.merchant.toLowerCase() === budget.category.toLowerCase() || transaction.category === budget.transactionCategory);
    return transaction.type === "expense" && (transaction.category === budget.transactionCategory || transaction.category === budget.category);
  });

const getBudgetActual = (budget, transactions) =>
  getBudgetTransactions(budget, transactions).reduce((sum, transaction) => sum + transaction.amount, 0);

const getBudgetStatus = (budget, actual) => {
  const percentage = budget.planned > 0 ? (actual / budget.planned) * 100 : 0;
  const today = new Date("2026-07-14T12:00:00");
  const dueDate = new Date(`${budget.dueDate}T12:00:00`);
  const daysUntilDue = Math.ceil((dueDate - today) / 86400000);
  if (percentage > 100) return "Overspent";
  if (budget.reminder && daysUntilDue >= 0 && daysUntilDue <= Number(budget.reminderDays || 3) && percentage < 80) return "Due soon";
  if (percentage >= 80) return "Nearly reached";
  return "On track";
};

const monthlyDebtPayment = (debt) => debt.minimumPayment * ({ Weekly: 52 / 12, Fortnightly: 26 / 12, Monthly: 1 }[debt.frequency] || 1);

const debtOrderForStrategy = (debts, strategy, customOrder = []) => {
  if (strategy === "snowball") return [...debts].sort((a, b) => a.balance - b.balance || b.interestRate - a.interestRate);
  if (strategy === "avalanche") return [...debts].sort((a, b) => b.interestRate - a.interestRate || a.balance - b.balance);
  const positions = new Map(customOrder.map((id, index) => [id, index]));
  return [...debts].sort((a, b) => (positions.get(a.id) ?? 999) - (positions.get(b.id) ?? 999));
};

const simulateDebtPayoff = (debts, strategy, extraPayment, customOrder = []) => {
  const activeDebts = debts.filter((debt) => debt.balance > 0);
  if (!activeDebts.length) return { months: 0, debtFreeDate: null, totalInterest: 0, totalRepayment: 0, order: [], schedule: [], balanceData: [] };
  const order = debtOrderForStrategy(activeDebts, strategy, customOrder);
  const balances = Object.fromEntries(activeDebts.map((debt) => [debt.id, debt.balance]));
  const monthlyBudget = activeDebts.reduce((sum, debt) => sum + monthlyDebtPayment(debt), 0) + Math.max(0, Number(extraPayment) || 0);
  const schedule = [];
  const balanceData = [{ month: "Now", balance: activeDebts.reduce((sum, debt) => sum + debt.balance, 0) }];
  let totalInterest = 0;
  let totalRepayment = 0;
  let month = 0;
  while (Object.values(balances).some((balance) => balance > 0.01) && month < 600) {
    month += 1;
    const openingBalance = Object.values(balances).reduce((sum, balance) => sum + balance, 0);
    let interestThisMonth = 0;
    activeDebts.forEach((debt) => {
      if (balances[debt.id] <= 0.01) return;
      const interest = balances[debt.id] * (debt.interestRate / 100 / 12);
      balances[debt.id] += interest;
      interestThisMonth += interest;
    });
    let available = monthlyBudget;
    let paidThisMonth = 0;
    activeDebts.forEach((debt) => {
      if (balances[debt.id] <= 0.01 || available <= 0) return;
      const payment = Math.min(monthlyDebtPayment(debt), balances[debt.id], available);
      balances[debt.id] -= payment;
      available -= payment;
      paidThisMonth += payment;
    });
    order.forEach((debt) => {
      if (balances[debt.id] <= 0.01 || available <= 0) return;
      const payment = Math.min(balances[debt.id], available);
      balances[debt.id] -= payment;
      available -= payment;
      paidThisMonth += payment;
    });
    const remaining = Object.values(balances).reduce((sum, balance) => sum + Math.max(0, balance), 0);
    const date = new Date(2026, 6 + month, 1);
    totalInterest += interestThisMonth;
    totalRepayment += paidThisMonth;
    schedule.push({ month, date, payment: paidThisMonth, principal: Math.max(0, paidThisMonth - interestThisMonth), interest: interestThisMonth, remaining });
    if (month === 1 || month % 3 === 0 || remaining <= 0.01) balanceData.push({ month: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(date), balance: Math.round(remaining) });
    if (openingBalance <= remaining && paidThisMonth <= interestThisMonth) break;
  }
  return { months: month, debtFreeDate: schedule.at(-1)?.date || null, totalInterest, totalRepayment, order, schedule, balanceData };
};

const getGoalTransactions = (goal, transactions) => transactions.filter((transaction) => transaction.type === "transfer" && transaction.status !== "Scheduled" && (transaction.goalId === goal.id || transaction.merchant.toLowerCase() === goal.name.toLowerCase()) && (transaction.toAccountId === goal.linkedAccountId || transaction.fromAccountId === goal.linkedAccountId));

const getGoalCurrentAmount = (goal, transactions) => goal.baseAmount + getGoalTransactions(goal, transactions).reduce((sum, transaction) => sum + (transaction.toAccountId === goal.linkedAccountId ? transaction.amount : -transaction.amount), 0);

const getGoalCompletionDate = (currentAmount, targetAmount, monthlyContribution) => {
  const remaining = Math.max(0, targetAmount - currentAmount);
  if (!remaining) return new Date("2026-07-14T12:00:00");
  if (!(monthlyContribution > 0)) return null;
  const date = new Date("2026-07-14T12:00:00");
  date.setMonth(date.getMonth() + Math.ceil(remaining / monthlyContribution));
  return date;
};

function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function IconButton({ children, label, className = "", onClick, ...buttonProps }) {
  return (
    <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} {...buttonProps}>
      {children}
    </button>
  );
}

function DropdownControl({ value, options, onChange, icon: Icon, ariaLabel, className = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePress = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutsidePress); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);
  return <div className={`app-dropdown ${className} ${open ? "open" : ""}`} ref={rootRef}>
    <button type="button" className="dropdown-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {Icon ? <Icon size={17}/> : null}<span className="dropdown-label">{selected?.label}</span><CaretDown className="dropdown-caret" size={13}/>
    </button>
    {open ? <div className="dropdown-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? "selected" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>
        <span>{option.label}</span>{option.value === value ? <Check size={15} weight="bold"/> : null}
      </button>)}
    </div> : null}
  </div>;
}

function StatefulDropdown({ initialValue, options, ariaLabel, className = "" }) {
  const [value, setValue] = useState(initialValue);
  return <DropdownControl value={value} options={options} onChange={setValue} ariaLabel={ariaLabel} className={className}/>;
}

function Brand() {
  return (
    <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Kalsoon home">
      <span className="brand-mark">
<Coins size={22} weight="bold" />
</span>
      <span className="brand-copy">
<strong>Kalsoon</strong>
<small>Every franc, with purpose</small>
</span>
    </button>
  );
}

function Sidebar({ page, onNavigate, expanded, setExpanded, onSignOut }) {
  return (
    <aside className={`sidebar ${expanded ? "expanded" : ""}`}>
      <div className="sidebar-brand">
        <Brand />
        <IconButton label={expanded ? "Collapse navigation" : "Expand navigation"} className="sidebar-toggle" onClick={() => setExpanded((value) => !value)}>
          <SidebarSimple size={19} />
        </IconButton>
      </div>
      <nav className="nav-list" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => onNavigate(id)} aria-current={page === id ? "page" : undefined}>
            <Icon size={21} weight={page === id ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className={`nav-item ${page === "settings" ? "active" : ""}`} onClick={() => onNavigate("settings")}>
          <Gear size={21} />
<span>Settings</span>
        </button>
        <button className="nav-item" onClick={onSignOut}>
<SignOut size={21} />
<span>Sign out</span>
</button>
      </div>
    </aside>
  );
}

const TOPBAR_NOTIFICATIONS = [
  { id: "budget-check", title: "Monthly budget check-in", detail: "Review your July plan and give every franc a job.", time: "Today", unread: true },
  { id: "goal-update", title: "Goals are ready to track", detail: "Link a savings account to keep goal progress current.", time: "Yesterday", unread: true },
];

function Topbar({ onMenu, page, transactionFilter, onTransactionFilterChange, profile = INITIAL_SETTINGS.profile }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(TOPBAR_NOTIFICATIONS);
  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const markAllRead = () => setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })));
  const openNotification = (id) => setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, unread: false } : notification));
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation">
<List size={22} />
      </button>
      <div className="top-actions">
        {page === "transactions" ? <DropdownControl className="topbar-category-filter" icon={SlidersHorizontal} ariaLabel="Transaction category filter" value={transactionFilter} onChange={onTransactionFilterChange} options={TRANSACTION_FILTERS.map((name) => ({ value: name, label: name === "All" ? "All categories" : name }))}/> : null}
        <div className="notification-shell">
        <IconButton label="Notifications" className={`notification-button ${notificationsOpen ? "active" : ""}`} onClick={() => setNotificationsOpen((open) => !open)} aria-expanded={notificationsOpen}>
<Bell size={20} />
{unreadCount ? <span className="notification-dot" /> : null}
</IconButton>
        {notificationsOpen ? <div className="notification-popover" role="region" aria-label="Notifications panel">
          <div className="notification-head">
            <div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</span></div>
            {unreadCount ? <button type="button" onClick={markAllRead}>Mark all read</button> : null}
          </div>
          <div className="notification-list">
            {notifications.length ? notifications.map((notification) => <button type="button" className={`notification-item ${notification.unread ? "unread" : ""}`} key={notification.id} onClick={() => openNotification(notification.id)}>
              <span className="notification-icon"><Bell size={16}/></span>
              <span><strong>{notification.title}</strong><small>{notification.detail}</small><em>{notification.time}</em></span>
            </button>) : <div className="notification-empty"><CheckCircle size={24}/><strong>No notifications</strong><span>New money updates will appear here.</span></div>}
          </div>
          {notifications.length ? <button type="button" className="notification-clear" onClick={() => setNotifications([])}>Clear all</button> : null}
        </div> : null}
        </div>
        <button className="profile-button">
          <img src={profile.photo} alt={`${profile.firstName} ${profile.lastName}`} />
          <span>
<strong>{profile.firstName} {profile.lastName}</strong>
<small>Personal plan</small>
</span>
          <CaretDown size={14} />
        </button>
      </div>
    </header>
  );
}

function PageHeader({ page, showPeriod = true, month, onMonthChange }) {
  const [title, subtitle] = PAGE_META[page];
  return (
    <div className="page-heading">
      <div>
<p className="eyebrow">Tuesday, 14 July</p>
<h1>{title}</h1>
<p>{subtitle}</p>
</div>
      {showPeriod ? <DropdownControl className="period-dropdown" icon={CalendarBlank} ariaLabel="Page month" value={month} options={APP_MONTH_OPTIONS} onChange={onMonthChange}/> : null}
    </div>
  );
}

function StatCard({ label, value, foot, icon: Icon, trend, chart, valueClass = "", footClass = "" }) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
<span>{label}</span>
<Icon size={21} />
</div>
      <div className="stat-bottom">
        <div>
<strong className={valueClass}>{value}</strong>
<small className={footClass || (trend === "up" ? "positive" : trend === "down" ? "negative" : "")}>{foot}</small>
</div>
        {chart}
      </div>
    </Card>
  );
}

function MiniBars({ values, active = 4 }) {
  const data = values.map((value, index) => ({ value, index }));
  return <div className="mini-bars" aria-hidden="true">
<ResponsiveContainer width="100%" height="100%">
<BarChart data={data}>
<Bar dataKey="value" radius={[4,4,2,2]}>{data.map((item)=>
<Cell key={item.index} fill={item.index===active?"#e45f44":"#eceae6"}/>)}</Bar>
</BarChart>
</ResponsiveContainer>
</div>;
}

function MiniLine() {
  const data=[{v:28},{v:22},{v:31},{v:26},{v:38},{v:44},{v:52}];
  return (
    <div className="mini-line" aria-hidden="true">
<ResponsiveContainer width="100%" height="100%">
<LineChart data={data}>
<Line type="monotone" dataKey="v" stroke="#e45f44" strokeWidth={2} dot={false}/>
</LineChart>
</ResponsiveContainer>
</div>
  );
}

function MiniScore({ value = 0 }){const score=Math.max(0,Math.min(100,Number(value)||0));const rounded=Math.round(score);const data=[{v:rounded},{v:Math.max(0,100-rounded)}];return <div className="score-ring">
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie data={data} dataKey="v" innerRadius="72%" outerRadius="98%" startAngle={90} endAngle={-270} stroke="none">
<Cell fill="#e45f44"/>
<Cell fill="#f0ede8"/>
</Pie>
</PieChart>
</ResponsiveContainer>
<span>
<strong>{rounded}</strong>
<small>%</small>
</span>
</div>}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
<strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}>
<i style={{ background: item.color }} />{item.name}: {formatCHF(item.value)}</span>)}</div>
  );
}

function IncomeExpenseChart({ data = MONTHLY_DATA }) {
  const hasValues = data.some((item) => item.income || item.expense);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#eceae6" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#817e77", fontSize: 12 }} dy={10} />
        <YAxis domain={hasValues ? [0, "auto"] : [0, 1000]} axisLine={false} tickLine={false} tick={{ fill: "#817e77", fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d8d4cd", strokeDasharray: "3 3" }} />
        <Line type="monotone" dataKey="income" name="Income" stroke="#1e9f7a" strokeWidth={2.4} dot={{ r: 4, fill: "#1e9f7a", strokeWidth: 0 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="expense" name="Spent" stroke="#e45f44" strokeWidth={2.4} dot={{ r: 4, fill: "#e45f44", strokeWidth: 0 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CashFlowChart({ data = MONTHLY_DATA }) {
  const hasValues = data.some((item) => item.cash);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 2, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#eceae6" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#817e77", fontSize: 12 }} dy={10} />
        <YAxis domain={hasValues ? ["auto", "auto"] : [0, 1000]} axisLine={false} tickLine={false} tick={{ fill: "#817e77", fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="cash" name="Cash flow" radius={[12, 12, 12, 12]} maxBarSize={44}>
          {data.map((_, i) => <Cell key={i} fill={i === data.length - 1 ? "#e45f44" : "#e9e7e2"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SpendingDonut({ transactions = [] }) {
  const colors = ["#e45f44", "#ef9c87", "#f1c8bd", "#a8d9e7", "#e6e3df"];
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  const grouped = Object.entries(transactions.reduce((result, item) => ({ ...result, [item.category]: (result[item.category] || 0) + item.amount }), {})).sort((a,b) => b[1]-a[1]);
  const data = (grouped.length ? grouped.slice(0, 5) : [["No spending", 1]]).map(([name, amount], index) => ({ name, value: total ? Math.round(amount / total * 100) : 100, color: colors[index] }));
  return (
    <>
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
<Pie data={data} dataKey="value" innerRadius="79%" outerRadius="94%" paddingAngle={2} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie>
</PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
<strong className={moneyTone(-total)}>{formatSignedCHF(-total)}</strong>
<span>spent</span>
</div>
      </div>
      <div className="legend-grid">{data.slice(0, 4).map((item) => <span key={item.name}>
<i style={{ background: item.color }} />{item.name}<b>{item.value}%</b>
</span>)}</div>
    </>
  );
}

function TransactionTable({ transactions, compact = false, onSelect, accounts = [] }) {
  return (
    <div className="table-scroll">
      <table className="transaction-table">
        <thead>
<tr>
<th>Merchant</th>
<th>Category</th>
<th>Date & time</th>
<th>Amount</th>
<th>Status</th>
</tr>
</thead>
        <tbody>{transactions.slice(0, compact ? 4 : transactions.length).map((tx) => {
          const account = accounts.find((item) => item.id === (tx.type === "transfer" ? tx.fromAccountId : tx.accountId));
          const signedAmount = tx.type === "income" ? tx.amount : tx.type === "expense" ? -tx.amount : null;
          return <tr key={tx.id} className={onSelect ? "clickable-row" : ""} onClick={onSelect ? () => onSelect(tx.id) : undefined} onKeyDown={onSelect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(tx.id); } } : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={onSelect ? `View ${tx.merchant} transaction` : undefined}>
            <td>
<span className={`merchant-icon ${tx.tone}`}>{tx.icon}</span>
<span className="merchant-copy">
<strong>{tx.merchant}</strong>{!compact && account ? <small>{account.name}</small> : null}</span>
</td>
            <td>{tx.category}</td>
<td>{formatTransactionDate(tx.dateValue, tx.timeValue)}</td>
            <td className={signedAmount === null ? "money-transfer" : moneyTone(signedAmount)}>{signedAmount === null ? formatMoney(tx.amount, tx.currency || account?.currency || "CHF") : formatSignedMoney(signedAmount, tx.currency || account?.currency || "CHF")}</td>
            <td>
<span className={`status ${tx.status.toLowerCase()}`}>{tx.status}</span>
</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function SectionHead({ title, subtitle, action }) {
  return <div className="section-head">
<div>
<h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</div>;
}

function BudgetList({ full = false, budgets = [], transactions = [] }) {
  return (
    <div className={`budget-list ${full ? "full" : ""}`}>
      {budgets.length ? budgets.slice(0, full ? budgets.length : 3).map((budget) => {
        const name = budget.category; const Icon = budget.group === "savings" ? Target : budget.group === "fixed" ? Receipt : Wallet;
        const spent = getBudgetActual(budget, transactions); const limit = budget.planned; const color = budget.group === "savings" ? "#168c6b" : "#e45f44";
        const percentage = Math.round((spent / limit) * 100);
        return (
          <div className="budget-row" key={name}>
            <span className="budget-icon">
<Icon size={18} />
</span>
            <div className="budget-info">
<div>
<strong>{name}</strong>
<span>{formatCHF(spent)} of {formatCHF(limit)}</span>
</div>
<div className="progress-track">
<span style={{ width: `${percentage}%`, background: color }} />
</div>
</div>
            <b>{percentage}%</b>
          </div>
        );
      }) : <div className="budget-related-empty">No monthly budgets yet.</div>}
    </div>
  );
}

function ConnectedProgressCard({ type, items, total, completed, onOpen }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDebt = type === "debt";
  return <Card className={`connected-progress-card ${type}`}>
    <SectionHead title={isDebt ? "Debt progress" : "Goals progress"} subtitle={isDebt ? "See how much debt you have already cleared" : "Track the milestones you are building toward"} action={<button className="text-button" onClick={onOpen}>View all <ArrowRight size={15}/>
</button>}/>
    <div className="connected-progress-summary">
<div className="connected-progress-ring" style={{ "--progress": `${Math.min(100, percentage)}%` }}>
<span>{percentage}%</span>
</div>
<div>
<span>{isDebt ? "Paid off" : "Saved so far"}</span>
<strong className={moneyTone(completed)}>{formatSignedCHF(completed)}</strong>
<small>{isDebt ? `${formatCHF(Math.max(0, total - completed))} remaining` : `of ${formatCHF(total)} total targets`}</small>
</div>
</div>
    {items.length ? <div className="connected-progress-list">{items.slice(0, 3).map((item) => <div key={item.id}>
<div>
<strong>{item.name}</strong>
<span><b className={moneyTone(item.current)}>{formatSignedCHF(item.current)}</b> of {formatCHF(item.total)}</span>
</div>
<div className="progress-track">
<span style={{ width: `${Math.min(100, item.percentage)}%` }}/>
</div>
<b>{item.percentage}%</b>
</div>)}</div> : <div className="connected-progress-empty">
<span>{isDebt ? <HandCoins size={22}/> : <Target size={22}/>}</span>
<div>
<strong>{isDebt ? "No active debt" : "No savings goals yet"}</strong>
<small>{isDebt ? "Add a debt to start tracking payoff progress." : "Create a goal to make your progress visible."}</small>
</div>
</div>}
  </Card>;
}

function Dashboard({ transactions, accounts, budgets, debts, goals, onNavigate }) {
  const selectedMonth = new Date().toISOString().slice(0, 7);
  const monthly = transactions.filter((transaction) => transaction.dateValue?.startsWith(selectedMonth) && transaction.status !== "Scheduled");
  const income = monthly.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const spending = monthly.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const available = income - spending;
  const netWorth = accounts.filter((account) => !account.archived && account.includeInNetWorth !== false).reduce((sum, account) => sum + account.balance * (FX_TO_CHF[account.currency] || 1), 0);
  const savingsRate = income ? Math.max(0, (available / income) * 100) : 0;
  const monthlySeries = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    const rows = transactions.filter((transaction) => transaction.dateValue?.startsWith(key) && transaction.status !== "Scheduled");
    const monthIncome = rows.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const monthExpense = rows.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date), income: monthIncome, expense: monthExpense, cash: monthIncome - monthExpense };
  }), [transactions]);
  const debtProgress = useMemo(() => {
    const total = debts.reduce((sum, debt) => sum + Math.max(debt.originalBalance || debt.balance, debt.balance), 0);
    const remaining = debts.reduce((sum, debt) => sum + debt.balance, 0);
    return { total, completed: Math.max(0, total - remaining), items: debts.map((debt) => ({ id: debt.id, name: debt.creditor, current: Math.max(0, (debt.originalBalance || debt.balance) - debt.balance), total: debt.originalBalance || debt.balance, percentage: debt.originalBalance ? Math.round(Math.max(0, 1 - debt.balance / debt.originalBalance) * 100) : 0 })) };
  }, [debts]);
  const goalsProgress = useMemo(() => {
    const items = goals.map((goal) => { const current = getGoalCurrentAmount(goal, transactions); return { id: goal.id, name: goal.name, current, total: goal.targetAmount, percentage: goal.targetAmount ? Math.round((current / goal.targetAmount) * 100) : 0 }; });
    return { total: items.reduce((sum, item) => sum + item.total, 0), completed: items.reduce((sum, item) => sum + item.current, 0), items };
  }, [goals, transactions]);
  return (
    <>
      <div className="stats-grid">
        <StatCard label="Net worth" value={formatSignedCHF(netWorth)} valueClass={moneyTone(netWorth)} foot={`${accounts.filter((account) => !account.archived && account.includeInNetWorth !== false).length} accounts included`} icon={Coins} chart={<MiniLine />} />
        <StatCard label="Monthly income" value={formatSignedCHF(income)} valueClass={moneyTone(income)} foot="From connected transactions" icon={TrendUp} trend="up" chart={<MiniBars values={[48, 55, 62, 56, 78, 72]} active={4} />} />
        <StatCard label="Monthly spending" value={formatSignedCHF(-spending)} valueClass={moneyTone(-spending)} foot={`${available < 0 ? "Over by" : "Available"} ${formatSignedCHF(available)}`} footClass={moneyTone(available)} icon={TrendDown} chart={<MiniBars values={[30, 44, 67, 88, 56, 36]} active={3} />} />
        <StatCard label="Savings rate" value={`${savingsRate.toFixed(1)}%`} foot="Goal: 30%" icon={Target} trend={savingsRate >= 30 ? "up" : "down"} chart={<MiniScore value={savingsRate} />} />
      </div>
      <div className="dashboard-grid">
        <Card className="chart-card income-chart">
          <SectionHead title="Income vs spending" subtitle="6-month overview" action={<StatefulDropdown initialValue="monthly" options={CHART_PERIOD_OPTIONS} ariaLabel="Income and spending period" className="chart-period-dropdown"/>} />
          <div className="chart-area">
<IncomeExpenseChart data={monthlySeries} />
</div>
          <div className="chart-legend">
<span>
<i className="green" />Income</span>
<span>
<i className="coral" />Spending</span>
</div>
        </Card>
        <Card className="chart-card cash-chart">
          <SectionHead title="Cash flow" subtitle="Monthly money left after spending" action={<StatefulDropdown initialValue="monthly" options={CHART_PERIOD_OPTIONS} ariaLabel="Cash flow period" className="chart-period-dropdown"/>} />
          <div className="chart-area">
<CashFlowChart data={monthlySeries} />
</div>
        </Card>
        <Card className="spending-card">
          <SectionHead title="Spending breakdown" subtitle="July distribution" action={<IconButton label="More options">
<span className="dots">•••</span>
</IconButton>} />
          <SpendingDonut transactions={monthly.filter((transaction) => transaction.type === "expense")} />
        </Card>
        <Card className="transactions-card">
          <SectionHead title="Latest transactions" subtitle="Your most recent activity" action={<button className="text-button" onClick={() => onNavigate("transactions")}>View all <ArrowRight size={15} />
</button>} />
          <TransactionTable transactions={transactions} accounts={accounts} compact />
        </Card>
        <Card className="planner-card">
          <SectionHead title="Budget planner" subtitle="Track this month’s usage" action={<button className="text-button" onClick={() => onNavigate("budget")}>Edit <ArrowRight size={15} />
</button>} />
          <BudgetList budgets={budgets} transactions={transactions} />
        </Card>
      </div>
      <div className="connected-progress-grid">
        <ConnectedProgressCard type="debt" items={debtProgress.items} total={debtProgress.total} completed={debtProgress.completed} onOpen={() => onNavigate("debt")}/>
        <ConnectedProgressCard type="goals" items={goalsProgress.items} total={goalsProgress.total} completed={goalsProgress.completed} onOpen={() => onNavigate("goals")}/>
      </div>
    </>
  );
}

function AccountSteps({ step }) {
  return <div className="account-steps" aria-label={`Step ${step} of 3`}>{[1,2,3].map((number) => <span key={number} className={number <= step ? "active" : ""}>{number < step ? <Check size={13} weight="bold" /> : number}</span>)}</div>;
}

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

function ConnectAccountModal({ onClose, onCreate, onView }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ type: "", institution: "", customInstitution: "", name: "", currency: "CHF", balance: "", lastFour: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); };
  const validate = () => {
    const nextErrors = {};
    if (step === 1 && !form.type) nextErrors.type = "Choose an account type to continue.";
    if (step === 2 && !form.institution) nextErrors.institution = "Choose an institution to continue.";
    if (step === 2 && form.institution === "custom" && !form.customInstitution.trim()) nextErrors.customInstitution = "Enter the institution name.";
    if (step === 3) {
      if (!form.name.trim()) nextErrors.name = "Enter an account name.";
      if (form.balance === "" || !Number.isFinite(Number(form.balance))) nextErrors.balance = "Enter a valid balance.";
      if (form.lastFour && !/^\d{4}$/.test(form.lastFour)) nextErrors.lastFour = "Use exactly four digits.";
    }
    setErrors(nextErrors);
    return !Object.keys(nextErrors).length;
  };
  const next = () => { if (validate()) setStep((current) => Math.min(3, current + 1)); };
  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    window.setTimeout(() => {
      const account = { id: crypto.randomUUID(), type: form.type, institution: form.institution === "custom" ? form.customInstitution.trim() : form.institution, name: form.name.trim(), currency: form.currency, balance: Number(form.balance), lastFour: form.lastFour };
      onCreate(account);
      setCreated(account);
      setSaving(false);
    }, 650);
  };
  const close = () => { if (!saving) onClose(); };

  if (created) return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
<div className="modal account-modal success-modal" role="dialog" aria-modal="true" aria-labelledby="account-success-title">
<span className="success-icon">
<CheckCircle size={34} weight="fill" />
</span>
<span className="eyebrow">Account connected</span>
<h2 id="account-success-title">{created.name} is ready</h2>
<p>{created.institution} now appears in your account overview and net worth.</p>
<div className="success-balance">
<span>Current balance</span>
<strong className={moneyTone(created.balance)}>{formatSignedMoney(created.balance, created.currency)}</strong>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={onClose}>Done</button>
<button type="button" className="primary-button" onClick={() => onView(created.id)}>View account</button>
</div>
</div>
</div>;

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
<form className="modal account-modal" onSubmit={submit} aria-labelledby="connect-account-title">
    <div className="modal-head">
<div>
<span className="eyebrow">Connect account</span>
<h2 id="connect-account-title">{step === 1 ? "What kind of account?" : step === 2 ? "Choose your institution" : "Add account details"}</h2>
</div>
<IconButton label="Close" onClick={close}>
<X size={19} />
</IconButton>
</div>
    <AccountSteps step={step} />
    {step === 1 ? <div className="choice-grid account-type-grid">{ACCOUNT_TYPES.map(({ id, label, description, icon: Icon, tone }) => <button type="button" key={id} className={`choice-card ${form.type === id ? "selected" : ""}`} onClick={() => update("type", id)}>
<span className={`account-icon ${tone}`}>
<Icon size={21} weight="fill" />
</span>
<strong>{label}</strong>
<small>{description}</small>{form.type === id ? <CheckCircle className="choice-check" size={18} weight="fill" /> : null}</button>)}<FieldError>{errors.type}</FieldError>
</div> : null}
    {step === 2 ? <div className="institution-list">{SWISS_INSTITUTIONS.map((institution) => <button type="button" key={institution} className={form.institution === institution ? "selected" : ""} onClick={() => update("institution", institution)}>
<span>{institution.slice(0, 2).toUpperCase()}</span>
<strong>{institution}</strong>{form.institution === institution ? <CheckCircle size={18} weight="fill" /> : null}</button>)}<button type="button" className={form.institution === "custom" ? "selected" : ""} onClick={() => update("institution", "custom")}>
<span>+</span>
<strong>Add a custom institution</strong>{form.institution === "custom" ? <CheckCircle size={18} weight="fill" /> : null}</button>{form.institution === "custom" ? <label>
<span>Institution name</span>
<input autoFocus value={form.customInstitution} onChange={(event) => update("customInstitution", event.target.value)} placeholder="e.g. Banque Cantonale Vaudoise" />
<FieldError>{errors.customInstitution}</FieldError>
</label> : null}<FieldError>{errors.institution}</FieldError>
</div> : null}
    {step === 3 ? <div className="account-form">
<label>
<span>Account name</span>
<input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Everyday account" />
<FieldError>{errors.name}</FieldError>
</label>
<div className="modal-grid">
<label>
<span>Currency</span>
<select value={form.currency} onChange={(event) => update("currency", event.target.value)}>
<option value="CHF">CHF — Swiss franc</option>
<option value="EUR">EUR — Euro</option>
<option value="USD">USD — US dollar</option>
</select>
</label>
<label>
<span>Current balance</span>
<input type="number" step="0.01" value={form.balance} onChange={(event) => update("balance", event.target.value)} placeholder="0.00" />
<FieldError>{errors.balance}</FieldError>
</label>
</div>
<label>
<span>Last four digits <em>Optional</em>
</span>
<input inputMode="numeric" maxLength={4} value={form.lastFour} onChange={(event) => update("lastFour", event.target.value.replace(/\D/g, ""))} placeholder="1234" />
<FieldError>{errors.lastFour}</FieldError>
</label>
<div className="account-review">
<span>{ACCOUNT_TYPE_MAP[form.type]?.label}</span>
<strong>{form.institution === "custom" ? form.customInstitution : form.institution}</strong>
</div>
</div> : null}
    <div className="modal-actions account-modal-actions">{step > 1 ? <button type="button" className="secondary-button" disabled={saving} onClick={() => { setErrors({}); setStep((current) => current - 1); }}>Back</button> : <button type="button" className="secondary-button" onClick={close}>Cancel</button>}<button type={step === 3 ? "submit" : "button"} className="primary-button" disabled={saving} onClick={step === 3 ? undefined : next}>{saving ? <>
<CircleNotch className="spin" size={17} />Connecting…</> : step === 3 ? "Connect account" : "Continue"}</button>
</div>
  </form>
</div>;
}

function AccountDetailsModal({ account, onClose, onUpdate, onDelete }) {
  const [mode, setMode] = useState("details");
  const [draft, setDraft] = useState({ ...account, balance: String(account.balance) });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const type = ACCOUNT_TYPE_MAP[account.type] || ACCOUNT_TYPES[0];
  const TypeIcon = type.icon;
  const save = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || draft.balance === "" || !Number.isFinite(Number(draft.balance)) || (draft.lastFour && !/^\d{4}$/.test(draft.lastFour))) { setError("Check the account name, balance, and last four digits."); return; }
    setSaving(true);
    window.setTimeout(() => { onUpdate({ ...account, ...draft, name: draft.name.trim(), balance: Number(draft.balance) }); setSaving(false); }, 500);
  };
  const remove = () => { setSaving(true); window.setTimeout(() => onDelete(account.id), 500); };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
<form className="modal account-modal details-modal" onSubmit={save} aria-labelledby="account-detail-title">
    <div className="modal-head">
<div>
<span className="eyebrow">{mode === "edit" ? "Edit account" : mode === "delete" ? "Remove account" : type.label}</span>
<h2 id="account-detail-title">{mode === "delete" ? `Delete ${account.name}?` : account.name}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19} />
</IconButton>
</div>
    {mode === "details" ? <>
<div className="detail-hero">
<span className={`account-icon ${type.tone}`}>
<TypeIcon size={23} weight="fill" />
</span>
<span>{account.institution}</span>
<strong className={moneyTone(account.balance)}>{formatSignedMoney(account.balance, account.currency)}</strong>
<small>{account.lastFour ? `Account ending ${account.lastFour}` : "No account number saved"}</small>
</div>
<div className="detail-list">
<div>
<span>Account type</span>
<strong>{type.label}</strong>
</div>
<div>
<span>Currency</span>
<strong>{account.currency}</strong>
</div>
<div>
<span>Institution</span>
<strong>{account.institution}</strong>
</div>
</div>
<div className="modal-actions split-actions">
<button type="button" className="danger-button" onClick={() => setMode("delete")}>
<Trash size={16} />Delete</button>
<button type="button" className="primary-button" onClick={() => setMode("edit")}>
<PencilSimple size={16} />Edit account</button>
</div>
</> : null}
    {mode === "edit" ? <>
<div className="account-form">
<label>
<span>Account name</span>
<input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
</label>
<label>
<span>Institution</span>
<input value={draft.institution} onChange={(event) => setDraft((current) => ({ ...current, institution: event.target.value }))} />
</label>
<div className="modal-grid">
<label>
<span>Currency</span>
<select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}>
<option>CHF</option>
<option>EUR</option>
<option>USD</option>
</select>
</label>
<label>
<span>Balance</span>
<input type="number" step="0.01" value={draft.balance} onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))} />
</label>
</div>
<label>
<span>Last four digits <em>Optional</em>
</span>
<input inputMode="numeric" maxLength={4} value={draft.lastFour} onChange={(event) => setDraft((current) => ({ ...current, lastFour: event.target.value.replace(/\D/g, "") }))} />
</label>
<FieldError>{error}</FieldError>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" disabled={saving} onClick={() => setMode("details")}>Cancel</button>
<button type="submit" className="primary-button" disabled={saving}>{saving ? <>
<CircleNotch className="spin" size={17} />Saving…</> : "Save changes"}</button>
</div>
</> : null}
    {mode === "delete" ? <>
<div className="delete-message">
<span>
<Trash size={24} />
</span>
<p>This removes the account from Kalsoon and recalculates your net worth. Your institution is not affected.</p>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" disabled={saving} onClick={() => setMode("details")}>Keep account</button>
<button type="button" className="danger-button filled" disabled={saving} onClick={remove}>{saving ? <>
<CircleNotch className="spin" size={17} />Deleting…</> : "Delete account"}</button>
</div>
</> : null}
  </form>
</div>;
}

function Accounts({ accounts, setAccounts }) {
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("");
  const selected = accounts.find((account) => account.id === selectedId);
  const visibleAccounts = useMemo(() => accounts.filter((account) => !account.archived).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)), [accounts]);
  const total = useMemo(() => accounts.filter((account) => !account.archived && account.includeInNetWorth !== false).reduce((sum, account) => sum + account.balance * (FX_TO_CHF[account.currency] || 1), 0), [accounts]);
  const chartData = useMemo(() => [0.76,0.79,0.78,0.84,0.86,0.9,0.89,0.93,0.96,0.98,1].map((factor,index) => ({ m:["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"][index], v: Math.round(total * factor) })), [total]);
  const create = (account) => { setAccounts((current) => [...current, { ...account, includeInNetWorth: true, archived: false, order: current.length }]); setNotice(`${account.name} was connected successfully.`); };
  const update = (account) => { setAccounts((current) => current.map((item) => item.id === account.id ? account : item)); setSelectedId(null); setNotice(`${account.name} was updated.`); };
  const remove = (id) => { const name = accounts.find((account) => account.id === id)?.name; setAccounts((current) => current.filter((account) => account.id !== id)); setSelectedId(null); setNotice(`${name || "Account"} was deleted.`); };
  return <>
    {notice ? <div className="account-notice" role="status">
<CheckCircle size={18} weight="fill" />
<span>{notice}</span>
<IconButton label="Dismiss" onClick={() => setNotice("")}>
<X size={15} />
</IconButton>
</div> : null}
    <div className="account-summary">
<div>
<span className="summary-label">Total net worth <b>CHF equivalent</b>
</span>
<strong className={moneyTone(total)}>{formatSignedCHF(total, 2)}</strong>
<small>
<TrendUp size={15} /> Updated from {visibleAccounts.filter((account) => account.includeInNetWorth !== false).length} included {visibleAccounts.length === 1 ? "account" : "accounts"}</small>
</div>
<button className="primary-button" onClick={() => setConnectOpen(true)}>
<Plus size={17} />Connect account</button>
</div>
    {visibleAccounts.length ? <div className="account-grid">{visibleAccounts.map((account) => { const type = ACCOUNT_TYPE_MAP[account.type] || ACCOUNT_TYPES[0]; const Icon = type.icon; return <button type="button" className="account-card card" key={account.id} onClick={() => setSelectedId(account.id)}>
<div className={`account-icon ${type.tone}`}>
<Icon size={23} weight="fill" />
</div>
<div className="account-title">
<span>{account.institution}</span>
<h3>{account.name}</h3>
</div>
<strong className={moneyTone(account.balance)}>{formatSignedMoney(account.balance, account.currency)}</strong>
<p>{account.lastFour ? `•••• ${account.lastFour}` : type.label}{account.includeInNetWorth === false ? " · Excluded from net worth" : ""}</p>
<span className="account-arrow">
<ArrowRight size={18} />
</span>
</button>; })}</div> : <Card className="account-empty">
<span className="empty-account-icon">
<Wallet size={27} />
</span>
<h2>No active accounts</h2>
<p>Add your first account or restore an archived account in Settings.</p>
<button className="primary-button" onClick={() => setConnectOpen(true)}>
<Plus size={17} />Connect your first account</button>
</Card>}
    {visibleAccounts.length ? <Card className="wide-card">
<SectionHead title="Net worth over time" subtitle="Included assets minus liabilities" action={<StatefulDropdown initialValue="12" options={ACCOUNT_RANGE_OPTIONS} ariaLabel="Net worth chart period" className="chart-period-dropdown"/>} />
<div className="large-chart">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={chartData}>
<CartesianGrid stroke="#eceae6" vertical={false} strokeDasharray="3 4"/>
<XAxis dataKey="m" axisLine={false} tickLine={false}/>
<YAxis hide/>
<Tooltip formatter={(value) => formatCHF(value, 2)}/>
<Area type="monotone" dataKey="v" stroke="#e45f44" fill="#fbeae6" strokeWidth={2.5}/>
</AreaChart>
</ResponsiveContainer>
</div>
</Card> : null}
    {connectOpen ? <ConnectAccountModal onClose={() => setConnectOpen(false)} onCreate={create} onView={(id) => { setConnectOpen(false); setSelectedId(id); }} /> : null}
    {selected ? <AccountDetailsModal account={selected} onClose={() => setSelectedId(null)} onUpdate={update} onDelete={remove} /> : null}
  </>;
}

function TransactionDetailsModal({ transaction, accounts, onClose, onEdit, onDuplicate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const account = accounts.find((item) => item.id === transaction.accountId);
  const fromAccount = accounts.find((item) => item.id === transaction.fromAccountId);
  const toAccount = accounts.find((item) => item.id === transaction.toAccountId);
  const type = TRANSACTION_TYPES.find((item) => item.id === transaction.type) || TRANSACTION_TYPES[0];
  const TypeIcon = type.icon;
  const remove = () => { setDeleting(true); window.setTimeout(() => onDelete(transaction.id), 500); };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}>
<div className="modal transaction-detail-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title">
    <div className="modal-head">
<div>
<span className="eyebrow">{confirmDelete ? "Delete transaction" : type.label}</span>
<h2 id="transaction-detail-title">{confirmDelete ? `Delete ${transaction.merchant}?` : transaction.merchant}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>
    {confirmDelete ? <>
<div className="delete-message">
<span>
<Trash size={24}/>
</span>
<p>This removes the transaction and reverses its effect on the related account balance{transaction.type === "transfer" ? "s" : ""}.</p>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep transaction</button>
<button type="button" className="danger-button filled" disabled={deleting} onClick={remove}>{deleting ? <>
<CircleNotch className="spin" size={17}/>Deleting…</> : "Delete transaction"}</button>
</div>
</> : <>
<div className={`transaction-detail-hero ${transaction.type}`}>
<span className="transaction-type-icon">
<TypeIcon size={23} weight="bold"/>
</span>
<span>{type.label}</span>
<strong className={transaction.type === "transfer" ? "money-neutral" : moneyTone(transaction.type === "income" ? transaction.amount : -transaction.amount)}>{transaction.type === "transfer" ? formatMoney(transaction.amount, transaction.currency || "CHF") : formatSignedMoney(transaction.type === "income" ? transaction.amount : -transaction.amount, transaction.currency || "CHF")}</strong>
<small>{transaction.type === "transfer" ? `${fromAccount?.name || "Unknown account"} → ${toAccount?.name || "Unknown account"}` : account?.name || "Account unavailable"}</small>
</div>
<div className="detail-list transaction-detail-list">
<div>
<span>Category</span>
<strong>{transaction.category}</strong>
</div>
<div>
<span>Date and time</span>
<strong>{formatTransactionDate(transaction.dateValue, transaction.timeValue)}</strong>
</div>
<div>
<span>Status</span>
<strong>
<i className={`status ${transaction.status.toLowerCase()}`}>{transaction.status}</i>
</strong>
</div>
<div>
<span>Recurring</span>
<strong>{transaction.recurring ? transaction.frequency : "No"}</strong>
</div>
<div className="detail-notes">
<span>Notes</span>
<strong>{transaction.notes || "No notes added"}</strong>
</div>
</div>
<div className="transaction-detail-actions">
<button type="button" className="danger-button" onClick={() => setConfirmDelete(true)}>
<Trash size={16}/>Delete</button>
<div>
<button type="button" className="secondary-button" onClick={() => onDuplicate(transaction)}>
<Copy size={16}/>Duplicate</button>
<button type="button" className="primary-button" onClick={() => onEdit(transaction)}>
<PencilSimple size={16}/>Edit</button>
</div>
</div>
</>}
  </div>
</div>;
}

function Transactions({ transactions, accounts, query, setQuery, filter, setFilter, notice, setNotice, onAdd, onEdit, onDuplicate, onDelete }) {
  const [month, setMonth] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const selected = transactions.find((transaction) => transaction.id === selectedId);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const accountNames = transaction.type === "transfer" ? `${accounts.find((item) => item.id === transaction.fromAccountId)?.name || ""} ${accounts.find((item) => item.id === transaction.toAccountId)?.name || ""}` : accounts.find((item) => item.id === transaction.accountId)?.name || "";
      const matchesSearch = !term || `${transaction.merchant} ${transaction.category} ${transaction.status} ${transaction.notes || ""} ${accountNames}`.toLowerCase().includes(term);
      const matchesFilter = filter === "All" || (filter === "Transfer" ? transaction.type === "transfer" : transaction.category === filter);
      const matchesMonth = month === "all" || transaction.dateValue?.startsWith(month);
      return matchesSearch && matchesFilter && matchesMonth;
    });
  }, [transactions, accounts, filter, month, query]);
  const totals = useMemo(() => filtered.reduce((summary, transaction) => { if (transaction.type === "income") summary.income += transaction.amount; if (transaction.type === "expense") summary.expense += transaction.amount; if (transaction.type === "transfer") summary.transfers += 1; return summary; }, { income: 0, expense: 0, transfers: 0 }), [filtered]);
  const exportCsv = () => {
    if (!filtered.length) return;
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = filtered.map((transaction) => [transaction.type, transaction.merchant, transaction.category, transaction.dateValue, transaction.timeValue, transaction.amount, transaction.currency || "CHF", transaction.status, transaction.notes || ""].map(quote).join(","));
    const blob = new Blob([["Type,Merchant,Category,Date,Time,Amount,Currency,Status,Notes", ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `kalsoon-transactions-${month === "all" ? "all" : month}.csv`; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${filtered.length} transactions exported.`);
  };
  const clearFilters = () => { setQuery(""); setFilter("All"); setMonth("all"); };
  return <>
    {notice ? <div className="account-notice" role="status">
<CheckCircle size={18} weight="fill"/>
<span>{notice}</span>
<IconButton label="Dismiss" onClick={() => setNotice("")}>
<X size={15}/>
</IconButton>
</div> : null}
    <Card className="wide-card transaction-page">
      <div className="transaction-toolbar">
<div className="local-search">
<MagnifyingGlass size={18}/>
<input aria-label="Search transactions" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search transactions" />
</div>
<DropdownControl className="month-dropdown" icon={CalendarBlank} ariaLabel="Transaction month" value={month} onChange={setMonth} options={TRANSACTION_MONTH_OPTIONS}/>
<button className="secondary-button export-button" disabled={!filtered.length} onClick={exportCsv}>
<DownloadSimple size={17}/>Export</button>
</div>
      <div className="transaction-insight">
<span className="insight-icon">
<Sparkle size={20} weight="fill" />
</span>
<div>
<strong>{filtered.length} {filtered.length === 1 ? "transaction" : "transactions"} in view</strong>
<p>{formatCHF(totals.income)} income · {formatCHF(totals.expense)} spent{totals.transfers ? ` · ${totals.transfers} transfer${totals.transfers === 1 ? "" : "s"} excluded from cash flow` : ""}</p>
</div>
<ArrowRight size={18}/>
</div>
      {filtered.length ? <TransactionTable transactions={filtered} accounts={accounts} onSelect={setSelectedId}/> : <div className="empty-state">
<MagnifyingGlass size={28}/>
<h3>{transactions.length ? "No transactions found" : "No transactions yet"}</h3>
<p>{transactions.length ? "Try another search, category, or month." : "Add your first expense, income, or transfer."}</p>
<div>{transactions.length ? <button className="secondary-button" onClick={clearFilters}>Clear filters</button> : <button className="primary-button" onClick={onAdd}>
<Plus size={16}/>Add transaction</button>}</div>
</div>}
    </Card>
    {selected ? <TransactionDetailsModal transaction={selected} accounts={accounts} onClose={() => setSelectedId(null)} onEdit={(transaction) => { setSelectedId(null); onEdit(transaction); }} onDuplicate={(transaction) => { setSelectedId(null); onDuplicate(transaction); }} onDelete={(id) => { setSelectedId(null); onDelete(id); }}/> : null}
  </>;
}

const budgetTransactionCategory = (category) => ({ Rent: "Housing", Insurance: "Health", "Debt payments": "Debt payment" }[category] || category);

function BudgetModal({ budget, initialGroup = "fixed", customCategories, categories, onClose, onSave }) {
  const startingGroup = budget?.group || initialGroup;
  const categoryNames = (group) => categories?.filter((category) => category.group === group).map((category) => category.name) || [...BUDGET_CATEGORIES[group], ...(customCategories[group] || [])];
  const [form, setForm] = useState({ group: startingGroup, category: budget?.category || categoryNames(startingGroup)[0] || "", customCategory: budget?.custom ? budget.category : "", custom: budget?.custom || false, planned: budget ? String(budget.planned) : "", frequency: budget?.frequency || "Monthly", dueDate: budget?.dueDate || "2026-07-31", reminder: budget?.reminder || false, reminderDays: budget?.reminderDays || "3" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(budget);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); };
  const changeGroup = (group) => {
    setForm((current) => ({ ...current, group, category: categoryNames(group)[0] || "", custom: false, customCategory: "" }));
    setErrors({});
  };
  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const enteredCategory = form.custom ? form.customCategory.trim() : form.category;
    const existingCategory = categoryNames(form.group).find((category) => category.toLowerCase() === enteredCategory.toLowerCase());
    const category = existingCategory || enteredCategory;
    const isCustom = !BUDGET_CATEGORIES[form.group].includes(category);
    if (!category) nextErrors.category = "Enter a category name.";
    if (!form.planned || !Number.isFinite(Number(form.planned)) || Number(form.planned) <= 0) nextErrors.planned = "Enter an amount greater than zero.";
    if (!form.dueDate) nextErrors.dueDate = "Choose a due date.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    window.setTimeout(() => {
      onSave({ id: budget?.id || crypto.randomUUID(), group: form.group, category, transactionCategory: isCustom ? category : budgetTransactionCategory(category), planned: Number(form.planned), frequency: form.frequency, dueDate: form.dueDate, reminder: form.reminder, reminderDays: form.reminderDays, custom: isCustom });
      setSaving(false);
    }, 550);
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
<form className="modal budget-modal" onSubmit={submit} aria-labelledby="budget-modal-title">
    <div className="modal-head">
<div>
<span className="eyebrow">{isEditing ? "Edit plan" : "Monthly plan"}</span>
<h2 id="budget-modal-title">{isEditing ? "Edit budget" : "Create budget"}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>
    <div className="budget-group-choices">{Object.entries(BUDGET_GROUPS).map(([id, group]) => { const Icon = group.icon; return <button type="button" key={id} className={form.group === id ? "active" : ""} onClick={() => changeGroup(id)}>
<span className={`budget-group-icon ${group.tone}`}>
<Icon size={18}/>
</span>
<span>
<strong>{group.label}</strong>
<small>{group.description}</small>
</span>
</button>; })}</div>
    <div className="budget-form">
<label>
<span>Category</span>{form.custom ? <input autoFocus value={form.customCategory} onChange={(event) => update("customCategory", event.target.value)} placeholder="e.g. Pet care"/> : <select value={form.category} onChange={(event) => update("category", event.target.value)}>{categoryNames(form.group).map((category) => <option key={category}>{category}</option>)}</select>}<FieldError>{errors.category}</FieldError>
<button type="button" className="inline-text-button" onClick={() => setForm((current) => ({ ...current, custom: !current.custom, customCategory: current.custom ? "" : current.customCategory }))}>{form.custom ? "Choose a saved category" : "+ Create custom category"}</button>
</label>
<div className="modal-grid">
<label>
<span>Planned amount</span>
<div className="amount-input">
<b>CHF</b>
<input type="number" min="0" step="0.05" value={form.planned} onChange={(event) => update("planned", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.planned}</FieldError>
</label>
<label>
<span>Frequency</span>
<select value={form.frequency} onChange={(event) => update("frequency", event.target.value)}>
<option>Weekly</option>
<option>Monthly</option>
<option>Quarterly</option>
<option>Yearly</option>
<option>One-time</option>
</select>
</label>
</div>
<label>
<span>Due date</span>
<input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)}/>
<FieldError>{errors.dueDate}</FieldError>
</label>
<div className="recurring-box budget-reminder">
<label>
<input type="checkbox" checked={form.reminder} onChange={(event) => update("reminder", event.target.checked)}/>
<span>
<strong>Budget reminder</strong>
<small>Get a reminder before this budget is due.</small>
</span>
</label>{form.reminder ? <select aria-label="Reminder timing" value={form.reminderDays} onChange={(event) => update("reminderDays", event.target.value)}>
<option value="1">1 day before</option>
<option value="2">2 days before</option>
<option value="3">3 days before</option>
<option value="7">1 week before</option>
</select> : null}</div>
</div>
    <div className="modal-actions">
<button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Cancel</button>
<button type="submit" className="primary-button" disabled={saving}>{saving ? <>
<CircleNotch className="spin" size={17}/>Saving…</> : isEditing ? "Save changes" : "Create budget"}</button>
</div>
  </form>
</div>;
}

function BudgetDetailsModal({ budget, transactions, onClose, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const related = getBudgetTransactions(budget, transactions);
  const largest = [...related].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const actual = related.reduce((sum, transaction) => sum + transaction.amount, 0);
  const remaining = budget.planned - actual;
  const percentage = budget.planned ? Math.round((actual / budget.planned) * 100) : 0;
  const status = getBudgetStatus(budget, actual);
  const group = BUDGET_GROUPS[budget.group];
  const GroupIcon = group.icon;
  const remove = () => { setDeleting(true); window.setTimeout(() => onDelete(budget.id), 500); };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}>
<div className="modal budget-detail-modal" role="dialog" aria-modal="true" aria-labelledby="budget-detail-title">
<div className="modal-head">
<div>
<span className="eyebrow">{confirmDelete ? "Delete budget" : group.label}</span>
<h2 id="budget-detail-title">{confirmDelete ? `Delete ${budget.category}?` : budget.category}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>
    {confirmDelete ? <>
<div className="delete-message">
<span>
<Trash size={24}/>
</span>
<p>This removes the monthly plan only. Your related transactions will stay untouched.</p>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep budget</button>
<button type="button" className="danger-button filled" disabled={deleting} onClick={remove}>{deleting ? <>
<CircleNotch className="spin" size={17}/>Deleting…</> : "Delete budget"}</button>
</div>
</> : <>
<div className="budget-detail-hero">
<span className={`budget-group-icon ${group.tone}`}>
<GroupIcon size={21}/>
</span>
<span className={`budget-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>
<strong className="money-negative">{formatSignedCHF(-actual)} <small>of {formatCHF(budget.planned)}</small>
</strong>
<div className="progress-track">
<span style={{ width: `${Math.min(100, percentage)}%` }}/>
</div>
<p className={moneyTone(remaining)}>{formatSignedCHF(remaining)} {remaining < 0 ? "over plan" : "remaining"}</p>
</div>
<div className="budget-detail-meta">
<div>
<span>Group</span>
<strong>{group.label}</strong>
</div>
<div>
<span>Frequency</span>
<strong>{budget.frequency}</strong>
</div>
<div>
<span>Due date</span>
<strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(`${budget.dueDate}T12:00:00`))}</strong>
</div>
<div>
<span>Reminder</span>
<strong>{budget.reminder ? `${budget.reminderDays} day${budget.reminderDays === "1" ? "" : "s"} before` : "Off"}</strong>
</div>
</div>
<div className="related-budget-section">
<h3>Related transactions <span>{related.length}</span>
</h3>{related.length ? <div className="related-budget-list">{related.map((transaction) => <div key={transaction.id}>
<span className={`merchant-icon ${transaction.tone}`}>{transaction.icon}</span>
<div>
<strong>{transaction.merchant}</strong>
<small>{formatTransactionDate(transaction.dateValue, transaction.timeValue)}</small>
</div>
<b className={moneyTone(budget.group === "savings" ? transaction.amount : -transaction.amount)}>{formatSignedMoney(budget.group === "savings" ? transaction.amount : -transaction.amount, transaction.currency)}</b>
</div>)}</div> : <div className="budget-related-empty">No matching transactions this month.</div>}</div>{largest.length ? <div className="largest-expenses">
<h3>Largest {budget.group === "savings" ? "contributions" : "expenses"}</h3>{largest.map((transaction, index) => <div key={transaction.id}>
<span>{index + 1}. {transaction.merchant}</span>
<strong className={moneyTone(budget.group === "savings" ? transaction.amount : -transaction.amount)}>{formatSignedMoney(budget.group === "savings" ? transaction.amount : -transaction.amount, transaction.currency)}</strong>
</div>)}</div> : null}<div className="transaction-detail-actions">
<button type="button" className="danger-button" onClick={() => setConfirmDelete(true)}>
<Trash size={16}/>Delete</button>
<button type="button" className="primary-button" onClick={() => onEdit(budget)}>
<PencilSimple size={16}/>Edit budget</button>
</div>
</>}
  </div>
</div>;
}

function BudgetPage({ budgets, setBudgets, customCategories, setCustomCategories, transactions, categories }) {
  const [editor, setEditor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("");
  const selected = budgets.find((budget) => budget.id === selectedId);
  const expectedIncome = useMemo(() => transactions.filter((transaction) => transaction.type === "income" && transaction.dateValue?.startsWith("2026-07") && transaction.status !== "Scheduled").reduce((sum, transaction) => sum + transaction.amount, 0), [transactions]);
  const plannedSpending = useMemo(() => budgets.filter((budget) => budget.group !== "savings").reduce((sum, budget) => sum + budget.planned, 0), [budgets]);
  const actualSpending = useMemo(() => transactions.filter((transaction) => transaction.type === "expense" && transaction.dateValue?.startsWith("2026-07") && transaction.status !== "Scheduled").reduce((sum, transaction) => sum + transaction.amount, 0), [transactions]);
  const expectedSavings = expectedIncome - plannedSpending;
  const save = (budget) => { const existing = budgets.find((item) => item.id === budget.id); setBudgets((current) => existing ? current.map((item) => item.id === budget.id ? budget : item) : [...current, budget]); if (budget.custom) setCustomCategories((current) => { const next = Object.fromEntries(Object.entries(current).map(([group, categories]) => [group, existing?.custom && existing.group !== budget.group && group === existing.group ? categories.filter((category) => category !== existing.category) : [...categories]])); if (!next[budget.group].some((category) => category.toLowerCase() === budget.category.toLowerCase())) next[budget.group] = [...next[budget.group], budget.category]; return next; }); setEditor(null); setNotice(`${budget.category} was ${existing ? "updated" : "added"} and saved.`); };
  const remove = (id) => { const name = budgets.find((budget) => budget.id === id)?.category; setBudgets((current) => current.filter((budget) => budget.id !== id)); setSelectedId(null); setNotice(`${name || "Budget"} was deleted.`); };
  return <>{notice ? <div className="account-notice" role="status">
<CheckCircle size={18} weight="fill"/>
<span>{notice}</span>
<IconButton label="Dismiss" onClick={() => setNotice("")}>
<X size={15}/>
</IconButton>
</div> : null}<div className="budget-summary-grid">
<Card>
<span>Expected income</span>
<strong className={moneyTone(expectedIncome)}>{formatSignedCHF(expectedIncome)}</strong>
<small>Based on recurring income</small>
</Card>
<Card>
<span>Planned spending</span>
<strong className={moneyTone(-plannedSpending)}>{formatSignedCHF(-plannedSpending)}</strong>
<small>Fixed and flexible budgets</small>
</Card>
<Card>
<span>Actual spending</span>
<strong className={moneyTone(-actualSpending)}>{formatSignedCHF(-actualSpending)}</strong>
<small className={moneyTone(plannedSpending - actualSpending)}>{actualSpending <= plannedSpending ? `${formatSignedCHF(plannedSpending - actualSpending)} under plan` : `${formatSignedCHF(plannedSpending - actualSpending)} over plan`}</small>
</Card>
<Card className="savings-summary">
<span>Expected savings</span>
<strong className={moneyTone(expectedSavings)}>{formatSignedCHF(expectedSavings)}</strong>
<small>{expectedIncome ? Math.round((expectedSavings / expectedIncome) * 100) : 0}% of expected income</small>
</Card>
</div>
<div className="budget-page-toolbar">
<div>
<span className="eyebrow">July 2026</span>
<h2>Monthly category plan</h2>
<p>Each transaction automatically updates its matching budget.</p>
</div>
<button className="primary-button" onClick={() => setEditor({ group: "fixed" })}>
<Plus size={16}/>Create budget</button>
</div>
<div className="budget-groups">{Object.entries(BUDGET_GROUPS).map(([groupId, group]) => { const GroupIcon = group.icon; const items = budgets.filter((budget) => budget.group === groupId); const groupPlanned = items.reduce((sum, budget) => sum + budget.planned, 0); const groupActual = items.reduce((sum, budget) => sum + getBudgetActual(budget, transactions), 0); return <Card className="budget-group-card" key={groupId}>
<div className="budget-group-head">
<span className={`budget-group-icon ${group.tone}`}>
<GroupIcon size={20}/>
</span>
<div>
<h2>{group.label}</h2>
<p>{group.description}</p>
</div>
<div className="budget-group-total">
<span className={moneyTone(groupId === "savings" ? groupActual : -groupActual)}>{formatSignedCHF(groupId === "savings" ? groupActual : -groupActual)} actual</span>
<strong className={moneyTone(groupId === "savings" ? groupPlanned : -groupPlanned)}>{formatSignedCHF(groupId === "savings" ? groupPlanned : -groupPlanned)} planned</strong>
</div>
</div>
<div className="budget-items">{items.length ? items.map((budget) => { const actual = getBudgetActual(budget, transactions); const remaining = budget.planned - actual; const percentage = budget.planned ? Math.round((actual / budget.planned) * 100) : 0; const status = getBudgetStatus(budget, actual); return <button type="button" className="budget-item" key={budget.id} onClick={() => setSelectedId(budget.id)}>
<span className="budget-category-icon">{budget.category.slice(0, 1).toUpperCase()}</span>
<div className="budget-item-main">
<div>
<strong>{budget.category}{budget.custom ? <em>Custom</em> : null}</strong>
<span><b className={moneyTone(budget.group === "savings" ? actual : -actual)}>{formatSignedCHF(budget.group === "savings" ? actual : -actual)}</b> of <b className={moneyTone(budget.group === "savings" ? budget.planned : -budget.planned)}>{formatSignedCHF(budget.group === "savings" ? budget.planned : -budget.planned)}</b></span>
</div>
<div className="progress-track">
<span className={status === "Overspent" ? "overspent" : ""} style={{ width: `${Math.min(100, percentage)}%` }}/>
</div>
<small><b className={moneyTone(remaining)}>{formatSignedCHF(remaining)}</b> {remaining < 0 ? "over" : "remaining"} · {budget.frequency}</small>
</div>
<span className={`budget-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>
<ArrowRight size={17}/>
</button>; }) : <div className="budget-group-empty">
<p>No budgets in this group yet.</p>
<button className="secondary-button" onClick={() => setEditor({ group: groupId })}>
<Plus size={14}/>Add one</button>
</div>}</div>
</Card>; })}</div>{editor ? <BudgetModal budget={editor.budget} initialGroup={editor.group} customCategories={customCategories} onClose={() => setEditor(null)} onSave={save}/> : null}{selected ? <BudgetDetailsModal budget={selected} transactions={transactions} onClose={() => setSelectedId(null)} onEdit={(budget) => { setSelectedId(null); setEditor({ budget, group: budget.group }); }} onDelete={remove}/> : null}</>;
}

function DebtModal({ debt, onClose, onSave }) {
  const [form, setForm] = useState({ type: debt?.type || "Credit card", creditor: debt?.creditor || "", balance: debt ? String(debt.balance) : "", interestRate: debt ? String(debt.interestRate) : "", minimumPayment: debt ? String(debt.minimumPayment) : "", dueDate: debt?.dueDate || "2026-07-31", frequency: debt?.frequency || "Monthly" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); };
  const submit = (event) => { event.preventDefault(); const nextErrors = {}; if (!form.creditor.trim()) nextErrors.creditor = "Enter the creditor name."; if (!(Number(form.balance) > 0)) nextErrors.balance = "Enter a balance greater than zero."; if (!(Number(form.interestRate) >= 0)) nextErrors.interestRate = "Enter an interest rate of zero or more."; if (!(Number(form.minimumPayment) > 0)) nextErrors.minimumPayment = "Enter a minimum payment."; if (!form.dueDate) nextErrors.dueDate = "Choose a due date."; setErrors(nextErrors); if (Object.keys(nextErrors).length) return; setSaving(true); window.setTimeout(() => onSave({ id: debt?.id || crypto.randomUUID(), type: form.type, creditor: form.creditor.trim(), balance: Number(form.balance), interestRate: Number(form.interestRate), minimumPayment: Number(form.minimumPayment), dueDate: form.dueDate, frequency: form.frequency, originalBalance: debt?.originalBalance || Number(form.balance) }), 500); };
  return <div className="modal-backdrop">
<form className="modal debt-modal" onSubmit={submit} aria-labelledby="debt-modal-title">
<div className="modal-head">
<div>
<span className="eyebrow">Debt account</span>
<h2 id="debt-modal-title">{debt ? "Edit debt" : "Add debt"}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>
<div className="debt-type-grid">{DEBT_TYPES.map((type) => <button type="button" key={type} className={form.type === type ? "active" : ""} onClick={() => update("type", type)}>
<Wallet size={17}/>{type}</button>)}</div>
<div className="debt-form">
<label>
<span>Creditor</span>
<input autoFocus value={form.creditor} onChange={(event) => update("creditor", event.target.value)} placeholder="e.g. Cembra"/>
<FieldError>{errors.creditor}</FieldError>
</label>
<div className="modal-grid">
<label>
<span>Current balance</span>
<div className="amount-input">
<b>CHF</b>
<input type="number" min="0" step="0.05" value={form.balance} onChange={(event) => update("balance", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.balance}</FieldError>
</label>
<label>
<span>Interest rate</span>
<div className="amount-input percentage-input">
<b>%</b>
<input type="number" min="0" step="0.01" value={form.interestRate} onChange={(event) => update("interestRate", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.interestRate}</FieldError>
</label>
</div>
<div className="modal-grid">
<label>
<span>Minimum payment</span>
<div className="amount-input">
<b>CHF</b>
<input type="number" min="0" step="0.05" value={form.minimumPayment} onChange={(event) => update("minimumPayment", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.minimumPayment}</FieldError>
</label>
<label>
<span>Payment frequency</span>
<select value={form.frequency} onChange={(event) => update("frequency", event.target.value)}>{PAYMENT_FREQUENCIES.map((frequency) => <option key={frequency}>{frequency}</option>)}</select>
</label>
</div>
<label>
<span>Next due date</span>
<input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)}/>
<FieldError>{errors.dueDate}</FieldError>
</label>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
<button type="submit" className="primary-button" disabled={saving}>{saving ? <>
<CircleNotch className="spin" size={17}/>Saving…</> : debt ? "Save changes" : "Add debt"}</button>
</div>
</form>
</div>;
}

function DebtDetailsModal({ debt, accounts, onClose, onEdit, onDelete, onConfirmPayment }) {
  const [paymentMode, setPaymentMode] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [date, setDate] = useState("2026-07-14");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitPayment = (event) => { event.preventDefault(); const value = Number(amount); if (!(value > 0) || value > debt.balance) { setError(`Enter an amount up to ${formatCHF(debt.balance)}.`); return; } if (!accountId || !date) { setError("Choose an account and payment date."); return; } setSaving(true); window.setTimeout(() => onConfirmPayment(debt, value, accountId, date), 500); };
  return <div className="modal-backdrop">
<div className="modal debt-detail-modal" role="dialog" aria-modal="true" aria-labelledby="debt-detail-title">
<div className="modal-head">
<div>
<span className="eyebrow">{debt.type}</span>
<h2 id="debt-detail-title">{paymentMode ? `Pay ${debt.creditor}` : debt.creditor}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>{paymentMode ? <form className="debt-payment-form" onSubmit={submitPayment}>
<div className="simulation-note">
<Sparkle size={18}/>
<p>This is the confirmation step. The debt and account balance change only after you confirm.</p>
</div>
<label>
<span>Payment amount</span>
<div className="amount-input">
<b>CHF</b>
<input autoFocus type="number" min="0" step="0.05" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} placeholder="0.00"/>
</div>
</label>
<label>
<span>Pay from</span>
<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select>
</label>
<label>
<span>Payment date</span>
<input type="date" value={date} onChange={(event) => setDate(event.target.value)}/>
</label>
<FieldError>{error}</FieldError>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={() => setPaymentMode(false)}>Back</button>
<button type="submit" className="primary-button" disabled={saving}>{saving ? <>
<CircleNotch className="spin" size={17}/>Confirming…</> : "Confirm payment"}</button>
</div>
</form> : <>
<div className="debt-detail-balance">
<span>Current balance</span>
<strong className="money-negative">{formatSignedMoney(-debt.balance)}</strong>
<small>{debt.interestRate}% interest · <b className="money-negative">{formatSignedCHF(-monthlyDebtPayment(debt))}</b> monthly equivalent</small>
</div>
<div className="budget-detail-meta">
<div>
<span>Minimum payment</span>
<strong className="money-negative">{formatSignedMoney(-debt.minimumPayment)}</strong>
</div>
<div>
<span>Frequency</span>
<strong>{debt.frequency}</strong>
</div>
<div>
<span>Due date</span>
<strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(`${debt.dueDate}T12:00:00`))}</strong>
</div>
<div>
<span>Paid down</span>
<strong>{Math.max(0, Math.round((1 - debt.balance / debt.originalBalance) * 100))}%</strong>
</div>
</div>
<div className="transaction-detail-actions debt-detail-actions">
<button className="danger-button" onClick={() => onDelete(debt.id)}>
<Trash size={16}/>Delete</button>
<div>
<button className="secondary-button" onClick={() => onEdit(debt)}>
<PencilSimple size={16}/>Edit</button>
<button className="primary-button" onClick={() => setPaymentMode(true)}>
<Check size={16}/>Record payment</button>
</div>
</div>
</>}</div>
</div>;
}

function DebtPage({ debts, setDebts, accounts, onConfirmedPayment }) {
  const [strategy, setStrategy] = useState("snowball");
  const [extraPayment, setExtraPayment] = useState(250);
  const [customOrder, setCustomOrder] = useState(() => debts.map((debt) => debt.id));
  const [editor, setEditor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("");
  useEffect(() => setCustomOrder((current) => [...current.filter((id) => debts.some((debt) => debt.id === id)), ...debts.filter((debt) => !current.includes(debt.id)).map((debt) => debt.id)]), [debts]);
  const results = useMemo(() => simulateDebtPayoff(debts, strategy, extraPayment, customOrder), [debts, strategy, extraPayment, customOrder]);
  const baseline = useMemo(() => simulateDebtPayoff(debts, strategy, 0, customOrder), [debts, strategy, customOrder]);
  const comparisons = useMemo(() => ["snowball", "avalanche", "custom"].map((id) => ({ id, result: simulateDebtPayoff(debts, id, extraPayment, customOrder) })), [debts, extraPayment, customOrder]);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const monthsSaved = Math.max(0, baseline.months - results.months);
  const selected = debts.find((debt) => debt.id === selectedId);
  const moveCustom = (index, direction) => setCustomOrder((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const saveDebt = (debt) => { const exists = debts.some((item) => item.id === debt.id); setDebts((current) => exists ? current.map((item) => item.id === debt.id ? debt : item) : [...current, debt]); setEditor(null); setNotice(`${debt.creditor} was ${exists ? "updated" : "added"}.`); };
  const deleteDebt = (id) => { const name = debts.find((debt) => debt.id === id)?.creditor; setDebts((current) => current.filter((debt) => debt.id !== id)); setSelectedId(null); setNotice(`${name} was deleted.`); };
  const confirmPayment = (debt, amount, accountId, date) => { onConfirmedPayment(debt, amount, accountId, date); setSelectedId(null); setNotice(`${formatCHF(amount)} payment to ${debt.creditor} is being confirmed.`); };
  const strategyCopy = { snowball: ["Debt Snowball", "Smallest balance first"], avalanche: ["Debt Avalanche", "Highest interest first"], custom: ["Custom plan", "Choose your repayment order"] };
  return <>{notice ? <div className="account-notice" role="status">
<CheckCircle size={18} weight="fill"/>
<span>{notice}</span>
<IconButton label="Dismiss" onClick={() => setNotice("")}>
<X size={15}/>
</IconButton>
</div> : null}<Card className="debt-simulator-hero">
<div>
<span>Total debt</span>
<strong className="money-negative">{formatSignedCHF(-totalDebt)}</strong>
<p>{debts.length} active {debts.length === 1 ? "debt" : "debts"} · <b className="money-negative">{formatSignedCHF(-debts.reduce((sum, debt) => sum + monthlyDebtPayment(debt), 0))}</b> minimums</p>
</div>
<div className="debt-hero-stat">
<Flag size={22}/>
<span>Estimated debt-free</span>
<strong>{results.debtFreeDate ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(results.debtFreeDate) : "You’re debt-free"}</strong>
<small>{monthsSaved} months saved with CHF {extraPayment} extra</small>
</div>
<div className="debt-hero-stat">
<Coins size={22}/>
<span>Total interest</span>
<strong className="money-negative">{formatSignedCHF(-results.totalInterest)}</strong>
<small><b className="money-negative">{formatSignedCHF(-results.totalRepayment)}</b> total repayment</small>
</div>
</Card>
<div className="debt-control-grid">
<Card className="debt-strategy-card">
<SectionHead title="Choose your payoff strategy" subtitle="Compare the same debts and monthly extra"/>
<div className="strategy-comparison">{comparisons.map(({ id, result }) => <button key={id} className={strategy === id ? "active" : ""} onClick={() => setStrategy(id)}>
<span>
<strong>{strategyCopy[id][0]}</strong>
<small>{strategyCopy[id][1]}</small>
</span>
<b>{result.months} mo</b>
<em>{formatCHF(result.totalInterest)} interest</em>
</button>)}</div>
</Card>
<Card className="extra-payment-card">
<span>Monthly extra payment</span>
<strong className="money-negative">{formatSignedCHF(-extraPayment)}</strong>
<p>Simulation only — no account or transaction changes yet.</p>
<input aria-label="Monthly extra payment" type="range" min="0" max="2000" step="25" value={extraPayment} onChange={(event) => setExtraPayment(Number(event.target.value))}/>
<div className="extra-payment-input">
<span>CHF</span>
<input aria-label="Extra payment amount" type="number" min="0" step="25" value={extraPayment} onChange={(event) => setExtraPayment(Math.max(0, Number(event.target.value) || 0))}/>
</div>
<small>
<Sparkle size={14}/> {monthsSaved} months sooner than minimum payments</small>
</Card>
</div>
<div className="debt-workspace">
<Card className="debt-order-card">
<SectionHead title="Recommended payment order" subtitle={strategyCopy[strategy][1]} action={<button className="primary-button small" onClick={() => setEditor({})}>
<Plus size={15}/>Add debt</button>}/>{results.order.length ? <div className="debt-list">{results.order.map((debt, index) => <div className="debt-row interactive" key={debt.id} onClick={() => setSelectedId(debt.id)}>
<span className="debt-order">{index + 1}</span>
<span className="debt-kind">
<Wallet size={17}/>
</span>
<div className="debt-main">
<div>
<strong>{debt.creditor}</strong>
<span>{debt.type} · {debt.interestRate}% APR</span>
</div>
<div className="progress-track">
<span style={{ width: `${Math.min(100, Math.max(4, debt.balance / debt.originalBalance * 100))}%` }}/>
</div>
</div>
<div className="debt-amount">
<strong className="money-negative">{formatSignedCHF(-debt.balance)}</strong>
<span className="money-negative">{formatSignedCHF(-monthlyDebtPayment(debt))}/mo</span>
</div>{strategy === "custom" ? <div className="order-buttons" onClick={(event) => event.stopPropagation()}>
<IconButton label={`Move ${debt.creditor} up`} onClick={() => moveCustom(index, -1)}>
<ArrowUp size={14}/>
</IconButton>
<IconButton label={`Move ${debt.creditor} down`} onClick={() => moveCustom(index, 1)}>
<ArrowDown size={14}/>
</IconButton>
</div> : <ArrowRight size={17}/>}</div>)}</div> : <div className="empty-state">
<HandCoins size={30}/>
<h3>No debts yet</h3>
<p>Add a debt to build your payoff plan.</p>
<button className="primary-button" onClick={() => setEditor({})}>
<Plus size={16}/>Add debt</button>
</div>}</Card>
<Card className="debt-timeline-card">
<SectionHead title="Payoff timeline" subtitle={`${results.months} month journey`}/>
<div className="payoff-timeline">{results.order.map((debt, index) => { const previous = index ? results.order.slice(0, index).reduce((sum, item) => sum + item.balance, 0) : 0; const estimate = results.months ? Math.max(1, Math.round((previous + debt.balance) / totalDebt * results.months)) : 0; return <div key={debt.id}>
<span>{index + 1}</span>
<div>
<strong>{debt.creditor}</strong>
<small>Estimated month {estimate}</small>
</div>
</div>; })}</div>
</Card>
</div>
<div className="debt-analytics-grid">
<Card className="debt-chart-card">
<SectionHead title="Declining balance" subtitle={`${strategyCopy[strategy][0]} projection`}/>
<div className="debt-chart">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={results.balanceData}>
<defs>
<linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#e45f44" stopOpacity={0.25}/>
<stop offset="100%" stopColor="#e45f44" stopOpacity={0.02}/>
</linearGradient>
</defs>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee9e5"/>
<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:9,fill:"#8d8985"}}/>
<YAxis axisLine={false} tickLine={false} tick={{fontSize:9,fill:"#8d8985"}} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/>
<Tooltip formatter={(value) => formatCHF(value)}/>
<Area type="monotone" dataKey="balance" stroke="#e45f44" strokeWidth={2.5} fill="url(#debtFill)"/>
</AreaChart>
</ResponsiveContainer>
</div>
</Card>
<Card className="debt-schedule-card">
<SectionHead title="Monthly payment schedule" subtitle="First 12 projected months"/>
<div className="schedule-table">
<div className="schedule-head">
<span>Month</span>
<span>Payment</span>
<span>Principal</span>
<span>Interest</span>
<span>Remaining</span>
</div>{results.schedule.slice(0, 12).map((row) => <div key={row.month}>
<span>{new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(row.date)}</span>
<span className="money-negative">{formatSignedCHF(-row.payment)}</span>
<span className="money-negative">{formatSignedCHF(-row.principal)}</span>
<span className="money-negative">{formatSignedCHF(-row.interest)}</span>
<strong className="money-negative">{formatSignedCHF(-row.remaining)}</strong>
</div>)}</div>
</Card>
</div>{editor ? <DebtModal debt={editor.debt} onClose={() => setEditor(null)} onSave={saveDebt}/> : null}{selected ? <DebtDetailsModal debt={selected} accounts={accounts} onClose={() => setSelectedId(null)} onEdit={(debt) => { setSelectedId(null); setEditor({ debt }); }} onDelete={deleteDebt} onConfirmPayment={confirmPayment}/> : null}</>;
}

function GoalModal({ goal, accounts, onClose, onSave }) {
  const [form, setForm] = useState({ type: goal?.type || "Emergency fund", name: goal?.name || "", targetAmount: goal ? String(goal.targetAmount) : "", currentAmount: goal ? String(goal.baseAmount) : "", deadline: goal?.deadline || "2026-12-31", linkedAccountId: goal?.linkedAccountId || accounts.find((account) => account.type === "savings")?.id || accounts[0]?.id || "", monthlyContribution: goal ? String(goal.monthlyContribution) : "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); };
  const chooseType = (type) => setForm((current) => ({ ...current, type, name: type === "Custom goal" ? current.name : type }));
  const submit = (event) => { event.preventDefault(); const nextErrors = {}; if (!form.name.trim()) nextErrors.name = "Enter a goal name."; if (!(Number(form.targetAmount) > 0)) nextErrors.targetAmount = "Enter a target greater than zero."; if (!(Number(form.currentAmount) >= 0)) nextErrors.currentAmount = "Enter a current amount of zero or more."; if (Number(form.currentAmount) > Number(form.targetAmount)) nextErrors.currentAmount = "Current amount cannot exceed the target."; if (!form.deadline) nextErrors.deadline = "Choose a deadline."; if (!form.linkedAccountId) nextErrors.linkedAccountId = "Choose a linked account."; if (!(Number(form.monthlyContribution) >= 0)) nextErrors.monthlyContribution = "Enter a monthly contribution."; setErrors(nextErrors); if (Object.keys(nextErrors).length) return; setSaving(true); window.setTimeout(() => onSave({ id: goal?.id || crypto.randomUUID(), type: form.type, name: form.name.trim(), targetAmount: Number(form.targetAmount), baseAmount: Number(form.currentAmount), deadline: form.deadline, linkedAccountId: form.linkedAccountId, monthlyContribution: Number(form.monthlyContribution), status: goal?.status || "Active", history: goal?.history || [] }), 500); };
  return <div className="modal-backdrop">
<form className="modal goal-modal" onSubmit={submit} aria-labelledby="goal-modal-title">
<div className="modal-head">
<div>
<span className="eyebrow">Savings goal</span>
<h2 id="goal-modal-title">{goal ? "Edit goal" : "Create goal"}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>
<div className="goal-type-grid">{GOAL_TYPES.map((type) => <button type="button" key={type} className={form.type === type ? "active" : ""} onClick={() => chooseType(type)}>
<Target size={17}/>{type}</button>)}</div>
<div className="goal-form">
<label>
<span>Goal name</span>
<input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Summer in Ticino"/>
<FieldError>{errors.name}</FieldError>
</label>
<div className="modal-grid">
<label>
<span>Target amount</span>
<div className="amount-input">
<b>CHF</b>
<input type="number" min="0" step="0.05" value={form.targetAmount} onChange={(event) => update("targetAmount", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.targetAmount}</FieldError>
</label>
<label>
<span>Current amount</span>
<div className="amount-input">
<b>CHF</b>
<input type="number" min="0" step="0.05" value={form.currentAmount} onChange={(event) => update("currentAmount", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.currentAmount}</FieldError>
</label>
</div>
<div className="modal-grid">
<label>
<span>Deadline</span>
<input type="date" value={form.deadline} onChange={(event) => update("deadline", event.target.value)}/>
<FieldError>{errors.deadline}</FieldError>
</label>
<label>
<span>Linked account</span>
<select value={form.linkedAccountId} onChange={(event) => update("linkedAccountId", event.target.value)}>
<option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select>
<FieldError>{errors.linkedAccountId}</FieldError>
</label>
</div>
<label>
<span>Planned monthly contribution</span>
<div className="amount-input">
<b>CHF</b>
<input type="number" min="0" step="0.05" value={form.monthlyContribution} onChange={(event) => update("monthlyContribution", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.monthlyContribution}</FieldError>
</label>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
<button type="submit" className="primary-button" disabled={saving}>{saving ? <>
<CircleNotch className="spin" size={17}/>Saving…</> : goal ? "Save changes" : "Create goal"}</button>
</div>
</form>
</div>;
}

function GoalDetailsModal({ goal, currentAmount, transactions, accounts, onClose, onEdit, onPause, onDelete, onTransfer }) {
  const [simContribution, setSimContribution] = useState(goal.monthlyContribution);
  const [simDeadline, setSimDeadline] = useState(goal.deadline);
  const [transferMode, setTransferMode] = useState(null);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts.find((account) => account.id !== goal.linkedAccountId)?.id || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const linked = getGoalTransactions(goal, transactions).map((transaction) => ({ id: transaction.id, type: transaction.toAccountId === goal.linkedAccountId ? "Contribution" : "Withdrawal", amount: transaction.amount, date: transaction.dateValue, source: transaction.notes || "Linked account transfer" }));
  const history = [...linked, ...goal.history].sort((a, b) => b.date.localeCompare(a.date));
  const completion = getGoalCompletionDate(currentAmount, goal.targetAmount, simContribution);
  const deadlineDate = new Date(`${simDeadline}T12:00:00`);
  const monthsToDeadline = Math.max(1, (deadlineDate.getFullYear() - 2026) * 12 + deadlineDate.getMonth() - 6);
  const requiredMonthly = Math.ceil(Math.max(0, goal.targetAmount - currentAmount) / monthsToDeadline);
  const chartData = [...goal.history].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(`${item.date}T12:00:00`)), balance: item.balance }));
  chartData.push({ month: "Now", balance: currentAmount });
  const submitTransfer = (event) => { event.preventDefault(); const value = Number(amount); const max = transferMode === "withdraw" ? currentAmount : Infinity; if (!(value > 0) || value > max) { setError(transferMode === "withdraw" ? `Enter an amount up to ${formatCHF(currentAmount)}.` : "Enter an amount greater than zero."); return; } if (!accountId) { setError("Choose an account."); return; } setSaving(true); window.setTimeout(() => onTransfer(goal, transferMode, value, accountId), 500); };
  return <div className="modal-backdrop">
<div className="modal goal-detail-modal" role="dialog" aria-modal="true" aria-labelledby="goal-detail-title">
<div className="modal-head">
<div>
<span className="eyebrow">{transferMode ? `${transferMode === "add" ? "Add to" : "Withdraw from"} goal` : goal.type}</span>
<h2 id="goal-detail-title">{goal.name}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>{transferMode ? <form className="goal-transfer-form" onSubmit={submitTransfer}>
<div className="simulation-note">
<Coins size={18}/>
<p>{transferMode === "add" ? "Money will move from the selected account into the linked goal account." : "Money will move from the linked goal account into the selected account."}</p>
</div>
<label>
<span>Amount</span>
<div className="amount-input">
<b>CHF</b>
<input autoFocus type="number" min="0" step="0.05" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} placeholder="0.00"/>
</div>
</label>
<label>
<span>{transferMode === "add" ? "From account" : "To account"}</span>
<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.filter((account) => account.id !== goal.linkedAccountId).map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select>
</label>
<FieldError>{error}</FieldError>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={() => setTransferMode(null)}>Back</button>
<button type="submit" className="primary-button" disabled={saving}>{saving ? <>
<CircleNotch className="spin" size={17}/>Saving…</> : transferMode === "add" ? "Add money" : "Withdraw money"}</button>
</div>
</form> : <>
<div className="goal-detail-summary">
<div>
<span>Saved</span>
<strong className={moneyTone(currentAmount)}>{formatSignedCHF(currentAmount)}</strong>
<small>of {formatCHF(goal.targetAmount)}</small>
</div>
<div className="goal-ring" style={{ "--progress": `${Math.min(100, currentAmount / goal.targetAmount * 100)}%` }}>
<strong>{Math.round(currentAmount / goal.targetAmount * 100)}%</strong>
</div>
<div className="progress-track">
<span style={{ width: `${Math.min(100, currentAmount / goal.targetAmount * 100)}%` }}/>
</div>
<p>{formatCHF(Math.max(0, goal.targetAmount - currentAmount))} remaining · {goal.status}</p>
</div>
<div className="goal-action-row">
<button className="secondary-button" onClick={() => setTransferMode("withdraw")}>
<ArrowDown size={15}/>Withdraw</button>
<button className="primary-button" onClick={() => setTransferMode("add")}>
<Plus size={15}/>Add money</button>
</div>
<div className="goal-simulator">
<div>
<span className="eyebrow">Goal simulator</span>
<h3>Adjust the plan</h3>
</div>
<label>
<span>Monthly contribution</span>
<div className="amount-input">
<b>CHF</b>
<input aria-label="Simulated monthly contribution" type="number" min="0" step="25" value={simContribution} onChange={(event) => setSimContribution(Math.max(0, Number(event.target.value) || 0))}/>
</div>
</label>
<label>
<span>Target deadline</span>
<input aria-label="Simulated deadline" type="date" value={simDeadline} onChange={(event) => setSimDeadline(event.target.value)}/>
</label>
<div className="goal-sim-result">
<span>Estimated completion</span>
<strong>{completion ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(completion) : "Add a contribution"}</strong>
<small>{formatCHF(requiredMonthly)}/month needed for the selected deadline</small>
</div>
</div>
<div className="goal-detail-grid">
<div className="goal-history">
<h3>Contribution history <span>{history.length}</span>
</h3>{history.length ? history.slice(0, 6).map((item) => <div key={item.id}>
<span className={item.type === "Withdrawal" ? "withdraw" : "add"}>{item.type === "Withdrawal" ? <ArrowDown size={14}/> : <ArrowUp size={14}/>}</span>
<div>
<strong>{item.type}</strong>
<small>{item.source} · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${item.date}T12:00:00`))}</small>
</div>
<b className={moneyTone(item.type === "Withdrawal" ? -item.amount : item.amount)}>{formatSignedCHF(item.type === "Withdrawal" ? -item.amount : item.amount)}</b>
</div>) : <div className="budget-related-empty">No contributions yet.</div>}</div>
<div className="goal-progress-chart">
<h3>Progress</h3>
<div>
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={chartData}>
<defs>
<linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#15926f" stopOpacity={0.25}/>
<stop offset="100%" stopColor="#15926f" stopOpacity={0.02}/>
</linearGradient>
</defs>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee9e5"/>
<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:8,fill:"#8d8985"}}/>
<YAxis hide/>
<Tooltip formatter={(value) => formatCHF(value)}/>
<Area type="monotone" dataKey="balance" stroke="#15926f" strokeWidth={2.5} fill="url(#goalFill)"/>
</AreaChart>
</ResponsiveContainer>
</div>
</div>
</div>
<div className="goal-detail-footer">
<button className="danger-button" onClick={() => onDelete(goal.id)}>
<Trash size={15}/>Delete</button>
<div>
<button className="secondary-button" onClick={() => onPause(goal.id)}>{goal.status === "Paused" ? <>
<Check size={15}/>Resume</> : <>
<Flag size={15}/>Pause</>}</button>
<button className="primary-button" onClick={() => onEdit(goal)}>
<PencilSimple size={15}/>Edit goal</button>
</div>
</div>
</>}</div>
</div>;
}

function GoalsPage({ goals, setGoals, transactions, accounts, onGoalTransfer }) {
  const [editor, setEditor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("");
  const selected = goals.find((goal) => goal.id === selectedId);
  const saveGoal = (goal) => { const exists = goals.some((item) => item.id === goal.id); setGoals((current) => exists ? current.map((item) => item.id === goal.id ? goal : item) : [...current, goal]); setEditor(null); setNotice(`${goal.name} was ${exists ? "updated" : "created"}.`); };
  const deleteGoal = (id) => { const name = goals.find((goal) => goal.id === id)?.name; setGoals((current) => current.filter((goal) => goal.id !== id)); setSelectedId(null); setNotice(`${name} was deleted.`); };
  const pauseGoal = (id) => setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, status: goal.status === "Paused" ? "Active" : "Paused" } : goal));
  const transfer = (goal, mode, amount, accountId) => { onGoalTransfer(goal, mode, amount, accountId); setSelectedId(null); setNotice(`${formatCHF(amount)} was ${mode === "add" ? "added to" : "withdrawn from"} ${goal.name}.`); };
  return <>{notice ? <div className="account-notice" role="status">
<CheckCircle size={18} weight="fill"/>
<span>{notice}</span>
<IconButton label="Dismiss" onClick={() => setNotice("")}>
<X size={15}/>
</IconButton>
</div> : null}<div className="goal-page-toolbar">
<div>
<span className="eyebrow">Your future, funded</span>
<h2>Active savings goals</h2>
<p>Linked transfers update progress automatically.</p>
</div>
<button className="primary-button" onClick={() => setEditor({})}>
<Plus size={16}/>Create goal</button>
</div>
<div className="goal-grid">{goals.map((goal) => { const current = getGoalCurrentAmount(goal, transactions); const percentage = goal.targetAmount ? Math.round(current / goal.targetAmount * 100) : 0; const completion = getGoalCompletionDate(current, goal.targetAmount, goal.status === "Paused" ? 0 : goal.monthlyContribution); const linkedAccount = accounts.find((account) => account.id === goal.linkedAccountId); return <button type="button" className={`card goal-card goal-workflow-card ${goal.status === "Paused" ? "paused" : ""}`} key={goal.id} onClick={() => setSelectedId(goal.id)}>
<div className="goal-card-top">
<span className={`goal-icon ${goal.type === "Pillar 3a" ? "green" : goal.type === "Holiday" ? "blue" : "coral"}`}>
<Target size={21} weight="fill"/>
</span>
<span className={`goal-state ${goal.status.toLowerCase()}`}>{goal.status}</span>
</div>
<span>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${goal.deadline}T12:00:00`))}</span>
<h3>{goal.name}</h3>
<strong className={moneyTone(current)}>{formatSignedCHF(current)} <small>of {formatCHF(goal.targetAmount)}</small>
</strong>
<div className="progress-track">
<span style={{ width: `${Math.min(100, percentage)}%` }}/>
</div>
<div className="goal-foot">
<b>{percentage}% funded</b>
<span>{formatCHF(Math.max(0, goal.targetAmount - current))} remaining</span>
</div>
<div className="goal-card-meta">
<div>
<span>Monthly</span>
<strong className={moneyTone(goal.monthlyContribution)}>{formatSignedCHF(goal.monthlyContribution)}</strong>
</div>
<div>
<span>Estimated</span>
<strong>{completion ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(completion) : "Paused"}</strong>
</div>
</div>
<small className="linked-goal-account">
<Wallet size={13}/>{linkedAccount?.name || "No linked account"}</small>
</button>; })}<button className="new-goal" onClick={() => setEditor({})}>
<Plus size={24}/>
<strong>Create a new goal</strong>
<span>Make your next milestone visible.</span>
</button>
</div>{editor ? <GoalModal goal={editor.goal} accounts={accounts} onClose={() => setEditor(null)} onSave={saveGoal}/> : null}{selected ? <GoalDetailsModal goal={selected} currentAmount={getGoalCurrentAmount(selected, transactions)} transactions={transactions} accounts={accounts} onClose={() => setSelectedId(null)} onEdit={(goal) => { setSelectedId(null); setEditor({ goal }); }} onPause={pauseGoal} onDelete={deleteGoal} onTransfer={transfer}/> : null}</>;
}

function ReportsPage({ transactions }) {
  const settled = transactions.filter((item) => item.status !== "Scheduled");
  const months = [...new Set(settled.map((item) => item.dateValue?.slice(0,7)).filter(Boolean))];
  const expenses = settled.filter((item) => item.type === "expense");
  const totalExpense = expenses.reduce((sum,item) => sum + item.amount, 0);
  const totalIncome = settled.filter((item) => item.type === "income").reduce((sum,item) => sum + item.amount, 0);
  const averageSpend = months.length ? totalExpense / months.length : 0;
  const averageSaved = months.length ? (totalIncome - totalExpense) / months.length : 0;
  const categories = Object.entries(expenses.reduce((result,item) => ({ ...result, [item.category]: (result[item.category] || 0) + item.amount }), {})).sort((a,b) => b[1]-a[1]);
  const series = Array.from({length:7},(_,index) => { const date=new Date(); date.setDate(1); date.setMonth(date.getMonth()-(6-index)); const key=date.toISOString().slice(0,7); const rows=settled.filter((item)=>item.dateValue?.startsWith(key)); const income=rows.filter((item)=>item.type==="income").reduce((sum,item)=>sum+item.amount,0); const expense=rows.filter((item)=>item.type==="expense").reduce((sum,item)=>sum+item.amount,0); return {month:new Intl.DateTimeFormat("en-GB",{month:"short"}).format(date),income,expense,cash:income-expense}; });
  return <><div className="report-stats"><Card><span>Average monthly spend</span><strong className={moneyTone(-averageSpend)}>{formatSignedCHF(-averageSpend)}</strong><small>From connected transactions</small></Card><Card><span>Average saved</span><strong className={moneyTone(averageSaved)}>{formatSignedCHF(averageSaved)}</strong><small>Income minus spending</small></Card><Card><span>Top category</span><strong>{categories[0]?.[0] || "No spending yet"}</strong><small>{totalExpense && categories[0] ? Math.round(categories[0][1]/totalExpense*100) : 0}% of spending</small></Card></div><Card className="wide-card"><SectionHead title="Spending trend" subtitle="Last seven months" action={<StatefulDropdown initialValue="year" options={REPORT_RANGE_OPTIONS} ariaLabel="Report period" className="chart-period-dropdown"/>}/><div className="large-chart"><IncomeExpenseChart data={series}/></div></Card><div className="report-grid"><Card><SectionHead title="By category" subtitle="Share of total spending"/><SpendingDonut transactions={expenses}/></Card><Card><SectionHead title="Category share" subtitle="Largest spending areas"/><div className="change-list">{categories.slice(0,4).map(([name,amount])=><div key={name}><span>{name}</span><b>{totalExpense ? Math.round(amount/totalExpense*100) : 0}%</b></div>)}</div></Card></div></>;
}

function SettingsAccountModal({ account, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...account, balance: String(account.balance) });
  const [error, setError] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.institution.trim() || form.balance === "" || !Number.isFinite(Number(form.balance)) || (form.lastFour && !/^\d{4}$/.test(form.lastFour))) { setError("Enter a name, institution, valid balance and four digits if supplied."); return; }
    onSave({ ...form, name: form.name.trim(), institution: form.institution.trim(), balance: Number(form.balance) });
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
<form className="modal account-modal" onSubmit={submit}>
<div className="modal-head">
<div>
<span className="eyebrow">Account settings</span>
<h2>Edit {account.name}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>
<div className="account-form">
<div className="modal-grid">
<label>
<span>Account name</span>
<input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}/>
</label>
<label>
<span>Institution</span>
<input value={form.institution} onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))}/>
</label>
</div>
<div className="modal-grid">
<label>
<span>Currency</span>
<select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}>
<option>CHF</option>
<option>EUR</option>
<option>USD</option>
</select>
</label>
<label>
<span>Balance</span>
<input type="number" step="0.01" value={form.balance} onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))}/>
</label>
</div>
<label>
<span>Last four digits <em>Optional</em>
</span>
<input inputMode="numeric" maxLength={4} value={form.lastFour || ""} onChange={(event) => setForm((current) => ({ ...current, lastFour: event.target.value.replace(/\D/g, "") }))}/>
</label>
<Toggle label="Include in net worth" description="Controls whether this balance appears in the financial overview." value={form.includeInNetWorth !== false} setValue={(value) => setForm((current) => ({ ...current, includeInNetWorth: value }))}/>
<FieldError>{error}</FieldError>
</div>
<div className="modal-actions split-actions">
<button type="button" className="danger-button" onClick={() => onDelete(account.id)}>
<Trash size={16}/>Delete</button>
<div>
<button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
<button type="submit" className="primary-button">Save changes</button>
</div>
</div>
</form>
</div>;
}

function CategoryEditorModal({ category, categories, budgets, transactions, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ name: category?.name || "", group: category?.group || "flexible" });
  const [replacementId, setReplacementId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const used = Boolean(category && (budgets.some((budget) => budget.category === category.name || budget.transactionCategory === category.name) || transactions.some((transaction) => transaction.category === category.name)));
  const replacements = categories.filter((item) => item.id !== category?.id);
  const submit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) { setError("Enter a category name."); return; }
    if (categories.some((item) => item.id !== category?.id && item.name.toLowerCase() === name.toLowerCase())) { setError("A category with this name already exists."); return; }
    onSave({ id: category?.id || crypto.randomUUID(), name, group: form.group }, category);
  };
  const remove = () => {
    if (used && !replacementId) { setError("Choose where existing budgets and transactions should move."); return; }
    onDelete(category, replacements.find((item) => item.id === replacementId));
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
<form className="modal" onSubmit={submit}>
<div className="modal-head">
<div>
<span className="eyebrow">Budget categories</span>
<h2>{deleting ? `Delete ${category.name}?` : category ? "Edit category" : "Create category"}</h2>
</div>
<IconButton label="Close" onClick={onClose}>
<X size={19}/>
</IconButton>
</div>{deleting ? <div className="account-form">
<div className="delete-message">
<span>
<Trash size={23}/>
</span>
<p>{used ? "This category is already used. Reassign its budgets and transactions before deleting it." : "This unused category can be deleted safely."}</p>
</div>{used ? <label>
<span>Reassign existing items to</span>
<select value={replacementId} onChange={(event) => { setReplacementId(event.target.value); setError(""); }}>
<option value="">Choose a replacement</option>{replacements.map((item) => <option key={item.id} value={item.id}>{item.name} · {SETTINGS_GROUPS[item.group]}</option>)}</select>
</label> : null}<FieldError>{error}</FieldError>
</div> : <div className="account-form">
<label>
<span>Category name</span>
<input autoFocus value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setError(""); }} placeholder="e.g. Childcare"/>
</label>
<label>
<span>Group</span>
<select value={form.group} onChange={(event) => setForm((current) => ({ ...current, group: event.target.value }))}>{Object.entries(SETTINGS_GROUPS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
</label>
<FieldError>{error}</FieldError>
</div>}<div className="modal-actions split-actions">{category && !deleting ? <button type="button" className="danger-button" onClick={() => setDeleting(true)}>
<Trash size={16}/>Delete</button> : <span/>}<div>
<button type="button" className="secondary-button" onClick={deleting ? () => setDeleting(false) : onClose}>{deleting ? "Back" : "Cancel"}</button>
<button type={deleting ? "button" : "submit"} className={deleting ? "danger-button filled" : "primary-button"} onClick={deleting ? remove : undefined}>{deleting ? "Delete category" : category ? "Save changes" : "Create category"}</button>
</div>
</div>
</form>
</div>;
}

function SettingsPage({ settings, setSettings, accounts, setAccounts, transactions, setTransactions, budgets, setBudgets, categories, setCategories, onDeleteAccount, onDeleteProfile, onChangePassword, exportData }) {
  const sections = ["Profile", "Preferences", "Notifications", "Accounts", "Budget categories", "Security", "Subscription", "Data & privacy"];
  const [section, setSection] = useState("Profile");
  const [draft, setDraft] = useState(settings);
  const [notice, setNotice] = useState("");
  const [profileErrors, setProfileErrors] = useState({});
  const [photoState, setPhotoState] = useState({ loading: false, message: "", error: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [accountEditor, setAccountEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(null);
  const [sessions, setSessions] = useState([{ id: 1, device: "Safari on MacBook Pro", place: "Zürich, Switzerland", current: true }, { id: 2, device: "Kalsoon on iPhone", place: "Zürich, Switzerland", current: false }]);
  useEffect(() => { setDraft(settings); }, [settings]);
  const updateDraft = (group, field, value) => {
    setDraft((current) => ({ ...current, [group]: { ...current[group], [field]: value } }));
    if (group === "profile") setProfileErrors((current) => ({ ...current, [field]: "" }));
  };
  const saveSettings = () => {
    let next = draft;
    if (section === "Profile") {
      const errors = {};
      if (!draft.profile.firstName.trim()) errors.firstName = "Enter your first name.";
      if (!draft.profile.lastName.trim()) errors.lastName = "Enter your last name.";
      if (!/^\S+@\S+\.\S+$/.test(draft.profile.email.trim())) errors.email = "Enter a valid email address.";
      if (Object.keys(errors).length) { setProfileErrors(errors); return; }
      next = { ...draft, profile: { ...draft.profile, firstName: draft.profile.firstName.trim(), lastName: draft.profile.lastName.trim(), email: draft.profile.email.trim() } };
      setDraft(next);
    }
    setSettings(next); setNotice(`${section} settings saved.`);
  };
  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setPhotoState({ loading: true, message: "", error: "" });
    try {
      const photo = await prepareProfilePhoto(file);
      updateDraft("profile", "photo", photo);
      setPhotoState({ loading: false, message: "Photo ready to save.", error: "" });
    } catch (error) { setPhotoState({ loading: false, message: "", error: error.message }); }
  };
  const changePassword = async (password) => {
    await onChangePassword(password);
    const next = { ...draft, security: { ...draft.security, passwordUpdated: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date()) } };
    setDraft(next); setSettings(next); setPasswordOpen(false); setNotice("Password updated securely.");
  };
  const orderedAccounts = useMemo(() => [...accounts].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)), [accounts]);
  const moveAccount = (id, direction) => setAccounts((current) => { const list = [...current].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)); const index = list.findIndex((item) => item.id === id); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return current; [list[index], list[nextIndex]] = [list[nextIndex], list[index]]; return list.map((item, order) => ({ ...item, order })); });
  const saveAccount = (account) => { setAccounts((current) => current.map((item) => item.id === account.id ? account : item)); setAccountEditor(null); setNotice(`${account.name} was updated everywhere.`); };
  const createAccount = (account) => { setAccounts((current) => [...current, { ...account, includeInNetWorth: true, archived: false, order: current.length }]); setConnectOpen(false); setNotice(`${account.name} was added to Accounts.`); };
  const saveCategory = (next, previous) => {
    setCategories((current) => previous ? current.map((item) => item.id === previous.id ? next : item) : [...current, next]);
    if (previous) {
      setTransactions((current) => current.map((transaction) => transaction.category === previous.name ? { ...transaction, category: next.name } : transaction));
      setBudgets((current) => current.flatMap((budget) => budget.category === previous.name || budget.transactionCategory === previous.name ? (next.group === "income" ? [] : [{ ...budget, category: next.name, transactionCategory: next.name, group: next.group }]) : [budget]));
    }
    setCategoryEditor(null); setNotice(`${next.name} was ${previous ? "updated" : "created"}.`);
  };
  const deleteCategory = (category, replacement) => {
    setCategories((current) => current.filter((item) => item.id !== category.id));
    if (replacement) {
      setTransactions((current) => current.map((transaction) => transaction.category === category.name ? { ...transaction, category: replacement.name } : transaction));
      setBudgets((current) => current.map((budget) => budget.category === category.name || budget.transactionCategory === category.name ? { ...budget, category: replacement.name, transactionCategory: replacement.name, group: replacement.group === "income" ? budget.group : replacement.group } : budget));
    }
    setCategoryEditor(null); setNotice(`${category.name} was deleted${replacement ? ` and reassigned to ${replacement.name}` : ""}.`);
  };
  const moveCategory = (id, direction) => setCategories((current) => { const item = current.find((category) => category.id === id); const groupItems = current.filter((category) => category.group === item.group); const index = groupItems.findIndex((category) => category.id === id); const target = groupItems[index + direction]; if (!target) return current; const a = current.findIndex((category) => category.id === id); const b = current.findIndex((category) => category.id === target.id); const next = [...current]; [next[a], next[b]] = [next[b], next[a]]; return next; });

  return <>{notice ? <div className="account-notice" role="status">
<CheckCircle size={18} weight="fill"/>
<span>{notice}</span>
<IconButton label="Dismiss" onClick={() => setNotice("")}>
<X size={15}/>
</IconButton>
</div> : null}<div className="settings-layout">
<aside className="settings-menu">{sections.map((name) => <button key={name} className={section === name ? "active" : ""} onClick={() => setSection(name)}>{name}</button>)}</aside>
<Card className="settings-card">
    {section === "Profile" ? <>
<SectionHead title="Profile" subtitle="Your personal details"/>
<div className="profile-editor">
<img src={draft.profile.photo} alt={`${draft.profile.firstName} ${draft.profile.lastName}`}/>
<div>
<strong>{draft.profile.firstName} {draft.profile.lastName}</strong>
<span>{draft.profile.email}</span>
<label className="photo-upload">
{photoState.loading ? <CircleNotch className="spin" size={14}/> : <UploadSimple size={14}/>} {photoState.loading ? "Preparing photo…" : "Change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto}/>
</label>
{photoState.message ? <small className="photo-feedback success">{photoState.message}</small> : null}
{photoState.error ? <small className="photo-feedback error" role="alert">{photoState.error}</small> : null}
</div>
</div>
<div className="form-grid">
<label>
<span>First name</span>
<input value={draft.profile.firstName} onChange={(event) => updateDraft("profile", "firstName", event.target.value)}/>
<FieldError>{profileErrors.firstName}</FieldError>
</label>
<label>
<span>Last name</span>
<input value={draft.profile.lastName} onChange={(event) => updateDraft("profile", "lastName", event.target.value)}/>
<FieldError>{profileErrors.lastName}</FieldError>
</label>
<label className="full-field">
<span>Email</span>
<input type="email" value={draft.profile.email} onChange={(event) => updateDraft("profile", "email", event.target.value)}/>
<FieldError>{profileErrors.email}</FieldError>
</label>
</div>
<SettingsActions onCancel={() => setDraft(settings)} onSave={saveSettings}/>
</> : null}
    {section === "Preferences" ? <>
<SectionHead title="Preferences" subtitle="Formats used across Kalsoon"/>
<div className="form-grid settings-form-top">
<label>
<span>Currency</span>
<select value={draft.preferences.currency} onChange={(event) => updateDraft("preferences", "currency", event.target.value)}>
<option value="CHF">CHF — Swiss franc</option>
<option value="EUR">EUR — Euro</option>
<option value="USD">USD — US dollar</option>
</select>
</label>
<label>
<span>Language</span>
<select value={draft.preferences.language} onChange={(event) => updateDraft("preferences", "language", event.target.value)}>
<option>English</option>
<option>Deutsch</option>
<option>Français</option>
<option>Italiano</option>
</select>
</label>
<label>
<span>Date format</span>
<select value={draft.preferences.dateFormat} onChange={(event) => updateDraft("preferences", "dateFormat", event.target.value)}>
<option>DD.MM.YYYY</option>
<option>DD/MM/YYYY</option>
<option>YYYY-MM-DD</option>
</select>
</label>
<label>
<span>First day of the week</span>
<select value={draft.preferences.firstDay} onChange={(event) => updateDraft("preferences", "firstDay", event.target.value)}>
<option>Monday</option>
<option>Sunday</option>
</select>
</label>
</div>
<SettingsActions onCancel={() => setDraft(settings)} onSave={saveSettings}/>
</> : null}
    {section === "Notifications" ? <>
<SectionHead title="Notifications" subtitle="Choose which money moments need your attention"/>
<div className="settings-form-top">
<Toggle label="Weekly check-in" description="A calm Sunday summary of your money." value={draft.notifications.weekly} setValue={(value) => updateDraft("notifications", "weekly", value)}/>
<Toggle label="Budget warnings" description="Alert me when a category reaches 80% and 100%." value={draft.notifications.budget} setValue={(value) => updateDraft("notifications", "budget", value)}/>
<Toggle label="Bill reminders" description="Remind me before fixed bills are due." value={draft.notifications.bills} setValue={(value) => updateDraft("notifications", "bills", value)}/>
<Toggle label="Goal updates" description="Celebrate contributions and important milestones." value={draft.notifications.goals} setValue={(value) => updateDraft("notifications", "goals", value)}/>
</div>
<SettingsActions onCancel={() => setDraft(settings)} onSave={saveSettings}/>
</> : null}
    {section === "Accounts" ? <>
<SectionHead title="Accounts" subtitle="Manage the accounts shown in your financial overview" action={<button className="primary-button" onClick={() => setConnectOpen(true)}>
<Plus size={15}/>Add account</button>}/>
<div className="settings-account-list settings-form-top">{orderedAccounts.length ? orderedAccounts.map((account, index) => <div key={account.id} className={account.archived ? "archived" : ""}>
<span className="settings-account-icon">
<Wallet size={18}/>
</span>
<div>
<strong>{account.name}</strong>
<small>{account.institution} · <b className={moneyTone(account.balance)}>{formatSignedMoney(account.balance, account.currency)}</b>{account.archived ? " · Archived" : ""}</small>
</div>
<label className="compact-toggle">
<input type="checkbox" checked={account.includeInNetWorth !== false} onChange={(event) => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, includeInNetWorth: event.target.checked } : item))}/>
<span>Net worth</span>
</label>
<div className="reorder-buttons">
<IconButton label="Move up" onClick={() => moveAccount(account.id, -1)}>
<ArrowUp size={14}/>
</IconButton>
<IconButton label="Move down" onClick={() => moveAccount(account.id, 1)}>
<ArrowDown size={14}/>
</IconButton>
</div>
<button className="secondary-button" onClick={() => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, archived: !item.archived } : item))}>
<Archive size={14}/>{account.archived ? "Restore" : "Archive"}</button>
<IconButton label={`Edit ${account.name}`} onClick={() => setAccountEditor(account)}>
<PencilSimple size={15}/>
</IconButton>
</div>) : <div className="settings-empty">
<Wallet size={25}/>
<strong>No accounts yet</strong>
<span>Add an account to start your financial overview.</span>
</div>}</div>
</> : null}
    {section === "Budget categories" ? <>
<SectionHead title="Budget categories" subtitle="A two-level structure shared by Budget and Transactions" action={<button className="primary-button" onClick={() => setCategoryEditor({})}>
<Plus size={15}/>New category</button>}/>
<div className="category-groups settings-form-top">{Object.entries(SETTINGS_GROUPS).map(([group, label]) => <section key={group}>
<div className="category-group-head">
<strong>{label}</strong>
<span>{categories.filter((category) => category.group === group).length} categories</span>
</div>{categories.filter((category) => category.group === group).map((category) => <div className="category-setting-row" key={category.id}>
<span>{category.name.slice(0, 1).toUpperCase()}</span>
<strong>{category.name}</strong>
<div className="reorder-buttons">
<IconButton label="Move up" onClick={() => moveCategory(category.id, -1)}>
<ArrowUp size={14}/>
</IconButton>
<IconButton label="Move down" onClick={() => moveCategory(category.id, 1)}>
<ArrowDown size={14}/>
</IconButton>
</div>
<IconButton label={`Edit ${category.name}`} onClick={() => setCategoryEditor(category)}>
<PencilSimple size={15}/>
</IconButton>
</div>)}</section>)}</div>
</> : null}
    {section === "Security" ? <>
<SectionHead title="Security" subtitle="Protect your Kalsoon account"/>
<div className="security-list settings-form-top">
<div>
<span>
<strong>Password</strong>
<small>Last updated {draft.security.passwordUpdated}</small>
</span>
<button className="secondary-button" onClick={() => setPasswordOpen(true)}>Change password</button>
</div>
<Toggle label="Two-factor authentication" description="Require a verification code when signing in." value={draft.security.twoFactor} setValue={(value) => updateDraft("security", "twoFactor", value)}/>
</div>
<hr/>
<h3>Active sessions</h3>
<div className="session-list">{sessions.map((session) => <div key={session.id}>
<span>
<strong>{session.device}{session.current ? " · This device" : ""}</strong>
<small>{session.place}</small>
</span>{session.current ? <em>Active now</em> : <button className="secondary-button" onClick={() => setSessions((current) => current.filter((item) => item.id !== session.id))}>Sign out</button>}</div>)}</div>
<SettingsActions onCancel={() => setDraft(settings)} onSave={saveSettings}/>
</> : null}
    {section === "Subscription" ? <>
<SectionHead title="Subscription" subtitle="Plan and billing information"/>
<div className="plan-card settings-form-top">
<span className="eyebrow">Current plan</span>
<div>
<strong>{draft.subscription.plan}</strong>
<b>{draft.subscription.price}</b>
</div>
<p>Unlimited accounts, budgets, goals and debt simulations.</p>
</div>
<div className="detail-list">
<div>
<span>Next renewal</span>
<strong>{draft.subscription.renewal}</strong>
</div>
<div>
<span>Payment method</span>
<strong>{draft.subscription.card}</strong>
</div>
</div>
<div className="form-actions">
<button className="secondary-button" onClick={() => setNotice("Billing portal opened in prototype mode.")}>Manage billing</button>
<button className="primary-button" onClick={() => setNotice("You already have the best prototype plan.")}>Change plan</button>
</div>
</> : null}
    {section === "Data & privacy" ? <>
<SectionHead title="Data & privacy" subtitle="Manage your connected Kalsoon data"/>
<div className="privacy-block settings-form-top">
<DownloadSimple size={23}/>
<div>
<strong>Export your data</strong>
<p>Download accounts, transactions, budgets, debts, goals, categories and settings as JSON.</p>
</div>
<button className="secondary-button" onClick={exportData}>
<DownloadSimple size={15}/>Export data</button>
</div>
<div className="privacy-block danger-zone">
<Trash size={23}/>
<div>
<strong>Delete Kalsoon account</strong>
<p>Delete your Kalsoon financial data. This cannot be undone.</p>
</div>
<button className="danger-button" onClick={onDeleteProfile}>Delete account</button>
</div>
</> : null}
  </Card>
</div>{connectOpen ? <ConnectAccountModal onClose={() => setConnectOpen(false)} onCreate={createAccount} onView={() => setConnectOpen(false)}/> : null}{accountEditor ? <SettingsAccountModal account={accountEditor} onClose={() => setAccountEditor(null)} onSave={saveAccount} onDelete={(id) => { onDeleteAccount(id); setAccountEditor(null); setNotice("Account and its linked data were deleted."); }}/>: null}{categoryEditor ? <CategoryEditorModal category={categoryEditor.id ? categoryEditor : null} categories={categories} budgets={budgets} transactions={transactions} onClose={() => setCategoryEditor(null)} onSave={saveCategory} onDelete={deleteCategory}/> : null}{passwordOpen ? <PasswordModal onClose={() => setPasswordOpen(false)} onSave={changePassword}/> : null}</>;
}

function PasswordModal({ onClose, onSave }) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (form.password.length < 8) { setError("Use at least 8 characters."); return; }
    if (form.password !== form.confirm) { setError("The passwords do not match."); return; }
    setSaving(true);
    try { await onSave(form.password); } catch (saveError) { setError(saveError.message || "Password could not be updated."); setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="modal password-modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">Security</span><h2>Change password</h2></div><IconButton label="Close" onClick={onClose}><X size={17}/></IconButton></div>
    <p className="modal-description">Choose a new password for your Kalsoon sign-in.</p>
    <label><span>New password</span><input autoFocus type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}/></label>
    <label><span>Confirm password</span><input type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}/></label>
    {error ? <div className="auth-message error" role="alert">{error}</div> : null}
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? <><CircleNotch className="spin" size={16}/>Updating…</> : "Update password"}</button></div>
  </form></div>;
}

function SettingsActions({ onCancel, onSave }) { return <div className="form-actions">
<button className="secondary-button" onClick={onCancel}>Cancel</button>
<button className="primary-button" onClick={onSave}>
<Check size={16}/>Save changes</button>
</div>; }
function Toggle({label,description,value,setValue}){return <div className="toggle-row">
<div>
<strong>{label}</strong>
<span>{description}</span>
</div>
<button type="button" className={`toggle ${value?"on":""}`} onClick={()=>setValue(!value)} aria-pressed={value}>
<span/>
</button>
</div>}

function TransactionModal({ accounts, transaction, categories, onClose, onSave, onViewTransactions }) {
  const initialType = transaction?.type || "expense";
  const categoriesForType = (type) => type === "transfer" ? ["Transfer"] : type === "income" ? categories.filter((category) => category.group === "income").map((category) => category.name) : categories.filter((category) => category.group === "fixed" || category.group === "flexible").map((category) => category.name);
  const firstAccount = accounts[0]?.id || "";
  const secondAccount = accounts.find((account) => account.id !== firstAccount)?.id || "";
  const [form, setForm] = useState({ type: initialType, accountId: transaction?.accountId || firstAccount, fromAccountId: transaction?.fromAccountId || firstAccount, toAccountId: transaction?.toAccountId || secondAccount, amount: transaction ? String(transaction.amount) : "", merchant: transaction?.merchant || "", category: transaction?.category || categoriesForType(initialType)[0] || "Other", dateValue: transaction?.dateValue || "2026-07-14", timeValue: transaction?.timeValue || "12:00", status: transaction?.status || "Cleared", notes: transaction?.notes || "", recurring: transaction?.recurring || false, frequency: transaction?.frequency || "Monthly" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const isEditing = Boolean(transaction);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); };
  const setType = (type) => { setForm((current) => ({ ...current, type, category: categoriesForType(type)[0] || "Other", status: current.status === "Received" ? "Cleared" : current.status })); setErrors({}); };
  const validate = () => {
    const nextErrors = {};
    if (!form.merchant.trim()) nextErrors.merchant = "Enter a merchant or title.";
    if (!form.amount || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) nextErrors.amount = "Enter an amount greater than zero.";
    if (!form.dateValue) nextErrors.dateValue = "Choose a date.";
    if (!form.timeValue) nextErrors.timeValue = "Choose a time.";
    if (form.type === "transfer") {
      if (!form.fromAccountId) nextErrors.fromAccountId = "Choose the source account.";
      if (!form.toAccountId) nextErrors.toAccountId = "Choose the destination account.";
      if (form.fromAccountId && form.fromAccountId === form.toAccountId) nextErrors.toAccountId = "Choose a different destination account.";
    } else if (!form.accountId) nextErrors.accountId = "Choose an account.";
    setErrors(nextErrors);
    return !Object.keys(nextErrors).length;
  };
  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    window.setTimeout(() => {
      const sourceId = form.type === "transfer" ? form.fromAccountId : form.accountId;
      const account = accounts.find((item) => item.id === sourceId);
      const nextTransaction = { ...form, id: transaction?.id || crypto.randomUUID(), merchant: form.merchant.trim(), amount: Math.abs(Number(form.amount)), category: form.type === "transfer" ? "Transfer" : form.category, currency: account?.currency || "CHF", icon: form.type === "transfer" ? "↔" : form.merchant.trim()[0].toUpperCase(), tone: form.type === "income" ? "green" : form.type === "transfer" ? "blue" : "red" };
      onSave(nextTransaction, transaction);
      setSaved(nextTransaction);
      setSaving(false);
    }, 650);
  };
  const close = () => { if (!saving) onClose(); };
  const accountLabel = (account) => `${account.name}${account.lastFour ? ` •••• ${account.lastFour}` : ""} — ${formatSignedMoney(account.balance, account.currency)}`;

  if (saved) { const signedAmount = saved.type === "income" ? saved.amount : saved.type === "expense" ? -saved.amount : null; return <div className="modal-backdrop">
<div className="modal transaction-modal success-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-success-title">
<span className="success-icon">
<CheckCircle size={34} weight="fill"/>
</span>
<span className="eyebrow">{isEditing ? "Transaction updated" : "Transaction saved"}</span>
<h2 id="transaction-success-title">{saved.merchant}</h2>
<p>{saved.type === "transfer" ? "The money moved between accounts without changing income or spending." : `The ${saved.type} is now reflected in the transaction list and account balance.`}</p>
<div className="success-balance">
<span>{saved.type === "transfer" ? "Amount moved" : saved.type}</span>
<strong className={signedAmount === null ? "money-neutral" : moneyTone(signedAmount)}>{signedAmount === null ? formatMoney(saved.amount, saved.currency) : formatSignedMoney(signedAmount, saved.currency)}</strong>
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={onClose}>Done</button>
<button type="button" className="primary-button" onClick={onViewTransactions}>View transactions</button>
</div>
</div>
</div>; }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
<form className="modal transaction-modal" onSubmit={submit} aria-labelledby="transaction-modal-title">
    <div className="modal-head">
<div>
<span className="eyebrow">{isEditing ? "Edit entry" : "New entry"}</span>
<h2 id="transaction-modal-title">{isEditing ? "Edit transaction" : "Add transaction"}</h2>
</div>
<IconButton label="Close" onClick={close}>
<X size={19}/>
</IconButton>
</div>
    {!accounts.length ? <div className="transaction-no-accounts">
<Wallet size={27}/>
<h3>Connect an account first</h3>
<p>Transactions need an account before they can update a balance.</p>
</div> : <>
      <div className="transaction-type-tabs">{TRANSACTION_TYPES.map(({ id, label, description, icon: Icon }) => <button type="button" key={id} className={form.type === id ? "active" : ""} onClick={() => setType(id)}>
<Icon size={18}/>
<span>
<strong>{label}</strong>
<small>{description}</small>
</span>
</button>)}</div>
      <div className="transaction-form">
        {form.type === "transfer" ? <div className="modal-grid">
<label>
<span>From account</span>
<select value={form.fromAccountId} onChange={(event) => update("fromAccountId", event.target.value)}>
<option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select>
<FieldError>{errors.fromAccountId}</FieldError>
</label>
<label>
<span>To account</span>
<select value={form.toAccountId} onChange={(event) => update("toAccountId", event.target.value)}>
<option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select>
<FieldError>{errors.toAccountId}</FieldError>
</label>
</div> : <label>
<span>Account</span>
<select value={form.accountId} onChange={(event) => update("accountId", event.target.value)}>
<option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select>
<FieldError>{errors.accountId}</FieldError>
</label>}
        <div className="modal-grid">
<label>
<span>Amount</span>
<div className="amount-input">
<b>{accounts.find((item) => item.id === (form.type === "transfer" ? form.fromAccountId : form.accountId))?.currency || "CHF"}</b>
<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0.00"/>
</div>
<FieldError>{errors.amount}</FieldError>
</label>
<label>
<span>Merchant or title</span>
<input autoFocus value={form.merchant} onChange={(event) => update("merchant", event.target.value)} placeholder={form.type === "transfer" ? "e.g. Move to savings" : "e.g. Coop"}/>
<FieldError>{errors.merchant}</FieldError>
</label>
</div>
        <div className="modal-grid">
<label>
<span>Category</span>
<select value={form.category} disabled={form.type === "transfer"} onChange={(event) => update("category", event.target.value)}>{categoriesForType(form.type).map((category) => <option key={category}>{category}</option>)}</select>
</label>
<label>
<span>Status</span>
<select value={form.status} onChange={(event) => update("status", event.target.value)}>{TRANSACTION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
</label>
</div>
        <div className="modal-grid">
<label>
<span>Date</span>
<input type="date" value={form.dateValue} onChange={(event) => update("dateValue", event.target.value)}/>
<FieldError>{errors.dateValue}</FieldError>
</label>
<label>
<span>Time</span>
<input type="time" value={form.timeValue} onChange={(event) => update("timeValue", event.target.value)}/>
<FieldError>{errors.timeValue}</FieldError>
</label>
</div>
        <label>
<span>Notes <em>Optional</em>
</span>
<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Add a short note…" rows={3}/>
</label>
        <div className="recurring-box">
<label>
<input type="checkbox" checked={form.recurring} onChange={(event) => update("recurring", event.target.checked)}/>
<span>
<strong>Recurring transaction</strong>
<small>Repeat this entry automatically.</small>
</span>
</label>{form.recurring ? <select aria-label="Recurring frequency" value={form.frequency} onChange={(event) => update("frequency", event.target.value)}>
<option>Weekly</option>
<option>Monthly</option>
<option>Yearly</option>
</select> : null}</div>
      </div>
    </>}
    <div className="modal-actions">
<button type="button" className="secondary-button" onClick={close}>Cancel</button>
<button type="submit" className="primary-button" disabled={saving || !accounts.length}>{saving ? <>
<CircleNotch className="spin" size={17}/>Saving…</> : isEditing ? "Save changes" : "Add transaction"}</button>
</div>
  </form>
</div>;
}

function KalsoonApp({ session }) {
  const [page,setPage]=useState("dashboard");
  const [sidebarExpanded,setSidebarExpanded]=useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const [transactionEditor,setTransactionEditor]=useState(null);
  const [transactions,setTransactions]=useState([]);
  const [accounts,setAccounts]=useState([]);
  const [budgets,setBudgets]=useState([]);
  const [customCategories,setCustomCategories]=useState(EMPTY_CUSTOM_CATEGORIES);
  const [debts,setDebts]=useState([]);
  const [goals,setGoals]=useState([]);
  const [categorySettings,setCategorySettings]=useState([]);
  const [settings,setSettings]=useState(() => settingsFromSession(session));
  const [query,setQuery]=useState("");
  const [transactionFilter,setTransactionFilter]=useState("All");
  const [selectedMonth,setSelectedMonth]=useState("2026-07");
  const [transactionNotice,setTransactionNotice]=useState("");
  const [dataLoading,setDataLoading]=useState(true);
  const [dataError,setDataError]=useState("");

  const handleDataError = (error) => {
    const message = String(error?.message || error || "");
    const isMissingSchema = /schema cache|could not find the table|PGRST205/i.test(message);
    setDataError(isMissingSchema ? "" : "We couldn't sync your latest changes. Please try again.");
  };

  const applyRemoteData = (data) => {
    setAccounts(data.accounts); setTransactions(data.transactions); setBudgets(data.budgets); setDebts(data.debts); setGoals(data.goals); setCategorySettings(data.categories);
    setSettings((current) => ({ ...current, ...data.settings, profile: { ...current.profile, ...data.settings.profile }, preferences: { ...current.preferences, ...data.settings.preferences }, notifications: { ...current.notifications, ...data.settings.notifications } }));
  };
  const refreshData = async () => { try { applyRemoteData(await loadFinancialData(session.user.id)); setDataError(""); return true; } catch (error) { handleDataError(error); return false; } };

  useEffect(() => {
    let active = true;
    const load = async () => { try { const data = await loadFinancialData(session.user.id); if (active) { applyRemoteData(data); setDataError(""); } } catch (error) { if (active) handleDataError(error); } finally { if (active) setDataLoading(false); } };
    load();
    const channel = supabase.channel(`kalsoon-${session.user.id}`).on("postgres_changes", { event: "*", schema: "public" }, () => { if (active) load(); }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session.user.id]);

  useEffect(() => { setCustomCategories(Object.fromEntries(["fixed", "flexible", "savings"].map((group) => [group, categorySettings.filter((category) => category.group === group && !BUDGET_CATEGORIES[group].includes(category.name)).map((category) => category.name)]))); }, [categorySettings]);

  const remoteSetter = (setter, syncer) => (updater) => setter((before) => {
    const after = typeof updater === "function" ? updater(before) : updater;
    queueMicrotask(async () => { try { await syncer(session.user.id, before, after); await refreshData(); } catch (error) { setter(before); handleDataError(error); } });
    return after;
  });
  const setAccountsRemote = remoteSetter(setAccounts, syncAccounts);
  const setTransactionsRemote = remoteSetter(setTransactions, syncTransactions);
  const setBudgetsRemote = remoteSetter(setBudgets, syncBudgets);
  const setDebtsRemote = remoteSetter(setDebts, syncDebts);
  const setGoalsRemote = remoteSetter(setGoals, syncGoals);
  const setCategoriesRemote = remoteSetter(setCategorySettings, syncCategories);
  const setSettingsRemote = (updater) => setSettings((before) => { const after = typeof updater === "function" ? updater(before) : updater; queueMicrotask(async () => { try { await saveRemoteSettings(session.user.id, after); await refreshData(); } catch (error) { setSettings(before); handleDataError(error); } }); return after; });

  const navigate=(id)=>{setPage(id);setMobileNav(false);window.scrollTo({top:0,behavior:"smooth"});};
  const saveTransaction = async (nextTransaction, originalTransaction) => {
    try { await saveRemoteTransaction(session.user.id, nextTransaction); await refreshData(); setTransactionNotice(`${nextTransaction.merchant} was ${originalTransaction ? "updated" : "added"}.`); }
    catch (error) { handleDataError(error); setTransactionNotice(""); }
  };
  const duplicateTransaction = async (transaction) => {
    const duplicate = { ...transaction, id: crypto.randomUUID(), dateValue: new Date().toISOString().slice(0,10), timeValue: "12:00", merchant: `${transaction.merchant} copy` };
    try { await saveRemoteTransaction(session.user.id, duplicate); await refreshData(); setTransactionNotice(`${transaction.merchant} was duplicated.`); } catch (error) { handleDataError(error); }
  };
  const deleteTransaction = async (id) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;
    try { await removeTransaction(id); await refreshData(); setTransactionNotice(`${transaction.merchant} was deleted.`); } catch (error) { handleDataError(error); }
  };
  const confirmDebtPayment = async (debt, amount, accountId, dateValue) => { try { await recordDebtPayment(debt.id, accountId, amount, dateValue); await refreshData(); setTransactionNotice(`${debt.creditor} payment was added.`); } catch (error) { handleDataError(error); } };
  const transferGoalMoney = async (goal, mode, amount, accountId) => { try { await recordGoalContribution(goal.id, accountId, amount, mode, new Date().toISOString().slice(0,10)); await refreshData(); setTransactionNotice(`${goal.name} transfer was added.`); } catch (error) { handleDataError(error); } };
  const deleteLinkedAccount = (id) => {
    setAccountsRemote((current) => current.filter((account) => account.id !== id));
  };
  const exportAllData = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), accounts, transactions, budgets, debts, goals, categories: categorySettings, settings }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "kalsoon-data-export.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const deleteProfile = async () => { if (!window.confirm("Delete all Kalsoon financial data? This cannot be undone.")) return; try { await deleteFinancialData(session.user.id); await supabase.auth.signOut(); } catch (error) { handleDataError(error); } };
  const changePassword = async (password) => { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; };

  if (dataLoading) return <div className="data-state-page"><CircleNotch className="spin" size={30}/><h2>Loading your financial workspace…</h2><p>Accounts, budgets and goals are being connected securely.</p></div>;
  const content={dashboard:<Dashboard transactions={transactions} accounts={accounts} budgets={budgets} debts={debts} goals={goals} onNavigate={navigate}/>,accounts:<Accounts accounts={accounts} setAccounts={setAccountsRemote}/>,transactions:<Transactions transactions={transactions} accounts={accounts} query={query} setQuery={setQuery} filter={transactionFilter} setFilter={setTransactionFilter} notice={transactionNotice} setNotice={setTransactionNotice} onAdd={()=>setTransactionEditor({mode:"create"})} onEdit={(transaction)=>setTransactionEditor({mode:"edit",transaction})} onDuplicate={duplicateTransaction} onDelete={deleteTransaction}/>,budget:<BudgetPage budgets={budgets} setBudgets={setBudgetsRemote} customCategories={customCategories} setCustomCategories={setCustomCategories} transactions={transactions}/>,debt:<DebtPage debts={debts} setDebts={setDebtsRemote} accounts={accounts} onConfirmedPayment={confirmDebtPayment}/>,goals:<GoalsPage goals={goals} setGoals={setGoalsRemote} transactions={transactions} accounts={accounts} onGoalTransfer={transferGoalMoney}/>,reports:<ReportsPage transactions={transactions}/>,settings:<SettingsPage settings={settings} setSettings={setSettingsRemote} accounts={accounts} setAccounts={setAccountsRemote} transactions={transactions} setTransactions={setTransactionsRemote} budgets={budgets} setBudgets={setBudgetsRemote} categories={categorySettings} setCategories={setCategoriesRemote} onDeleteAccount={deleteLinkedAccount} onDeleteProfile={deleteProfile} onChangePassword={changePassword} exportData={exportAllData}/>}[page];
  return <div className={`app-shell ${sidebarExpanded?"sidebar-open":""}`}>
    {dataError ? <div className="data-error-banner" role="alert"><span>{dataError}</span><button onClick={refreshData}>Retry</button><button aria-label="Dismiss data error" onClick={() => setDataError("")}><X size={15}/></button></div> : null}
    <div className={`mobile-overlay ${mobileNav?"show":""}`} onClick={()=>setMobileNav(false)}/>
    <div className={mobileNav?"mobile-sidebar show":"mobile-sidebar"}>
<Sidebar page={page} onNavigate={navigate} expanded setExpanded={()=>setMobileNav(false)} onSignOut={() => supabase.auth.signOut()}/>
</div>
    <Sidebar page={page} onNavigate={navigate} expanded={sidebarExpanded} setExpanded={setSidebarExpanded} onSignOut={() => supabase.auth.signOut()}/>
    <Topbar profile={settings.profile} page={page} transactionFilter={transactionFilter} onTransactionFilterChange={setTransactionFilter} onMenu={()=>setMobileNav(true)}/>
    <main className={`main-content ${page === "dashboard" ? "dashboard-content" : ""}`}>{page === "dashboard" ? null : <PageHeader page={page} showPeriod={page !== "settings"} month={selectedMonth} onMonthChange={setSelectedMonth}/>} {content}<footer>
<span>Kalsoon</span>
<p>Your data stays yours. Built with calm in Switzerland.</p>
</footer>
</main>
    {transactionEditor?<TransactionModal accounts={accounts} categories={categorySettings} transaction={transactionEditor.transaction} onClose={()=>setTransactionEditor(null)} onSave={saveTransaction} onViewTransactions={()=>{setTransactionEditor(null);navigate("transactions");}}/>:null}
  </div>;
}

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  if (path === "/") return <LandingPage/>;
  const initialMode = path === "/signup" ? "signup" : "signin";
  return <AuthGate initialMode={initialMode}>{(session) => <KalsoonApp session={session}/>}</AuthGate>;
}
