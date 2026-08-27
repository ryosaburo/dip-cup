-- ログイン（Supabase Auth）導入時の初期スキーマ
-- 前提: ゲスト参加は残す（アカウント任意）／認証はメール＋パスワード／保存対象はプロフィールと対戦履歴のみ

-- 1. profiles
--   auth.users の1:1拡張。表示名・アバターなど公開情報を持つ。
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 対戦相手の表示名を見せる必要があるため閲覧は全員可、更新は本人のみ
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- サインアップ時に auth.users -> profiles を自動生成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 2. match_history
--   1試合＝1行。ゲスト参加者もいるため user_id は null 許容、
--   その場で表示していた名前をスナップショットとして持つ。
create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  rounds_option smallint not null check (rounds_option in (1, 3, 5)),
  played_at timestamptz not null default now(),

  player1_user_id uuid references public.profiles (id) on delete set null,
  player1_name text not null,
  player1_wins smallint not null,

  player2_user_id uuid references public.profiles (id) on delete set null,
  player2_name text not null,
  player2_wins smallint not null,

  winner_user_id uuid references public.profiles (id) on delete set null
);

alter table public.match_history enable row level security;

-- 自分が参加した試合のみ閲覧可能
create policy "match_history_select_own" on public.match_history
  for select using (
    auth.uid() = player1_user_id or auth.uid() = player2_user_id
  );

-- insert/update/delete のポリシーは意図的に作らない。
-- クライアントからの直接書き込みは不可にし、
-- WSサーバーが service_role キーで（RLSをバイパスして）試合終了時に書き込む。

create index if not exists match_history_player1_idx on public.match_history (player1_user_id);
create index if not exists match_history_player2_idx on public.match_history (player2_user_id);
