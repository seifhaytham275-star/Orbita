"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrbitaTheme, type OrbitaTheme } from "@/components/theme-provider";

type Section = "account" | "appearance" | "security" | "preferences";

export default function SettingsClient({
  initialName,
  username,
  initialRecoveryEmail
}: {
  initialName: string;
  username: string;
  initialRecoveryEmail: string;
}) {
  const { theme, setTheme } = useOrbitaTheme();
  const [section, setSection] = useState<Section>("account");
  const [name, setName] = useState(initialName);
  const [recoveryEmail, setRecoveryEmail] = useState(initialRecoveryEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    setNotifications(window.localStorage.getItem("orbita-notifications-v1") !== "off");
  }, []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function feedback(success = "", failure = "") {
    setNotice(success);
    setError(failure);
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); feedback();
    try {
      const db = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      const { error: updateError } = await db.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
      if (updateError) throw updateError;
      feedback("تم تحديث اسم الحساب.");
    } catch (e) { feedback("", e instanceof Error ? e.message : "تعذر تحديث الاسم."); }
    finally { setBusy(false); }
  }

  async function saveRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); feedback();
    try {
      const db = createSupabaseBrowserClient();
      const { data, error: updateError } = await db.auth.updateUser({ email: recoveryEmail.trim().toLowerCase() });
      if (updateError) throw updateError;
      if (data.user?.email?.toLowerCase() === recoveryEmail.trim().toLowerCase()) {
        feedback("تم تحديث البريد في الحساب. تأكد من أنه بريدك الشخصي ويمكنك الوصول إليه.");
      } else {
        feedback("تم إرسال طلب تأكيد إلى البريد الجديد. افتح الرسالة واضغط رابط التأكيد قبل استخدامه لاستعادة كلمة المرور.");
      }
    } catch (e) {
      feedback("", e instanceof Error ? e.message : "تعذر تحديث البريد. تأكد من صحة العنوان وحاول مرة أخرى.");
    } finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); feedback();
    if (newPassword.length < 12) { feedback("", "كلمة المرور الجديدة يجب أن تكون 12 حرفًا على الأقل."); return; }
    if (newPassword !== confirmPassword) { feedback("", "كلمتا المرور غير متطابقتين."); return; }
    setBusy(true);
    try {
      const db = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user?.email) throw new Error("تعذر التحقق من الحساب. سجّل الدخول مرة أخرى.");
      const { error: verifyError } = await db.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) throw new Error("كلمة المرور الحالية غير صحيحة.");
      const { error: updateError } = await db.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      feedback("تم تغيير كلمة المرور بنجاح.");
    } catch (e) { feedback("", e instanceof Error ? e.message : "تعذر تغيير كلمة المرور."); }
    finally { setBusy(false); }
  }

  function updateTheme(next: OrbitaTheme) {
    setTheme(next);
    feedback(next === "dark" ? "تم تفعيل المظهر الداكن." : "تم تفعيل المظهر الفاتح.");
  }

  function updateNotifications(value: boolean) {
    setNotifications(value);
    window.localStorage.setItem("orbita-notifications-v1", value ? "on" : "off");
    feedback(value ? "تم تفعيل تفضيل الإشعارات." : "تم إيقاف تفضيل الإشعارات.");
  }

  const sections: { id: Section; label: string; detail: string; icon: string }[] = [
    { id: "account", label: "الحساب", detail: "الاسم والبريد الاحتياطي", icon: "◉" },
    { id: "appearance", label: "المظهر", detail: "الوضع الداكن والفاتح", icon: "◐" },
    { id: "security", label: "الأمان", detail: "كلمة المرور", icon: "◇" },
    { id: "preferences", label: "التفضيلات", detail: "الإشعارات", icon: "⚙" }
  ];

  return <div className="settings-layout">
    <aside className="settings-sidebar" aria-label="قائمة الإعدادات">
      <p className="settings-sidebar-title">SETTINGS MENU</p>
      {sections.map(item => <button key={item.id} className={section === item.id ? "settings-nav-item active" : "settings-nav-item"} onClick={() => { setSection(item.id); feedback(); }}>
        <span className="settings-nav-icon">{item.icon}</span>
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        <span className="settings-nav-arrow">‹</span>
      </button>)}
      <div className="settings-sidebar-note"><span className="settings-online-dot"/> إعدادات مساحة ORBITA الخاصة بك</div>
    </aside>

    <section className="settings-content">
      {notice && <p className="settings-alert success" role="status">{notice}</p>}
      {error && <p className="settings-alert error" role="alert">{error}</p>}

      {section === "account" && <div className="settings-panel">
        <div className="settings-panel-heading"><div><p className="eyebrow">ACCOUNT PROFILE</p><h2>بيانات الحساب</h2><p>حدّث بياناتك وطريقة استعادة حسابك.</p></div><span className="settings-panel-mark">01</span></div>
        <form className="settings-form" onSubmit={saveName}>
          <label>اسم الحساب<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={120} required /></label>
          <label>اسم مستخدم الشركة<input value={username || "سيظهر بعد إنشاء مساحة الشركة"} readOnly /></label>
          <button disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ الاسم"}</button>
        </form>
        <div className="settings-divider"/>
        <div className="settings-subheading"><h3>بريد استرداد الحساب</h3><span className="settings-optional">اختياري</span></div>
        <p className="settings-help">أضف بريدًا تملكه وتستطيع فتحه. لن يظهر في نموذج إنشاء الحساب، وسيُستخدم لإرسال رابط إعادة تعيين كلمة المرور عند الحاجة.</p>
        <form className="settings-form" onSubmit={saveRecoveryEmail}>
          <label>Recovery email<input type="email" value={recoveryEmail} onChange={e=>setRecoveryEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required maxLength={254}/></label>
          <button disabled={busy}>{busy ? "جارٍ تحديث البريد..." : "حفظ بريد الاسترداد"}</button>
        </form>
        <p className="settings-footnote">قد تحتاج إلى تأكيد البريد من الرسالة التي تصلك قبل استخدامه للاستعادة.</p>
      </div>}

      {section === "appearance" && <div className="settings-panel">
        <div className="settings-panel-heading"><div><p className="eyebrow">PERSONALIZE YOUR SPACE</p><h2>المظهر</h2><p>اختر شكل واجهة ORBITA المناسب لك.</p></div><span className="settings-panel-mark">02</span></div>
        <div className="theme-options">
          <button className={theme === "dark" ? "theme-choice selected" : "theme-choice"} onClick={() => updateTheme("dark")} aria-pressed={theme === "dark"}>
            <span className="theme-preview theme-preview-dark"><i/><i/><i/></span><strong>Dark Mode</strong><small>واجهة داكنة مريحة</small>{theme === "dark" && <span className="theme-check">✓</span>}
          </button>
          <button className={theme === "light" ? "theme-choice selected" : "theme-choice"} onClick={() => updateTheme("light")} aria-pressed={theme === "light"}>
            <span className="theme-preview theme-preview-light"><i/><i/><i/></span><strong>Light Mode</strong><small>واجهة فاتحة وواضحة</small>{theme === "light" && <span className="theme-check">✓</span>}
          </button>
        </div>
        <p className="settings-footnote">سيتم حفظ اختيارك على هذا الجهاز وتطبيقه عند فتح ORBITA مرة أخرى.</p>
      </div>}

      {section === "security" && <div className="settings-panel">
        <div className="settings-panel-heading"><div><p className="eyebrow">ACCOUNT PROTECTION</p><h2>الأمان وكلمة المرور</h2><p>حافظ على كلمة مرور قوية وفريدة لحسابك.</p></div><span className="settings-panel-mark">03</span></div>
        <form className="settings-form" onSubmit={changePassword}>
          <label>كلمة المرور الحالية<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password" required /></label>
          <label>كلمة المرور الجديدة<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" minLength={12} required /></label>
          <label>تأكيد كلمة المرور الجديدة<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={12} required /></label>
          <p className="settings-help">استخدم 12 حرفًا على الأقل، ويفضل مزيجًا من الحروف والأرقام والرموز.</p>
          <button disabled={busy}>{busy ? "جارٍ تحديث كلمة المرور..." : "تغيير كلمة المرور"}</button>
        </form>
        <div className="settings-security-tip"><strong>نصيحة أمان</strong><p>لا تشارك كلمة المرور مع أي شخص، ولا تستخدم نفس كلمة المرور في مواقع أخرى.</p></div>
      </div>}

      {section === "preferences" && <div className="settings-panel">
        <div className="settings-panel-heading"><div><p className="eyebrow">YOUR PREFERENCES</p><h2>التفضيلات</h2><p>تحكم في بعض اختيارات تجربة الاستخدام.</p></div><span className="settings-panel-mark">04</span></div>
        <div className="settings-preference-row"><div><strong>تفضيل الإشعارات داخل الواجهة</strong><p>احفظ اختيارك لتجربة الاستخدام على هذا الجهاز.</p></div><button className={notifications ? "toggle-switch on" : "toggle-switch"} onClick={() => updateNotifications(!notifications)} aria-pressed={notifications}><span/></button></div>
        <p className="settings-footnote">هذا الاختيار يحفظ تفضيل الواجهة فقط؛ إرسال إشعارات البريد أو الهاتف يحتاج إلى تفعيل خدمة الإشعارات.</p>
      </div>}
    </section>
  </div>;
}
