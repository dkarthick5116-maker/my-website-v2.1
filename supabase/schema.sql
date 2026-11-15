-- Run this SQL in Supabase Dashboard > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','teacher')),
  full_name text not null,
  school_name text not null,
  school_key text not null,
  roll_number text,
  roll_key text,
  class_name text,
  curriculum text,
  parent_email text,
  subjects text,
  created_at timestamptz not null default now(),
  constraint student_roll_school_required check (
    role <> 'student' or (roll_number is not null and roll_key is not null and class_name is not null)
  )
);

create unique index if not exists profiles_student_school_roll_unique
on public.profiles (school_key, roll_key) where role = 'student';

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  user_role text := coalesce(meta->>'role','');
  school text := coalesce(meta->>'school_name','');
  full_name text := coalesce(meta->>'full_name','');
begin
  if user_role not in ('student','teacher') then
    raise exception 'Invalid account role';
  end if;
  if trim(school) = '' or trim(full_name) = '' then
    raise exception 'Name and school are required';
  end if;

  insert into public.profiles (
    id, role, full_name, school_name, school_key, roll_number, roll_key,
    class_name, curriculum, parent_email, subjects
  ) values (
    new.id, user_role, trim(full_name), trim(school), lower(regexp_replace(trim(school), '\s+', ' ', 'g')),
    nullif(trim(meta->>'roll_number'), ''),
    case when user_role='student' then lower(trim(meta->>'roll_number')) else null end,
    nullif(trim(meta->>'class_name'), ''),
    nullif(trim(meta->>'curriculum'), ''),
    nullif(trim(meta->>'parent_email'), ''),
    nullif(trim(meta->>'subjects'), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

-- No public insert/update/delete policies. Profiles are created by the trusted auth trigger.
