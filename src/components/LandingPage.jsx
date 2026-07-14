import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bank,
  CalendarBlank,
  CaretDown,
  Check,
  ChartDonut,
  ChartLineUp,
  CircleNotch,
  CreditCard,
  HandCoins,
  House,
  List,
  LockKey,
  Minus,
  Plus,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Target,
  TrendUp,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import "./landing.css";

const heroChart = [
  { value: 44 }, { value: 48 }, { value: 45 }, { value: 54 }, { value: 58 }, { value: 67 }, { value: 72 },
];

const showcase = {
  Accounts: { title: "All your accounts. One clear overview.", copy: "See every balance in one calm place, from everyday spending to long-term savings.", icon: Wallet, rows: [["Everyday account", "CHF 4’820"], ["Savings", "CHF 18’450"], ["Pillar 3a", "CHF 32’750"]] },
  Transactions: { title: "Every movement has a place.", copy: "Categorise spending in seconds and stay close to the choices shaping your month.", icon: Receipt, rows: [["Migros · Groceries", "− CHF 84"], ["Acme AG · Salary", "+ CHF 8’200"], ["SBB Mobile · Transport", "− CHF 46"]] },
  Budget: { title: "Give every franc a purpose.", copy: "Plan what matters, then see your remaining money update as your month unfolds.", icon: ChartDonut, rows: [["Housing", "CHF 1’950 / 2’100"], ["Groceries", "CHF 684 / 850"], ["Transport", "CHF 322 / 480"]] },
  Debt: { title: "A calmer way out of debt.", copy: "Compare payoff paths and put your extra money where it will make the strongest difference.", icon: HandCoins, rows: [["Credit card", "CHF 1’240 · 18.9%"], ["Personal loan", "CHF 6’800 · 5.7%"], ["Debt-free", "July 2027"]] },
  Goals: { title: "Progress you can feel.", copy: "Turn your next holiday, emergency fund or Pillar 3a into a plan with a clear finish line.", icon: Target, rows: [["Emergency fund", "CHF 9’200 / 15’000"], ["Holiday", "CHF 2’350 / 5’000"], ["Pillar 3a", "CHF 7’200 / 7’258"]] },
};

const faqs = [
  ["Is Kalsoon only for financial experts?", "No. Kalsoon is designed for everyday people who want a clearer and simpler way to manage their money."],
  ["Do I need to have a perfect budget?", "Not at all. Kalsoon helps you create a realistic starting point and improve it as you learn more about your habits."],
  ["Can Kalsoon help me reduce my spending?", "Yes. Kalsoon shows where your money goes, which categories are close to their limits and where you may be able to cut unnecessary costs."],
  ["Can I track savings goals and debt?", "Yes. You can monitor your goals, explore debt-repayment strategies and follow your progress in one place."],
  ["Is Kalsoon free?", "Kalsoon is currently free to use."],
];

const money = (value) => `CHF ${Math.round(value).toLocaleString("en-CH").replace(/,/g, "’")}`;

function useCount(value, active = true) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return undefined; }
    const started = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - started) / 850, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, active]);
  return display;
}

function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { node.classList.add("is-visible"); observer.unobserve(node); } }, { threshold: 0.13 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div className={`landing-reveal ${className}`} ref={ref}>{children}</div>;
}

function LandingHeader({ onStart }) {
  const [open, setOpen] = useState(false);
  const go = (target) => { setOpen(false); document.querySelector(target)?.scrollIntoView({ behavior: "smooth" }); };
  return <header className="landing-header">
    <a className="landing-brand" href="/" aria-label="Kalsoon home"><span className="landing-mark"><Wallet weight="fill" size={19}/></span><strong>Kalsoon</strong></a>
    <button className="landing-menu-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? <X size={21}/> : <List size={21}/>}</button>
    <nav className={open ? "landing-nav open" : "landing-nav"} aria-label="Landing page navigation">
      <button onClick={() => go("#how-it-works")}>How it works</button><button onClick={() => go("#features")}>Features</button><button onClick={() => go("#why-kalsoon")}>Why Kalsoon</button><button onClick={() => go("#faq")}>FAQ</button>
      <a className="landing-login" href="/login">Log in</a><button className="landing-primary compact" onClick={onStart}>Start for free <ArrowUpRight size={16}/></button>
    </nav>
  </header>;
}

