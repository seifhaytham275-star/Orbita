import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const timeZone = "Africa/Cairo";

function getCairoDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function cairoLocalToUtc(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let candidate = new Date(target);
  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(candidate);
    const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "0";
    const represented = Date.UTC(
      Number(part("year")),
      Number(part("month")) - 1,
      Number(part("day")),
      Number(part("hour")),
      Number(part("minute")),
      Number(part("second")),
    );
    const delta = target - represented;
    if (delta === 0) return candidate;
    candidate = new Date(candidate.getTime() + delta);
  }
  return candidate;
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function moneyByCurrency(rows: Array<{ amount: number | string; currency: string }>) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount));
  }
  return Object.fromEntries([...totals.entries()].map(([currency, amount]) => [currency, Number(amount.toFixed(2))]));
}

function renderMoney(values: Record<string, number>) {
  const entries = Object.entries(values);
  return entries.length
    ? entries.map(([currency, amount]) => `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`).join(" / ")
    : "0";
}

async function sendReport(to: string, report: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.ORBITA_REPORT_FROM_EMAIL || "Orbita Reports <onboarding@resend.dev>";
  const revenue = report.revenue as Record<string, number>;
  const expenses = report.expenses as Record<string, number>;
  const profit = report.netProfit as Record<string, number>;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033">
      <h1>ORBITA — Daily Subscription Report</h1>
      <p>Report date: <b>${escapeHtml(report.date)} (Africa/Cairo)</b></p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">New organizations</td><td><b>${escapeHtml(report.newSubscribers)}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Active subscriptions</td><td><b>${escapeHtml(report.activeSubscriptions)}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Automatically expired today</td><td><b>${escapeHtml(report.expiredToday)}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Pending InstaPay reviews</td><td><b>${escapeHtml(report.pendingPayments)}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Approved payments</td><td><b>${escapeHtml(report.approvedPayments)}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Collected revenue</td><td><b>${escapeHtml(renderMoney(revenue))}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Recorded expenses</td><td><b>${escapeHtml(renderMoney(expenses))}</b></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #ddd">Net after recorded expenses</td><td><b>${escapeHtml(renderMoney(profit))}</b></td></tr>
      </table>
      <p style="color:#666;font-size:12px">Net figures exclude expenses that have not yet been entered. InstaPay requests are never auto-approved from customer-submitted references; pending transfers require verified reconciliation.</p>
    </div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `ORBITA Daily Report — ${report.date}`,
      html,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider rejected the report: ${detail.slice(0, 300)}`);
  }
}

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service configuration is missing");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getDb();
    const now = new Date();
    const today = getCairoDate(now);
    const start = cairoLocalToUtc(today);
    const tomorrowDate = new Date(start);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const startNext = new Date(tomorrowDate);
    const end = new Date(startNext);
    const dayStart = start.toISOString();
    const dayEnd = end.toISOString();

    const { data: priorReport } = await db.from("platform_daily_reports")
      .select("payload,email_sent_at").eq("report_date", today).maybeSingle();
    if (priorReport?.email_sent_at) {
      return NextResponse.json({ ok: true, alreadySent: true, report: priorReport.payload });
    }

    const { data: expiredCount, error: expiryError } = await db.rpc("orbita_expire_due_subscriptions");
    if (expiryError) throw expiryError;

    const [
      newOrgs,
      activeOrgs,
      expiredLogs,
      pendingPayments,
      approvedPayments,
      paidRows,
      expenseRows,
    ] = await Promise.all([
      db.from("organizations").select("id", { count: "exact", head: true }).gte("created_at", dayStart).lt("created_at", dayEnd),
      db.from("organizations").select("id", { count: "exact", head: true })
        .eq("features_enabled", true).in("subscription_status", ["active", "trial"])
        .or(`subscription_ends_at.gt.${now.toISOString()},and(subscription_ends_at.is.null,trial_ends_at.gt.${now.toISOString()})`),
      db.from("audit_logs").select("id", { count: "exact", head: true })
        .eq("action", "subscription.auto_expired").gte("created_at", dayStart).lt("created_at", dayEnd),
      db.from("payment_submissions").select("id", { count: "exact", head: true })
        .in("status", ["pending_review", "pending_provider"]),
      db.from("payment_submissions").select("id", { count: "exact", head: true })
        .eq("status", "paid").gte("reviewed_at", dayStart).lt("reviewed_at", dayEnd),
      db.from("payment_submissions").select("amount,currency")
        .eq("status", "paid").gte("reviewed_at", dayStart).lt("reviewed_at", dayEnd),
      db.from("platform_expenses").select("amount,currency")
        .gte("incurred_at", dayStart).lt("incurred_at", dayEnd),
    ]);
    const errors = [newOrgs.error, activeOrgs.error, expiredLogs.error, pendingPayments.error,
      approvedPayments.error, paidRows.error, expenseRows.error].filter(Boolean);
    if (errors.length) throw new Error("Unable to aggregate subscription and financial metrics");

    const revenue = moneyByCurrency((paidRows.data ?? []) as Array<{ amount: number | string; currency: string }>);
    const expenses = moneyByCurrency((expenseRows.data ?? []) as Array<{ amount: number | string; currency: string }>);
    const netProfit: Record<string, number> = {};
    for (const currency of new Set([...Object.keys(revenue), ...Object.keys(expenses)])) {
      netProfit[currency] = Number(((revenue[currency] ?? 0) - (expenses[currency] ?? 0)).toFixed(2));
    }
    const report = {
      date: today,
      newSubscribers: newOrgs.count ?? 0,
      activeSubscriptions: activeOrgs.count ?? 0,
      expiredToday: expiredLogs.count ?? expiredCount ?? 0,
      pendingPayments: pendingPayments.count ?? 0,
      approvedPayments: approvedPayments.count ?? 0,
      revenue,
      expenses,
      netProfit,
      note: "Net profit is revenue less expenses entered in platform_expenses; unrecorded expenses are excluded.",
    };

    await db.from("platform_daily_reports").upsert({
      report_date: today,
      payload: report,
      generated_at: new Date().toISOString(),
      email_error: null,
    }, { onConflict: "report_date" });

    const recipient = process.env.ORBITA_OWNER_REPORT_EMAIL;
    if (!recipient) throw new Error("ORBITA_OWNER_REPORT_EMAIL is not configured");
    await sendReport(recipient, report);

    await db.from("platform_daily_reports").update({
      email_sent_at: new Date().toISOString(),
      email_error: null,
    }).eq("report_date", today);

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown automation error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const input = body as { amount?: unknown; currency?: unknown; category?: unknown; description?: unknown; incurredAt?: unknown };
  const amount = Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency.toUpperCase() : "EGP";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const incurredAt = typeof input.incurredAt === "string" ? input.incurredAt : new Date().toISOString();
  if (!Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency) ||
      category.length < 2 || category.length > 80 || description.length > 500 ||
      !Number.isFinite(Date.parse(incurredAt))) {
    return NextResponse.json({ error: "Invalid expense details" }, { status: 400 });
  }
  try {
    const db = getDb();
    const { data, error } = await db.from("platform_expenses").insert({
      amount, currency, category, description, incurred_at: new Date(incurredAt).toISOString(),
      recorded_by: "platform-owner",
    }).select("id,amount,currency,category,incurred_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, expense: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not record expense" }, { status: 503 });
  }
}
