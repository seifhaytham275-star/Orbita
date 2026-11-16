export default function PricingPage() {
  return <main className="shell pricing-shell" dir="rtl">
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-mark">O</span><span>ORBITA</span></a>
      <nav className="pricing-nav"><a href="/login">تسجيل الدخول</a><a href="/signup">إنشاء حساب</a></nav>
    </header>
    <section className="pricing-hero">
      <p className="eyebrow">FREE LAUNCH ACCESS</p>
      <h1>ابدأ مع Orbita، <span>من غير تكلفة.</span></h1>
      <p>خلال مرحلة الإطلاق، الوصول مجاني لمدة شهر واحد لكل شركة. لا نطلب بطاقة بنكية ولا نفعّل خصمًا أو تجديدًا تلقائيًا.</p>
      <span className="pricing-disclaimer">لا توجد باقات مدفوعة أو تحصيل اشتراكات مفعّل في الوقت الحالي.</span>
    </section>
    <section className="pricing-grid" aria-label="الخطة الحالية">
      <article className="plan-card plan-featured">
        <span className="plan-tag">خطة الإطلاق</span>
        <h2>Orbita Free</h2>
        <p className="plan-description">مساحة موحدة لتنظيم أعمال شركتك وتجربة الأدوات المتاحة أثناء الإطلاق.</p>
        <div className="plan-price"><strong>0</strong><span>جنيه</span></div>
        <p className="annual-price">مجانًا لمدة شهر واحد</p>
        <ul>
          <li>حساب شركة واحد يعمل من الموبايل واللابتوب</li>
          <li>لوحة تحكم عربية واتجاه RTL</li>
          <li>إدارة أعضاء الشركة وصلاحياتهم عند اكتمال التفعيل</li>
          <li>الوصول إلى الوكلاء المتاحين تدريجيًا</li>
          <li>لا بطاقة بنكية ولا دفع تلقائي</li>
        </ul>
        <a className="primary plan-cta" href="/signup">ابدأ مجانًا</a>
      </article>
    </section>
    <section className="pricing-notes">
      <h2>بوضوح ومن غير مفاجآت</h2>
      <ul>
        <li>لا توجد مدفوعات أو اشتراكات مدفوعة مفعّلة حاليًا.</li>
        <li>لن يتم خصم أي مبلغ تلقائيًا بعد انتهاء فترة الوصول المجاني.</li>
        <li>قد تكون هناك حدود استخدام على خدمات الاستضافة المجانية؛ سنوضح أي حدود فعلية بدلًا من الوعد باستخدام غير محدود.</li>
        <li>ربط WhatsApp وFawry وInstaPay مؤجل لحين تجهيز الربط الرسمي ومراجعته.</li>
      </ul>
    </section>
    <footer>© {new Date().getFullYear()} Orbita · <a href="/">الرئيسية</a></footer>
  </main>;
}
