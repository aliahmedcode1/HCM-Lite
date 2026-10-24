drop policy if exists "demo_tasks_select" on public.demo_tasks;
drop policy if exists "demo_tasks_insert" on public.demo_tasks;
drop policy if exists "demo_tasks_update" on public.demo_tasks;
drop policy if exists "demo_tasks_delete" on public.demo_tasks;
drop table if exists public.demo_tasks;

create table if not exists public.company_settings (
  id int primary key default 1 check (id = 1),
  name text not null,
  office_start time not null default '09:00',
  grace_minutes int not null default 15,
  weekend_days int[] not null default '{6,0}', 
  half_day_hours numeric not null default 5,
  office_lat double precision,
  office_lng double precision,
  office_radius_m int default 150,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('admin','hr','employee')),
  employee_id uuid,
  must_change_password boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);


create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.designations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               
  annual_quota int,                        
  created_at timestamptz not null default now()
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  created_at timestamptz not null default now()
);


create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 
  full_name text not null,
  email text not null unique,
  phone text default '',
  address text default '',
  gender text check (gender in ('male','female','other')) default 'male',
  department_id uuid references public.departments(id),
  designation text default '',
  join_date date not null,
  exit_date date,
  status text not null default 'active' check (status in ('active','probation','exited')),
  basic_salary numeric not null default 0 check (basic_salary >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present'
    check (status in ('present','late','half_day','missing_checkout','on_leave','absent')),
  worked_hours numeric default 0,
  source text not null default 'web' check (source in ('web','camera')),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,                 
  start_date date not null,
  end_date date not null,
  days numeric not null,
  reason text default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_by uuid references public.profiles(id),
  decision_comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  status text not null default 'draft' check (status in ('draft','finalized')),
  created_by uuid references public.profiles(id),
  finalized_by uuid references public.profiles(id),
  finalized_at timestamptz,
  total_gross numeric default 0,
  total_net numeric default 0,
  created_at timestamptz not null default now(),
  unique (period_month, period_year)
);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  basic numeric not null default 0,
  hra numeric not null default 0,
  medical numeric not null default 0,
  gross numeric not null default 0,
  working_days numeric not null default 0,
  payable_days numeric not null default 0,
  absent_days numeric not null default 0,
  half_days numeric not null default 0,
  unpaid_leave_days numeric not null default 0,
  deduction numeric not null default 0,
  tax numeric not null default 0,
  net numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  posted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text default '',
  action text not null,                      
  entity text not null,                      
  entity_id text default '',
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  question text not null,
  tool_used text default '',
  created_at timestamptz not null default now()
);


insert into public.leave_types (name, annual_quota) values
  ('annual', 14), ('sick', 8), ('casual', 10), ('unpaid', null)
on conflict (name) do nothing;


alter table public.company_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.leave_types enable row level security;
alter table public.holidays enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payslips enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table public.ai_logs enable row level security;


drop policy if exists "settings_public_read" on public.company_settings;
create policy "settings_public_read" on public.company_settings
  for select to anon using (true);

drop policy if exists "settings_auth_write" on public.company_settings;
create policy "settings_auth_write" on public.company_settings
  for all to authenticated using (true) with check (true);

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_auth_write" on public.profiles;
create policy "profiles_auth_write" on public.profiles
  for all to authenticated using (true) with check (true);

declare  text;
begin
  foreach  in array array[
    'departments','designations','leave_types','holidays','employees',
    'attendance','attendance_corrections','leave_requests','payroll_runs',
    'payslips','announcements','notifications','audit_log','ai_logs'
  ]
  loop
    execute format('drop policy if exists "%s_auth_all" on public.%I', t, t);
    execute format(
      'create policy "%s_auth_all" on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end ;
