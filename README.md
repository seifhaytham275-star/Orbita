# Orbita

Arabic-first SaaS workspace for small businesses.

## Stack
- Next.js App Router + TypeScript
- Supabase (Postgres, Auth, Row Level Security)
- Provider-agnostic AI adapter
- Payment methods: InstaPay and Fawry only

## Current status
Foundation scaffold. Not production-ready yet. Fawry requires an approved merchant account and official integration credentials. InstaPay transfer submissions require owner review until a trusted payment confirmation integration exists.

## Setup
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in values locally.
4. Run `npm run dev`.

Never commit `.env.local`, passwords, API keys, Supabase service-role keys, or payment-provider secrets.

## Windows and Android installers
The repository includes build pipelines for:
- Windows x64 NSIS setup installer (.exe), using Electron.
- Android debug APK, using Capacitor.

Both packages open the hosted Orbita website. They do not run Python or a local Python server, and they require an internet connection.

### Build installers
1. Deploy the Next.js website to an HTTPS host and finish Supabase configuration first.
2. In GitHub, open Settings → Secrets and variables → Actions → Variables.
3. Add repository variable `ORBITA_WEB_URL` with the exact deployed HTTPS URL (no trailing slash required).
4. Open Actions → Build Orbita installers → Run workflow.
5. When both jobs finish successfully, open the workflow run's Artifacts section and download `Orbita-Windows-Installer` and `Orbita-Android-APK`.

The Android artifact is a debug APK for device testing and direct installation, not a Play Store release. A production Android release needs a protected signing keystore. The Windows installer is currently unsigned; commercial distribution without SmartScreen warnings requires a code-signing certificate.

Do not place API keys, service-role keys, payment secrets, passwords, or private signing material in this public repository.

## Company accounts and free trial
- Company signup collects company name, business activity, email, and password.
- The database creates a unique company username and starts a five-day trial.
- Login accepts either the company username or account email plus password.
- Username login requires the server-only `SUPABASE_SERVICE_ROLE_KEY` environment variable. Never use a `NEXT_PUBLIC_` prefix for this key.
- Platform administrators can review registered companies and manually activate/suspend subscriptions or disable features at `/admin`.
- After adding the owner account, promote it once in the Supabase SQL editor:
  `update public.profiles set platform_role='admin' where email='OWNER_EMAIL_HERE';`
- Apply migrations in order: `0001_orbita_core.sql`, then `0002_company_accounts_and_trial.sql`.
- The trial dates and feature switch are stored per company. Each future paid feature/API must check that the subscription is active or the trial has not expired and that `features_enabled` is true before allowing access.
- Admins cannot view customer passwords. Passwords are securely handled by Supabase Auth; use account recovery/reset flows instead.
