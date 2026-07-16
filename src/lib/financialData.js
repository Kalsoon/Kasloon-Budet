import { supabase } from "./supabase.js";

const required = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
};

const accountFromDb = (row) => ({ id: row.id, type: row.account_type, institution: row.institution, institutionLogo: row.institution_logo || "", name: row.name, currency: row.currency, balance: Number(row.balance), lastFour: row.last_four || "", balanceDate: row.balance_date || row.updated_at?.slice(0, 10), includeInAvailableCash: row.include_in_available_cash, includeInNetWorth: row.include_in_net_worth, includeTransactionsInBudgets: row.include_transactions_in_budgets, isPrimarySpending: row.is_primary_spending, createdVia: row.created_via || "manual", balanceConfirmed: row.balance_confirmed !== false, updatedAt: row.updated_at, archived: Boolean(row.archived_at), order: row.position });
const accountToDb = (row, userId) => ({ id: row.id, user_id: userId, account_type: row.type, institution: row.institution, institution_logo: row.institutionLogo || null, name: row.name, currency: row.currency, balance: Number(row.balance), last_four: row.lastFour || null, balance_date: row.balanceDate || new Date().toISOString().slice(0, 10), include_in_available_cash: row.includeInAvailableCash !== false, include_in_net_worth: row.includeInNetWorth !== false, include_transactions_in_budgets: row.includeTransactionsInBudgets !== false, is_primary_spending: Boolean(row.isPrimarySpending), created_via: row.createdVia || "manual", balance_confirmed: row.balanceConfirmed !== false, archived_at: row.archived ? new Date().toISOString() : null, position: row.order ?? 0 });
const categoryFromDb = (row) => ({ id: row.id, name: row.name, group: row.group_key, order: row.position, archived: Boolean(row.archived_at), _parentId: row.parent_id });
const transactionFromDb = (row, contributionMap) => ({ id: row.id, type: row.transaction_type, flowKind: row.flow_kind, merchant: row.merchant, category: row.budget_categories?.name || (row.transaction_type === "transfer" ? "Transfer" : "Other"), categoryId: row.category_id, dateValue: row.occurred_on, timeValue: row.occurred_at?.slice(0, 5) || "12:00", amount: Number(row.amount), status: row.status, accountId: row.account_id, fromAccountId: row.from_account_id, toAccountId: row.to_account_id, goalId: contributionMap.get(row.id), notes: row.notes || "", recurring: row.recurring, frequency: row.frequency || "Monthly", icon: row.transaction_type === "transfer" ? "↔" : row.merchant.slice(0, 1).toUpperCase(), tone: row.transaction_type === "income" ? "green" : row.transaction_type === "transfer" ? "blue" : "red", currency: row.currency, archived: Boolean(row.archived_at) });
const budgetFromDb = (row) => ({ id: row.id, group: row.budget_categories?.group_key || "flexible", category: row.budget_categories?.name || "Other", categoryId: row.category_id, transactionCategory: row.budget_categories?.name || "Other", planned: Number(row.planned_amount), frequency: row.frequency, dueDate: row.due_date || row.month, reminder: row.reminder_enabled, reminderDays: String(row.reminder_days), custom: false, month: row.month, archived: Boolean(row.archived_at) });
const debtFromDb = (row, payments) => {
  const paymentTotal = payments.filter((item) => item.debt_id === row.id).reduce((sum, item) => sum + Number(item.amount), 0);
  return { id: row.id, type: row.debt_type, creditor: row.creditor, balance: Number(row.current_balance), interestRate: Number(row.interest_rate), minimumPayment: Number(row.minimum_payment), dueDate: row.due_date, frequency: row.payment_frequency, originalBalance: Number(row.original_balance), paidAmount: paymentTotal, linkedAccountId: row.liability_account_id, customPosition: row.custom_position, archived: Boolean(row.archived_at) };
};
const goalFromDb = (row, history) => {
  const ledger = history.filter((item) => item.goal_id === row.id);
  const contributionTotal = ledger.reduce((sum, item) => sum + (item.contribution_type === "withdrawal" ? -Number(item.amount) : Number(item.amount)), 0);
  return { id: row.id, type: row.goal_type, name: row.name, targetAmount: Number(row.target_amount), baseAmount: Number(row.base_amount), contributionTotal, deadline: row.deadline, linkedAccountId: row.linked_account_id || "", monthlyContribution: Number(row.monthly_contribution), status: row.status, archived: Boolean(row.archived_at), history: ledger.map((item) => ({ id: item.id, transactionId: item.transaction_id, type: item.contribution_type === "withdrawal" ? "Withdrawal" : "Contribution", amount: Number(item.amount), date: item.contributed_on, source: "Supabase transfer" })) };
};