function ProductPreview({ compact = false }) {
  const [activity, setActivity] = useState(0);
  const total = useCount(78860);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setActivity((current) => (current + 1) % 3), 3200);
    return () => window.clearInterval(timer);
  }, []);
  const monthly = ["July 2026", "August 2026", "September 2026"][activity];
  const cash = [2170, 2480, 1930][activity];
  return <div className={compact ? "product-preview compact-preview" : "product-preview"} aria-label="Kalsoon product preview">
    <aside className="preview-rail"><span className="preview-logo"><Wallet weight="fill" size={16}/></span>{[House, Wallet, Receipt, ChartDonut, HandCoins, Target].map((Icon, index) => <span className={index === 0 ? "rail-icon selected" : "rail-icon"} key={Icon.displayName || index}><Icon size={15}/></span>)}</aside>
    <div className="preview-content"><div className="preview-top"><div><span className="preview-date">Tuesday, 14 July</span><strong>Overview</strong></div><button className="preview-month"><CalendarBlank size={14}/> {monthly} <CaretDown size={12}/></button></div>
      <div className="preview-stat-grid"><PreviewStat label="Net worth" value={money(total + activity * 340)} trend="+ CHF 4’250 (5.7%)"/><PreviewStat label="Income" value={money(6420 + activity * 120)} chart/><PreviewStat label="Spending" value={money(4250 + activity * 80)} chart="coral"/></div>
      <div className="preview-cash"><div><span>Cash flow</span><strong>{money(cash)}</strong><small>Left to give a job this month</small></div><ResponsiveContainer width="52%" height={86}><LineChart data={heroChart.map((point, index) => ({ value: point.value + activity * (index % 3) * 3 }))}><Tooltip contentStyle={{ display: "none" }}/><Line type="monotone" dataKey="value" stroke="#e45f44" strokeWidth={3} dot={false} isAnimationActive animationDuration={900}/></LineChart></ResponsiveContainer></div>
      <div className="preview-accounts"><div><span>Accounts</span><b>Total balance</b></div><strong>CHF 52’350</strong><div className="preview-account-lines"><span>Everyday account <b>CHF 4’820</b></span><span>Savings <b>CHF 18’450</b></span><span>Pillar 3a <b>CHF 32’750</b></span></div><a href="/app">View all accounts <ArrowRight size={14}/></a></div>
    </div>
  </div>;
}

function PreviewStat({ label, value, trend, chart }) {
  return <div className="preview-stat"><span>{label}</span><strong>{value}</strong>{trend ? <small>{trend}</small> : <div className={`mini-bars ${chart === "coral" ? "coral" : ""}`}><i/><i/><i/><i/><i/></div>}</div>;
}

function Hero({ onStart }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const update = () => { frame = 0; node.style.setProperty("--hero-shift", `${Math.min(window.scrollY * .055, 26)}px`); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true }); update();
    return () => { window.removeEventListener("scroll", scroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return <section className="landing-hero" ref={ref}><div className="hero-copy landing-reveal is-visible"><span className="landing-kicker"><Sparkle size={14}/> Confidence with money</span><h1>Feel confident<br/>with your money.</h1><p>Kalsoon helps you understand where your money goes, take control of your spending, build a budget you can stick to and save for what matters.</p><div className="hero-actions"><button className="landing-primary" onClick={onStart}>Start for free <ArrowRight size={18}/></button><button className="landing-secondary" onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}>See how it works <span className="play-dot"><ArrowRight size={13}/></span></button></div><div className="hero-trust"><span><Check size={15}/> Kalsoon is currently free to use.</span></div></div>
    <div className="hero-visual" aria-hidden="true"><div className="hero-layer layer-back"/><div className="hero-layer layer-mid"/><ProductPreview/></div>
  </section>;
}

