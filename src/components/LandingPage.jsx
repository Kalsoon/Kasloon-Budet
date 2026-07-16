"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Pause,
  Play,
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
import { KalsoonLogo } from "./KalsoonLogo.jsx";
import { trackConversion } from "../lib/conversionAnalytics.js";
import "./landing.css";
import "./macbook-preview.css";

const heroChart = [
  { value: 44 }, { value: 48 }, { value: 45 }, { value: 54 }, { value: 58 }, { value: 67 }, { value: 72 },
];

const showcase = [
  { name: "Dashboard", title: "Your next money decision, in one view.", problem: "Separate balances and plans make it hard to know what is safe to spend.", outcome: "See cash flow, budgets, debt and goals together—and spot what needs attention now.", icon: House, image: "/landing/dashboard.png", alt: "Kalsoon dashboard showing net worth, cash flow, spending, budget, debt and goals" },
  { name: "Accounts", title: "Know what you have and what you owe.", problem: "Cash, savings and liabilities are easy to misread when they live in different places.", outcome: "Kalsoon groups every account and calculates available cash, total debt and net worth.", icon: Wallet, image: "/landing/accounts.png", alt: "Kalsoon accounts overview with cash, debt, net worth and account groups" },
  { name: "Transactions", title: "Every movement has a clear purpose.", problem: "Uncategorised transactions hide where the month is really going.", outcome: "Search, filter and categorise activity while transfers stay separate from income and spending.", icon: Receipt, image: "/landing/transactions.png", alt: "Kalsoon transaction list with filters, categories and amounts" },
  { name: "Budget", title: "See the month before it surprises you.", problem: "A budget is only useful when it reflects what has actually been spent.", outcome: "Transactions update each category automatically so you can see what is left or over budget.", icon: ChartDonut, image: "/landing/budget.png", alt: "Kalsoon monthly budget with category progress and status labels" },
  { name: "Debt", title: "Turn repayment into a visible plan.", problem: "Minimum payments make it difficult to see when debt will really be gone.", outcome: "Compare payoff strategies and test how an extra payment changes your debt-free date.", icon: HandCoins, image: "/landing/debt.png", alt: "Kalsoon debt payoff simulator with payment strategy and timeline" },
  { name: "Goals", title: "Give important goals a finish line.", problem: "Saving feels abstract when progress is scattered across accounts and transfers.", outcome: "Link a savings account, plan contributions and see how close each goal is to completion.", icon: Target, image: "/landing/goals.png", alt: "Kalsoon savings goals showing progress toward four goals" },
];

