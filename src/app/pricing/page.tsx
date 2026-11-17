import Link from "next/link";

const plans = [
  {name:"Orbita Free",price:"0",period:"تجربة مجانية لمدة 30 يومًا",users:"مستخدم واحد",tasks:"30 مهمة Astro شهريًا",agents:"الوكلاء الستة",description:"ابدأ بتنظيم أساسيات عملك."},
  {name:"Orbita Pro",price:"399",period:"جنيه / شهر",users:"حتى مستخدمين اثنين",tasks:"500 مهمة Astro شهريًا",agents:"الوكلاء الستة",description:"للشركات الصغيرة التي تحتاج إدارة يومية متكاملة."},
  {name:"Orbita Max",price:"899",period:"جنيه / شهر",users:"حتى 10 مستخدمين",tasks:"1,800 مهمة Astro شهريًا",agents:"الوكلاء الستة",description:"لفرق العمل النامية ومعدلات الاستخدام العالية."},
  {name:"Orbita Business",price:"1,699",period:"جنيه / شهر",users:"حتى 20 مستخدمًا",tasks:"2,000 مهمة Astro شهريًا",agents:"الوكلاء الستة + دعم أولوية",description:"أعلى طاقة وأكبر عدد مستخدمين للشركات الأكبر."}
];
export default function PricingPage() {
  return <main className="shell pricing-shell" dir="rtl">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">O</span><span>ORBITA</span></Link><nav className="pricing-nav"><Link href="/login">تسجيل الدخول</Link><Link href="/signup">إنشاء حساب</Link></nav></header>
    <section className="pricing-hero"><p className="eyebrow">SIMPLE EGP SUBSCRIPTIONS</p><h1>اختار الباقة المناسبة <span>لنمو شغلك.</span></h1><p>الدفع عبر InstaPay فقط، ومراجعة التحويل يدويًا. لا يوجد خصم تلقائي أو تجديد دون طلبك.</p></section>
    <section className="pricing-grid" aria-label="الباقات">{plans.map((p,i)=><article className={i===2?"plan-card plan-featured":"plan-card"} key={p.name}><span className="plan-tag">{i===0?"ابدأ مجانًا":i===1?"للبداية":i===2?"الأكثر توازنًا":"للشركات الأكبر"}</span><h2>{p.name}</h2><p>{p.description}</p><div className="plan-price"><strong>{p.price}</strong><span>جنيه</span></div><p className="annual-price">{p.period}</p><ul><li>{p.users}</li><li>{p.tasks}</li><li>{p.agents}</li><li>إدارة اشتراك واضحة دون خصم تلقائي</li></ul><Link className="primary plan-cta" href={i===0?"/signup":"/dashboard/billing"}>{i===0?"ابدأ مجانًا":"اشترك عبر InstaPay"}</Link></article>)}</section>
    <section className="pricing-notes"><h2>طريقة الدفع والتفعيل</h2><ul><li>حوّل قيمة الباقة إلى رقم InstaPay الظاهر داخل حسابك.</li><li>أدخل مرجع التحويل لإرسال طلب المراجعة.</li><li>لا يتم تفعيل الاشتراك إلا بعد تأكيد الاستلام من الإدارة.</li><li>الأسعار بالجنيه المصري وقابلة للتعديل قبل الإطلاق التجاري النهائي.</li></ul></section><footer>© {new Date().getFullYear()} Orbita · <Link href="/">الرئيسية</Link></footer>
  </main>;
}
