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