const faqs = [
  ["How long does it take to get started?", "Kalsoon guides you through a short five-step setup for your preferences, first account, optional debt or goal, and first monthly budget. You can save your progress and return later."],
  ["How do I add my financial information?", "You can create accounts manually and import transaction activity from CSV. This gives you control over exactly what enters your Kalsoon workspace."],
  ["Does Kalsoon connect to my bank automatically?", "Not yet. Bank connections are planned for later. Today, Kalsoon works with manual accounts and CSV imports, so you never need to share online-banking credentials."],
  ["Who can access my financial data?", "Your financial records are protected by authenticated, user-specific database access rules. Kalsoon also gives you controls to export your data or delete your account."],
  ["What happens after I create an account?", "After confirming your email and signing in, Kalsoon opens a guided setup that builds your first financial picture before you reach the dashboard."],
  ["Can I track savings goals and debt?", "Yes. You can monitor goal contributions, compare debt-repayment strategies and follow both kinds of progress alongside your budget."],
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

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
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
    <Link className="landing-brand" href="/" aria-label="Kalsoon home"><KalsoonLogo /></Link>
    <button className="landing-menu-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? <X size={21}/> : <List size={21}/>}</button>
    <nav className={open ? "landing-nav open" : "landing-nav"} aria-label="Landing page navigation">
      <button onClick={() => go("#how-it-works")}>How it works</button><button onClick={() => go("#features")}>Features</button><button onClick={() => go("#why-kalsoon")}>Why Kalsoon</button><button onClick={() => go("#faq")}>FAQ</button>
      <Link className="landing-login" href="/login">Log in</Link><button className="landing-primary compact" onClick={() => onStart("navigation")}>Create my free account <ArrowUpRight size={16}/></button>
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
    <aside className="preview-rail"><span className="preview-logo"><KalsoonLogo compact /></span>{[House, Wallet, Receipt, ChartDonut, HandCoins, Target].map((Icon, index) => <span className={index === 0 ? "rail-icon selected" : "rail-icon"} key={Icon.displayName || index}><Icon size={15}/></span>)}</aside>
    <div className="preview-content"><div className="preview-top"><div><span className="preview-date">Tuesday, 14 July</span><strong>Overview</strong></div><button className="preview-month"><CalendarBlank size={14}/> {monthly} <CaretDown size={12}/></button></div>
      <div className="preview-stat-grid"><PreviewStat label="Net worth" value={money(total + activity * 340)} trend="+ CHF 4’250 (5.7%)"/><PreviewStat label="Income" value={money(6420 + activity * 120)} chart/><PreviewStat label="Spending" value={money(4250 + activity * 80)} chart="coral"/></div>
      <div className="preview-cash"><div><span>Cash flow</span><strong>{money(cash)}</strong><small>Left to give a job this month</small></div><ResponsiveContainer width="52%" height={86}><LineChart data={heroChart.map((point, index) => ({ value: point.value + activity * (index % 3) * 3 }))}><Tooltip contentStyle={{ display: "none" }}/><Line type="monotone" dataKey="value" stroke="#e45f44" strokeWidth={3} dot={false} isAnimationActive animationDuration={900}/></LineChart></ResponsiveContainer></div>
      <div className="preview-accounts"><div><span>Accounts</span><b>Total balance</b></div><strong>CHF 52’350</strong><div className="preview-account-lines"><span>Everyday account <b>CHF 4’820</b></span><span>Savings <b>CHF 18’450</b></span><span>Pillar 3a <b>CHF 32’750</b></span></div><Link href="/dashboard">View all accounts <ArrowRight size={14}/></Link></div>
    </div>
  </div>;
}

function PreviewStat({ label, value, trend, chart }) {
  return <div className="preview-stat"><span>{label}</span><strong>{value}</strong>{trend ? <small>{trend}</small> : <div className={`mini-bars ${chart === "coral" ? "coral" : ""}`}><i/><i/><i/><i/><i/></div>}</div>;
}