function Introduction() {
  return <section className="introduction-section"><Reveal><span className="landing-kicker">Confidence starts with clarity</span><h2>Confidence starts with clarity.</h2><div><p>Money can feel overwhelming when you cannot clearly see what is coming in, what is going out or where you could improve.</p><p>Kalsoon brings your accounts, transactions, budgets, debts and goals together in one calm view—so you always know where you stand and what to do next.</p></div></Reveal></section>;
}

function Showcase() {
  const [tab, setTab] = useState("Accounts");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const names = Object.keys(showcase);
    const timer = window.setInterval(() => setTab((current) => names[(names.indexOf(current) + 1) % names.length]), 3600);
    return () => window.clearInterval(timer);
  }, []);
  const current = showcase[tab];
  const Icon = current.icon;
  return <section className="showcase-section" id="features"><Reveal><div className="section-heading split"><div><span className="landing-kicker">Features</span><h2>Build better money habits,<br/>one decision at a time.</h2></div><p>Explore how Kalsoon connects the daily choices behind better financial habits.</p></div><div className="feature-tabs" role="tablist" aria-label="Kalsoon features">{Object.keys(showcase).map((name) => <button role="tab" aria-selected={tab === name} key={name} onClick={() => setTab(name)}>{name}</button>)}</div><div className="showcase-panel" key={tab}><div className="showcase-copy"><span className="showcase-icon"><Icon size={23}/></span><h3>{current.title}</h3><p>{current.copy}</p><ul><li><Check size={16}/>Clear, connected data</li><li><Check size={16}/>Built around your choices</li><li><Check size={16}/>Designed for calm progress</li></ul><a href="/signup">Explore {tab.toLowerCase()} <ArrowRight size={16}/></a></div><div className="showcase-ui"><header><span>{tab}</span><button aria-label="Feature settings"><SlidersHorizontal size={16}/></button></header><div className="showcase-total"><span>{tab === "Debt" ? "Debt-free date" : tab === "Goals" ? "Saved so far" : "Total balance"}</span><strong>{tab === "Debt" ? "July 2027" : tab === "Goals" ? "CHF 11’550" : "CHF 52’350"}</strong></div>{current.rows.map(([label, value], index) => <div className="showcase-row" key={label}><span className={index === 1 && tab === "Transactions" ? "positive" : ""}>{label}</span><b>{value}</b>{["Budget", "Goals"].includes(tab) ? <i><em style={{ width: `${82 - index * 12}%` }}/></i> : null}</div>)}<a href="/signup">View all {tab.toLowerCase()} <ArrowRight size={15}/></a></div></div></Reveal></section>;
}

function Benefits() {
  const benefits = [
    [Receipt, "See where your money goes", "Understand your spending without digging through statements or complicated reports. Kalsoon organizes your financial activity into a clear picture."],
    [ChartDonut, "Create a budget that fits your life", "Plan your fixed bills, flexible spending and savings without forcing yourself into an unrealistic budget."],
    [TrendUp, "Stay on track", "See how much you have spent, what remains and which categories need your attention before the month is over."],
    [Sparkle, "Find opportunities to save", "Recognize unnecessary spending, identify areas where you can cut costs and redirect that money toward your priorities."],
    [HandCoins, "Make progress on debt", "Understand what you owe, compare repayment strategies and see how additional payments could move your debt-free date closer."],
    [Target, "Save for what matters", "Create meaningful goals, plan your contributions and watch your progress grow over time."],
  ];
  return <section className="benefits-section"><Reveal><div className="section-heading"><span className="landing-kicker">Benefits</span><h2>Build better money habits,<br/>one decision at a time.</h2></div><div className="benefits-grid">{benefits.map(([Icon, title, copy]) => <article key={title}><span><Icon size={22}/></span><h3>{title}</h3><p>{copy}</p></article>)}</div></Reveal></section>;
}

