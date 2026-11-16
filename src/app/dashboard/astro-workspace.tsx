"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };
type Task = { id: string; agent_name: string; title: string; status: string; created_at: string };

const agents = [
  { name: "Ledger", label: "الحسابات والفواتير", description: "الفواتير والسجلات المالية" },
  { name: "Echo", label: "خدمة العملاء", description: "الطلبات ومتابعة العملاء" },
  { name: "Pulse", label: "الحجوزات", description: "المواعيد والتذكيرات" },
  { name: "Stock", label: "المخزون", description: "الأصناف وحركة المخزون" },
  { name: "Reach", label: "التسويق", description: "أفكار ومحتوى التسويق" },
  { name: "Insight", label: "التحليلات", description: "ملخصات وتقارير الأعمال" }
];

export default function AstroWorkspace({ organizationId }: { organizationId: string | null }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "أهلًا، أنا Astro مساعد Orbita. اكتب المهمة، وسأحدد الأداة المتخصصة وأسجلها في مساحة شركتك." }
  ]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || busy) return;
    const text = prompt.trim();
    setMessages(current => [...current, { role: "user", text }]);
    setPrompt("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/astro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر توجيه المهمة.");
      setMessages(current => [...current, { role: "assistant", text: data.reply }]);
      if (data.task) setTasks(current => [data.task, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="astro-shell">
    <div className="astro-heading">
      <div><p className="eyebrow">YOUR AI WORKSPACE</p><h2>ASTRO <span>مساعد Orbita</span></h2><p>اطلب، وAstro يوجّه المهمة للـAgent المختص.</p></div>
      <span className="astro-status">نموذج أولي</span>
    </div>
    <div className="astro-grid">
      <div className="astro-chat">
        <div className="astro-messages" aria-live="polite">
          {messages.map((message, index) => <div className={message.role === "user" ? "astro-message user" : "astro-message"} key={index}><small>{message.role === "user" ? "أنت" : "ASTRO"}</small><p>{message.text}</p></div>)}
        </div>
        <form className="astro-form" onSubmit={submit}>
          <input value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="مثال: جهّز ملخص للمخزون..." aria-label="اكتب مهمة إلى Astro" disabled={busy || !organizationId}/>
          <button disabled={busy || !organizationId || !prompt.trim()}>{busy ? "جارٍ التوجيه..." : "إرسال"}</button>
        </form>
        {!organizationId && <p className="astro-hint">اربط حسابك بشركة أولًا لاستخدام المهام.</p>}
        {error && <p className="notice">{error}</p>}
      </div>
      <aside className="astro-agents"><h3>فريق Agents</h3>{agents.map((agent, index) => <div className="astro-agent" key={agent.name}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{agent.name}</strong><p>{agent.label} · {agent.description}</p></div></div>)}</aside>
    </div>
    <div className="astro-task-list"><h3>المهام التي تم توجيهها</h3>{tasks.length ? tasks.map(task => <div className="astro-task" key={task.id}><strong>{task.agent_name}</strong><span>{task.title}</span><small>{task.status === "queued" ? "مسجلة — بانتظار التنفيذ" : task.status}</small></div>) : <p>ستظهر هنا المهام بعد إرسالها إلى Astro.</p>}</div>
    <p className="astro-disclaimer">تنبيه: هذا إصدار MVP أولي؛ توجيه المهام وتسجيلها يعملان بعد إعداد قاعدة البيانات. التنفيذ الآلي الكامل وربط نموذج لغوي فعلي قيد التطوير.</p>
  </section>;
}