export async function loadFinancialData(userId) {
  const [profileResult, preferenceResult, notificationResult, accountsResult, categoriesResult, contributionsResult, transactionsResult, budgetsResult, debtsResult, debtPaymentsResult, goalsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).single(),
    supabase.from("notification_preferences").select("*").eq("user_id", userId).single(),
    supabase.from("accounts").select("*").eq("user_id", userId).order("position"),
    supabase.from("budget_categories").select("*").eq("user_id", userId).order("position"),
    supabase.from("goal_contributions").select("*").eq("user_id", userId).order("contributed_on", { ascending: false }),
    supabase.from("transactions").select("*, budget_categories(name)").eq("user_id", userId).order("occurred_on", { ascending: false }).order("occurred_at", { ascending: false }),
    supabase.from("monthly_budgets").select("*, budget_categories(name,group_key)").eq("user_id", userId).order("month", { ascending: false }),
    supabase.from("debts").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("debt_payments").select("*").eq("user_id", userId).order("paid_on", { ascending: false }),
    supabase.from("goals").select("*").eq("user_id", userId).order("created_at"),
  ]);
  const profile = required(profileResult, "Profile");
  const preferences = required(preferenceResult, "Preferences");
  const notifications = required(notificationResult, "Notifications");
  const contributionRows = required(contributionsResult, "Goal contributions");
  const debtPaymentRows = required(debtPaymentsResult, "Debt payments");
  const contributionMap = new Map(contributionRows.map((row) => [row.transaction_id, row.goal_id]));
  const goalRows = required(goalsResult, "Goals");
  return {
    accounts: required(accountsResult, "Accounts").map(accountFromDb),
    categories: required(categoriesResult, "Categories").filter((row) => row.kind === "category" && !row.archived_at).map(categoryFromDb),
    transactions: required(transactionsResult, "Transactions").filter((row) => !row.archived_at).map((row) => transactionFromDb(row, contributionMap)),
    budgets: required(budgetsResult, "Budgets").filter((row) => !row.archived_at).map(budgetFromDb),
    debts: required(debtsResult, "Debts").filter((row) => !row.archived_at).map((row) => debtFromDb(row, debtPaymentRows)),
    goals: goalRows.filter((row) => !row.archived_at).map((row) => goalFromDb(row, contributionRows)),
    settings: {
      profile: { firstName: profile.first_name, lastName: profile.last_name, email: profile.email, photo: profile.avatar_url || "/assets/lina-avatar.png" },
      preferences: { currency: preferences.currency, language: preferences.language, dateFormat: preferences.date_format, firstDay: preferences.first_day_of_week, selectedMonth: preferences.selected_month?.slice(0, 7) },
      notifications: { weekly: notifications.weekly_check_in, budget: notifications.budget_warnings, bills: notifications.bill_reminders, goals: notifications.goal_updates },
    },
  };
}

async function upsert(table, rows) {
  if (!rows.length) return;
  required(await supabase.from(table).upsert(rows), `Save ${table}`);
}

export async function syncAccounts(userId, before, after) {
  const afterIds = new Set(after.map((item) => item.id));
  await Promise.all(before.filter((item) => !afterIds.has(item.id)).map(async (item) => required(await supabase.rpc("delete_account", { p_account_id: item.id }), "Delete account")));
  const previous = new Map(before.map((item) => [item.id, item]));
  const changed = after.filter((item) => !previous.has(item.id) || JSON.stringify(previous.get(item.id)) !== JSON.stringify(item));
  await upsert("accounts", changed.map((item) => accountToDb(item, userId)));
}

