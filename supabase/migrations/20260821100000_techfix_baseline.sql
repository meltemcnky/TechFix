-- TechFix production baseline. This is the complete application schema.
-- It is designed for clean DEV/PRO projects and has no legacy compatibility.

create extension if not exists pgcrypto with schema extensions;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  auth_email text unique,
  name text not null check (length(trim(name)) between 2 and 160),
  normalized_name text not null unique,
  block text not null check (length(trim(block)) between 1 and 80),
  floor text not null check (length(trim(floor)) between 1 and 80),
  office_code text not null check (length(trim(office_code)) between 1 and 80),
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_active_name_idx on public.companies(is_active, name);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null unique check (length(trim(name)) between 2 and 80),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_active_sort_idx on public.categories(is_active, sort_order, name);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  category_id uuid not null references public.categories(id),
  title varchar(160) not null check (length(trim(title)) between 3 and 160),
  description text not null check (length(trim(description)) between 10 and 5000),
  photo_path text unique,
  status text not null default 'new'
    check (status in ('new', 'under_review', 'in_progress', 'resolved', 'archived')),
  admin_public_note text check (admin_public_note is null or length(admin_public_note) <= 3000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index tickets_company_created_idx on public.tickets(company_id, created_at desc);
create index tickets_company_status_idx on public.tickets(company_id, status);
create index tickets_status_created_idx on public.tickets(status, created_at desc);
create index tickets_category_created_idx on public.tickets(category_id, created_at desc);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  meter_type text not null check (meter_type in ('electricity', 'natural_gas')),
  photo_path text not null unique,
  reading_value numeric(18,3) check (reading_value is null or reading_value >= 0),
  notes varchar(2000),
  access_method text not null check (access_method in ('qr', 'pin')),
  created_at timestamptz not null default now()
);
create index meter_readings_created_type_idx on public.meter_readings(created_at desc, meter_type);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('admin', 'company')),
  company_id uuid not null references public.companies(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  type text not null check (type in ('ticket_updated', 'pin_request')),
  title text not null check (length(trim(title)) between 2 and 160),
  message text not null check (length(trim(message)) between 2 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_audience_created_idx on public.notifications(audience, created_at desc);
create index notifications_company_unread_idx on public.notifications(company_id, read_at, created_at desc);
create unique index notifications_open_pin_request_unique on public.notifications(company_id)
  where audience = 'admin' and type = 'pin_request' and read_at is null;

create table public.technician_access (
  id uuid primary key default gen_random_uuid(),
  qr_token_hash text not null,
  fallback_pin_hash text not null,
  credential_version integer not null default 1,
  is_active boolean not null default true,
  qr_expires_at timestamptz,
  last_qr_used_at timestamptz,
  last_pin_used_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 4),
  locked_until timestamptz,
  updated_by uuid references public.admin_users(user_id) on delete set null,
  updated_at timestamptz not null default now()
);
create unique index technician_single_active_row on public.technician_access((is_active)) where is_active;

insert into public.categories(code, name, sort_order) values
  ('electrical', 'Elektrik', 10), ('network', 'İnternet / Ağ', 20),
  ('plumbing', 'Su ve Tesisat', 30), ('air_conditioning', 'Klima', 40),
  ('elevator', 'Asansör', 50), ('cleaning', 'Temizlik', 60),
  ('security', 'Güvenlik', 70), ('common_areas', 'Ortak Alanlar', 80),
  ('equipment', 'Ekipman', 90), ('request', 'Genel Talep', 100), ('other', 'Diğer', 110);

create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and is_active);
$$;
create function public.current_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.companies where auth_user_id = auth.uid() and is_active limit 1;
$$;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.current_company_id() from public, anon;
grant execute on function public.is_admin(), public.current_company_id() to authenticated, service_role;

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger tickets_set_updated_at before update on public.tickets
for each row execute function public.set_updated_at();
create trigger technician_access_set_updated_at before update on public.technician_access
for each row execute function public.set_updated_at();