function BudgetDemo() {
  const [budget, setBudget] = useState(4250);
  const remaining = 6420 - budget;
  const updateBudget = (event) => setBudget(Math.max(3000, Math.min(6000, Number(event.target.value) || 3000)));
  return <div className="interactive-demo budget-demo"><div><span className="landing-kicker">Interactive budget</span><h3>A budget you can actually stick to.</h3><p>Your budget should support your life—not make you feel restricted. Kalsoon helps you separate essential bills from flexible spending, monitor your progress and adjust your plan when life changes.</p><label>Monthly budget<input aria-label="Monthly budget" type="number" min="3000" max="6000" value={budget} onChange={updateBudget}/></label><input className="range-input" aria-label="Monthly budget slider" type="range" min="3000" max="6000" step="50" value={budget} onInput={updateBudget} onChange={updateBudget}/><div className="range-labels"><span>CHF 3’000</span><span>CHF 6’000</span></div><a className="inline-cta" href="/signup">Create your budget <ArrowRight size={16}/></a></div><div className="demo-result"><span>Remaining this month</span><strong className={remaining < 0 ? "negative" : "positive"}>{remaining < 0 ? "− " : ""}{money(Math.abs(remaining))}</strong><small>{remaining >= 0 ? "Ready to give every franc a job" : "Bring the plan back within your income"}</small><div className="result-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={heroChart.map((item, index) => ({ value: item.value + (budget - 4250) / 90 + index * 3 }))}><Line type="monotone" dataKey="value" stroke={remaining >= 0 ? "#168c6b" : "#e45f44"} strokeWidth={3} dot={false} isAnimationActive/></LineChart></ResponsiveContainer></div></div></div>;
}

function DebtDemo() {
  const [extra, setExtra] = useState(200);
  const monthsSaved = Math.round(extra / 25);
  const date = useMemo(() => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(2028, 3 - monthsSaved)), [monthsSaved]);
  const updateExtra = (event) => setExtra(Number(event.target.value));
  return <div className="interactive-demo debt-demo"><div className="debt-control"><span className="landing-kicker">Pay down debt faster</span><h3>Make extra payments count.</h3><p>Move the slider to see how a little more can change the end date.</p><label>Extra monthly payment <output>{money(extra)}</output></label><input className="range-input" aria-label="Extra monthly payment" type="range" min="0" max="1000" step="25" value={extra} onInput={updateExtra} onChange={updateExtra}/><div className="range-labels"><span>CHF 0</span><span>CHF 1’000</span></div></div><div className="debt-result"><span>Estimated debt-free date</span><strong>{date}</strong><small>Original: April 2028</small><b>{monthsSaved} months sooner</b></div><div className="debt-interest"><span>Total interest saved</span><strong>{money(extra * 6.2)}</strong><small>Calculated from your selected extra payment.</small></div></div>;
}

