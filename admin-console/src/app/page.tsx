"use client";

import { useState, type FormEvent } from "react";

const sections = [
  { id: "overview", label: "نظرة عامة", marker: "01" },
  { id: "users", label: "المستخدمون", marker: "02" },
  { id: "subscriptions", label: "الاشتراكات", marker: "03" },
  { id: "payments", label: "المدفوعات", marker: "04" },
  { id: "astro", label: "Astro والوكلاء", marker: "05" },
  { id: "settings", label: "الإعدادات", marker: "06" },
] as const;

type SectionId = (typeof sections)[number]["id"];

const sectionDetails: Record<SectionId, { title: string; description: string }> = {
  overview: {
    title: "نظرة عامة",
    description: "ملخص لوحة إدارة ORBITA.",
  },
  users: {
    title: "المستخدمون",
    description: "إدارة حسابات المستخدمين — هذا القسم غير متصل بقاعدة البيانات حالياً.",
  },
  subscriptions: {
    title: "الاشتراكات",
    description: "متابعة الخطط والاشتراكات — هذا القسم غير متصل بقاعدة البيانات حالياً.",
  },
  payments: {
    title: "المدفوعات",
    description: "مراجعة عمليات الدفع — هذا القسم غير متصل بقاعدة البيانات حالياً.",
  },
  astro: {
    title: "Astro والوكلاء",
    description: "متابعة المساعد والوكلاء المتخصصين — هذا القسم غير متصل ببيانات التشغيل حالياً.",
  },
  settings: {
    title: "الإعدادات",
    description: "إعدادات المنصة — لا توجد تغييرات فعلية متاحة في وضع المعاينة.",
  },
};

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username.trim().toLowerCase() !== "seif") {
      setError("اسم المستخدم غير صحيح.");
      return;
    }

    setError("");
    setEntered(true);
  }

  if (!entered) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-mark">O</div>
          <p className="eyebrow">ORBITA · ADMIN CONSOLE</p>
          <h1>لوحة تحكم ORBITA</h1>
          <p className="login-description">اكتب اسم المستخدم لفتح معاينة لوحة الإدارة.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="admin-username">اسم المستخدم</label>
            <input
              id="admin-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Seif"
              required
            />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button type="submit">دخول لوحة المعاينة</button>
          </form>

          <div className="preview-notice">
            <strong>وضع المعاينة فقط</strong>
            <span>هذه الصفحة تعرض واجهة تجريبية فقط، ولا تفتح بيانات العملاء أو تنفذ عمليات إدارية.</span>
          </div>
        </section>
      </main>
    );
  }

  const active = sectionDetails[activeSection];

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark small-mark">O</div>
          <div>
            <strong>ORBITA</strong>
            <span>ADMIN CONSOLE</span>
          </div>
        </div>

        <div className="sidebar-label">القائمة الرئيسية</div>
        <nav className="nav-list" aria-label="القائمة الرئيسية">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "nav-item active" : "nav-item"}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-marker">{section.marker}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          <span>معاينة غير متصلة</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">ADMINISTRATION / {activeSection.toUpperCase()}</p>
            <h1>{active.title}</h1>
            <p className="page-description">{active.description}</p>
          </div>
          <div className="top-actions">
            <span className="preview-pill">PREVIEW MODE</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setEntered(false);
                setUsername("");
                setActiveSection("overview");
              }}
            >
              تسجيل الخروج
            </button>
          </div>
        </header>

        {activeSection === "overview" ? (
          <>
            <section className="welcome-panel">
              <div>
                <span className="welcome-kicker">مرحباً بك في ORBITA</span>
                <h2>كل أدوات الإدارة في مكان واحد.</h2>
                <p>تم تجهيز الواجهة الأساسية. عند ربط خدمات الإدارة الآمنة ستظهر هنا بيانات المنصة الفعلية.</p>
              </div>
              <div className="orbita-symbol" aria-hidden="true">O</div>
            </section>

            <section className="stats-grid" aria-label="ملخص المنصة">
              {[
                ["إجمالي المستخدمين", "—", "بانتظار ربط البيانات"],
                ["الاشتراكات النشطة", "—", "بانتظار ربط البيانات"],
                ["المدفوعات", "—", "بانتظار ربط البيانات"],
                ["مهام Astro", "—", "بانتظار ربط البيانات"],
              ].map(([label, value, note]) => (
                <article className="stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </section>

            <section className="connection-panel">
              <div className="connection-icon">i</div>
              <div>
                <h2>الواجهة جاهزة، والربط التشغيلي لم يكتمل بعد</h2>
                <p>لا يتم عرض أرقام تجريبية على أنها بيانات حقيقية. لا توجد حالياً اتصالات بقاعدة بيانات العملاء أو أنظمة الدفع أو أدوات التحكم.</p>
              </div>
            </section>
          </>
        ) : (
          <section className="empty-state">
            <div className="empty-state-mark">{sections.find((item) => item.id === activeSection)?.marker}</div>
            <span className="preview-pill">قيد الربط</span>
            <h2>{active.title}</h2>
            <p>{active.description}</p>
            <p className="muted-copy">هذا القسم ظاهر في التصميم فقط حالياً، ولن ينفذ أي إجراء أو يغيّر بيانات ORBITA.</p>
          </section>
        )}

        <footer className="admin-footer">
          <span>ORBITA Admin Console</span>
          <span>واجهة معاينة · لا توجد بيانات تشغيل متصلة</span>
        </footer>
      </main>
    </div>
  );
}
