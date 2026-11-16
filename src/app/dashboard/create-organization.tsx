"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateOrganization() {
  const [name,setName] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إنشاء الشركة");
      setMessage("تم إنشاء مساحة الشركة بنجاح.");
      setName("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    } finally { setBusy(false); }
  }

  return <section className="dash-panel">
    <h2>إنشاء مساحة شركة</h2>
    <form className="org-form" onSubmit={submit}>
      <input value={name} onChange={event=>setName(event.target.value)} minLength={2} maxLength={120} required placeholder="اسم الشركة أو النشاط التجاري"/>
      <button disabled={busy}>{busy ? "جارٍ الإنشاء..." : "إنشاء الشركة"}</button>
    </form>
    {message && <p role="status">{message}</p>}
  </section>;
}
