"use client";
import { useEffect, useMemo, useState } from "react";

type Plan = { code: string; name: string; monthly_price: number; currency: string; limits: Record<string, number>; features: Record<string, unknown> };
type Org = { organization_id: string; organizations: { name: string; plan_code: string; subscription_status: string; subscription_ends_at: string | null; trial_ends_at: string | null } | null };
export default function BillingWorkspace({ organizationId }: { organizationId: string | null }) {
  const [plans,setPlans]=useState<Plan[]>([]);
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [planCode,setPlanCode]=useState("pro");
  const [months,setMonths]=useState(1);
  const [reference,setReference]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [receiver,setReceiver]=useState("01117770325");
  const [history,setHistory]=useState<Array<{id:string;status:string;amount:number;plan_code:string;created_at:string}>>([]);
  useEffect(()=>{let live=true;fetch("/api/payments").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر تحميل الاشتراكات");if(!live)return;setPlans(d.plans||[]);setOrgs(d.organizations||[]);setReceiver(d.instapay?.receiverIdentifier||"01117770325");}).catch(e=>live&&setMessage(e.message));return()=>{live=false}},[]);
  const orgId=organizationId || orgs[0]?.organization_id || "";
  const plan=useMemo(()=>plans.find(p=>p.code===planCode),[plans,planCode]);
  const total=Number(plan?.monthly_price||0)*months;
  async function submit(e: React.FormEvent){e.preventDefault();if(!orgId){setMessage("لا توجد شركة مرتبطة بحسابك.");return;}setBusy(true);setMessage("");try{const r=await fetch("/api/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:orgId,planCode,billingPeriodMonths:months,customerReference:reference})});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر تسجيل الدفع");setMessage(d.message+" رقم الطلب: "+d.payment.id);setReference("");}catch(e){setMessage(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false)}}
  return <section className="dash-panel" dir="rtl"><h2>الباقات والاشتراك</h2><p>اختار الباقة، حوّل المبلغ على InstaPay، وبعدها سجّل رقم العملية. الاشتراك بيتفعل بعد مراجعة التحويل.</p>
    <div className="pricing-grid">{plans.map(p=><article className="plan-card" key={p.code}><h3>{p.name}</h3><strong>{p.monthly_price===0?"مجاني":new Intl.NumberFormat("ar-EG").format(p.monthly_price)+" جنيه / شهر"}</strong><p>المستخدمون: {p.limits.max_users} · مهام Astro شهريًا: {p.limits.max_agent_tasks_month}</p><p>الوكلاء: {Array.isArray(p.features.agents)?(p.features.agents as string[]).join("، "):"—"}</p></article>)}</div>
    <form onSubmit={submit} className="auth-form">
      <label>الباقة<select value={planCode} onChange={e=>setPlanCode(e.target.value)}>{plans.filter(p=>p.monthly_price>0).map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
      <label>مدة الاشتراك<select value={months} onChange={e=>setMonths(Number(e.target.value))}>{[1,3,6,12].map(m=><option key={m} value={m}>{m} {m===1?"شهر":"شهور"}</option>)}</select></label>
      <p><strong>المبلغ المطلوب: {new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP"}).format(total)}</strong></p>
      <div className="notice"><strong>حوّل إلى InstaPay:</strong><p dir="ltr">{receiver}</p><button type="button" className="secondary-action" onClick={()=>navigator.clipboard?.writeText(receiver)}>نسخ الرقم</button><p>اكتب رقم مرجع التحويل بعد إتمام التحويل.</p></div>
      <label>رقم مرجع التحويل<input value={reference} onChange={e=>setReference(e.target.value)} minLength={3} maxLength={160} required placeholder="رقم العملية الظاهر في InstaPay"/></label>
      <button disabled={busy||!plan||!reference.trim()}>{busy?"جارٍ تسجيل الطلب...":"إرسال طلب مراجعة الدفع"}</button>
    </form>
    {message&&<p className="notice">{message}</p>}
  </section>;
}
