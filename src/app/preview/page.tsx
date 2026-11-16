const sections = [
  ["Orbita Ledger", "الفواتير والحسابات", "معاينة شكل متابعة الفواتير والمصروفات."],
  ["Orbita Echo", "خدمة العملاء والطلبات", "معاينة تنظيم رسائل العملاء والطلبات."],
  ["Orbita Pulse", "الحجوزات والتذكيرات", "معاينة جدول المواعيد والتذكيرات."],
  ["Orbita Stock", "المخزون والمشتريات", "معاينة أرصدة الأصناف وحركة المخزون."],
  ["Orbita Reach", "المحتوى والتسويق", "معاينة أفكار المحتوى والحملات."],
  ["Orbita Insight", "التقارير والتحليلات", "معاينة التقارير ومؤشرات الأداء."]
];

export default function PreviewPage() {
  return (
    <main className="dashboard-shell" dir="rtl">
      <header className="dash-top">
        <a className="auth-brand" href="/">ORBITA</a>
        <nav className="home-nav"><a href="/login">تسجيل الدخول</a><a href="/signup">إنشاء حساب</a></nav>
      </header>
      <section className="dash-welcome">
        <p className="eyebrow">READ-ONLY PREVIEW</p>
        <h1>أهلًا بك في جولة Orbita</h1>
        <p>تقدر تتفرج على أقسام المنصة وتفهم كل وكيل بيعمل إيه. وضع الزائر للعرض فقط؛ لا توجد عمليات أو بيانات حقيقية متاحة.</p>
        <p className="notice">وضع المشاهدة فقط — كل البيانات المعروضة تعريفية وليست بيانات عملاء.</p>
      </section>
      <section className="agent-grid">
        {sections.map(([name, label, description], index) => (
          <article className="agent-card" key={name}>
            <span className="agent-index">0{index + 1}</span>
            <h3>{name}</h3><p>{label}</p><p>{description}</p>
            <span className="notice">معاينة مقفولة للزائر</span>
          </article>
        ))}
      </section>
      <section className="dash-panel">
        <p className="eyebrow">MEET ASTRO</p>
        <h2>Astro — دليلك داخل Orbita</h2>
        <p>Astro يعرّفك بأقسام المنصة، ويوضح وظيفة كل وكيل، ويرشدك إلى طريقة البدء. في وضع الزائر، Astro للشرح فقط ولا ينفّذ أوامر ولا يفتح أدوات أو بيانات.</p>
        <div className="actions">
          <a className="primary" href="/signup">أنشئ حسابك</a>
          <a className="secondary" href="/login">لديك حساب بالفعل؟</a>
        </div>
      </section>
      <footer>© {new Date().getFullYear()} Orbita. Visitor preview only.</footer>
    </main>
  );
}
