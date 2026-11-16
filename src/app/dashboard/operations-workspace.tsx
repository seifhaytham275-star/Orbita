"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Customer={id:string;name:string;phone:string|null;email:string|null;notes:string|null};
type Product={id:string;name:string;sku:string|null;unit:string;quantity:number;reorder_level:number;unit_cost:number;sale_price:number};
type Invoice={id:string;invoice_number:string;customer_name:string;amount:number;status:string;due_date:string|null};
type Booking={id:string;title:string;starts_at:string;status:string};
type Tab="overview"|"customers"|"stock"|"invoices"|"bookings";
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP",maximumFractionDigits:2}).format(Number(n||0));

export default function OperationsWorkspace({organizationId}:{organizationId:string|null}){
 const [tab,setTab]=useState<Tab>("overview"),[customers,setCustomers]=useState<Customer[]>([]),[products,setProducts]=useState<Product[]>([]),[invoices,setInvoices]=useState<Invoice[]>([]),[bookings,setBookings]=useState<Booking[]>([]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
 const load=useCallback(async()=>{
  if(!organizationId)return;setBusy(true);setError("");const db=createSupabaseBrowserClient();
  const [c,p,i,b]=await Promise.all([
   db.from("customers").select("id,name,phone,email,notes").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
   db.from("products").select("id,name,sku,unit,quantity,reorder_level,unit_cost,sale_price").eq("organization_id",organizationId).order("name").limit(200),
   db.from("invoices").select("id,invoice_number,customer_name,amount,status,due_date").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
   db.from("bookings").select("id,title,starts_at,status").eq("organization_id",organizationId).order("starts_at").limit(100)
  ]);
  const failed=[c,p,i,b].find(x=>x.error);if(failed?.error)setError("تعذر تحميل بيانات الشركة. راجع صلاحيات قاعدة البيانات.");
  else{setCustomers(c.data??[]);setProducts(p.data??[]);setInvoices(i.data??[]);setBookings(b.data??[]);}setBusy(false);
 },[organizationId]);
 useEffect(()=>{void load();},[load,refresh]);
 async function submit(event:FormEvent<HTMLFormElement>,table:string,build:(d:FormData,userId:string)=>Record<string,unknown>){
  event.preventDefault();if(!organizationId||busy)return;const form=event.currentTarget;setBusy(true);setError("");setNotice("");
  try{const db=createSupabaseBrowserClient();const {data:{user},error:userError}=await db.auth.getUser();if(userError||!user)throw new Error("سجّل الدخول مرة أخرى.");
   const {error:e}=await db.from(table).insert(build(new FormData(form),user.id));if(e)throw e;form.reset();setNotice("تم حفظ البيانات بنجاح.");setRefresh(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"حدث خطأ أثناء الحفظ.");setBusy(false);}
 }
 async function changeStock(p:Product,delta:number){
  if(!organizationId||busy||Number(p.quantity)+delta<0)return;
  setBusy(true);setError("");setNotice("");
  const db=createSupabaseBrowserClient();
  const {data,error:adjustError}=await db.rpc("orbita_adjust_stock",{
   p_organization_id:organizationId,p_product_id:p.id,p_delta:delta,p_note:"تعديل من لوحة المخزون"
  });
  if(adjustError){setError("تعذر تحديث المخزون. لم يتم تسجيل حركة جزئية.");setBusy(false);return;}
  setNotice(`تم تحديث الرصيد إلى ${data} وتسجيل حركة المخزون بشكل ذري.`);
  setRefresh(v=>v+1);setBusy(false);
 }
 async function bookingStatus(b:Booking,status:string){
  if(!organizationId||busy)return;setBusy(true);const db=createSupabaseBrowserClient();const {error:e}=await db.from("bookings").update({status}).eq("id",b.id).eq("organization_id",organizationId);
  if(e)setError("تعذر تحديث حالة الموعد.");else setNotice("تم تحديث حالة الموعد.");setRefresh(v=>v+1);setBusy(false);
 }
 if(!organizationId)return <section className="ops-shell"><h2>إدارة الشركة</h2><p>اربط حسابك بشركة لاستخدام الأدوات.</p></section>;
 const tabs:[Tab,string][]=[["overview","نظرة عامة"],["customers","العملاء"],["stock","المخزون"],["invoices","الفواتير"],["bookings","الحجوزات"]];
 const outstanding=invoices.filter(x=>x.status!=="paid"&&x.status!=="cancelled").reduce((s,x)=>s+Number(x.amount),0);
 return <section className="ops-shell" dir="rtl">
  <div className="ops-heading"><div><p className="eyebrow">BUSINESS OPERATIONS</p><h2>إدارة عمليات الشركة</h2><p>إدارة سجلات فعلية خاصة بمساحة شركتك.</p></div><button className="ops-refresh" onClick={()=>setRefresh(v=>v+1)} disabled={busy}>تحديث</button></div>
  <nav className="ops-tabs">{tabs.map(([k,v])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{v}</button>)}</nav>
  {error&&<p className="notice">{error}</p>}{notice&&<p className="ops-success">{notice}</p>}{busy&&<p className="ops-muted">جارٍ تنفيذ العملية...</p>}
  {tab==="overview"&&<><div className="ops-stats"><article><span>العملاء</span><strong>{customers.length}</strong></article><article><span>الأصناف</span><strong>{products.length}</strong></article><article><span>فواتير غير مسددة</span><strong>{money(outstanding)}</strong></article><article><span>الحجوزات</span><strong>{bookings.length}</strong></article></div><div className="ops-columns"><article className="ops-panel"><h3>أصناف قاربت على النفاد</h3>{products.filter(p=>Number(p.quantity)<=Number(p.reorder_level)).map(p=><p className="ops-list-row" key={p.id}><b>{p.name}</b><span>{p.quantity} {p.unit}</span></p>)}{!products.some(p=>Number(p.quantity)<=Number(p.reorder_level))&&<p className="ops-muted">لا توجد أصناف منخفضة الرصيد.</p>}</article><article className="ops-panel"><h3>أحدث الفواتير</h3>{invoices.slice(0,6).map(i=><p className="ops-list-row" key={i.id}><b>{i.invoice_number}</b><span>{money(Number(i.amount))}</span></p>)}{!invoices.length&&<p className="ops-muted">لا توجد فواتير بعد.</p>}</article></div></>}
  {tab==="customers"&&<div className="ops-columns"><form className="ops-form" onSubmit={e=>submit(e,"customers",d=>({organization_id:organizationId,name:String(d.get("name")||"").trim(),phone:String(d.get("phone")||"").trim()||null,email:String(d.get("email")||"").trim()||null,notes:String(d.get("notes")||"").trim()||null}))}><h3>إضافة عميل</h3><label>اسم العميل<input name="name" required minLength={2} maxLength={160}/></label><label>رقم الهاتف<input name="phone" type="tel" maxLength={40}/></label><label>البريد الإلكتروني<input name="email" type="email" maxLength={200}/></label><label>ملاحظات<textarea name="notes" rows={3} maxLength={1000}/></label><button disabled={busy}>حفظ العميل</button></form><article className="ops-panel"><h3>العملاء ({customers.length})</h3>{customers.map(c=><div className="ops-record" key={c.id}><b>{c.name}</b><span>{c.phone||"لا يوجد هاتف"} · {c.email||"لا يوجد بريد"}</span>{c.notes&&<small>{c.notes}</small>}</div>)}{!customers.length&&<p className="ops-muted">لا يوجد عملاء بعد.</p>}</article></div>}
  {tab==="stock"&&<div className="ops-columns"><form className="ops-form" onSubmit={e=>submit(e,"products",d=>({organization_id:organizationId,name:String(d.get("name")||"").trim(),sku:String(d.get("sku")||"").trim()||null,unit:String(d.get("unit")||"قطعة"),quantity:Number(d.get("quantity")||0),reorder_level:Number(d.get("reorder_level")||0),unit_cost:Number(d.get("unit_cost")||0),sale_price:Number(d.get("sale_price")||0)}))}><h3>إضافة صنف</h3><label>اسم الصنف<input name="name" required maxLength={160}/></label><label>كود الصنف<input name="sku" maxLength={80}/></label><label>وحدة القياس<input name="unit" defaultValue="قطعة" maxLength={30}/></label><label>الرصيد الافتتاحي<input name="quantity" type="number" min="0" step="0.01" defaultValue="0"/></label><label>حد إعادة الطلب<input name="reorder_level" type="number" min="0" step="0.01" defaultValue="0"/></label><label>تكلفة الوحدة<input name="unit_cost" type="number" min="0" step="0.01" defaultValue="0"/></label><label>سعر البيع<input name="sale_price" type="number" min="0" step="0.01" defaultValue="0"/></label><button disabled={busy}>حفظ الصنف</button></form><article className="ops-panel"><h3>الأصناف ({products.length})</h3>{products.map(p=><div className="ops-record" key={p.id}><b>{p.name} {p.sku&&<small>({p.sku})</small>}</b><span>الرصيد: {p.quantity} {p.unit} · حد الطلب: {p.reorder_level}</span><span>التكلفة {money(Number(p.unit_cost))} · البيع {money(Number(p.sale_price))}</span><div className="ops-inline"><button disabled={busy||Number(p.quantity)<=0} onClick={()=>changeStock(p,-1)}>صرف وحدة</button><button disabled={busy} onClick={()=>changeStock(p,1)}>إضافة وحدة</button></div></div>)}{!products.length&&<p className="ops-muted">لا توجد أصناف بعد.</p>}</article></div>}
  {tab==="invoices"&&<div className="ops-columns"><form className="ops-form" onSubmit={e=>submit(e,"invoices", (d,userId)=>({organization_id:organizationId,created_by:userId,invoice_number:"INV-"+Date.now(),customer_name:String(d.get("customer_name")||"").trim(),amount:Number(d.get("amount")||0),currency:"EGP",status:String(d.get("status")||"draft"),due_date:String(d.get("due_date")||"")||null}))}><h3>إنشاء فاتورة</h3><label>اسم العميل<input name="customer_name" required maxLength={160}/></label><label>المبلغ بالجنيه<input name="amount" type="number" required min="0.01" step="0.01"/></label><label>تاريخ الاستحقاق<input name="due_date" type="date"/></label><label>الحالة<select name="status"><option value="draft">مسودة</option><option value="issued">صادرة</option></select></label><button disabled={busy}>حفظ الفاتورة</button><small>سجل داخلي وليس فاتورة ضريبية أو إلكترونية معتمدة.</small></form><article className="ops-panel"><h3>الفواتير ({invoices.length})</h3>{invoices.map(i=><div className="ops-record" key={i.id}><b>{i.invoice_number} · {i.customer_name}</b><span>{money(Number(i.amount))} · {i.status==="paid"?"مدفوعة":i.status==="issued"?"صادرة":i.status==="cancelled"?"ملغاة":"مسودة"}</span><small>{i.due_date?"الاستحقاق: "+i.due_date:"بدون تاريخ استحقاق"}</small></div>)}{!invoices.length&&<p className="ops-muted">لا توجد فواتير بعد.</p>}</article></div>}
  {tab==="bookings"&&<div className="ops-columns"><form className="ops-form" onSubmit={e=>submit(e,"bookings",(d,userId)=>({organization_id:organizationId,created_by:userId,title:String(d.get("title")||"").trim(),starts_at:new Date(String(d.get("starts_at"))).toISOString(),ends_at:String(d.get("ends_at")||"")?new Date(String(d.get("ends_at"))).toISOString():null,status:"booked",notes:String(d.get("notes")||"").trim()||null}))}><h3>إضافة حجز أو موعد</h3><label>عنوان الموعد<input name="title" required maxLength={180}/></label><label>البداية<input name="starts_at" type="datetime-local" required/></label><label>النهاية<input name="ends_at" type="datetime-local"/></label><label>ملاحظات<textarea name="notes" rows={3} maxLength={1000}/></label><button disabled={busy}>حفظ الموعد</button></form><article className="ops-panel"><h3>المواعيد ({bookings.length})</h3>{bookings.map(b=><div className="ops-record" key={b.id}><b>{b.title}</b><span>{new Date(b.starts_at).toLocaleString("ar-EG")}</span><div className="ops-inline"><span>{b.status==="booked"?"مؤكد":b.status==="cancelled"?"ملغي":b.status}</span><button disabled={busy||b.status==="cancelled"} onClick={()=>bookingStatus(b,"cancelled")}>إلغاء</button><button disabled={busy||b.status==="completed"} onClick={()=>bookingStatus(b,"completed")}>إتمام</button></div></div>)}{!bookings.length&&<p className="ops-muted">لا توجد مواعيد.</p>}</article></div>}
  <p className="ops-footnote">السجلات تخص شركتك فقط. لا يرسل هذا الإصدار رسائل WhatsApp ولا يصدر فواتير ضريبية إلكترونية معتمدة.</p>
 </section>;
}
