const plans = [
  {
    name: "أساسي",
    price: "399",
    annual: "3,990",
    description: "للمشروعات الصغيرة التي تريد تنظيم شغلها اليومي.",
    users: "مستخدمان",
    tasks: "300 عملية AI شهريًا",
    features: ["Ledger للفواتير والمتابعة الأساسية", "Insight لتقرير مبسط", "مساحة شركة واحدة", "دعم عبر البريد"],
  },
  {
    name: "نمو",
    price: "899",
    annual: "8,990",
    description: "للشركات التي لديها فريق وعملاء وعمليات متكررة.",
    users: "5 مستخدمين",
    tasks: "1,200 عملية AI شهريًا",
    featured: true,
    features: ["كل مميزات أساسي", "Echo لخدمة العملاء", "Pulse للحجوزات والتذكيرات", "Stock للمخزون", "تقارير أوسع وأدوار للفريق"],
  },
  {
    name: "أعمال",
    price: "1,699",
    annual: "16,990",
    description: "للشركات النامية التي تحتاج إدارة أشمل.",
    users: "10 مستخدمين",
    tasks: "3,000 عملية AI شهريًا",
    features: ["كل مميزات نمو", "Reach للمحتوى التسويقي", "الوكلاء الستة عند اكتمال إطلاقهم", "صلاحيات فريق أكثر تفصيلًا", "أولوية في الدعم"],
  },
];

export default function PricingPage() {
  return <main className="shell pricing-shell" dir="rtl">
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-mark">O</span><span>ORBITA</span></a>
      <nav className="pricing-nav"><a href="/login">تسجيل الدخول</a><a href="/signup">ابدأ التجربة</a></nav>
    </header>
    <section className="pricing-hero">
      <p className="eyebrow">SIMPLE, TRANSPARENT PRICING</p>
      <h1>خطة مناسبة لشغلك، <span>وسعر مفهوم.</span></h1>
      <p>الأسعار التالية مقترحة للإطلاق الأول في مصر بالجنيه المصري. تجربة Orbita مجانية لمدة 5 أيام، ولا تحتاج إلى إدخال وسيلة دفع لبدئها.</p>
      <span className="pricing-disclaimer">أسعار إطلاق مقترحة — البيع وتحصيل الاشتراكات غير مفعّلين بعد.</span>
    </section>
    <section className="pricing-grid" aria-label="خطط الاشتراك">
      {plans.map(plan=><article className={`plan-card ${plan.featured ? "plan-featured" : ""}`} key={plan.name}>
        {plan.featured && <span className="plan-tag">الأنسب للشركات النامية</span>}
        <h2>{plan.name}</h2><p className="plan-description">{plan.description}</p>
        <div className="plan-price"><strong>{plan.price}</strong><span>جنيه / شهر</span></div>
        <p className="annual-price">{plan.annual} جنيه سنويًا (يعادل شهرين مجانًا)</p>
        <p className="plan-limit">{plan.users} · {plan.tasks}</p>
        <ul>{plan.features.map(feature=><li key={feature}>{feature}</li>)}</ul>
        <a className={plan.featured ? "primary plan-cta" : "secondary plan-cta"} href="/signup">ابدأ تجربة 5 أيام</a>
      </article>)}
    </section>
    <section className="pricing-notes">
      <h2>قبل الاشتراك، اعرف الآتي</h2>
      <ul>
        <li>كل شركة تبدأ بتجربة مجانية لمدة 5 أيام.</li>
        <li>عدد عمليات الذكاء الاصطناعي محدد حتى تظل التكلفة واضحة ولا نعدك باستخدام غير محدود.</li>
        <li>رسوم WhatsApp أو الرسائل أو بوابات الدفع الخارجية — إن وجدت — قد تكون منفصلة حسب مزود الخدمة.</li>
        <li>الخطط المعروضة تصور تسعير أولي؛ لن يتم تحصيل أي مبلغ من هذه الصفحة حاليًا.</li>
      </ul>
    </section>
    <footer>© {new Date().getFullYear()} Orbita · <a href="/">الرئيسية</a></footer>
  </main>;
}
