-- Pode ser executado novamente com segurança no SQL Editor.
create table if not exists public.progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ord int not null,
  status text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, ord)
);

alter table public.progress
  add column if not exists updated_at timestamptz not null default now();

-- "Não" funciona como tombstone sincronizável; não apague a linha ao desmarcar.
alter table public.progress
  drop constraint if exists progress_status_check;

alter table public.progress
  add constraint progress_status_check
  check (status in ('Não', 'Sim', 'Pulei'));

alter table public.progress enable row level security;

drop policy if exists "ler o proprio progresso" on public.progress;
create policy "ler o proprio progresso"
  on public.progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "inserir o proprio progresso" on public.progress;
create policy "inserir o proprio progresso"
  on public.progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "atualizar o proprio progresso" on public.progress;
create policy "atualizar o proprio progresso"
  on public.progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "apagar o proprio progresso" on public.progress;
create policy "apagar o proprio progresso"
  on public.progress
  for delete
  using (auth.uid() = user_id);
