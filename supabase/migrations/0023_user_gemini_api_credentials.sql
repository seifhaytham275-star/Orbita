create table if not exists public.user_ai_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'google-gemini' check (provider = 'google-gemini'),
  encrypted_api_key text not null,
  key_last_four text not null check (char_length(key_last_four) = 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ai_credentials enable row level security;
revoke all on public.user_ai_credentials from anon;
grant select, insert, update, delete on public.user_ai_credentials to authenticated;

create policy "Users manage only their own AI credential"
on public.user_ai_credentials
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
