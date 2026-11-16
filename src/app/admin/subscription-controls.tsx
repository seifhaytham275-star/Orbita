"use client";
import { useState } from "react";

export default function SubscriptionControls({ organizationId, initialStatus, initialFeatures }: {
  organizationId: string; initialStatus: string; initialFeatures: boolean;
}) {
  const [status,setStatus] = useState(initialStatus);
  const [features,setFeatures] = useState(initialFeatures);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  async function save(next: { subscription_status?: string; features_enabled?: boolean }) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/subscription`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تحديث الاشتراك");
      if (next.subscription_status) setStatus(next.subscription_status);
      if (next.features_enabled !== undefined) setFeatures(next.features_enabled);
      setMessage("تم الحفظ");
    } catch (error) { setMessage(error instanceof Error ? error.message : "حدث خطأ"); }
    finally { setBusy(false); }
  }
  return <div className="admin-controls">
    <span>الحالة: {status === "active" ? "نشط" : status === "suspended" ? "موقوف" : status === "trial" ? "تجريبي" : status}</span>
    <button type="button" disabled={busy} className="secondary-action" onClick={()=>save({subscription_status: status === "suspended" ? "active" : "suspended"})}>
      {status === "suspended" ? "إعادة تفعيل الاشتراك" : "إيقاف الاشتراك"}
    </button>
    <button type="button" disabled={busy} className="secondary-action" onClick={()=>save({features_enabled: !features})}>
      {features ? "تعطيل المميزات" : "تفعيل المميزات"}
    </button>
    <small>{message}</small>
  </div>;
}
