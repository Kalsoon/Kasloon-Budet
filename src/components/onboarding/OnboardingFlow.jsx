import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleNotch, HandCoins, Target } from "@phosphor-icons/react";
import {
  completeOnboarding,
  loadOnboardingCategories,
  saveOnboardingAccount,
  saveOnboardingBudgets,
  saveOnboardingDebt,
  saveOnboardingGoal,
  saveOnboardingPreferences,
} from "../../lib/onboardingData.js";
import "./onboarding.css";
import { KalsoonLogo } from "../KalsoonLogo.jsx";
import { trackConversion } from "../../lib/conversionAnalytics.js";

const STEPS = ["Welcome", "Preferences", "First account", "Debt & goals", "First budget"];
const FOCUS_OPTIONS = ["Understand my spending", "Build a monthly budget", "Pay off debt", "Build an emergency fund", "Save toward a goal"];
const CATEGORY_GROUPS = [
  ["fixed", "Fixed bills"], ["flexible", "Flexible spending"], ["income", "Income"], ["savings", "Savings"],
];
const today = new Date().toISOString().slice(0, 10);
const defaultMonth = new Date().toISOString().slice(0, 7);
const emptyAccount = { institution: "", name: "", type: "bank", balance: "", currency: "CHF", includeInNetWorth: true };
const emptyDebt = { type: "Credit card", creditor: "", currentBalance: "", originalBalance: "", interestRate: "", minimumPayment: "", dueDate: "" };
const emptyGoal = { type: "Emergency fund", name: "", targetAmount: "", baseAmount: "", deadline: "", monthlyContribution: "" };
const money = (value, currency = "CHF") => `${currency} ${Math.round(Number(value || 0)).toLocaleString("en-CH").replace(/,/g, "’")}`;
const asNumber = (value) => Number(value || 0);