create function public.notify_ticket_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.admin_public_note is distinct from old.admin_public_note then
    insert into public.notifications(audience, company_id, ticket_id, type, title, message)
    values ('company', new.company_id, new.id, 'ticket_updated', 'Talebiniz güncellendi',
      case new.status when 'new' then 'Talebiniz alındı.' when 'under_review' then 'Talebiniz inceleniyor.'
      when 'in_progress' then 'Talebiniz üzerinde çalışılıyor.' when 'resolved' then 'Talebiniz çözüldü.'
      when 'archived' then 'Talebiniz arşivlendi.' end);
  end if;
  return new;
end;
$$;
create trigger tickets_notify_update after update of status, admin_public_note on public.tickets
for each row execute function public.notify_ticket_update();

create function public.mark_notification_read(notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications n set read_at = coalesce(n.read_at, now())
  where n.id = notification_id and ((n.audience = 'admin' and public.is_admin())
    or (n.audience = 'company' and n.company_id = public.current_company_id()));
end;
$$;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

alter table public.admin_users enable row level security;
alter table public.companies enable row level security;
alter table public.categories enable row level security;
alter table public.tickets enable row level security;
alter table public.meter_readings enable row level security;
alter table public.notifications enable row level security;
alter table public.technician_access enable row level security;

create policy admin_users_self_read on public.admin_users for select to authenticated
using (user_id = auth.uid() and is_active);
create policy companies_scope_read on public.companies for select to authenticated
using (public.is_admin() or auth_user_id = auth.uid());
create policy companies_admin_write on public.companies for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy categories_read on public.categories for select to authenticated
using (is_active or public.is_admin());
create policy categories_admin_write on public.categories for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy tickets_scope_read on public.tickets for select to authenticated
using (public.is_admin() or company_id = public.current_company_id());
create policy tickets_company_insert on public.tickets for insert to authenticated
with check (company_id = public.current_company_id() and created_by = auth.uid()
  and exists (select 1 from public.categories c where c.id = category_id and c.is_active));
create policy tickets_admin_update on public.tickets for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy meter_readings_admin_read on public.meter_readings for select to authenticated
using (public.is_admin());
create policy notifications_scope_read on public.notifications for select to authenticated
using ((audience = 'admin' and public.is_admin())
  or (audience = 'company' and company_id = public.current_company_id()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.admin_users, public.companies, public.categories, public.tickets,
  public.meter_readings, public.notifications to authenticated;
grant insert on public.tickets to authenticated;
grant update on public.companies, public.categories, public.tickets to authenticated;
grant insert, delete on public.categories to authenticated;

-- Remote DEV resets preserve managed Storage bucket metadata, so creation is
-- idempotent. Legacy buckets are removed separately through the Storage API.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('ticket-photos', 'ticket-photos', false, 5242880, array['image/webp']),
  ('meter-photos', 'meter-photos', false, 5242880, array['image/webp']),
  ('company-logos', 'company-logos', false, 2097152, array['image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy ticket_photos_read on storage.objects for select to authenticated
using (bucket_id = 'ticket-photos' and (public.is_admin()
  or (storage.foldername(name))[1] = public.current_company_id()::text));
create policy ticket_photos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'ticket-photos'
  and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy ticket_photos_orphan_cleanup on storage.objects for delete to authenticated
using (bucket_id = 'ticket-photos' and (storage.foldername(name))[1] = public.current_company_id()::text
  and not exists (select 1 from public.tickets t where t.photo_path = name));
create policy meter_photos_admin_read on storage.objects for select to authenticated
using (bucket_id = 'meter-photos' and public.is_admin());
create policy company_logos_read on storage.objects for select to authenticated
using (bucket_id = 'company-logos' and (public.is_admin()
  or (storage.foldername(name))[1] = public.current_company_id()::text));
create policy company_logos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'company-logos' and public.is_admin());
create policy company_logos_admin_update on storage.objects for update to authenticated
using (bucket_id = 'company-logos' and public.is_admin())
with check (bucket_id = 'company-logos' and public.is_admin());
create policy company_logos_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'company-logos' and public.is_admin());
