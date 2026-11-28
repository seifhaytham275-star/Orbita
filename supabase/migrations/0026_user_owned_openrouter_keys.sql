-- Each signed-in Orbita user may store their own OpenRouter API key.
-- Only encrypted key material is persisted; RLS restricts rows to the owning user.
create table if not exists public.user_ai_provider_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'openrouter' check (provider = 'openrouter'),
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_ai_provider_keys enable row level security;
drop policy if exists "Users can read own encrypted AI key" on public.user_ai_provider_keys;
create policy "Users can read own encrypted AI key" on public.user_ai_provider_keys
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own encrypted AI key" on public.user_ai_provider_keys;
create policy "Users can insert own encrypted AI key" on public.user_ai_provider_keys
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own encrypted AI key" on public.user_ai_provider_keys;
create policy "Users can update own encrypted AI key" on public.user_ai_provider_keys
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own encrypted AI key" on public.user_ai_provider_keys;
create policy "Users can delete own encrypted AI key" on public.user_ai_provider_keys
  for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.user_ai_provider_keys to authenticated;
