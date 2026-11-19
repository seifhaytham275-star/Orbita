"use client";
import { useEffect, useMemo, useState } from "react";

type Plan = { code: string; name: string; monthly_price: number; currency: string; limits: Record<string, number>; features: Record<string, unknown> };
type Org = { organization_id: string; organizations: { name: string; plan_code: string; subscription_status: string; subscription_ends_at: string | null; trial_ends_at: string | null } | null };

const INSTAPAY_RECEIVER = "01117770325";
const WHATSAPP_NUMBER = "201100877339";

export default function BillingWorkspace({ organizationId }: { organizationId: string | null }) {
  const [plans,setPlans]=useState<Plan[]>([]);
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [planCode,setPlanCode]=useState("pro");
  const [months,setMonths]=useState(1);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [paymentId,setPaymentId]=useState<string | null>(null);
  const [history,setHistory]=useState<Array<{id:string;status:string;amount:number;plan_code:string;created_at:string}>>([]);

  useEffect(()=>{let live=true;fetch("/api/payments").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر تحميل الاشتراكات");if(!live)return;setPlans(d.plans||[]);setOrgs(d.organizations||[]);setHistory(d.payments||[]);}).catch(e=>live&&setMessage(e.message));return()=>{live=false}},[]);

  const orgId=organizationId || orgs[0]?.organization_id || "";
  const plan=useMemo(()=>plans.find(p=>p.code===planCode),[plans,planCode]);
  const total=Number(plan?.monthly_price||0)*months;
  const whatsappText = `مرحبًا، أرسلت تحويل اشتراك ORBITA. رقم طلب الدفع: ${paymentId ?? "سأرسله بعد تسجيل الطلب"}. سأرفق صورة Screenshot لإثبات التحويل.`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;

  async function submit(e: React.FormEvent){
    e.preventDefault();
    if(!orgId){setMessage("لا توجد شركة مرتبطة بحسابك.");return;}
    setBusy(true);setMessage("");setPaymentId(null);
    try{
      const r=await fetch("/api/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:orgId,planCode,billingPeriodMonths:months})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"تعذر تسجيل طلب الدفع");
      setPaymentId(d.payment.id);
      setMessage(d.message+" رقم الطلب: "+d.payment.id);
      setHistory(current=>[{id:d.payment.id,status:d.payment.status,amount:d.payment.amount,plan_code:d.payment.plan_code,created_at:d.payment.created_at},...current]);
    }catch(e){setMessage(e instanceof Error?e.message:"حدث خطأ");}
    finally{setBusy(false);}
  }

  return <section className="dash-panel" dir="rtl">
    <h2>الباقات والاشتراك</h2>
    <p>اختار الباقة، حوّل المبلغ على InstaPay، وبعدها ابعت صورة إثبات التحويل على WhatsApp. الاشتراك بيتفعل بعد مراجعة التحويل واعتماده من الإدارة.</p>
    <div className="pricing-grid">{plans.map(p=><article className="plan-card" key={p.code}><h3>{p.name}</h3><strong>{p.monthly_price===0?"مجاني":new Intl.NumberFormat("ar-EG").format(p.monthly_price)+" جنيه / شهر"}</strong><p>المستخدمون: {p.limits.max_users} · مهام Astro شهريًا: {p.limits.max_agent_tasks_month}</p><p>الوكلاء: {Array.isArray(p.features.agents)?(p.features.agents as string[]).join("، "):"—"}</p></article>)}</div>
    <form onSubmit={submit} className="auth-form">
      <label>الباقة<select value={planCode} onChange={e=>setPlanCode(e.target.value)}>{plans.filter(p=>p.monthly_price>0).map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
      <label>مدة الاشتراك<select value={months} onChange={e=>setMonths(Number(e.target.value))}>{[1,3,6,12].map(m=><option key={m} value={m}>{m} {m===1?"شهر":"شهور"}</option>)}</select></label>
      <p><strong>المبلغ المطلوب: {new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP"}).format(total)}</strong></p>
      <div className="notice">
        <strong>حوّل المبلغ إلى رقم InstaPay التالي:</strong>
        <p dir="ltr">{INSTAPAY_RECEIVER}</p>
        <button type="button" className="secondary-action" onClick={()=>navigator.clipboard?.writeText(INSTAPAY_RECEIVER)}>نسخ رقم InstaPay</button>
      </div>
      <div className="notice">
        <strong>بعد إتمام التحويل:</strong>
        <p>افتح WhatsApp على الرقم التالي، وابعت Screenshot واضحة لإثبات التحويل. يُفضّل إرفاق رقم طلب الدفع بعد تسجيل الطلب.</p>
        <p dir="ltr">{ "01100877339" }</p>
        <a className="secondary-action" href={whatsappUrl} target="_blank" rel="noreferrer">إرسال إثبات التحويل عبر WhatsApp</a>
      </div>
      <button disabled={busy||!plan}>{busy?"جارٍ تسجيل الطلب...":"تسجيل طلب مراجعة الدفع"}</button>
    </form>
    {message&&<p className="notice">{message}</p>}
    <h3>سجل عمليات الدفع</h3><ul>{history.map(p=><li key={p.id}>{p.plan_code} · {p.amount} جنيه · {p.status==="pending_review"?"قيد المراجعة":p.status==="paid"?"تم التأكيد":p.status==="rejected"?"مرفوض":p.status} · {new Date(p.created_at).toLocaleDateString("ar-EG")}</li>)}</ul>
  </section>;
}
