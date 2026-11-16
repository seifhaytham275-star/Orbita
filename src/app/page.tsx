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
        <nav className="home-nav"><a href="/pricing">الخطة المجانية</a><a href="/login">تسجيل الدخول</a><a href="/signup">إنشاء حساب</a></nav>
      </header>
      <section className="hero">
        <p className="eyebrow">YOUR BUSINESS, IN ORBIT</p>
        <h1>إدارة شغلك، <span>بذكاء.</span></h1>
        <p className="intro">مساحة واحدة تساعدك تدير عمليات شركتك، وتتابع التفاصيل من غير ما تتوه بين أدوات كتير.</p>
        <div className="actions"><a className="primary" href="/signup">ابدأ مجانًا لمدة شهر واحد</a><a className="secondary" href="#agents">استكشف الوكلاء</a></div>
        <p className="device-note">حساب واحد يعمل من الموبايل واللابتوب، بنفس بيانات الدخول. لا بطاقة بنكية ولا تجديد تلقائي.</p>
      </section>
      <section id="agents" className="section">
        <div className="section-heading"><div><p className="eyebrow">THE ORBITA SUITE</p><h2>ستة وكلاء. مساحة واحدة.</h2></div><span className="count">06 MODULES</span></div>
        <div className="agent-grid">
          {agents.map(([name, description], index) => <article className="agent-card" key={name}>
            <span className="agent-index">0{index + 1}</span><h3>{name}</h3><p>{description}</p><span className="arrow">↗</span>
          </article>)}
        </div>
      </section>
      <section className="pricing-teaser">
        <div><p className="eyebrow">FREE LAUNCH</p><h2>ابدأ من غير تكلفة.</h2><p>شهر واحد وصول مجاني خلال مرحلة الإطلاق، بدون إدخال وسيلة دفع أو خصم تلقائي.</p></div>
        <a className="secondary" href="/pricing">تفاصيل الخطة المجانية</a>
      </section>
      <footer>© {new Date().getFullYear()} Orbita. Built for growing businesses.</footer>
    </main>
  );
}