function HowItWorks() {
  const steps = [["1", "See the full picture", "Bring your accounts, transactions, spending and commitments together."], ["2", "Make a realistic plan", "Decide how much you want to spend, save and put toward debt."], ["3", "Follow your progress", "Kalsoon shows whether you are on track and where you may need to adjust."], ["4", "Improve every month", "Learn from your habits, make better decisions and build lasting confidence."]];
  return <section className="how-section" id="how-it-works"><Reveal><span className="landing-kicker">How it works</span><h2>A simpler way to take control.</h2><div className="how-grid">{steps.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></Reveal></section>;
}

function SavingsSection() {
  return <section className="savings-section"><Reveal><div className="savings-copy"><span className="landing-kicker">Savings goals</span><h2>Cut what does not matter.<br/>Save for what does.</h2><p>See where small changes could create room for your emergency fund, holiday, education, home or any goal that matters to you.</p><a className="landing-primary" href="/signup">Create a goal <ArrowRight size={18}/></a></div><div className="savings-preview" aria-label="Savings goal preview"><div><span>Emergency fund</span><b>CHF 9’200 <small>of CHF 15’000</small></b><i><em/></i></div><div><span>Holiday</span><b>CHF 2’350 <small>of CHF 5’000</small></b><i><em/></i></div><div><span>Pillar 3a</span><b>CHF 7’200 <small>of CHF 7’258</small></b><i><em/></i></div></div></Reveal></section>;
}

function WhyKalsoon() {
  return <section className="why-section" id="why-kalsoon"><Reveal><span className="landing-kicker">Why Kalsoon</span><h2>More than tracking numbers.</h2><div><p>Most finance apps show you what already happened. Kalsoon helps you understand it, plan what comes next and improve your habits over time.</p><p>No judgment. No complicated financial language. Just a clearer way to manage your money and feel more confident about your decisions.</p></div></Reveal></section>;
}

function FreeSection({ onStart }) {
  return <section className="free-section"><Reveal><div><span className="landing-kicker">Kalsoon is currently free</span><h2>Start changing your money habits for free.</h2><p>Kalsoon is currently free because taking the first step toward better financial habits should feel easy.</p><button className="landing-primary" onClick={onStart}>Start for free <ArrowRight size={18}/></button></div></Reveal></section>;
}

function Security() { return <section className="security-section" id="security"><Reveal><div className="security-intro"><span className="security-icon"><ShieldCheck size={28}/></span><div><span className="landing-kicker">Privacy and security</span><h2>Security you can trust.<br/>Built for Swiss peace of mind.</h2></div><p>Your data stays yours. Kalsoon is designed for a clearer relationship with money—not for selling your financial life.</p></div><div className="security-points"><div><LockKey size={22}/><strong>Secure authentication</strong><p>Protected sign-in and session controls.</p></div><div><Bank size={22}/><strong>Swiss-focused planning</strong><p>Built around the accounts and choices of everyday life in Switzerland.</p></div><div><ShieldCheck size={22}/><strong>You stay in control</strong><p>Manage, export and delete your data from Settings.</p></div></div></Reveal></section>; }

function FAQ() { const [open, setOpen] = useState(0); return <section className="faq-section" id="faq"><Reveal><div className="section-heading"><span className="landing-kicker">Questions, answered</span><h2>Frequently asked questions</h2></div><div className="faq-list">{faqs.map(([question, answer], index) => <article key={question}><button aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}><span>{question}</span>{open === index ? <Minus size={18}/> : <Plus size={18}/>}</button><div className={open === index ? "faq-answer open" : "faq-answer"}><p>{answer}</p></div></article>)}</div></Reveal></section>; }

function FinalCTA({ onStart }) { return <section className="final-cta"><Reveal><div><span className="landing-kicker">A clearer next step</span><h2>Ready to feel more confident about money?</h2><p>Start with clarity. Build better habits. Take control of your financial future.</p></div><button className="landing-primary" onClick={onStart}>Start for free <ArrowRight size={18}/></button></Reveal></section>; }

function Footer() { return <footer className="landing-footer"><a className="landing-brand" href="/"><span className="landing-mark"><Wallet weight="fill" size={17}/></span><strong>Kalsoon</strong></a><p>Kalsoon — Confidence with money.<br/>Built to help you understand your money, improve your habits and move forward with confidence.</p><div><a href="#features">Features</a><a href="#why-kalsoon">Why Kalsoon</a><a href="#faq">FAQ</a><a href="/login">Log in</a></div></footer>; }

export function LandingPage() {
  const start = () => { window.location.assign("/signup"); };
  return <div className="landing-page"><LandingHeader onStart={start}/><main><Hero onStart={start}/><Showcase/><Introduction/><Benefits/><section className="demos-section"><Reveal><div className="section-heading split"><div><span className="landing-kicker">Build your plan</span><h2>Make every month<br/>work for you.</h2></div><p>Try a flexible budget and see how small decisions create more room for what matters.</p></div><div className="demos-grid"><BudgetDemo/><DebtDemo/></div></Reveal></section><SavingsSection/><HowItWorks/><WhyKalsoon/><Security/><FreeSection onStart={start}/><FAQ/><FinalCTA onStart={start}/></main><Footer/></div>;
}
