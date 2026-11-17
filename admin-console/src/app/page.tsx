"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type SectionId = "overview" | "users" | "subscriptions" | "payments" | "astro" | "settings";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  platform_role: string;
  created_at: string;
};

type Organization = {
  id: string;
  name: string;
  industry: string | null;
  plan_code: string;
  subscription_status: string;
  features_enabled: boolean;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  ownerEmail: string | null;
  ownerName: string | null;
};

type Payment = {
  id: string;
  organization_id: string;
  user_id: string;
  method: string;
  amount: number | string;
  currency: string;
  customer_reference: string | null;
  status: string;
  created_at: string;
  plan_code: string | null;
  billing_period_months: number;
  admin_note: string | null;
  organizationName: string;
  accountEmail: string | null;
};

type AgentTask = {
  id: string;
  agent_name: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Plan = {
  code: string;
  name: string;
  monthly_price: number | string;
  currency: string;
  active: boolean;
  limits: Record<string, unknown>;
  features: Record<string, unknown>;
};

type Dashboard = {
  stats: {
    accounts: number;
    organizations: number;
    activeSubscriptions: number;
    payments: number;
    pendingPayments: number;
    agentTasks: number;
  };
  profiles: Profile[];
  organizations: Organization[];
  payments: Payment[];
  agentTasks: AgentTask[];
  plans: Plan[];
  generatedAt: string;
};

const sections: { id: SectionId; label: string; marker: string }[] = [
  { id: "overview", label: "نظرة عامة", marker: "01" },
  { id: "users", label: "حسابات العملاء", marker: "02" },
  { id: "subscriptions", label: "الاشتراكات", marker: "03" },
  { id: "payments", label: "المدفوعات", marker: "04" },
  { id: "astro", label: "Astro والوكلاء", marker: "05" },
  { id: "settings", label: "الباقات", marker: "06" },
];

const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";

const money = (value: number | string, currency = "EGP") =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));

const statusLabel = (status: string) => ({
  active: "نشط",
  trial: "تجريبي",
  suspended: "موقوف",
  expired: "منتهي",
  pending_review: "بانتظار المراجعة",
  pending_provider: "بانتظار تأكيد المزود",
  paid: "مدفوع",
  rejected: "مرفوض",
  expired_payment: "منتهي",
  queued: "في الانتظار",
  running: "قيد التنفيذ",
  needs_approval: "يحتاج موافقة",
  completed: "مكتمل",
  failed: "فشل",
}[status] ?? status);

function Status({ value }: { value: string }) {
  const tone = ["active", "paid", "completed"].includes(value)
    ? "good"
    : ["pending_review", "pending_provider", "trial", "queued", "running", "needs_approval"].includes(value)
      ? "warning"
      : "muted";
  return <span className={`status-tag ${tone}`}>{statusLabel(value)}</span>;
}


