import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Agent = "Ledger" | "Echo" | "Pulse" | "Stock" | "Reach" | "Insight" | "Studio" | "Chatbot";
type OrgContext = { id: string; name: string; industry: string; role: string; planCode: string };

const routing: Array<{ agent: Agent; keywords: string[] }> = [
  { agent: "Studio", keywords: ["بوست","ريل","ستوري","reel","story","post","social media content"] },
  { agent: "Stock", keywords: ["مخزون","صنف","منتج","شراء","كمية","رصيد","سكر","أرز","رز","دقيق","زيت","جرام","غرام","كيلو","stock","inventory","product"] },
  { agent: "Pulse", keywords: ["حجز","موعد","تذكير","booking","appointment","reminder"] },
  { agent: "Ledger", keywords: ["فاتورة","حساب","مبيعات","مصروف","invoice","account","sales"] },
  { agent: "Echo", keywords: ["عميل","رسالة","طلب","واتساب","خدمة العملاء","customer","order","whatsapp"] },
  { agent: "Reach", keywords: ["تسويق","إعلان","منشور","محتوى","حملة","marketing","content","campaign"] },
  { agent: "Insight", keywords: ["تقرير","تحليل","ملخص","أداء","إحصائيات","report","analytics","summary"] }
];

const money = (value: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(value);
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

function parseCairoLocalDateTime(dateValue: string, timeValue: string): Date | null {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const target = Date.UTC(year, month - 1, day, hour, minute);
  const normalized = new Date(target);
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() !== month - 1 || normalized.getUTCDate() !== day) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  let candidate = new Date(target - 2 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(candidate);
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
    const actual = Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")), Number(part("hour")), Number(part("minute")));
    const delta = target - actual;
    if (delta === 0) return candidate;
    candidate = new Date(candidate.getTime() + delta);
  }
  return null;
}

async function getContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string): Promise<OrgContext | null> {
  const { data, error } = await supabase.from("memberships")
    .select("organization_id,role,organizations(name,industry,subscription_status,features_enabled,trial_ends_at,subscription_ends_at,plan_code)")
    .eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error || !data) return null;
  const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;
  const accessEndsAt = org?.subscription_ends_at ?? org?.trial_ends_at;
  const accessEndsAtMs = accessEndsAt ? Date.parse(accessEndsAt) : Number.NaN;
  if (!org || !org.features_enabled || !["active", "trial"].includes(org.subscription_status) ||
      !Number.isFinite(accessEndsAtMs) || accessEndsAtMs <= Date.now()) return null;
  return { id: data.organization_id, name: org.name, industry: org.industry, role: data.role, planCode: org.plan_code || "free" };
}

function pickAgent(message: string): Agent {
  const normalized = message.toLocaleLowerCase("ar");
  return routing.find(item => item.keywords.some(keyword => normalized.includes(keyword)))?.agent ?? "Insight";
}

async function routeAgent(message: string, selectedAgent?: Agent): Promise<{ agent: Agent; mode: "local_rules"; provider: "orbita-local" }> {
  if (selectedAgent) return { agent: selectedAgent, mode: "local_rules", provider: "orbita-local" };
  return { agent: pickAgent(message), mode: "local_rules", provider: "orbita-local" };
}

