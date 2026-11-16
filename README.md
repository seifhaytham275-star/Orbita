# Orbita

Arabic-first SaaS workspace for small businesses. Astro coordinates six specialist agents: Ledger, Echo, Pulse, Stock, Reach, and Insight.

## Stack

- Next.js 15, React 19, TypeScript
- Supabase Auth, PostgreSQL, Row Level Security
- Responsive Arabic RTL web application
- Electron Windows wrapper and Capacitor Android wrapper

## Current implementation status

This repository contains the company signup/login foundation, one-month access policy, customer/inventory/invoice/booking workspace, independent platform-admin setup/login, audit records, and an Astro task workflow.

Astro currently performs deterministic intent routing and supported database operations. Reach and Echo return clearly labelled draft templates. It is **not yet backed by a local language model**, and WhatsApp delivery, tax e-invoicing, Fawry API collection, InstaPay verification, and automatic subscription billing are not active. Do not describe this build as a fully autonomous AI ERP or production-certified accounting system.

## Requirements

- Node.js 22 or newer
- A Supabase project
- A Vercel project or another compatible Next.js host for the hosted deployment
- Android Studio / Android SDK only if building the Android wrapper
- Windows build tools are supplied by GitHub Actions for the Windows installer

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`.

3. Set these values in `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for company-username login and admin company listing)
   - `ORBITA_ADMIN_SESSION_SECRET` (server-only HMAC signing secret)

   The Supabase service-role key must never be exposed to the browser or committed to Git.

4. Apply the SQL migrations in order in Supabase SQL Editor:

   - `supabase/migrations/0001_orbita_core.sql`
   - `supabase/migrations/0002_company_accounts_and_trial.sql`
   - `supabase/migrations/0003_astro_agent_tasks.sql`
   - `supabase/migrations/0004_business_operations_and_agent_security.sql`
   - `supabase/migrations/0005_atomic_stock_adjustment.sql`
   - `supabase/migrations/0006_atomic_product_creation.sql`

   Migration 0004 is idempotent for existing business tables. Migration 0005 adds the atomic inventory adjustment function.

5. In Supabase → Authentication → URL Configuration, set the production Site URL to your deployed HTTPS domain and add the local and production callback URLs to the Redirect URLs allowlist. Do not leave `http://localhost:3000` as the production Site URL.

6. Start the app:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`.

## Company accounts and free access

- A company signup creates the customer auth account, company record, owner membership, unique company username, and one-month access period.
- The first month does not require a payment card and does not auto-renew.
- Customer login supports email or company username. Username lookup requires `SUPABASE_SERVICE_ROLE_KEY` on the server.
- Email confirmation depends on the Supabase Auth URL configuration and email provider rate limits.

## Independent platform administrator

- Admin login is separate from customer accounts and does not use Gmail.
- Open `/admin/setup` once, enter the one-time bootstrap code supplied privately by the project owner, then choose your own username and password (minimum 12 characters).
- The setup code is single-use. Do not put it in this repository.
- After setup, use `/admin/login`.
- The admin session requires `ORBITA_ADMIN_SESSION_SECRET`.
- The admin dashboard requires `SUPABASE_SERVICE_ROLE_KEY` to read all companies. Keep it server-side.

## Astro and agents

- Astro is the user-facing assistant/coordinator; it is separate from the six specialist agents.
- Ledger can create draft invoices and summarize invoice balances.
- Stock can list inventory and add products; stock adjustments use a database transaction that records the movement atomically.
- Pulse can list appointments and create a booking when a future date and time are supplied.
- Echo prepares customer-service reply drafts; it does not send WhatsApp messages.
- Reach prepares marketing copy drafts using a local template; it is not a generative AI model.
- Insight summarizes customer, stock, invoice, and booking records.
- Sensitive requests create an approval record for owners/managers. Approval records the decision only; it does not activate a payment, deletion, or messaging integration.
- Tasks and audit entries are tenant-scoped. Supported actions are checked against the authenticated user's organization membership.

## Payments and external integrations

- No card is required for the free month and no automatic recurring charge is enabled.
- InstaPay submissions require manual review until a trusted official verification flow exists.
- Fawry collection requires an approved merchant account and official provider credentials/webhooks. It is not activated by adding a merchant code alone.
- WhatsApp Business requires an approved Meta WhatsApp Business setup and access token/webhook configuration. No messages are sent in this build.
- Tax-compliant Egyptian e-invoicing requires registration and integration with the Egyptian Tax Authority; the internal invoice record is not a tax invoice.

## Windows and Android apps

Both wrappers load the hosted HTTPS Orbita website and therefore require internet connectivity; they are not fully offline-native applications.

1. Deploy the website to HTTPS.
2. In GitHub → Settings → Secrets and variables → Actions → Variables, set `ORBITA_WEB_URL` to the exact deployed URL.
3. Open GitHub → Actions → Build Orbita installers → Run workflow.
4. Download the generated `Orbita-Windows-Installer` and `Orbita-Android-APK` artifacts from that workflow run.

The Android APK is a debug/testing build, not a Play Store release. Play Store publication requires a protected release keystore and store account. The Windows installer is unsigned; commercial distribution should use a code-signing certificate.

## Security notes

- Never commit `.env.local`, service-role keys, passwords, one-time admin bootstrap codes, Fawry secrets, or signing keystores.
- Use HTTPS in production.
- Configure Supabase Auth rate limits and email templates.
- Review Supabase Security Advisor before inviting real companies.
- Back up the database and test restore procedures.
- Do not use this early build as a certified accounting, tax, or payment-processing system.
