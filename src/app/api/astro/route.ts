import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Agent = "Ledger" | "Echo" | "Pulse" | "Stock" | "Reach" | "Insight";
type OrgContext = { id: string; name: string; industry: string; role: string };

const routing: Array<{ agent: Agent; keywords: string[] }> = [
  { agent: "Stock", keywords: ["مخزون","صنف","منتج","شراء","كمية","stock","inventory","product"] },
  { agent: "Pulse", keywords: ["حجز","موعد","تذكير","booking","appointment","reminder"] },
  { agent: "Ledger", keywords: ["فاتورة","حساب","مبيعات","مصروف","invoice","account","sales"] },
  { agent: "Echo", keywords: ["عميل","رسالة","طلب","واتساب","خدمة العملاء","customer","order","whatsapp"] },
  { agent: "Reach", keywords: ["تسويق","إعلان","منشور","محتوى","حملة","marketing","content","campaign"] },
  { agent: "Insight", keywords: ["تقرير","تحليل","ملخص","أداء","إحصائيات","report","analytics","summary"] }
];

const money = (value: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(value);
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function getContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string): Promise<OrgContext | null> {
  const { data, error } = await supabase.from("memberships")
    .select("organization_id,role,organizations(name,industry,subscription_status,features_enabled,trial_ends_at)")
    .eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error || !data) return null;
  const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;
  if (!org || !org.features_enabled || new Date(org.trial_ends_at) < new Date()) return null;
  return { id: data.organization_id, name: org.name, industry: org.industry, role: data.role };
}

function pickAgent(message: string): Agent {
  const normalized = message.toLocaleLowerCase("ar");
  return routing.find(item => item.keywords.some(keyword => normalized.includes(keyword)))?.agent ?? "Insight";
}

