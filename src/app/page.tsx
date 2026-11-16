const agents = [
  ["Orbita Ledger", "الفواتير والحسابات"],
  ["Orbita Echo", "خدمة العملاء والطلبات"],
  ["Orbita Pulse", "الحجوزات والتذكيرات"],
  ["Orbita Stock", "المخزون والمشتريات"],
  ["Orbita Reach", "المحتوى والتسويق"],
  ["Orbita Insight", "التقارير والتحليلات"]
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">O</span><span>ORBITA</span></div>
        <span className="status">نسخة تأسيسية</span>
      </header>
      <section className="hero">
        <p className="eyebrow">YOUR BUSINESS, IN ORBIT</p>
        <h1>إدارة شغلك، <span>بذكاء.</span></h1>
        <p className="intro">مساحة واحدة تساعدك تدير عمليات شركتك، وتتابع التفاصيل من غير ما تتوه بين أدوات كتير.</p>
        <div className="actions"><a className="primary" href="#agents">استكشف الوكلاء</a><a className="secondary" href="#payments">طرق الدفع</a></div>
      </section>
      <section id="agents" className="section">
        <div className="section-heading"><div><p className="eyebrow">THE ORBITA SUITE</p><h2>ستة وكلاء. مساحة واحدة.</h2></div><span className="count">06 MODULES</span></div>
        <div className="agent-grid">
          {agents.map(([name, description], index) => <article className="agent-card" key={name}>
            <span className="agent-index">0{index + 1}</span><h3>{name}</h3><p>{description}</p><span className="arrow">↗</span>
          </article>)}
        </div>
      </section>
      <section id="payments" className="payment-panel">
        <div><p className="eyebrow">SUBSCRIPTIONS</p><h2>دفع واضح وآمن</h2><p>الطرق المعتمدة في هذه النسخة: InstaPay وFawry فقط.</p></div>
        <div className="payment-methods"><span>InstaPay</span><span>Fawry</span></div>
        <small>إثبات التحويل عبر InstaPay يحتاج مراجعة المالك. دفع Fawry المباشر يتطلب تفعيل حساب تاجر وربطًا رسميًا.</small>
      </section>
      <footer>© {new Date().getFullYear()} Orbita. Built for growing businesses.</footer>
    </main>
  );
}