function Hero({ onStart }) {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const videoMilestoneRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [videoPaused, setVideoPaused] = useState(reducedMotion);
  useEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion) return undefined;
    let frame = 0;
    const update = () => { frame = 0; node.style.setProperty("--hero-shift", `${Math.min(window.scrollY * .055, 26)}px`); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const pointer = (event) => {
      const bounds = node.getBoundingClientRect();
      node.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 7}deg`);
      node.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height - .5) * -6}deg`);
    };
    const reset = () => { node.style.setProperty("--pointer-x", "0deg"); node.style.setProperty("--pointer-y", "0deg"); };
    window.addEventListener("scroll", scroll, { passive: true }); update();
    node.addEventListener("pointermove", pointer); node.addEventListener("pointerleave", reset);
    return () => { window.removeEventListener("scroll", scroll); node.removeEventListener("pointermove", pointer); node.removeEventListener("pointerleave", reset); if (frame) cancelAnimationFrame(frame); };
  }, [reducedMotion]);
  useEffect(() => {
    if (reducedMotion) { videoRef.current?.pause(); setVideoPaused(true); return; }
    videoRef.current?.play().then(() => setVideoPaused(false)).catch(() => setVideoPaused(true));
  }, [reducedMotion]);
  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      trackConversion("product_tour_control", { action: "play", source: "hero" });
      video.play().then(() => setVideoPaused(false)).catch(() => setVideoPaused(true));
    } else {
      trackConversion("product_tour_control", { action: "pause", source: "hero" });
      video.pause(); setVideoPaused(true);
    }
  };
  const trackVideoMilestone = (event) => {
    const video = event.currentTarget;
    if (!videoMilestoneRef.current && video.duration && video.currentTime / video.duration >= 0.9) {
      videoMilestoneRef.current = true;
      trackConversion("product_tour_milestone", { milestone: "90_percent", source: "hero" });
    }
  };
  return <section className="landing-hero" ref={ref}><div className="hero-copy landing-reveal is-visible"><span className="landing-kicker"><Sparkle size={14}/> Confidence with money</span><h1>Feel confident<br/>with your money.</h1><p>Know what you can safely spend, what needs attention and whether your budget, debt and goals are moving in the right direction—all in one calm view.</p><div className="hero-actions"><button className="landing-primary" onClick={() => onStart("hero")}>Create my free account <ArrowRight size={18}/></button><button className="landing-secondary" onClick={() => { trackConversion("how_it_works_click", { source: "hero" }); document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" }); }}>See how it works <span className="play-dot"><ArrowRight size={13}/></span></button></div><div className="hero-trust"><span><Check size={15}/> Currently free</span><span><Check size={15}/> Manual accounts and CSV imports</span><span><Check size={15}/> No bank connection required</span></div></div>
    <div className="hero-visual"><div className="macbook"><div className="macbook-screen"><span className="macbook-camera"/><video ref={videoRef} className="hero-product-video" autoPlay={!reducedMotion} muted loop playsInline preload="metadata" poster="/landing/dashboard.png" onPlay={() => setVideoPaused(false)} onPause={() => setVideoPaused(true)} onTimeUpdate={trackVideoMilestone} aria-label="Kalsoon product walkthrough"><source src="/landing/kalsoon-tour.m4v" type="video/mp4"/></video><button className="video-control" type="button" onClick={toggleVideo} aria-label={videoPaused ? "Play Kalsoon product tour" : "Pause Kalsoon product tour"}>{videoPaused ? <Play size={15} weight="fill"/> : <Pause size={15} weight="bold"/>}</button></div><div className="macbook-hinge"/><div className="macbook-base"><i/></div></div><p className="hero-media-caption"><span/>Real Kalsoon product tour</p></div>
  </section>;
}

function Showcase() {
  const [tab, setTab] = useState("Dashboard");
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion || paused) return undefined;
    const names = showcase.map((item) => item.name);
    const timer = window.setInterval(() => setTab((current) => names[(names.indexOf(current) + 1) % names.length]), 5000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);
  const current = showcase.find((item) => item.name === tab) || showcase[0];
  const Icon = current.icon;
  const selectTab = (name) => { setTab(name); trackConversion("feature_tab_selected", { feature: name.toLowerCase(), source: "product_showcase" }); };
  const handleTabKeyDown = (event, name) => {
    const names = showcase.map((item) => item.name);
    const currentIndex = names.indexOf(name);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % names.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + names.length) % names.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = names.length - 1;
    else return;
    event.preventDefault();
    selectTab(names[nextIndex]);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  };
  return <section className="showcase-section" id="features" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}><Reveal><div className="section-heading split"><div><span className="landing-kicker">Real product proof</span><h2>See exactly how Kalsoon<br/>makes money clearer.</h2></div><p>Explore real Kalsoon screens—from the daily decisions in your budget to long-term debt and savings progress.</p></div><div className="feature-tabs" role="tablist" aria-label="Kalsoon features">{showcase.map(({ name, icon: TabIcon }) => <button role="tab" aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} key={name} onClick={() => selectTab(name)} onKeyDown={(event) => handleTabKeyDown(event, name)}><TabIcon size={17}/><span>{name}</span>{tab === name && !reducedMotion ? <i className="feature-tab-timer"/> : null}</button>)}</div><div className="showcase-panel media-showcase" role="tabpanel" aria-live="polite" key={tab}><div className="showcase-copy"><span className="showcase-icon"><Icon size={23}/></span><span className="showcase-step">0{showcase.findIndex((item) => item.name === tab) + 1} / 0{showcase.length}</span><h3>{current.title}</h3><dl className="showcase-proof"><div><dt>The problem</dt><dd>{current.problem}</dd></div><div><dt>What changes</dt><dd>{current.outcome}</dd></div></dl><Link href="/register" onClick={() => trackConversion("signup_intent", { source: `feature_${tab.toLowerCase()}` })}>Create my free account <ArrowRight size={16}/></Link></div><figure className="showcase-screenshot"><img src={current.image} alt={current.alt}/><figcaption><span className="showcase-live-dot"/>Actual Kalsoon product screen</figcaption></figure></div></Reveal></section>;
}