export async function syncCategories(userId, before, after) {
  const groups = required(await supabase.from("budget_categories").select("id,group_key").eq("user_id", userId).eq("kind", "group"), "Category groups");
  const groupIds = Object.fromEntries(groups.map((group) => [group.group_key, group.id]));
  const afterIds = new Set(after.map((item) => item.id));
  const removed = before.filter((item) => !afterIds.has(item.id));
  if (removed.length) required(await supabase.from("budget_categories").update({ archived_at: new Date().toISOString() }).in("id", removed.map((item) => item.id)).eq("user_id", userId), "Archive categories");
  await upsert("budget_categories", after.map((item, index) => ({ id: item.id, user_id: userId, parent_id: groupIds[item.group], kind: "category", group_key: item.group, name: item.name, transaction_type: item.group === "income" ? "income" : item.group === "savings" ? "transfer" : "expense", position: item.order ?? index, archived_at: null })));
}

async function categoryIdsByName(userId) {
  const rows = required(await supabase.from("budget_categories").select("id,name").eq("user_id", userId).eq("kind", "category").is("archived_at", null), "Categories");
  return new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
}

const transactionToDb = (row, userId, categoryIds) => ({ id: row.id, user_id: userId, transaction_type: row.type, flow_kind: row.flowKind || (row.type === "transfer" ? "transfer" : "regular"), account_id: row.type === "transfer" ? null : row.accountId, from_account_id: row.type === "transfer" ? row.fromAccountId : null, to_account_id: row.type === "transfer" ? row.toAccountId : null, category_id: row.type === "transfer" ? null : (row.categoryId || categoryIds.get(row.category?.toLowerCase()) || null), merchant: row.merchant, amount: Number(row.amount), currency: row.currency || "CHF", occurred_on: row.dateValue, occurred_at: row.timeValue || "12:00", status: row.status, notes: row.notes || null, recurring: Boolean(row.recurring), frequency: row.frequency || null, archived_at: row.archived ? new Date().toISOString() : null });

export async function saveTransaction(userId, transaction) {
  const categoryIds = await categoryIdsByName(userId);
  required(await supabase.from("transactions").upsert(transactionToDb(transaction, userId, categoryIds)), "Save transaction");
}
export async function removeTransaction(id) { required(await supabase.rpc("delete_transaction", { p_transaction_id: id }), "Delete transaction"); }

export async function syncTransactions(userId, before, after) {
  const afterIds = new Set(after.map((item) => item.id));
  await Promise.all(before.filter((item) => !afterIds.has(item.id)).map((item) => removeTransaction(item.id)));
  const categoryIds = await categoryIdsByName(userId);
  await upsert("transactions", after.map((item) => transactionToDb(item, userId, categoryIds)));
}

export async function syncBudgets(userId, before, after) {
  const afterIds = new Set(after.map((item) => item.id));
  if (before.some((item) => !afterIds.has(item.id))) required(await supabase.from("monthly_budgets").delete().in("id", before.filter((item) => !afterIds.has(item.id)).map((item) => item.id)).eq("user_id", userId), "Delete budgets");
  let categoryIds = await categoryIdsByName(userId);
  const missing = after.filter((item) => !categoryIds.has(item.category.toLowerCase()));
  if (missing.length) {
    const groups = required(await supabase.from("budget_categories").select("id,group_key").eq("user_id", userId).eq("kind", "group"), "Category groups");
    const groupIds = Object.fromEntries(groups.map((group) => [group.group_key, group.id]));
    await upsert("budget_categories", missing.map((item, index) => ({ id: crypto.randomUUID(), user_id: userId, parent_id: groupIds[item.group], kind: "category", group_key: item.group, name: item.category, transaction_type: item.group === "savings" ? "transfer" : "expense", position: 100 + index })));
    categoryIds = await categoryIdsByName(userId);
  }
  await upsert("monthly_budgets", after.map((item) => ({ id: item.id, user_id: userId, category_id: item.categoryId || categoryIds.get(item.category.toLowerCase()), month: item.month ? `${item.month.slice(0, 7)}-01` : `${item.dueDate.slice(0, 7)}-01`, planned_amount: Number(item.planned), frequency: item.frequency, due_date: item.dueDate || null, reminder_enabled: Boolean(item.reminder), reminder_days: Number(item.reminderDays) || 0, archived_at: item.archived ? new Date().toISOString() : null })));
}

