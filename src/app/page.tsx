import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";

const agents: { name: string; description: string; icon: IconName }[] = [
  { name: "Orbita Ledger", description: "الفواتير والحسابات", icon: "ledger" },
  { name: "Orbita Echo", description: "خدمة العملاء والطلبات", icon: "echo" },
  { name: "Orbita Pulse", description: "الحجوزات والتذكيرات", icon: "pulse" },
  { name: "Orbita Stock", description: "المخزون والمشتريات", icon: "stock" },
  { name: "Orbita Reach", description: "المحتوى والتسويق", icon: "reach" },
  { name: "Orbita Insight", description: "التقارير والتحليلات", icon: "insight" }
];

const highlights = [
  { value: "6", label: "وكلاء متخصصين" },
  { value: "شهر", label: "وصول مجاني للبداية" },
  { value: "عربي", label: "واجهة كاملة من اليمين لليسار" },
  { value: "2", label: "موبايل ولابتوب بنفس الحساب" }
];

const steps = [
  { title: "سجّل شركتك", text: "أنشئ حسابك وشركتك في دقائق، بدون بطاقة بنكية ولا تجديد تلقائي." },
  { title: "ضيف شغلك", text: "سجّل العملاء والمخزون والفواتير والحجوزات في مكان واحد منظم." },
  { title: "وجّه Astro", text: "اكتب طلبك لـ Astro وهو يوجّهه للوكيل المناسب، والطلبات الحساسة تمر على موافقتك." }
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">O</span><span>ORBITA</span></Link>
        <nav className="home-nav">
          <Link href="/pricing">الخطة المجانية</Link>
          <Link href="/login">تسجيل الدخول</Link>
          <Link href="/signup">إنشاء حساب</Link>
        </nav>
      </header>

      <div className="hero-grid">
        <section className="hero">
          <p className="eyebrow">Business workspace</p>
          <h1>إدارة شغلك، <span>بذكاء.</span></h1>
          <p className="intro">مساحة واحدة تساعدك تدير عمليات شركتك، وتتابع التفاصيل من غير ما تتوه بين أدوات كتير.</p>
          <div className="actions">
            <Link className="primary" href="/signup">ابدأ مجانًا لمدة شهر واحد</Link>
            <Link className="secondary" href="/preview">شاهد جولة تعريفية</Link>
          </div>
          <p className="device-note">حساب واحد يعمل من الموبايل واللابتوب، بنفس بيانات الدخول. لا بطاقة بنكية ولا تجديد تلقائي.</p>
        </section>

        <div className="preview-card" aria-hidden="true">
          <div className="pv-bar"><i /><i /><i /><span>ORBITA WORKSPACE</span></div>
          <div className="pv-body">
            <div className="pv-stats">
              <div className="pv-stat"><b /><i /></div>
              <div className="pv-stat"><b /><i /></div>
              <div className="pv-stat"><b /><i /></div>
            </div>
            <div className="pv-rows">
              <div className="pv-row"><em /><b /><b /></div>
              <div className="pv-row"><em /><b /><b /></div>
              <div className="pv-row"><em /><b /><b /></div>
            </div>
            <div className="pv-chat"><small>ASTRO</small>اكتب طلبك وأنا أوجّهه للوكيل المناسب.</div>
          </div>
        </div>
      </div>

      <section className="stat-strip" aria-label="مميزات سريعة">
        {highlights.map((item) => (
          <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>
        ))}
      </section>

      <section id="agents" className="section">
        <div className="section-heading">
          <div><p className="eyebrow">The Orbita suite</p><h2>ستة وكلاء. مساحة واحدة.</h2></div>
          <span className="count">06 MODULES</span>
        </div>
        <div className="agent-grid">
          {agents.map((agent, index) => (
            <article className="agent-card" key={agent.name}>
              <div className="agent-top">
                <span className="agent-icon"><Icon name={agent.icon} /></span>
                <span className="arrow"><Icon name="arrow" size={18} /></span>
              </div>
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
              <span className="agent-index">0{index + 1}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">How it works</p><h2>ابدأ في ثلاث خطوات.</h2></div>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span className="step-num">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-teaser">
        <div>
          <p className="eyebrow">Free launch</p>
          <h2>ابدأ من غير تكلفة.</h2>
          <p>شهر واحد وصول مجاني خلال مرحلة الإطلاق، بدون إدخال وسيلة دفع أو خصم تلقائي.</p>
        </div>
        <Link className="secondary" href="/pricing">تفاصيل الخطة المجانية</Link>
      </section>

      <footer>© {new Date().getFullYear()} Orbita. Built for growing businesses.</footer>
    </main>
  );
}