function SubscriptionControls({
  organizationId,
  plans,
  busy,
  onActivate,
}: {
  organizationId: string;
  plans: Plan[];
  busy: boolean;
  onActivate: (organizationId: string, planCode: string, months: number) => void;
}) {
  const [planCode, setPlanCode] = useState(plans.find((plan) => plan.active)?.code ?? "");
  const [months, setMonths] = useState(1);
  return (
    <div className="subscription-controls">
      <select aria-label="الباقة" value={planCode} onChange={(event) => setPlanCode(event.target.value)}>
        {plans.filter((plan) => plan.active).map((plan) => (
          <option key={plan.code} value={plan.code}>{plan.name}</option>
        ))}
      </select>
      <select aria-label="مدة الاشتراك" value={months} onChange={(event) => setMonths(Number(event.target.value))}>
        <option value={1}>شهر واحد</option>
        <option value={3}>3 أشهر</option>
        <option value={6}>6 أشهر</option>
        <option value={12}>12 شهرًا</option>
      </select>
      <button type="button" className="primary-button" disabled={busy || !planCode} onClick={() => onActivate(organizationId, planCode, months)}>
        {busy ? "جارٍ التفعيل…" : "تفعيل / تمديد"}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [username, setUsername] = useState("Seif");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyPayment, setBusyPayment] = useState<string | null>(null);
  const [busySubscription, setBusySubscription] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل بيانات الإدارة.");
      setDashboard(data as Dashboard);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then(async (data) => {
        if (!mounted) return;
        if (data.authenticated) {
          setAuthenticated(true);
          await loadDashboard();
        }
      })
      .catch(() => {
        if (mounted) setError("تعذر التحقق من جلسة الإدارة.");
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => { mounted = false; };
  }, [loadDashboard]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تسجيل الدخول.");
      setAuthenticated(true);
      setPassword("");
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setDashboard(null);
    setPassword("");
    setActiveSection("overview");
    setNotice("");
  }

  async function reviewPayment(payment: Payment, decision: "paid" | "rejected") {
    const message = decision === "paid"
      ? "اعتمد الدفع فقط بعد التأكد من وصول المبلغ فعليًا إلى حساب InstaPay، وليس اعتمادًا على رقم المرجع وحده. هل تحققت من التحويل؟"
      : "هل تريد رفض طلب الدفع هذا؟";
    if (!window.confirm(message)) return;

    setBusyPayment(payment.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/payments/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث طلب الدفع.");
      setNotice(decision === "paid" ? "تم اعتماد الدفع وتحديث الاشتراك." : "تم رفض طلب الدفع.");
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث طلب الدفع.");
    } finally {
      setBusyPayment(null);
    }
  }


  async function activateSubscription(organizationId: string, planCode: string, months: number) {
    const organization = dashboard?.organizations.find((item) => item.id === organizationId);
    if (!organization) return;
    const plan = dashboard?.plans.find((item) => item.code === planCode);
    const confirmed = window.confirm(
      `تأكيد تفعيل باقة ${plan?.name ?? planCode} لمدة ${months} شهرًا للعميل "${organization.name}"؟ هذه عملية تفعيل إدارية ولا تثبت استلام دفعة.`,
    );
    if (!confirmed) return;

    setBusySubscription(organizationId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/subscriptions/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, planCode, months }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تفعيل الاشتراك.");
      setNotice("تم تفعيل / تمديد الاشتراك بنجاح، وتم تسجيل العملية في سجل الإدارة.");
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تفعيل الاشتراك.");
    } finally {
      setBusySubscription(null);
    }
  }

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  if (checkingSession) {
    return <main className="login-screen"><div className="loading-card">جارٍ التحقق من جلسة الإدارة…</div></main>;
  }

  if (!authenticated) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-mark">O</div>
          <p className="eyebrow">ORBITA · ADMIN CONSOLE</p>
          <h1>تسجيل دخول الإدارة</h1>
          <p className="login-description">استخدم حساب الإدارة المسجل للوصول إلى بيانات العملاء والاشتراكات والمدفوعات.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="admin-username">اسم المستخدم</label>
            <input id="admin-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
            <label htmlFor="admin-password">كلمة المرور</label>
            <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button type="submit" disabled={loading}>{loading ? "جارٍ التحقق…" : "دخول لوحة الإدارة"}</button>
          </form>
          <p className="setup-link"><a href="/setup">ليس لديك حساب إدارة؟ إنشاء حساب الإدارة لأول مرة</a></p>
          <div className="preview-notice">
            <strong>وصول محمي</strong>
            <span>الجلسة مشفرة ومؤقتة، ومحاولات الدخول الفاشلة محدودة من قاعدة البيانات.</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark small-mark">O</div>
          <div><strong>ORBITA</strong><span>ADMIN CONSOLE</span></div>
        </div>
        <div className="sidebar-label">القائمة الرئيسية</div>
        <nav className="nav-list" aria-label="القائمة الرئيسية">
          {sections.map((section) => (
            <button key={section.id} type="button" className={activeSection === section.id ? "nav-item active" : "nav-item"} onClick={() => { setActiveSection(section.id); setError(""); setNotice(""); }}>
              <span className="nav-marker">{section.marker}</span><span>{section.label}</span>
              {section.id === "payments" && dashboard?.stats.pendingPayments ? <b className="nav-count">{dashboard.stats.pendingPayments}</b> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><span className="status-dot" /><span>متصل بقاعدة بيانات ORBITA</span></div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">ADMINISTRATION / {active.id.toUpperCase()}</p>
            <h1>{active.label}</h1>
            <p className="page-description">لوحة الإدارة متصلة ببيانات ORBITA الفعلية.</p>
          </div>
          <div className="top-actions">
            <span className="secure-pill">SECURE SESSION · SEIF</span>
            <button type="button" className="ghost-button" onClick={() => loadDashboard()} disabled={loading}>{loading ? "تحديث…" : "تحديث البيانات"}</button>
            <button type="button" className="ghost-button" onClick={handleLogout}>تسجيل الخروج</button>
          </div>
        </header>

        {error ? <div className="alert error-alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success-alert" role="status">{notice}</div> : null}

        {!dashboard ? (
          <section className="empty-state"><h2>تعذر تحميل البيانات</h2><p>تأكد من إعدادات اتصال قاعدة البيانات ثم حدّث الصفحة.</p><button className="primary-button" onClick={loadDashboard}>إعادة المحاولة</button></section>
        ) : null}

        {dashboard && activeSection === "overview" ? (
          <>
            <section className="welcome-panel">
              <div><span className="welcome-kicker">مرحباً بك في ORBITA</span><h2>صورة مباشرة عن حالة المنصة.</h2><p>الأرقام التالية مأخوذة من قاعدة البيانات، ويتم تحديثها عند الضغط على زر تحديث البيانات.</p></div>
              <div className="orbita-symbol" aria-hidden="true">O</div>
            </section>
            <section className="stats-grid">
              <article className="stat-card"><span>حسابات العملاء</span><strong>{dashboard.stats.accounts}</strong><small>حسابات مسجلة في ORBITA</small></article>
              <article className="stat-card"><span>المؤسسات</span><strong>{dashboard.stats.organizations}</strong><small>حسابات الشركات المسجلة</small></article>
              <article className="stat-card"><span>الاشتراكات النشطة</span><strong>{dashboard.stats.activeSubscriptions}</strong><small>نشطة أو تجريبية وسارية</small></article>
              <article className="stat-card"><span>طلبات الدفع المعلقة</span><strong>{dashboard.stats.pendingPayments}</strong><small>تحتاج مراجعة الإدارة</small></article>
            </section>
            <section className="content-grid">
              <article className="panel"><div className="panel-heading"><h2>أحدث الحسابات</h2><button className="text-button" onClick={() => setActiveSection("users")}>عرض الكل</button></div>
                {dashboard.profiles.slice(0, 5).map((profile) => <div className="list-row" key={profile.id}><div><strong>{profile.display_name || "مستخدم ORBITA"}</strong><small>{profile.email || "بدون بريد إلكتروني"}</small></div><span className="date-copy">{dateTime(profile.created_at)}</span></div>)}
                {!dashboard.profiles.length ? <p className="empty-copy">لا توجد حسابات مسجلة بعد.</p> : null}
              </article>
              <article className="panel"><div className="panel-heading"><h2>حالة المدفوعات</h2><button className="text-button" onClick={() => setActiveSection("payments")}>فتح المدفوعات</button></div>
                <div className="mini-stat"><span>إجمالي طلبات الدفع</span><strong>{dashboard.stats.payments}</strong></div>
                <div className="mini-stat"><span>بانتظار المراجعة</span><strong>{dashboard.stats.pendingPayments}</strong></div>
                <div className="mini-stat"><span>مهام الوكلاء المسجلة</span><strong>{dashboard.stats.agentTasks}</strong></div>
              </article>
            </section>
          </>
        ) : null}

        {dashboard && activeSection === "users" ? (
          <section className="panel table-panel"><div className="panel-heading"><div><h2>حسابات عملاء ORBITA</h2><p>الحسابات المسجلة على المنصة، وليس سجلات عملاء كل مؤسسة الخاصة.</p></div><span className="count-pill">{dashboard.stats.accounts} حساب</span></div>
            <div className="table-wrap"><table><thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>نوع الحساب</th><th>تاريخ التسجيل</th></tr></thead><tbody>
              {dashboard.profiles.map((profile) => <tr key={profile.id}><td>{profile.display_name || "—"}</td><td>{profile.email || "—"}</td><td>{profile.platform_role === "admin" ? "إدارة" : "عميل"}</td><td>{dateTime(profile.created_at)}</td></tr>)}
            </tbody></table></div>
            {!dashboard.profiles.length ? <p className="empty-copy">لا توجد حسابات.</p> : null}
          </section>
        ) : null}

        {dashboard && activeSection === "subscriptions" ? (
          <section className="panel table-panel"><div className="panel-heading"><div><h2>إدارة اشتراكات المؤسسات</h2><p>فعّل أو مدّد اشتراك العميل واختر الباقة والمدة. التفعيل اليدوي لا يعني أن الدفع تم استلامه.</p></div><span className="count-pill">{dashboard.stats.organizations} مؤسسة</span></div>
            <div className="table-wrap"><table><thead><tr><th>المؤسسة</th><th>مالك الحساب</th><th>الباقة</th><th>الحالة</th><th>تاريخ الانتهاء</th><th>إدارة الاشتراك</th></tr></thead><tbody>
              {dashboard.organizations.map((organization) => <tr key={organization.id}><td><strong>{organization.name}</strong><small>{organization.industry || "—"}</small></td><td>{organization.ownerName || organization.ownerEmail || "—"}</td><td>{organization.plan_code.toUpperCase()}</td><td><Status value={organization.subscription_status} /></td><td>{dateTime(organization.subscription_ends_at || organization.trial_ends_at)}</td><td><SubscriptionControls organizationId={organization.id} plans={dashboard.plans} busy={busySubscription === organization.id} onActivate={activateSubscription} /></td></tr>)}
            </tbody></table></div>
            {!dashboard.organizations.length ? <p className="empty-copy">لا توجد مؤسسات.</p> : null}
          </section>
        ) : null}

        {dashboard && activeSection === "payments" ? (
          <>
            <section className="payment-warning"><strong>مراجعة InstaPay</strong><span>لا تعتمد أي طلب إلا بعد التأكد من وصول المبلغ فعليًا إلى حساب الاستلام ومطابقة القيمة والباقة. رقم المرجع وحده ليس إثباتًا كافيًا.</span></section>
            <section className="panel table-panel"><div className="panel-heading"><div><h2>طلبات الدفع</h2><p>طلبات الدفع المسجلة من العملاء.</p></div><span className="count-pill">{dashboard.stats.payments} طلب</span></div>
              <div className="table-wrap"><table><thead><tr><th>المؤسسة / الحساب</th><th>المبلغ</th><th>الطريقة</th><th>مرجع التحويل</th><th>الحالة</th><th>التاريخ</th><th>الإجراء</th></tr></thead><tbody>
                {dashboard.payments.map((payment) => <tr key={payment.id}><td><strong>{payment.organizationName}</strong><small>{payment.accountEmail || "—"}</small></td><td>{money(payment.amount, payment.currency)}</td><td>{payment.method === "instapay" ? "InstaPay" : payment.method}</td><td className="reference-cell">{payment.customer_reference || "—"}</td><td><Status value={payment.status} /></td><td>{dateTime(payment.created_at)}</td><td>{["pending_review", "pending_provider"].includes(payment.status) && payment.method === "instapay" ? <div className="action-group"><button className="approve-button" disabled={busyPayment === payment.id} onClick={() => reviewPayment(payment, "paid")}>{busyPayment === payment.id ? "…" : "اعتماد"}</button><button className="reject-button" disabled={busyPayment === payment.id} onClick={() => reviewPayment(payment, "rejected")}>رفض</button></div> : "—"}</td></tr>)}
              </tbody></table></div>
              {!dashboard.payments.length ? <p className="empty-copy">لا توجد طلبات دفع مسجلة حتى الآن.</p> : null}
            </section>
          </>
        ) : null}

        {dashboard && activeSection === "astro" ? (
          <section className="panel table-panel"><div className="panel-heading"><div><h2>مهام Astro والوكلاء</h2><p>ملخص المهام المسجلة دون عرض مدخلات العملاء أو نتائجهم الخاصة.</p></div><span className="count-pill">{dashboard.stats.agentTasks} مهمة</span></div>
            <div className="table-wrap"><table><thead><tr><th>الوكيل</th><th>المهمة</th><th>الحالة</th><th>تاريخ الإنشاء</th></tr></thead><tbody>
              {dashboard.agentTasks.map((task) => <tr key={task.id}><td>{task.agent_name}</td><td>{task.title}</td><td><Status value={task.status} /></td><td>{dateTime(task.created_at)}</td></tr>)}
            </tbody></table></div>
            {!dashboard.agentTasks.length ? <p className="empty-copy">لا توجد مهام مسجلة.</p> : null}
          </section>
        ) : null}

        {dashboard && activeSection === "settings" ? (
          <section className="panel table-panel"><div className="panel-heading"><div><h2>باقات ORBITA</h2><p>الأسعار والحدود الحالية المحفوظة في قاعدة البيانات.</p></div></div>
            <div className="plan-grid">{dashboard.plans.map((plan) => <article className="plan-card" key={plan.code}><div className="plan-top"><strong>{plan.name}</strong><Status value={plan.active ? "active" : "suspended"} /></div><div className="plan-price">{money(plan.monthly_price, plan.currency)}<small> / شهريًا</small></div><p>رمز الباقة: {plan.code.toUpperCase()}</p><p>حد المستخدمين: {String(plan.limits?.max_users ?? "—")}</p><p>مهام الوكلاء شهريًا: {String(plan.limits?.max_agent_tasks_month ?? "—")}</p></article>)}</div>
          </section>
        ) : null}

        <footer className="admin-footer"><span>ORBITA Admin Console</span><span>آخر تحديث: {dashboard ? dateTime(dashboard.generatedAt) : "—"}</span></footer>
      </main>
    </div>
  );
}