export async function syncDebts(userId, before, after) {
  const afterIds = new Set(after.map((item) => item.id));
  const removed = before.filter((item) => !afterIds.has(item.id));
  if (removed.length) required(await supabase.from("debts").update({ archived_at: new Date().toISOString() }).in("id", removed.map((item) => item.id)).eq("user_id", userId), "Archive debts");
  await upsert("debts", after.map((item) => ({ id: item.id, user_id: userId, liability_account_id: item.linkedAccountId || null, debt_type: item.type, creditor: item.creditor, current_balance: Number(item.balance), original_balance: Number(item.originalBalance), interest_rate: Number(item.interestRate), minimum_payment: Number(item.minimumPayment), due_date: item.dueDate, payment_frequency: item.frequency, custom_position: item.customPosition ?? null, archived_at: null })));
}

export async function syncGoals(userId, before, after) {
  const afterIds = new Set(after.map((item) => item.id));
  const removed = before.filter((item) => !afterIds.has(item.id));
  if (removed.length) required(await supabase.from("goals").update({ archived_at: new Date().toISOString() }).in("id", removed.map((item) => item.id)).eq("user_id", userId), "Archive goals");
  await upsert("goals", after.map((item) => ({ id: item.id, user_id: userId, linked_account_id: item.linkedAccountId || null, goal_type: item.type, name: item.name, target_amount: Number(item.targetAmount), base_amount: Number(item.baseAmount), deadline: item.deadline, monthly_contribution: Number(item.monthlyContribution), status: item.status, archived_at: null })));
}

export async function saveSettings(userId, settings) {
  try {
    await Promise.all([
      upsert("profiles", [{ id: userId, first_name: settings.profile.firstName, last_name: settings.profile.lastName, email: settings.profile.email, avatar_url: settings.profile.photo || null }]),
      upsert("user_preferences", [{ user_id: userId, currency: settings.preferences.currency, language: settings.preferences.language, date_format: settings.preferences.dateFormat, first_day_of_week: settings.preferences.firstDay, selected_month: `${settings.preferences.selectedMonth || new Date().toISOString().slice(0,7)}-01` }]),
      upsert("notification_preferences", [{ user_id: userId, weekly_check_in: settings.notifications.weekly, budget_warnings: settings.notifications.budget, bill_reminders: settings.notifications.bills, goal_updates: settings.notifications.goals }]),
    ]);
  } catch (error) {
    if (!/schema cache|could not find the table|PGRST205/i.test(String(error?.message || error))) throw error;
  }
}

export async function recordDebtPayment(debtId, accountId, amount, date, transactionId) {
  return required(await supabase.rpc("record_debt_payment", { p_debt_id: debtId, p_account_id: accountId, p_amount: amount, p_paid_on: date, p_transaction_id: transactionId }), "Record debt payment");
}
export async function recordGoalContribution(goalId, accountId, amount, mode, date, transactionId) {
  return required(await supabase.rpc("record_goal_contribution", { p_goal_id: goalId, p_counterparty_account_id: accountId, p_amount: amount, p_contribution_type: mode === "add" ? "contribution" : "withdrawal", p_contributed_on: date, p_transaction_id: transactionId }), "Record goal contribution");
}

export async function deleteFinancialData(userId) {
  for (const table of ["goal_contributions","debt_payments","transactions","monthly_budgets","goals","debts","accounts"]) {
    required(await supabase.from(table).delete().eq("user_id", userId), `Delete ${table}`);
  }
}