type OpenRouterReply = { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }> };
async function generateWithOpenRouter(planCode: string, agent: Agent, userMessage: string, groundedResult: Record<string, unknown>): Promise<{ text: string; model: string } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const isBusiness = planCode === "business";
  const model = ((isBusiness ? process.env.OPENROUTER_BUSINESS_MODEL : process.env.OPENROUTER_MAX_MODEL)?.trim()) || (isBusiness ? "anthropic/claude-sonnet-4" : "google/gemini-2.5-flash");
  const system = agent === "Studio"
    ? "You are Orbita Studio, a professional social media creative producer. Create a useful Arabic creative package for the requested Post, Reel, or Story: hook, caption, scene/slide sequence, visual direction, and CTA. Return concise, actionable Arabic. Do not claim to create an actual image/video file or publish content."
    : agent === "Chatbot"
      ? "You are Orbita Business Chatbot, an assistant for this company's authorized workspace. Answer the user's question in Arabic using only the provided company facts. Do not invent financial, customer, inventory, or booking facts. If data is missing, say so. Never perform actions or claim to have done them."
      : "You are Orbita's business operations AI. Explain the completed agent result clearly in Arabic. Treat the supplied result as the source of truth; do not invent values or claim any extra action. Keep all approvals and safety restrictions intact.";
  const prompt = JSON.stringify({ user_request: userMessage, verified_agent_result: groundedResult });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://orbita-seifhaytham275-star.vercel.app", "X-Title": "Orbita" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: prompt.slice(0, 12000) }], temperature: 0.45, max_tokens: agent === "Studio" ? 700 : 500 }),
    signal: AbortSignal.timeout(20000), cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("OpenRouter تعذر عليه إكمال الطلب (" + response.status + "). تأكد من موديل الباقة ورصيد الحساب." + (detail ? "" : ""));
  }
  const data = await response.json() as OpenRouterReply;
  const content = data.choices?.[0]?.message?.content;
  const text = (typeof content === "string" ? content : Array.isArray(content) ? content.map(part => part.text || "").join("\\n") : "").trim();
  if (!text) throw new Error("OpenRouter رجّع ردًا فارغًا. جرّب مرة أخرى.");
  return { text: text.slice(0, 7000), model };
}

