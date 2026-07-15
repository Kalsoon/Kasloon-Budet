import { supabase } from "./supabase.js";

const unwrap = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

const monthStart = (month) => `${month.slice(0, 7)}-01`;

export async function loadOnboardingState(userId) {
  const preferences = unwrap(await supabase
    .from("user_preferences")
    .select("currency,language,date_format,first_day_of_week,selected_month,onboarding_completed,onboarding_step,onboarding_focus")
    .eq("user_id", userId)
    .single(), "Onboarding preferences");
  return {
    completed: preferences.onboarding_completed,
    step: preferences.onboarding_step,
    focus: preferences.onboarding_focus || [],
    preferences: {
      currency: preferences.currency,
      language: preferences.language,
      dateFormat: preferences.date_format,
      firstDay: preferences.first_day_of_week,
      selectedMonth: preferences.selected_month.slice(0, 7),
    },
  };
}

export async function saveOnboardingPreferences(userId, { step, focus, preferences }) {
  unwrap(await supabase.from("user_preferences").update({
    onboarding_step: step,
    onboarding_focus: focus,
    currency: preferences.currency,
    language: preferences.language,
    date_format: preferences.dateFormat,
    first_day_of_week: preferences.firstDay,
    selected_month: monthStart(preferences.selectedMonth),
  }).eq("user_id", userId), "Save onboarding progress");
}

async function firstMatchingId(table, query) {
  const rows = unwrap(await query.limit(1), `Find ${table}`);
  return rows?.[0]?.id;
}

export async function saveOnboardingAccount(userId, account) {
  const existingId = await firstMatchingId("account", supabase.from("accounts").select("id")
    .eq("user_id", userId).eq("institution", account.institution.trim()).eq("name", account.name.trim()).is("archived_at", null));
  unwrap(await supabase.from("accounts").upsert({
    id: existingId,
    user_id: userId,
    account_type: account.type,
    institution: account.institution.trim(),
    name: account.name.trim(),
    balance: Number(account.balance),
    currency: account.currency,
    include_in_net_worth: account.includeInNetWorth,
    position: 0,
    archived_at: null,
  }), "Save first account");
}

export async function saveOnboardingDebt(userId, debt) {
  const existingId = await firstMatchingId("debt", supabase.from("debts").select("id")
    .eq("user_id", userId).eq("creditor", debt.creditor.trim()).eq("debt_type", debt.type).is("archived_at", null));
  unwrap(await supabase.from("debts").upsert({
    id: existingId,
    user_id: userId,
    debt_type: debt.type,
    creditor: debt.creditor.trim(),
    current_balance: Number(debt.currentBalance),
    original_balance: Number(debt.originalBalance),
    interest_rate: Number(debt.interestRate),
    minimum_payment: Number(debt.minimumPayment),
    due_date: debt.dueDate,
    payment_frequency: "Monthly",
    archived_at: null,
  }), "Save debt");
}

export async function saveOnboardingGoal(userId, goal) {
  const existingId = await firstMatchingId("goal", supabase.from("goals").select("id")
    .eq("user_id", userId).eq("name", goal.name.trim()).is("archived_at", null));
  unwrap(await supabase.from("goals").upsert({
    id: existingId,
    user_id: userId,
    goal_type: goal.type,
    name: goal.name.trim(),
    target_amount: Number(goal.targetAmount),
    base_amount: Number(goal.baseAmount),
    deadline: goal.deadline,
    monthly_contribution: Number(goal.monthlyContribution),
    status: "Active",
    archived_at: null,
  }), "Save savings goal");
}

export async function loadOnboardingCategories(userId) {
  return unwrap(await supabase.from("budget_categories").select("id,name,group_key,transaction_type,position")
    .eq("user_id", userId).eq("kind", "category").is("archived_at", null).order("position"), "Load budget categories");
}

export async function saveOnboardingBudgets(userId, { month, budgets }) {
  if (!budgets.length) return;
  unwrap(await supabase.from("monthly_budgets").upsert(budgets.map((budget) => ({
    user_id: userId,
    category_id: budget.categoryId,
    month: monthStart(month),
    planned_amount: Number(budget.plannedAmount),
    frequency: "Monthly",
    due_date: monthStart(month),
    reminder_enabled: false,
    reminder_days: 3,
    archived_at: null,
  })), { onConflict: "user_id,category_id,month" }), "Save monthly budgets");
}

export async function completeOnboarding(userId) {
  unwrap(await supabase.from("user_preferences").update({ onboarding_completed: true, onboarding_step: 5 })
    .eq("user_id", userId), "Complete onboarding");
}