function Outcomes() {
  const outcomes = [
    [Wallet, "Know what is safe to spend", "See available cash after this month’s income, spending and planned commitments."],
    [TrendUp, "Catch problems before month-end", "Budget progress shows which categories are on track and which need a decision."],
    [Target, "See progress beyond this month", "Keep debt payoff and savings goals visible beside everyday spending."],
  ];
  return <section className="outcomes-section" id="why-kalsoon"><Reveal><div className="section-heading split"><div><span className="landing-kicker">Clarity that leads somewhere</span><h2>Make the next decision<br/>with confidence.</h2></div><p>Kalsoon connects today’s spending choices with the debt and savings progress you want to make next.</p></div><div className="outcomes-grid">{outcomes.map(([OutcomeIcon, title, copy]) => <article key={title}><span><OutcomeIcon size={22}/></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></Reveal></section>;
}

function BudgetDemo() {
  const [budget, setBudget] = useState(4250);
  const budgetValue = Number(budget) || 0;
  const remaining = 6420 - budgetValue;
  const updateBudget = (event) => setBudget(event.target.value === "" ? "" : Number(event.target.value));
  const commitBudget = () => setBudget(Math.max(3000, Math.min(6000, Number(budget) || 3000)));
  return <div className="interactive-demo budget-demo"><div><span className="landing-kicker">Interactive budget</span><h3>A budget you can actually stick to.</h3><p>Your budget should support your life—not make you feel restricted. Adjust this example to see how every change affects the money left this month.</p><label>Monthly budget<input aria-label="Monthly budget" type="number" min="3000" max="6000" value={budget} onChange={updateBudget} onBlur={commitBudget} onFocus={() => trackConversion("interactive_demo_started", { action: "budget", source: "landing_demo" })}/></label><input className="range-input" aria-label="Monthly budget slider" type="range" min="3000" max="6000" step="50" value={budgetValue || 3000} onInput={updateBudget} onChange={updateBudget} onPointerDown={() => trackConversion("interactive_demo_started", { action: "budget", source: "landing_demo" })}/><div className="range-labels"><span>CHF 3’000</span><span>CHF 6’000</span></div><Link className="inline-cta" href="/register" onClick={() => trackConversion("signup_intent", { source: "budget_demo" })}>Create my free account <ArrowRight size={16}/></Link></div><div className="demo-result"><span>Remaining this month</span><strong className={remaining < 0 ? "negative" : "positive"}>{remaining < 0 ? "− " : ""}{money(Math.abs(remaining))}</strong><small>{remaining >= 0 ? "Ready to give every franc a job" : "Bring the plan back within your income"}</small><div className="result-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={heroChart.map((item, index) => ({ value: item.value + (budgetValue - 4250) / 90 + index * 3 }))}><Line type="monotone" dataKey="value" stroke={remaining >= 0 ? "#168c6b" : "#e45f44"} strokeWidth={3} dot={false} isAnimationActive/></LineChart></ResponsiveContainer></div></div></div>;
}

function DebtDemo() {
  const [extra, setExtra] = useState(200);
  const monthsSaved = Math.round(extra / 25);
  const date = useMemo(() => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(2028, 3 - monthsSaved)), [monthsSaved]);
  const updateExtra = (event) => setExtra(Number(event.target.value));
  return <div className="interactive-demo debt-demo"><div className="debt-control"><span className="landing-kicker">Pay down debt faster</span><h3>Make extra payments count.</h3><p>Move the slider to see how a little more can change the end date.</p><label>Extra monthly payment <output>{money(extra)}</output></label><input className="range-input" aria-label="Extra monthly payment" type="range" min="0" max="1000" step="25" value={extra} onInput={updateExtra} onChange={updateExtra} onPointerDown={() => trackConversion("interactive_demo_started", { action: "debt", source: "landing_demo" })}/><div className="range-labels"><span>CHF 0</span><span>CHF 1’000</span></div></div><div className="debt-result"><span>Estimated debt-free date</span><strong>{date}</strong><small>Original: April 2028</small><b>{monthsSaved} months sooner</b></div><div className="debt-interest"><span>Total interest saved</span><strong>{money(extra * 6.2)}</strong><small>Calculated from your selected extra payment.</small></div></div>;
}

function HowItWorks() {
  const steps = [["1", "Add what matters", "Create accounts manually or import CSV activity. No bank connection is required."], ["2", "Make a realistic plan", "Choose what to spend, save and put toward debt this month."], ["3", "Know what to do next", "See what is on track, what needs attention and how your progress is changing."]];
  return <section className="how-section how-section-compact" id="how-it-works"><Reveal><div className="how-intro"><span className="landing-kicker">How it works</span><h2>From scattered numbers<br/>to a clear next step.</h2><p>Start small. Kalsoon helps you build a useful financial picture without waiting for every account or category to be perfect.</p></div><div className="how-grid">{steps.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></Reveal></section>;
}

function SavingsSection() {
  return <section className="savings-section"><Reveal><div className="savings-copy"><span className="landing-kicker">Savings goals</span><h2>Cut what does not matter.<br/>Save for what does.</h2><p>See where small changes could create room for your emergency fund, holiday, education, home or any goal that matters to you.</p><Link className="landing-primary" href="/register" onClick={() => trackConversion("signup_intent", { source: "savings_section" })}>Create my free account <ArrowRight size={18}/></Link></div><div className="savings-preview" aria-label="Savings goal preview"><div><span>Emergency fund</span><b>CHF 9’200 <small>of CHF 15’000</small></b><i><em/></i></div><div><span>Holiday</span><b>CHF 2’350 <small>of CHF 5’000</small></b><i><em/></i></div><div><span>Pillar 3a</span><b>CHF 7’200 <small>of CHF 7’258</small></b><i><em/></i></div></div></Reveal></section>;
}

function Security() { return <section className="security-section" id="security"><Reveal><div className="security-intro"><span className="security-icon"><ShieldCheck size={28}/></span><div><span className="landing-kicker">Privacy and control</span><h2>Your financial workspace<br/>belongs to you.</h2></div><p>Kalsoon uses authenticated, user-specific database access rules. Your records are not shared with other Kalsoon users.</p></div><div className="security-points"><div><LockKey size={22}/><strong>Private by default</strong><p>Signed-in users can access only the financial records attached to their own account.</p></div><div><Bank size={22}/><strong>No bank credentials required</strong><p>Add accounts manually or import CSV activity without sharing online-banking credentials.</p></div><div><ShieldCheck size={22}/><strong>Export or delete</strong><p>Download your information or delete your Kalsoon account from Settings.</p></div></div></Reveal></section>; }

function FAQ() { const [open, setOpen] = useState(0); return <section className="faq-section" id="faq"><Reveal><div className="section-heading"><span className="landing-kicker">Questions, answered</span><h2>Frequently asked questions</h2></div><div className="faq-list">{faqs.map(([question, answer], index) => <article key={question}><button aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}><span>{question}</span>{open === index ? <Minus size={18}/> : <Plus size={18}/>}</button><div className={open === index ? "faq-answer open" : "faq-answer"}><p>{answer}</p></div></article>)}</div></Reveal></section>; }

function FinalCTA({ onStart }) { return <section className="final-cta"><Reveal><div><span className="landing-kicker">A clearer next step</span><h2>Ready to know where your money stands?</h2><p>Create your account, build a simple starting point and let Kalsoon show you what to do next.</p></div><div className="final-cta-action"><button className="landing-primary" onClick={() => onStart("final_cta")}>Create my free account <ArrowRight size={18}/></button><small>Currently free · No card required</small></div></Reveal></section>; }

function Footer() { return <footer className="landing-footer"><Link className="landing-brand" href="/" aria-label="Kalsoon home"><KalsoonLogo /></Link><p>Kalsoon — Confidence with money.<br/>Built to help you understand your money, improve your habits and move forward with confidence.</p><div><a href="#features">Features</a><a href="#why-kalsoon">Why Kalsoon</a><a href="#faq">FAQ</a><Link href="/login">Log in</Link></div></footer>; }

export function LandingPage() {
  const router = useRouter();
  const start = (source) => { trackConversion("signup_intent", { source, route: "/register" }); router.push("/register"); };
  return <div className="landing-page"><LandingHeader onStart={start}/><main><Hero onStart={start}/><HowItWorks/><Showcase/><section className="demos-section"><Reveal><div className="section-heading split"><div><span className="landing-kicker">Try it for yourself</span><h2>See how one decision<br/>changes the month.</h2></div><p>Adjust the budget and debt examples to see the kind of immediate feedback Kalsoon gives you.</p></div><div className="demos-grid"><BudgetDemo/><DebtDemo/></div></Reveal></section><Outcomes/><SavingsSection/><Security/><FAQ/><FinalCTA onStart={start}/></main><Footer/></div>;
}
