"use client";
import { useCallback, useEffect, useState } from "react";

type Approval={id:string;task_id:string;requested_action:string;status:"pending"|"approved"|"rejected";created_at:string};
export default function ApprovalsWorkspace(){
 const [items,setItems]=useState<Approval[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  try{const r=await fetch("/api/astro/approvals",{cache:"no-store"});const d=await r.json();if(!r.ok){if(r.status===403)return;throw new Error(d.error||"تعذر تحميل الموافقات.");}setItems(d.approvals??[]);}
  catch(e){setError(e instanceof Error?e.message:"حدث خطأ.");}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function decide(id:string,decision:"approved"|"rejected"){
  if(busy)return;setBusy(true);setError("");setMessage("");
  try{const r=await fetch("/api/astro/approvals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({approvalId:id,decision})});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر تسجيل القرار.");setMessage(d.message);await load();}
  catch(e){setError(e instanceof Error?e.message:"حدث خطأ.");}finally{setBusy(false);}
 }
 if(!items.length&&!error)return null;
 return <section className="astro-approvals" dir="rtl"><div className="ops-heading"><div><h3>موافقات الإجراءات الحساسة</h3><p>لا ينفّذ Astro المدفوعات أو الحذف أو الرسائل الجماعية دون موافقة.</p></div><button className="ops-refresh" onClick={()=>void load()} disabled={busy}>تحديث</button></div>
 {error&&<p className="notice">{error}</p>}{message&&<p className="ops-success">{message}</p>}
 {items.map(item=><article className="astro-approval" key={item.id}><strong>{item.status==="pending"?"بانتظار القرار":item.status==="approved"?"تمت الموافقة":"مرفوض"}</strong><p>{item.requested_action}</p><small>{new Date(item.created_at).toLocaleString("ar-EG")}</small>{item.status==="pending"&&<div className="ops-inline"><button disabled={busy} onClick={()=>void decide(item.id,"approved")}>موافقة</button><button disabled={busy} onClick={()=>void decide(item.id,"rejected")}>رفض</button></div>}</article>)}
 <p className="ops-footnote">الموافقة تسجّل القرار فقط؛ لا تعني أن تكامل الدفع أو WhatsApp أو تنفيذ الحذف أصبح متاحًا.</p></section>;
}
