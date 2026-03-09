-- Admin roles for secure website administrator access
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Users can only read their own role membership
create policy "Users can read own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- Security-definer helper for future server-side policy checks
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- Seed a default website administrator if none exists yet
insert into public.user_roles (user_id, role)
select p.user_id, 'admin'::public.app_role
from public.profiles p
where not exists (
  select 1
  from public.user_roles ur
  where ur.role = 'admin'::public.app_role
)
order by p.created_at asc
limit 1;