async function executeAgent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  org: OrgContext,
  userId: string,
  agent: Agent,
  message: string
): Promise<{ result: Record<string, unknown>; reply: string; status: "completed" | "needs_approval" }> {
  if (agent === "Studio") {
    const format = /ريل|reel|short video/i.test(message) ? "Reel" : /ستوري|story/i.test(message) ? "Story" : "Post";
    const topic = message.replace(/^(?:اعمل|جهز|أنشئ|انشئ|صمم)?\\s*(?:بوست|بوستات|منشور|ريل|reel|ستوري|story)?\\s*/i, "").trim() || org.industry;
    const brief = { format, topic, brand: org.name, industry: org.industry, hook: format === "Reel" ? "ابدأ بلقطة تلفت الانتباه خلال أول 3 ثوانٍ." : format === "Story" ? "رسالة قصيرة مع سؤال أو تصويت." : "عنوان واضح يبرز فائدة واحدة.", outline: format === "Reel" ? ["Hook","المشكلة أو الحاجة","الحل أو المنتج","دعوة لاتخاذ إجراء"] : format === "Story" ? ["افتتاحية قصيرة","ميزة أو عرض","CTA تفاعلي"] : ["Headline","Value proposition","Proof point","CTA"], caption: org.name + ": " + topic + ". تواصل معنا لمعرفة التفاصيل.", visual_direction: "استخدم ألوان وهوية الشركة، صورة واضحة للمنتج، ونصًا قليلًا عالي التباين.", note: "مسودة إبداعية؛ لم يتم نشر المحتوى أو إنشاء ملف فيديو فعلي." };
    return { status: "completed", result: { action: "studio_content_brief", ...brief }, reply: "Orbita Studio جهز خطة " + format + " حول: " + topic + "\\n\\n" + brief.outline.join(" → ") + "\\n\\nCaption: " + brief.caption + "\\n\\nVisual: " + brief.visual_direction + "\\n\\nدي خطة محتوى أولية، مش تصميم أو فيديو نهائي منشور." };
  }
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
    const normalizedMessage = message.replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const stockInput = normalizedMessage.match(/(?:عندي|لدينا|متوفر(?:\s+عندنا)?|سجل(?:\s+في\s+المخزون)?|أضف|اضف|ضيف)(?:\s+رصيد)?\s*(\d+(?:[.,]\d+)?)\s*(جرام|غرام|جم|كيلوجرام|كيلو|كجم|مل|لتر|قطعة|علبة|كرتونة)?\s+(?:من\s+)?(.+)/i);
    const legacyInput = normalizedMessage.match(/(?:أضف|اضف|سجل|ضيف).*?(?:صنف|منتج)?\s*([^،,]+?)\s+(?:بكمية|كمية|عدد)\s*(\d+(?:[.,]\d+)?)/i);
    const input = stockInput
      ? { quantity: Number(stockInput[1].replace(",", ".")), unit: stockInput[2] || "قطعة", name: stockInput[3], mode: /^(?:عندي|لدينا|متوفر)/i.test(normalizedMessage) ? "set" : "add" }
      : legacyInput && /(?:أضف|اضف|سجل|ضيف)/i.test(normalizedMessage)
        ? { quantity: Number(legacyInput[2]), unit: "قطعة", name: legacyInput[1], mode: "add" }
        : null;

    if (input) {
      const name = input.name.replace(/\s+(?:في\s+المخزون|عندنا)$/i, "").trim().replace(/^(?:صنف|منتج)\s*/i, "").slice(0, 160);
      const quantity = input.quantity;
      const unitAliases: Record<string, string> = { غرام: "جرام", جم: "جرام", كيلو: "كيلوجرام", كجم: "كيلوجرام" };
      const unit = unitAliases[input.unit] || input.unit;
      if (!name || !Number.isFinite(quantity) || quantity <= 0) throw new Error("اكتب اسم الصنف وكمية أكبر من صفر، مثال: عندي 500 جرام سكر.");
      const { data: existing, error: findError } = await supabase.from("products")
        .select("id,name,quantity,unit").eq("organization_id", org.id).ilike("name", name).limit(1).maybeSingle();
      if (findError) throw new Error("تعذر التحقق من الصنف الحالي في المخزون.");
      if (existing) {
        if (unit !== existing.unit && !(unit === "قطعة" && !stockInput)) {
          throw new Error(`وحدة الصنف المسجلة هي "${existing.unit}" وليست "${unit}". لم أغيّر المخزون لتجنب خلط الوحدات.`);
        }
        const delta = input.mode === "set" ? quantity - Number(existing.quantity) : quantity;
        if (delta === 0) {
          return { status: "completed", result: { action: "stock_verified", product: existing }, reply: `رصيد ${existing.name} بالفعل ${existing.quantity} ${existing.unit}، ولم أغيّر أي شيء.` };
        }
        const { data: newQuantity, error: adjustError } = await supabase.rpc("orbita_adjust_stock", {
          p_organization_id: org.id, p_product_id: existing.id, p_delta: delta,
          p_note: input.mode === "set" ? "تحديث الرصيد من Astro" : "إضافة كمية من Astro"
        });
        if (adjustError) throw new Error("تعذر تحديث رصيد الصنف. لم يتم تسجيل حركة جزئية.");
        return { status: "completed", result: { action: input.mode === "set" ? "stock_set" : "stock_added", product_id: existing.id, name: existing.name, previous_quantity: existing.quantity, quantity: newQuantity, unit: existing.unit }, reply: input.mode === "set" ? `تم تحديث رصيد ${existing.name} إلى ${newQuantity} ${existing.unit}.` : `تمت إضافة ${quantity} ${existing.unit} إلى ${existing.name}. الرصيد الجديد ${newQuantity} ${existing.unit}.` };
      }
      const { data: productId, error: createError } = await supabase.rpc("orbita_create_product", {
        p_organization_id: org.id, p_name: name, p_quantity: quantity, p_unit: unit,
        p_reorder_level: 0, p_unit_cost: 0, p_sale_price: 0
      });
      if (createError || !productId) throw new Error("تعذر إضافة الصنف. لم يتم حفظ رصيد جزئي.");
      const { data: created, error: readError } = await supabase.from("products").select("id,name,quantity,unit")
        .eq("id", productId).eq("organization_id", org.id).single();
      if (readError || !created) throw new Error("تم تسجيل الصنف لكن تعذر قراءة تفاصيله.");
      return { status: "completed", result: { action: "product_created", product: created }, reply: `تم تسجيل ${created.name} في المخزون برصيد ${created.quantity} ${created.unit}.` };
    }

    const { data, error } = await supabase.from("products")
      .select("id,name,sku,quantity,unit,reorder_level").eq("organization_id", org.id).order("name").limit(300);
    if (error) throw new Error("تعذر قراءة المخزون.");
    const queryMatch = normalizedMessage.match(/(?:كام|كم)\s+(?:من\s+)?(.+?)(?:\s*[؟?])?$/i)
      || normalizedMessage.match(/(?:رصيد|كمية)\s+(.+?)(?:\s*[؟?])?$/i);
    const queryName = queryMatch?.[1]?.trim().replace(/^(?:عندنا|لدينا)\s+/, "").replace(/\s+(?:عندنا|في المخزون)$/, "");
    const matches = queryName
      ? (data ?? []).filter(p => p.name.toLocaleLowerCase("ar").includes(queryName.toLocaleLowerCase("ar")))
      : (data ?? []);
    if (queryName && matches.length === 0) {
      return { status: "completed", result: { action: "product_not_found", query: queryName }, reply: `مش لاقي صنف باسم "${queryName}" مسجل في مخزون الشركة. لم أضف أو أغيّر أي بيانات.` };
    }
    const low = matches.filter(p => Number(p.quantity) <= Number(p.reorder_level));
    const summary = matches.slice(0, 30).map(p => `${p.name}: ${p.quantity} ${p.unit}`).join("؛ ");
    return {
      status: "completed",
      result: { action: queryName ? "product_stock_lookup" : "inventory_report", query: queryName || null, count: matches.length, products: matches, low_stock: low },
      reply: queryName ? summary : `المخزون يحتوي على ${matches.length} صنف. الأصناف عند حد إعادة الطلب أو أقل: ${low.length}. ${summary || "لا توجد أصناف مسجلة بعد."}`
    };
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
    const { data, error } = await supabase.from("invoices").select("invoice_number,customer_name,amount,status,due_date,created_at").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("تعذر قراءة الفواتير.");
    const customerQuery = message.match(/(?:فواتير|فاتورة)\s+(?:العميل|لـ|ل)\s*(.+)$/i)?.[1]?.trim();
    const filtered = customerQuery ? (data ?? []).filter(i => i.customer_name.toLocaleLowerCase("ar").includes(customerQuery.toLocaleLowerCase("ar"))) : (data ?? []);
    const unpaid = filtered.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Number(i.amount), 0);
    const paid = filtered.filter(i => i.status === "paid").reduce((sum, i) => sum + Number(i.amount), 0);
    const lines = filtered.slice(0, 15).map(i => `${i.invoice_number} — ${i.customer_name} — ${money(Number(i.amount))} — ${i.status}`).join("\n");
    return { status: "completed", result: { action: customerQuery ? "customer_invoice_summary" : "invoice_summary", customer: customerQuery ?? null, invoices: filtered, outstanding: unpaid, paid }, reply: `${customerQuery ? `فواتير ${customerQuery}: ` : ""}عدد الفواتير ${filtered.length}. المسدد ${money(paid)}، وغير المسدد ${money(unpaid)}.\n${lines || "لا توجد فواتير مطابقة."}` };
  }

  if (agent === "Pulse") {
    const dateMatch = message.match(/(20\d{2}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/);
    const titleMatch = message.match(/(?:احجز|سجل موعد|أضف موعد|اضف موعد|حدد موعد)\s*(?:لـ|ل|مع)?\s*([^،,]+?)(?=\s+(?:يوم|بتاريخ|في)\s+20\d{2}-|$)/i);
    if (dateMatch && titleMatch) {
      const startsAt = parseCairoLocalDateTime(dateMatch[1], dateMatch[2]);
      if (!startsAt || startsAt.getTime() < Date.now()) throw new Error("موعد الحجز يجب أن يكون تاريخًا مستقبليًا صحيحًا بتوقيت القاهرة.");
      const title = titleMatch[1].trim().slice(0, 180);
      const { data, error } = await supabase.from("bookings").insert({ organization_id: org.id, created_by: userId, title, starts_at: startsAt.toISOString(), status: "booked" }).select("id,title,starts_at,status").single();
      if (error) throw new Error("تعذر تسجيل الموعد.");
      return { status: "completed", result: { action: "booking_created", booking: data }, reply: `تم تسجيل موعد "${title}" يوم ${startsAt.toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}.` };
    }
    const { data, error } = await supabase.from("bookings").select("title,starts_at,status,customer_id,customers(name)").eq("organization_id", org.id).gte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at").limit(100);
    if (error) throw new Error("تعذر تحميل المواعيد.");
    const searchTerm = message.match(/(?:مواعيد|موعد)\s+(?:العميل|لـ|ل)\s*(.+)$/i)?.[1]?.trim();
    const filtered = searchTerm ? (data ?? []).filter(b => {
      const customer = Array.isArray(b.customers) ? b.customers[0] : b.customers;
      return b.title.toLocaleLowerCase("ar").includes(searchTerm.toLocaleLowerCase("ar")) || (customer?.name ?? "").toLocaleLowerCase("ar").includes(searchTerm.toLocaleLowerCase("ar"));
    }) : (data ?? []);
    const lines = filtered.slice(0, 20).map(b => `${b.title} — ${new Date(b.starts_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })} — ${b.status}`).join("\n");
    return { status: "completed", result: { action: searchTerm ? "customer_booking_lookup" : "booking_list", query: searchTerm ?? null, bookings: filtered }, reply: `${searchTerm ? `مواعيد ${searchTerm}: ` : "المواعيد القادمة: "}${filtered.length} موعد.\n${lines || "لا توجد مواعيد مطابقة."}` };
  }

  if (agent === "Echo") {
    const normalized = message.replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const addCustomer = normalized.match(/(?:سجل|أضف|اضف|ضيف)\s+(?:عميل|زبون)\s+(.+?)(?:\s+(?:رقم|موبايل|تليفون)\s*([+\d\s-]+))?$/i);
    if (addCustomer) {
      const name = addCustomer[1].trim().slice(0, 180);
      const phone = addCustomer[2]?.replace(/\s+/g, "") || null;
      if (!name) throw new Error("اكتب اسم العميل.");
      const { data: existing, error: findError } = await supabase.from("customers").select("id,name,phone").eq("organization_id", org.id).ilike("name", name).limit(1).maybeSingle();
      if (findError) throw new Error("تعذر التحقق من سجل العملاء.");
      if (existing) return { status: "completed", result: { action: "customer_exists", customer: existing }, reply: `العميل ${existing.name} مسجل بالفعل في قاعدة بيانات الشركة.` };
      const { data, error } = await supabase.from("customers").insert({ organization_id: org.id, name, phone }).select("id,name,phone,created_at").single();
      if (error) throw new Error("تعذر تسجيل العميل.");
      return { status: "completed", result: { action: "customer_created", customer: data }, reply: `تم تسجيل العميل ${data.name} بنجاح في سجل العملاء.` };
    }
    const customerQuery = normalized.match(/(?:بيانات|معلومات|دور على|ابحث عن)\s+(?:العميل|عميل)?\s*(.+)$/i)?.[1]?.trim();
    const { data, error } = await supabase.from("customers").select("name,phone,email,notes,created_at").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("تعذر قراءة سجل العملاء.");
    const customers = customerQuery ? (data ?? []).filter(x => x.name.toLocaleLowerCase("ar").includes(customerQuery.toLocaleLowerCase("ar")) || (x.phone ?? "").includes(customerQuery)) : (data ?? []).slice(0, 15);
    if (customerQuery) {
      const list = customers.map(x => `${x.name} — ${x.phone || "لا يوجد رقم مسجل"} — ${x.email || "لا يوجد بريد"}`).join("\n");
      return { status: "completed", result: { action: "customer_lookup", query: customerQuery, customers }, reply: list || `مش لاقي عميل مطابق لـ "${customerQuery}" في سجل الشركة.` };
    }
    const template = `أهلًا بحضرتك، شكرًا لتواصلك مع ${org.name}. يسعدنا مساعدتك. من فضلك ابعت تفاصيل طلبك أو استفسارك، وفريقنا هيتابع معاك.`;
    return { status: "completed", result: { action: "customer_service_draft", draft: template, recent_customers: customers, delivery: "not_connected" }, reply: `جهزت مسودة رد لخدمة العملاء: "${template}" لم يتم إرسال أي رسالة؛ لا يوجد ربط إرسال خارجي مفعّل.` };
  }

  if (agent === "Reach") {
    const topic = message.replace(/^(?:اكتب|اعمل|جهز|جهّز|أنشئ|انشئ)?\s*(?:منشور|محتوى|إعلان|اعلان|حملة تسويقية)?\s*/i, "").trim() || org.industry;
    const isOffer = /عرض|خصم|تخفيض|offer|discount/i.test(message);
    const isLaunch = /افتتاح|جديد|إطلاق|اطلاق|launch/i.test(message);
    const isAwareness = /تعريف|نبذة|من نحن|awareness/i.test(message);
    const hook = isOffer ? "عندنا عرض مميز لفترة محدودة!" : isLaunch ? "استنوا الجديد مننا!" : isAwareness ? `خلينا نعرّفكم على ${org.name}.` : `بتدور على ${topic}؟`;
    const value = isOffer ? "استفيدوا من العرض واسألونا عن التفاصيل والشروط." : isLaunch ? "تابعونا علشان تعرفوا كل التفاصيل أول بأول." : isAwareness ? `بنشتغل في مجال ${org.industry} وهدفنا نقدم خدمة واضحة وتجربة مريحة.` : "هنساعدك تختار الحل المناسب لاحتياجك بخطوات واضحة.";
    const draft = `✨ ${hook}\n\n${value}\n\n📩 ابعتلنا رسالة واعرف التفاصيل.\n\n#${org.name.replace(/\s+/g, "_")} #${org.industry.replace(/\s+/g, "_")}`;
    return { status: "completed", result: { action: "marketing_draft", draft, topic, campaign_type: isOffer ? "offer" : isLaunch ? "launch" : isAwareness ? "awareness" : "general", generated_by: "local_template_engine" }, reply: `جهزت مسودة تسويقية مناسبة لنوع الطلب:\n${draft}\nدي مسودة محلية قابلة للتعديل وليست منشورًا منشورًا بالفعل.` };
  }

  const [customers, products, invoices, bookings] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
    supabase.from("products").select("id,name,quantity,unit,reorder_level,unit_cost,sale_price").eq("organization_id", org.id).order("name").limit(500),
    supabase.from("invoices").select("invoice_number,customer_name,amount,status,created_at").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(500),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("organization_id", org.id).gte("starts_at", new Date().toISOString()).neq("status", "cancelled")
  ]);
  if (customers.error || products.error || invoices.error || bookings.error) throw new Error("تعذر تكوين التقرير من بيانات الشركة.");
  const outstandingInvoices = (invoices.data ?? []).filter(i => i.status !== "paid" && i.status !== "cancelled");
  const paidInvoices = (invoices.data ?? []).filter(i => i.status === "paid");
  const outstanding = outstandingInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const paid = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const lowStock = (products.data ?? []).filter(p => Number(p.quantity) <= Number(p.reorder_level));
  const stockCostValue = (products.data ?? []).reduce((sum, p) => sum + Number(p.quantity) * Number(p.unit_cost), 0);
  const stockLines = lowStock.slice(0, 8).map(p => `${p.name} (${p.quantity} ${p.unit})`).join("، ");
  const report = { customers: customers.count ?? 0, products: products.data?.length ?? 0, low_stock: lowStock.length, low_stock_items: lowStock, invoices: invoices.data?.length ?? 0, paid_invoices: paidInvoices.length, outstanding_invoices: outstandingInvoices.length, paid_egp: paid, outstanding_egp: outstanding, stock_cost_value_egp: stockCostValue, upcoming_bookings: bookings.count ?? 0 };
  return { status: "completed", result: { action: "business_summary", ...report }, reply: `ملخص ${org.name}: العملاء ${report.customers}، الأصناف ${report.products}، الأصناف منخفضة المخزون ${report.low_stock} (${stockLines || "لا يوجد"})، الفواتير ${report.invoices}، قيمة الفواتير المسددة ${money(paid)}، غير المسددة ${money(outstanding)}، قيمة المخزون بالتكلفة المسجلة ${money(stockCostValue)}، المواعيد القادمة ${report.upcoming_bookings}. الأرقام محسوبة من بيانات الشركة المسجلة.` };
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
  const availableAgents: Agent[] = org.planCode === "free" ? ["Insight", "Ledger"] : org.planCode === "pro" ? ["Insight", "Ledger", "Stock"] : ["Insight", "Ledger", "Stock", "Pulse", "Reach", "Echo", "Studio", ...(org.planCode === "business" ? ["Chatbot" as Agent] : [])];
  return NextResponse.json({ tasks: tasks ?? [], planCode: org.planCode, availableAgents, features: { studio: ["max", "business"].includes(org.planCode), voice: org.planCode === "business", chatbot: org.planCode === "business", aiProvider: ["max", "business"].includes(org.planCode) ? "openrouter" : "local" }, intelligence: { mode: "local_rules", provider: "orbita-local" } });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const body: unknown = await request.json().catch(() => null);
  const rawMessage = body && typeof body === "object" && !Array.isArray(body) && "message" in body
    ? (body as { message?: unknown }).message : undefined;
  const rawAgent = body && typeof body === "object" && !Array.isArray(body) && "agent" in body
    ? (body as { agent?: unknown }).agent : undefined;
  const allowedAgents: Agent[] = ["Ledger", "Echo", "Pulse", "Stock", "Reach", "Insight", "Studio", "Chatbot"];
  if (rawAgent !== undefined && rawAgent !== null && (typeof rawAgent !== "string" || !allowedAgents.includes(rawAgent as Agent))) return fail("الوكيل المحدد غير صالح.");
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message || message.length > 1200) return fail("اكتب مهمة واضحة (حتى 1200 حرف).");
  const org = await getContext(supabase, user.id);
  if (!org) return fail("لا توجد شركة نشطة مرتبطة بحسابك أو انتهت فترة الوصول.", 403);

  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count: recentTasks, error: rateError } = await supabase.from("agent_tasks")
    .select("id", { count: "exact", head: true }).eq("organization_id", org.id)
    .eq("requested_by", user.id).gte("created_at", windowStart);
  if (rateError) return fail("تعذر التحقق من معدل الطلبات. حاول مرة أخرى.", 503);
  if ((recentTasks ?? 0) >= 20) return fail("وصلت للحد المؤقت: 20 مهمة في الدقيقة. انتظر قليلًا ثم حاول.", 429);

  const route = await routeAgent(message, typeof rawAgent === "string" ? rawAgent as Agent : undefined);
  const agent = route.agent;
  const planAgents: Agent[] = org.planCode === "free" ? ["Insight", "Ledger"] : org.planCode === "pro" ? ["Insight", "Ledger", "Stock"] : ["Insight", "Ledger", "Stock", "Pulse", "Reach", "Echo", "Studio", ...(org.planCode === "business" ? ["Chatbot" as Agent] : [])];
  if (!planAgents.includes(agent)) return fail("الوكيل ده متاح في باقات أعلى. راجع صفحة الباقات.", 403);
  const { data: task, error: taskError } = await supabase.from("agent_tasks").insert({
    organization_id: org.id, requested_by: user.id, agent_name: agent,
    title: message.slice(0, 180), input: { message, routing_mode: route.mode, model: route.provider }, status: "running"
  }).select("id,agent_name,title,status,created_at").single();
  if (taskError || !task) return fail("تعذر تسجيل المهمة قبل التنفيذ. لم يتم تنفيذ أي إجراء.", 503);

  try {
    const execution = await executeAgent(supabase, org, user.id, agent, message);
    let finalReply = execution.reply;
    let provider = "orbita-local";
    if (["max", "business"].includes(org.planCode)) {
      try {
        const generated = await generateWithOpenRouter(org.planCode, agent, message, execution.result);
        if (generated) {
          finalReply = generated.text;
          provider = "openrouter:" + generated.model;
          if (agent === "Studio") execution.result = { ...execution.result, generated_content: generated.text, generated_by: "openrouter", model: generated.model };
        } else {
          finalReply += "\\n\\nملاحظة: OpenRouter غير مضبوط في إعدادات الخادم؛ تم استخدام الرد المحلي.";
        }
      } catch {
        finalReply += "\\n\\nملاحظة: تعذر الاتصال بموديل OpenRouter؛ تم الاحتفاظ بنتيجة الوكيل المحلية.";
        provider = "orbita-local-fallback";
      }
    }
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
      metadata: { agent_name: agent, status: execution.status, routing_mode: route.mode, provider: route.provider }
    });
    return NextResponse.json({ task: updated, reply: finalReply, intelligence: { mode: route.mode, provider } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "حدث خطأ أثناء تنفيذ المهمة.";
    await supabase.from("agent_tasks").update({ status: "failed", result: { error: reason }, updated_at: new Date().toISOString() })
      .eq("id", task.id).eq("organization_id", org.id);
    return fail(reason, 422);
  }
}