function Field({ label, children, hint }) { return <label className="onboarding-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>; }

function FocusStep({ focus, setFocus }) {
  const toggle = (option) => setFocus((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  return <><span className="onboarding-eyebrow">Step 1 · Your focus</span><h1>Let’s build your financial starting point.</h1><p>Choose what you would like Kalsoon to help you make clearer first. You can choose more than one.</p><div className="onboarding-choice-grid">{FOCUS_OPTIONS.map((option) => <button type="button" className={focus.includes(option) ? "focus-choice selected" : "focus-choice"} aria-pressed={focus.includes(option)} onClick={() => toggle(option)} key={option}><span>{focus.includes(option) ? <Check size={18}/> : null}</span>{option}</button>)}</div></>;
}

function PreferencesStep({ preferences, setPreferences }) {
  const set = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
  return <><span className="onboarding-eyebrow">Step 2 · Preferences</span><h1>Set up your everyday view.</h1><p>These settings shape how Kalsoon presents your money from the first day.</p><div className="onboarding-form-grid"><Field label="Currency"><select value={preferences.currency} onChange={(event) => set("currency", event.target.value)}><option>CHF</option><option>EUR</option><option>USD</option></select></Field><Field label="Language"><select value={preferences.language} onChange={(event) => set("language", event.target.value)}><option>English</option><option>Deutsch</option><option>Français</option><option>Italiano</option></select></Field><Field label="Date format"><select value={preferences.dateFormat} onChange={(event) => set("dateFormat", event.target.value)}><option>DD.MM.YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></Field><Field label="First day of week"><select value={preferences.firstDay} onChange={(event) => set("firstDay", event.target.value)}><option>Monday</option><option>Sunday</option></select></Field><Field label="Current budgeting month"><input type="month" value={preferences.selectedMonth} onChange={(event) => set("selectedMonth", event.target.value)} required/></Field></div></>;
}

function AccountStep({ account, setAccount }) {
  const set = (key, value) => setAccount((current) => ({ ...current, [key]: value }));
  return <><span className="onboarding-eyebrow">Step 3 · First account</span><h1>Bring your first account into view.</h1><p>Add an account to start with a clear net-worth picture. You can always add more later.</p><div className="onboarding-form-grid"><Field label="Institution"><input value={account.institution} onChange={(event) => set("institution", event.target.value)} placeholder="e.g. Zürcher Kantonalbank" required/></Field><Field label="Account name"><input value={account.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Everyday account" required/></Field><Field label="Account type"><select value={account.type} onChange={(event) => set("type", event.target.value)}><option value="bank">Bank</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="investment">Investment</option><option value="pillar">Pillar 3a</option></select></Field><Field label="Starting balance"><input type="number" min="0" step="0.01" value={account.balance} onChange={(event) => set("balance", event.target.value)} placeholder="0.00" required/></Field><Field label="Currency"><select value={account.currency} onChange={(event) => set("currency", event.target.value)}><option>CHF</option><option>EUR</option><option>USD</option></select></Field></div><label className="onboarding-check"><input type="checkbox" checked={account.includeInNetWorth} onChange={(event) => set("includeInNetWorth", event.target.checked)}/><span>Include this account in net worth</span></label></>;
}

function DebtGoalStep({ addDebt, setAddDebt, debt, setDebt, addGoal, setAddGoal, goal, setGoal }) {
  const setDebtField = (key, value) => setDebt((current) => ({ ...current, [key]: value }));
  const setGoalField = (key, value) => setGoal((current) => ({ ...current, [key]: value }));
  return <><span className="onboarding-eyebrow">Step 4 · Optional planning</span><h1>Plan for debt or what matters next.</h1><p>Both are optional. Add a starting point now or return once you are ready.</p><div className="onboarding-optional-stack"><section className={addDebt ? "onboarding-optional open" : "onboarding-optional"}><button type="button" className="optional-toggle" aria-expanded={addDebt} onClick={() => setAddDebt((current) => !current)}><span className="optional-icon"><HandCoins size={20}/></span><span><strong>Add a debt</strong><small>Understand a payoff path from the start.</small></span><span className="optional-state">{addDebt ? "Added" : "Optional"}</span></button>{addDebt ? <div className="onboarding-form-grid optional-fields"><Field label="Debt type"><select value={debt.type} onChange={(event) => setDebtField("type", event.target.value)}><option>Credit card</option><option>Personal loan</option><option>Car loan</option><option>Salary advance</option><option>Other</option></select></Field><Field label="Creditor"><input value={debt.creditor} onChange={(event) => setDebtField("creditor", event.target.value)} required/></Field><Field label="Current balance"><input type="number" min="0" value={debt.currentBalance} onChange={(event) => setDebtField("currentBalance", event.target.value)} required/></Field><Field label="Original balance"><input type="number" min="0" value={debt.originalBalance} onChange={(event) => setDebtField("originalBalance", event.target.value)} required/></Field><Field label="Interest rate (%)"><input type="number" min="0" step="0.01" value={debt.interestRate} onChange={(event) => setDebtField("interestRate", event.target.value)} required/></Field><Field label="Minimum payment"><input type="number" min="0" value={debt.minimumPayment} onChange={(event) => setDebtField("minimumPayment", event.target.value)} required/></Field><Field label="Due date"><input type="date" min={today} value={debt.dueDate} onChange={(event) => setDebtField("dueDate", event.target.value)} required/></Field></div> : null}</section><section className={addGoal ? "onboarding-optional open" : "onboarding-optional"}><button type="button" className="optional-toggle" aria-expanded={addGoal} onClick={() => setAddGoal((current) => !current)}><span className="optional-icon green"><Target size={20}/></span><span><strong>Add a savings goal</strong><small>Make the next important goal feel reachable.</small></span><span className="optional-state">{addGoal ? "Added" : "Optional"}</span></button>{addGoal ? <div className="onboarding-form-grid optional-fields"><Field label="Goal type"><select value={goal.type} onChange={(event) => setGoalField("type", event.target.value)}><option>Emergency fund</option><option>Holiday</option><option>Pillar 3a</option><option>New car</option><option>Home</option><option>Other</option></select></Field><Field label="Goal name"><input value={goal.name} onChange={(event) => setGoalField("name", event.target.value)} required/></Field><Field label="Target amount"><input type="number" min="0.01" value={goal.targetAmount} onChange={(event) => setGoalField("targetAmount", event.target.value)} required/></Field><Field label="Current amount"><input type="number" min="0" value={goal.baseAmount} onChange={(event) => setGoalField("baseAmount", event.target.value)} required/></Field><Field label="Deadline"><input type="date" min={today} value={goal.deadline} onChange={(event) => setGoalField("deadline", event.target.value)} required/></Field><Field label="Monthly contribution"><input type="number" min="0" value={goal.monthlyContribution} onChange={(event) => setGoalField("monthlyContribution", event.target.value)} required/></Field></div> : null}</section></div></>;
}

function BudgetStep({ categories, loading, selectedBudgets, setSelectedBudgets, preferences }) {
  const toggle = (category) => setSelectedBudgets((current) => current[category.id] === undefined ? { ...current, [category.id]: "" } : Object.fromEntries(Object.entries(current).filter(([id]) => id !== category.id)));
  const setAmount = (id, value) => setSelectedBudgets((current) => ({ ...current, [id]: value }));
  const totals = useMemo(() => categories.reduce((result, category) => {
    const amount = asNumber(selectedBudgets[category.id]);
    if (category.group_key === "income") result.income += amount;
    else if (category.group_key === "savings") result.savings += amount;
    else result.expenses += amount;
    return result;
  }, { income: 0, expenses: 0, savings: 0 }), [categories, selectedBudgets]);
  const remaining = totals.income - totals.expenses - totals.savings;
  return <><span className="onboarding-eyebrow">Step 5 · First monthly budget</span><h1>Give this month a simple plan.</h1><p>Pick only the categories you want to start with. You can add the rest once you have a rhythm.</p><div className="budget-onboarding-layout"><div className="onboarding-budget-groups">{loading ? <div className="onboarding-category-loading"><CircleNotch className="spin" size={18}/>Loading your categories…</div> : CATEGORY_GROUPS.map(([key, label]) => { const group = categories.filter((category) => category.group_key === key); return <section key={key}><h2>{label}</h2>{group.map((category) => { const selected = Object.hasOwn(selectedBudgets, category.id); return <div className="budget-category-choice" key={category.id}><label><input type="checkbox" checked={selected} onChange={() => toggle(category)}/><span>{category.name}</span></label>{selected ? <input aria-label={`${category.name} planned amount`} type="number" min="0" value={selectedBudgets[category.id]} onChange={(event) => setAmount(category.id, event.target.value)} placeholder="CHF 0"/> : null}</div>; })}</section>; })}</div><aside className="onboarding-summary"><span>Live monthly summary</span><div><b>Income</b><strong>{money(totals.income, preferences.currency)}</strong></div><div><b>Expenses</b><strong>{money(totals.expenses, preferences.currency)}</strong></div><div><b>Savings</b><strong>{money(totals.savings, preferences.currency)}</strong></div><footer><span>Remaining</span><strong className={remaining < 0 ? "negative" : "positive"}>{remaining < 0 ? "− " : ""}{money(Math.abs(remaining), preferences.currency)}</strong></footer></aside></div></>;
}

export function OnboardingFlow({ session, state, onComplete, onSaveExit }) {
  const [step, setStep] = useState(Math.min(5, Math.max(1, state.step || 1)));
  const [focus, setFocus] = useState(state.focus || []);
  const [preferences, setPreferences] = useState({ ...state.preferences, selectedMonth: state.preferences.selectedMonth || defaultMonth });
  const [account, setAccount] = useState({ ...emptyAccount, currency: state.preferences.currency || "CHF" });
  const [addDebt, setAddDebt] = useState(false); const [debt, setDebt] = useState(emptyDebt);
  const [addGoal, setAddGoal] = useState(false); const [goal, setGoal] = useState(emptyGoal);
  const [categories, setCategories] = useState([]); const [categoriesLoading, setCategoriesLoading] = useState(false); const [selectedBudgets, setSelectedBudgets] = useState({});
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");

  useEffect(() => { if (step !== 5) return undefined; let active = true; setCategoriesLoading(true); loadOnboardingCategories(session.user.id).then((rows) => { if (active) setCategories(rows); }).catch((reason) => { if (active) setError(reason.message); }).finally(() => { if (active) setCategoriesLoading(false); }); return () => { active = false; }; }, [session.user.id, step]);

  const saveStep = async (nextStep) => saveOnboardingPreferences(session.user.id, { step: nextStep, focus, preferences });
  const invalid = () => {
    if (step === 1 && !focus.length) return "Choose at least one focus so Kalsoon can tailor your starting point.";
    if (step === 2 && !preferences.selectedMonth) return "Choose the current budgeting month.";
    if (step === 3 && (!account.institution.trim() || !account.name.trim() || account.balance === "" || asNumber(account.balance) < 0)) return "Enter an institution, account name and a valid starting balance, or skip this step.";
    if (step === 4 && addDebt && (!debt.creditor.trim() || debt.currentBalance === "" || debt.originalBalance === "" || !debt.dueDate || asNumber(debt.currentBalance) < 0 || asNumber(debt.originalBalance) < asNumber(debt.currentBalance) || asNumber(debt.interestRate) < 0 || asNumber(debt.minimumPayment) < 0)) return "Complete the debt fields. Original balance must be at least the current balance.";
    if (step === 4 && addGoal && (!goal.name.trim() || asNumber(goal.targetAmount) <= 0 || asNumber(goal.baseAmount) < 0 || asNumber(goal.baseAmount) > asNumber(goal.targetAmount) || !goal.deadline || asNumber(goal.monthlyContribution) < 0)) return "Complete the goal fields. Current amount cannot be more than the target.";
    if (step === 5 && Object.values(selectedBudgets).some((value) => value === "" || asNumber(value) < 0)) return "Enter a valid planned amount for each selected category.";
    return "";
  };
  const continueFlow = async () => {
    const validation = invalid(); if (validation) { setError(validation); return; }
    setSaving(true); setError("");
    try {
      if (step === 3) await saveOnboardingAccount(session.user.id, account);
      if (step === 4) { if (addDebt) await saveOnboardingDebt(session.user.id, debt); if (addGoal) await saveOnboardingGoal(session.user.id, goal); }
      const nextStep = Math.min(step + 1, 5); await saveStep(nextStep); setStep(nextStep);
    } catch (reason) { setError(reason.message || "We could not save this step. Please try again."); } finally { setSaving(false); }
  };
  const skipAccount = async () => { setSaving(true); setError(""); try { await saveStep(4); setStep(4); } catch (reason) { setError(reason.message); } finally { setSaving(false); } };
  const finish = async () => { const validation = invalid(); if (validation) { setError(validation); return; } setSaving(true); setError(""); try { const budgets = Object.entries(selectedBudgets).map(([categoryId, plannedAmount]) => ({ categoryId, plannedAmount })); await saveOnboardingBudgets(session.user.id, { month: preferences.selectedMonth, budgets }); await completeOnboarding(session.user.id); trackConversion("onboarding_completed", { source: "onboarding", milestone: "step_5" }); onComplete(); } catch (reason) { setError(reason.message || "We could not finish onboarding. Please try again."); } finally { setSaving(false); } };
  const saveAndExit = async () => { setSaving(true); setError(""); try { await saveStep(step); await onSaveExit(); } catch (reason) { setError(reason.message || "We could not save your progress."); } finally { setSaving(false); } };
  const body = [<FocusStep focus={focus} setFocus={setFocus}/>, <PreferencesStep preferences={preferences} setPreferences={setPreferences}/>, <AccountStep account={account} setAccount={setAccount}/>, <DebtGoalStep addDebt={addDebt} setAddDebt={setAddDebt} debt={debt} setDebt={setDebt} addGoal={addGoal} setAddGoal={setAddGoal} goal={goal} setGoal={setGoal}/>, <BudgetStep categories={categories} loading={categoriesLoading} selectedBudgets={selectedBudgets} setSelectedBudgets={setSelectedBudgets} preferences={preferences}/>][step - 1];
  return <main className="onboarding-page"><header className="onboarding-brand"><a href="/" aria-label="Back to Kalsoon landing page"><KalsoonLogo tagline /></a><button type="button" className="onboarding-exit" onClick={saveAndExit} disabled={saving}>Save &amp; exit</button></header><section className="onboarding-panel"><aside className="onboarding-rail"><span className="onboarding-rail-label">Your setup</span>{STEPS.map((label, index) => <div className={index + 1 === step ? "onboarding-rail-step active" : index + 1 < step ? "onboarding-rail-step complete" : "onboarding-rail-step"} key={label}><span>{index + 1 < step ? <Check size={15}/> : index + 1}</span><div><strong>{label}</strong><small>{index + 1 < step ? "Saved" : index + 1 === step ? "In progress" : "Up next"}</small></div></div>)}</aside><section className="onboarding-content"><div className="onboarding-mobile-progress"><span>Step {step} of 5</span><i><em style={{ width: `${step * 20}%` }}/></i></div><div className="onboarding-progress"><span>Step {step} of 5</span><i><em style={{ width: `${step * 20}%` }}/></i></div><div className="onboarding-step-content" key={step}>{body}</div>{error ? <p className="onboarding-error" role="alert">{error}</p> : null}<footer className="onboarding-actions"><button type="button" className="onboarding-back" onClick={() => { setError(""); setStep((current) => Math.max(1, current - 1)); }} disabled={saving || step === 1}><ArrowLeft size={17}/>Back</button><div>{step === 3 ? <button type="button" className="onboarding-skip" onClick={skipAccount} disabled={saving}>Skip for now</button> : null}<button type="button" className="primary-button onboarding-continue" onClick={step === 5 ? finish : continueFlow} disabled={saving}>{saving ? <><CircleNotch className="spin" size={17}/>Saving…</> : step === 5 ? <>Open my Kalsoon dashboard<ArrowRight size={17}/></> : <>Continue<ArrowRight size={17}/></>}</button></div></footer></section></section></main>;
}