async function executeAgent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  org: OrgContext,
  userId: string,
  agent: Agent,
  message: string
): Promise<{ result: Record<string, unknown>; reply: string; status: "completed" | "needs_approval" }> {
  const lower = message.toLocaleLowerCase("ar");

  // Sensitive actions are never executed by an agent without explicit owner/manager approval.
  const sensitive = /(ادفع|تحويل|استرداد|refund|payment|delete|احذف|امسح|ابعت.*للعملاء|ارسل.*للعملاء|رسالة جماعية|mass message)/i.test(message);
  if (sensitive) {
    if (!["owner", "manager"].includes(org.role)) throw new Error("الإجراء ده يحتاج موافقة مالك الشركة أو المدير.");
    return {
      status: "needs_approval",
      result: { kind: "approval_required", requested_action: message, reason: "Sensitive action requires owner or manager review." },
      reply: "الإجراء حساس، لذلك لم أنفذه. سجلت طلب موافقة للمراجعة قبل أي تنفيذ."
    };
  }

  if (agent === "Stock") {
    const addMatch = message.match(/(?:أضف|اضف|سجل|ضيف).*?(?:صنف|منتج)?\s*([^،,]+?)\s+(?:بكمية|كمية|عدد)\s*(\d+(?:\.\d+)?)/i);
    if (addMatch && /(أضف|اضف|سجل|ضيف)/i.test(message)) {
      const name = addMatch[1].trim().replace(/^(?:صنف|منتج)\s*/i, "").slice(0, 180);
      const quantity = Number(addMatch[2]);
      if (!name || !Number.isFinite(quantity) || quantity < 0) throw new Error("اكتب اسم الصنف والكمية بشكل صحيح، مثال: أضف صنف ورق بكمية 20.");
      const { data, error } = await supabase.from("products").insert({ organization_id: org.id, name, quantity, unit: "قطعة", reorder_level: 0, unit_cost: 0, sale_price: 0 }).select("id,name,quantity,unit").single();
      if (error) throw new Error("تعذر إضافة الصنف. راجع بيانات المخزون وصلاحيات الحساب.");
      await supabase.from("stock_movements").insert({ organization_id: org.id, product_id: data.id, movement_type: "in", quantity, note: "رصيد افتتاحي من Astro", created_by: userId });
      return { status: "completed", result: { action: "product_created", product: data }, reply: `تمت إضافة الصنف "${data.name}" برصيد ${data.quantity} ${data.unit}.` };
    }
    const { data, error } = await supabase.from("products").select("name,sku,quantity,unit,reorder_level").eq("organization_id", org.id).order("name").limit(100);
    if (error) throw new Error("تعذر قراءة المخزون.");
    const low = (data ?? []).filter(p => Number(p.quantity) <= Number(p.reorder_level));
    const summary = (data ?? []).slice(0, 12).map(p => `${p.name}: ${p.quantity} ${p.unit}`).join("؛ ");
    return { status: "completed", result: { action: "inventory_report", count: data?.length ?? 0, low_stock: low }, reply: `المخزون يحتوي على ${data?.length ?? 0} صنف. أصناف وصلت لحد إعادة الطلب: ${low.length}. ${summary || "لا توجد أصناف مسجلة بعد."}` };
  }

  if (agent === "Ledger") {
    const amountMatch = message.match(/(?:مبلغ|بقيمة|بمبلغ|amount)\s*(\d+(?:\.\d+)?)/i);
    const customerMatch = message.match(/(?:للعميل|لعميل|العميل|customer)\s*([^،,]+?)(?=\s+(?:بمبلغ|مبلغ|بقيمة)|$)/i);
    if (/(?:أنشئ|انشئ|اعمل|سجل|إصدار|اصدر).*فاتورة/i.test(message) && amountMatch && customerMatch) {
      const amount = Number(amountMatch[1]);
      const customerName = customerMatch[1].trim().slice(0, 160);
      if (!(amount > 0) || !customerName) throw new Error("اكتب اسم العميل والمبلغ بوضوح.");
      const invoiceNumber = `ORB-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase.from("invoices").insert({ organization_id: org.id, created_by: userId, invoice_number: invoiceNumber, customer_name: customerName, amount, currency: "EGP", status: "draft" }).select("id,invoice_number,customer_name,amount,status").single();
      if (error) throw new Error("تعذر إنشاء الفاتورة. راجع صلاحيات الحساب.");
      return { status: "completed", result: { action: "invoice_created", invoice: data }, reply: `تم إنشاء مسودة فاتورة رقم ${data.invoice_number} للعميل ${data.customer_name} بقيمة ${money(amount)}. دي مسودة داخلية وليست فاتورة ضريبية إلكترونية.` };
    }
    const { data, error } = await supabase.from("invoices").select("invoice_number,customer_name,amount,status").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(20);
    if (error) throw new Error("تعذر قراءة الفواتير.");
    const unpaid = (data ?? []).filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Number(i.amount), 0);
    return { status: "completed", result: { action: "invoice_summary", invoices: data ?? [], outstanding: unpaid }, reply: `عدد آخر الفواتير المعروضة: ${data?.length ?? 0}. إجمالي الفواتير غير المسددة: ${money(unpaid)}.` };
  }

  if (agent === "Pulse") {
    const dateMatch = message.match(/(20\d{2}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/);
    const titleMatch = message.match(/(?:احجز|سجل موعد|أضف موعد|اضف موعد|حدد موعد)\s*(?:لـ|ل|مع)?\s*([^،,]+?)(?=\s+(?:يوم|بتاريخ|في)\s+20\d{2}-|$)/i);
    if (dateMatch && titleMatch) {
      const startsAt = new Date(`${dateMatch[1]}T${dateMatch[2]}:00+02:00`);
      if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now()) throw new Error("موعد الحجز يجب أن يكون تاريخًا مستقبليًا صحيحًا.");
      const title = titleMatch[1].trim().slice(0, 180);
      const { data, error } = await supabase.from("bookings").insert({ organization_id: org.id, created_by: userId, title, starts_at: startsAt.toISOString(), status: "booked" }).select("id,title,starts_at,status").single();
      if (error) throw new Error("تعذر تسجيل الموعد.");
      return { status: "completed", result: { action: "booking_created", booking: data }, reply: `تم تسجيل موعد "${title}" يوم ${startsAt.toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}.` };
    }
    const { data, error } = await supabase.from("bookings").select("title,starts_at,status").eq("organization_id", org.id).order("starts_at").limit(20);
    if (error) throw new Error("تعذر تحميل المواعيد.");
    return { status: "completed", result: { action: "booking_list", bookings: data ?? [] }, reply: `لديك ${data?.length ?? 0} موعدًا في قائمة المواعيد القادمة المعروضة.` };
  }

  if (agent === "Echo") {
    const { data, error } = await supabase.from("customers").select("name,phone").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(10);
    if (error) throw new Error("تعذر قراءة سجل العملاء.");
    const template = `أهلًا بحضرتك، شكرًا لتواصلك مع ${org.name}. يسعدنا مساعدتك. من فضلك ابعت تفاصيل طلبك أو استفسارك، وفريقنا هيتابع معاك.`;
    return { status: "completed", result: { action: "customer_service_draft", draft: template, recent_customers: data ?? [], delivery: "not_connected" }, reply: `جهزت لك مسودة رد لخدمة العملاء: "${template}" لم يتم إرسال أي رسالة؛ ربط WhatsApp غير مفعّل بعد.` };
  }

  if (agent === "Reach") {
    const topic = message.replace(/^(?:اكتب|اعمل|جهز|جهّز|أنشئ|انشئ)?\s*(?:منشور|محتوى|إعلان|اعلان|حملة تسويقية)?\s*/i, "").trim() || org.industry;
    const draft = `✨ ${org.name}\n\nبتدور على ${topic}؟ إحنا هنا علشان نسهّل عليك ونقدملك تجربة مناسبة لاحتياجاتك.\n\n📩 ابعتلنا رسالة واعرف التفاصيل.\n\n#${org.name.replace(/\s+/g, "_")} #${org.industry.replace(/\s+/g, "_")}`;
    return { status: "completed", result: { action: "marketing_draft", draft, generated_by: "template_engine" }, reply: `جهزت مسودة محتوى تسويقي مبدئية:
${draft}
دي مسودة قالبية وليست ناتج نموذج ذكاء اصطناعي.` };
  }

  const [customers, products, invoices, bookings] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
    supabase.from("products").select("id,name,quantity,reorder_level").eq("organization_id", org.id),
    supabase.from("invoices").select("amount,status").eq("organization_id", org.id),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("organization_id", org.id).gte("starts_at", new Date().toISOString())
  ]);
  if (customers.error || products.error || invoices.error || bookings.error) throw new Error("تعذر تكوين التقرير من بيانات الشركة.");
  const outstanding = (invoices.data ?? []).filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Number(i.amount), 0);
  const lowStock = (products.data ?? []).filter(p => Number(p.quantity) <= Number(p.reorder_level));
  const report = { customers: customers.count ?? 0, products: products.data?.length ?? 0, low_stock: lowStock.length, invoices: invoices.data?.length ?? 0, outstanding_egp: outstanding, upcoming_bookings: bookings.count ?? 0 };
  return { status: "completed", result: { action: "business_summary", ...report }, reply: `ملخص ${org.name}: العملاء ${report.customers}، الأصناف ${report.products}، الأصناف منخفضة المخزون ${report.low_stock}، الفواتير ${report.invoices}، المبالغ غير المسددة ${money(outstanding)}، المواعيد القادمة ${report.upcoming_bookings}.` };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const org = await getContext(supabase, user.id);
  if (!org) return fail("لا توجد شركة نشطة مرتبطة بحسابك أو انتهت فترة الوصول.", 403);
  const { data: tasks, error } = await supabase.from("agent_tasks").select("id,agent_name,title,status,result,created_at")
    .eq("organization_id", org.id).order("created_at", { ascending: false }).limit(25);
  if (error) return fail("تعذر تحميل سجل المهام.", 503);
  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const body = await request.json().catch(() => null) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message || message.length > 1200) return fail("اكتب مهمة واضحة (حتى 1200 حرف).");
  const org = await getContext(supabase, user.id);
  if (!org) return fail("لا توجد شركة نشطة مرتبطة بحسابك أو انتهت فترة الوصول.", 403);

  const agent = pickAgent(message);
  const { data: task, error: taskError } = await supabase.from("agent_tasks").insert({
    organization_id: org.id, requested_by: user.id, agent_name: agent,
    title: message.slice(0, 180), input: { message }, status: "running"
  }).select("id,agent_name,title,status,created_at").single();
  if (taskError || !task) return fail("تعذر تسجيل المهمة قبل التنفيذ. لم يتم تنفيذ أي إجراء.", 503);

  try {
    const execution = await executeAgent(supabase, org, user.id, agent, message);
    if (execution.status === "needs_approval") {
      const { error: approvalError } = await supabase.from("agent_approvals").insert({
        organization_id: org.id, task_id: task.id, requested_action: message,
        payload: execution.result, status: "pending"
      });
      if (approvalError) throw new Error("تعذر إنشاء طلب الموافقة؛ لم يتم تنفيذ الإجراء.");
    }
    const { data: updated, error: updateError } = await supabase.from("agent_tasks").update({
      result: execution.result, status: execution.status, updated_at: new Date().toISOString()
    }).eq("id", task.id).eq("organization_id", org.id).select("id,agent_name,title,status,result,created_at").single();
    if (updateError || !updated) throw new Error("تعذر تحديث حالة المهمة بعد التنفيذ.");
    await supabase.from("audit_logs").insert({
      organization_id: org.id, actor_id: user.id, action: "astro.task_executed",
      target_type: "agent_task", target_id: task.id,
      metadata: { agent_name: agent, status: execution.status }
    });
    return NextResponse.json({ task: updated, reply: execution.reply });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "حدث خطأ أثناء تنفيذ المهمة.";
    await supabase.from("agent_tasks").update({
      status: "failed", result: { error: reason }, updated_at: new Date().toISOString()
    }).eq("id", task.id).eq("organization_id", org.id);
    return fail(reason, 422);
  }
}
