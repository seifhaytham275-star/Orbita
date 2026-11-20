"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AgentName = "Astro" | "Ledger" | "Echo" | "Pulse" | "Stock" | "Reach" | "Insight";
type Message = { role: "user" | "assistant"; text: string };
type Task = { id: string; agent_name: string; title: string; status: string; created_at: string };
type Credential = { configured: boolean; lastFour: string | null };
const agents: { name: Exclude<AgentName,"Astro">; label: string; description: string; icon: string; prompt: string }[] = [
 {name:"Ledger",label:"الحسابات",description:"الفواتير والمصروفات والسجلات",icon:"د.م",prompt:"راجع الحسابات والفواتير"},
 {name:"Echo",label:"خدمة العملاء",description:"العملاء والطلبات والردود",icon:"◉",prompt:"ساعدني في خدمة العملاء"},
 {name:"Pulse",label:"المواعيد",description:"الحجوزات والتذكيرات",icon:"◷",prompt:"راجع المواعيد والحجوزات"},
 {name:"Stock",label:"المخزون",description:"الأصناف والكميات وحركات المخزون",icon:"▤",prompt:"اعرض حالة المخزون"},
 {name:"Reach",label:"التسويق",description:"المحتوى والحملات التسويقية",icon:"↗",prompt:"جهز فكرة تسويقية"},
 {name:"Insight",label:"التحليلات",description:"التقارير ومؤشرات الأداء",icon:"⌁",prompt:"جهز ملخص أداء الشركة"}
];
const statusLabel:Record<string,string>={queued:"بانتظار التنفيذ",running:"قيد التنفيذ",needs_approval:"تحتاج موافقتك",completed:"اكتملت",failed:"تعذر تنفيذها"};
export default function AstroWorkspace({organizationId}:{organizationId:string|null}){
 const [active,setActive]=useState<AgentName>("Astro"),[prompt,setPrompt]=useState(""),[busy,setBusy]=useState(false);
 const [messages,setMessages]=useState<Record<string,Message[]>>({Astro:[{role:"assistant",text:"أهلًا، أنا Astro. اكتب طلبك وسأختار الوكيل المتخصص وأتابع تنفيذ المهمة."}]});
 const [tasks,setTasks]=useState<Task[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [credential,setCredential]=useState<Credential>({configured:false,lastFour:null}),[apiKey,setApiKey]=useState(""),[savingKey,setSavingKey]=useState(false);
 const currentMessages=messages[active]||[];
 const visibleTasks=useMemo(()=>active==="Astro"?tasks:tasks.filter(task=>task.agent_name===active),[active,tasks]);
 useEffect(()=>{if(!organizationId)return;let alive=true;fetch("/api/astro").then(r=>r.json()).then(d=>{if(alive){if(d.tasks)setTasks(d.tasks);}}).catch(()=>{});return()=>{alive=false}},[organizationId]);
 useEffect(()=>{let alive=true;fetch("/api/ai-credentials").then(r=>r.json()).then(d=>{if(alive&&d.configured!==undefined)setCredential({configured:d.configured,lastFour:d.lastFour||null});}).catch(()=>{});return()=>{alive=false}},[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const text=prompt.trim();if(!text||busy||!organizationId)return;
  setMessages(old=>({...old,[active]:[...(old[active]||[]),{role:"user",text}]}));setPrompt("");setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/astro",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,agent:active==="Astro"?undefined:active})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"تعذر تنفيذ الطلب.");
   const target=(data.task?.agent_name||active) as AgentName;
   setMessages(old=>({...old,[active]:[...(old[active]||[]),{role:"assistant",text:data.reply||"تم استلام المهمة."}]}));
   if(data.task)setTasks(old=>[data.task,...old.filter(t=>t.id!==data.task.id)].slice(0,40));
   if(active==="Astro"&&target!=="Astro")setNotice("Astro وجّه المهمة إلى "+target+".");
  }catch(e){setError(e instanceof Error?e.message:"حدث خطأ.");}finally{setBusy(false);}
 }
 async function saveKey(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!apiKey.trim()||savingKey)return;setSavingKey(true);setError("");setNotice("");
  try{const response=await fetch("/api/ai-credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:apiKey.trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error||"تعذر حفظ المفتاح.");setCredential({configured:true,lastFour:data.lastFour});setApiKey("");setNotice("تم التحقق من مفتاح Gemini وحفظه مشفّرًا لحسابك.");}
  catch(e){setError(e instanceof Error?e.message:"تعذر حفظ المفتاح.");}finally{setSavingKey(false);}
 }
 async function removeKey(){if(savingKey)return;setSavingKey(true);setError("");try{const response=await fetch("/api/ai-credentials",{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error||"تعذر حذف المفتاح.");setCredential({configured:false,lastFour:null});setNotice("تم حذف مفتاح Gemini من حسابك.");}catch(e){setError(e instanceof Error?e.message:"تعذر حذف المفتاح.");}finally{setSavingKey(false);}}
 const selected=agents.find(a=>a.name===active);
 return <section className="astro-enterprise" dir="rtl">
  <aside className="astro-sidebar">
   <div className="astro-side-brand"><span className="astro-logo">O</span><div><b>ORBITA</b><small>AI WORKSPACE</small></div></div>
   <button className={"astro-nav-main "+(active==="Astro"?"active":"")} onClick={()=>{setActive("Astro");setError("");setNotice("");}}><span>✦</span><span><b>Astro</b><small>المساعد الرئيسي</small></span></button>
   <p className="astro-side-label">SPECIALIST AGENTS</p>
   {agents.map((agent,index)=><button key={agent.name} className={"astro-nav-agent "+(active===agent.name?"active":"")} onClick={()=>{setActive(agent.name);setError("");setNotice("");}}><span className="astro-agent-icon">{agent.icon}</span><span><b>{agent.name}</b><small>{agent.label}</small></span><i>{String(index+1).padStart(2,"0")}</i></button>)}
   <div className="astro-side-bottom"><span className={credential.configured?"astro-dot online":"astro-dot"}></span>{credential.configured?"Gemini متصل":"Gemini غير مربوط"}</div>
  </aside>
  <div className="astro-main">
   <header className="astro-topline"><div><p className="eyebrow">ORBITA INTELLIGENCE</p><h2>{active==="Astro"?"Astro — مركز القيادة":selected?.label+" · "+active}</h2><p>{active==="Astro"?"المساعد الرئيسي الذي ينسّق العمل بين الوكلاء.":selected?.description}</p></div><span className="astro-live">WORKSPACE ACTIVE</span></header>
   {active==="Stock"&&<div className="astro-stock-tip"><b>مساحة المخزون</b><span>إدارة الأصناف والكميات تتم من وحدة المخزون المتصلة بقاعدة بيانات شركتك.</span><a href="#operations-stock" onClick={e=>{e.preventDefault();document.querySelector(".ops-tabs button:nth-child(3)")?.dispatchEvent(new MouseEvent("click",{bubbles:true}));document.querySelector(".ops-shell")?.scrollIntoView({behavior:"smooth",block:"start"});}}>فتح إدارة المخزون ↓</a></div>}
   {active==="Astro"&&<div className="astro-welcome-card"><span>✦</span><div><b>أهلاً بك في Astro</b><p>اكتب طلبك بشكل طبيعي. Astro يفهمه ويحوّله للوكيل المناسب، مع الحفاظ على موافقات العمليات الحساسة.</p></div></div>}
   <div className="astro-work-grid">
    <section className="astro-conversation"><div className="astro-section-head"><div><b>{active==="Astro"?"محادثة Astro":"محادثة "+active}</b><small>{currentMessages.length} رسائل في هذه المساحة</small></div><span className="astro-active-pill">● نشط</span></div>
     <div className="astro-thread" aria-live="polite">{currentMessages.map((m,i)=><article key={i} className={"astro-bubble "+m.role}><small>{m.role==="user"?"أنت":active.toUpperCase()}</small><p>{m.text}</p></article>)}{busy&&<p className="astro-wait">جارٍ تنفيذ المهمة...</p>}</div>
     <form className="astro-composer" onSubmit={submit}><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={active==="Astro"?"اطلب من Astro أي مهمة في شركتك...": "اكتب مهمة لـ "+active+"..."} disabled={busy||!organizationId}/><button disabled={busy||!prompt.trim()||!organizationId}>{busy?"...":"إرسال ↑"}</button></form>
     {!organizationId&&<p className="astro-inline-note">اربط حسابك بشركة نشطة لاستخدام الوكلاء.</p>}
    </section>
    <aside className="astro-task-panel"><div className="astro-section-head"><div><b>{active==="Astro"?"كل المهام":"مهام "+active}</b><small>آخر المهام المسجلة</small></div><span>{visibleTasks.length}</span></div>
     {visibleTasks.length?visibleTasks.slice(0,12).map(t=><div className="astro-task-item" key={t.id}><b>{t.title}</b><small>{statusLabel[t.status]||t.status} · {t.agent_name}</small></div>):<p className="astro-empty">لا توجد مهام في هذه المساحة حتى الآن.</p>}
    </aside>
   </div>
   <section className="astro-key-panel"><div><p className="eyebrow">PERSONAL AI CONNECTION</p><h3>ربط Gemini API</h3><p>أدخل مفتاحك مرة واحدة. يتم حفظه مشفّرًا لحسابك ولا يظهر مرة أخرى في الصفحة.</p></div>
    {credential.configured?<div className="astro-key-saved"><span>● Gemini متصل ·•••• {credential.lastFour}</span><button type="button" onClick={removeKey} disabled={savingKey}>حذف المفتاح</button></div>:<form onSubmit={saveKey} className="astro-key-form"><input type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="الصق Gemini API key هنا" aria-label="Gemini API key"/><button disabled={savingKey||apiKey.trim().length<20}>{savingKey?"جارٍ التحقق...":"تحقق واحفظ"}</button></form>}
   </section>
   {notice&&<p className="astro-feedback success">{notice}</p>}{error&&<p className="astro-feedback error">{error}</p>}
   <p className="astro-security-note">المفتاح مشفّر باستخدام AES-256-GCM، ولا يُرسل إلى المتصفح بعد الحفظ. يتم استخدامه من الخادم فقط عند توجيه المهام إلى Gemini.</p>
  </div>
 </section>;
}
