-- TechFix approved UI/business-rule revision. Forward-only and data preserving.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  block text not null check (length(trim(block)) between 1 and 80),
  floor text not null check (length(trim(floor)) between 1 and 80),
  office_code text not null check (length(trim(office_code)) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block, floor, office_code)
);

insert into public.locations(block, floor, office_code) values
  ('A Blok', '1. Kat', 'DEV-A01'),
  ('B Blok', '2. Kat', 'DEV-B02'),
  ('C Blok', 'Zemin', 'DEV-C01')
on conflict (block, floor, office_code) do nothing;

-- Preserve any already-used DEV location even if it is outside the initial list.
insert into public.locations(block, floor, office_code)
select distinct block, floor, office_code from public.companies
on conflict (block, floor, office_code) do nothing;

alter table public.companies
  add column location_id uuid references public.locations(id) on delete restrict,
  add column removed_at timestamptz,
  add column removed_by uuid references public.admin_users(user_id) on delete set null;

update public.companies c set location_id = l.id
from public.locations l
where l.block = c.block and l.floor = c.floor and l.office_code = c.office_code;

create index companies_removed_name_idx on public.companies(removed_at, name);

-- Existing DEV data may contain duplicate historical assignments. Preserve
-- those rows, but reject every new or changed assignment that would collide.
create function public.ensure_company_location_available()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.location_id is not null
    and (tg_op = 'INSERT' or new.location_id is distinct from old.location_id)
    and exists(select 1 from public.companies c
      where c.location_id = new.location_id and c.removed_at is null and c.id <> new.id)
  then raise exception 'Lokasyon başka bir firma tarafından kullanılıyor'; end if;
  return new;
end;
$$;
create trigger companies_location_available before insert or update of location_id on public.companies
for each row execute function public.ensure_company_location_available();

alter table public.notifications alter column company_id drop not null;
alter table public.notifications add column meter_reading_id uuid
  references public.meter_readings(id) on delete set null;
alter table public.notifications drop constraint if exists notifications_type_check;
update public.notifications set type = 'password_request' where type = 'pin_request';
alter table public.notifications add constraint notifications_type_check
  check (type in ('ticket_updated', 'password_request', 'meter_created'));
alter table public.notifications add constraint notifications_has_target_check
  check (company_id is not null or ticket_id is not null or meter_reading_id is not null);
create index notifications_meter_idx on public.notifications(meter_reading_id)
  where meter_reading_id is not null;
drop index if exists public.notifications_open_pin_request_unique;
create unique index notifications_open_password_request_unique on public.notifications(company_id)
  where audience = 'admin' and type = 'password_request' and read_at is null;

create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_updated_at();

create or replace function public.category_slug(value text)
returns text language sql immutable strict set search_path = '' as $$
  select trim(both '_' from regexp_replace(
    regexp_replace(
      translate(lower(trim(value)), 'çğıöşüâîû', 'cgiosuaiu'),
      '[^a-z0-9]+', '_', 'g'
    ), '_+', '_', 'g'
  ));
$$;

create or replace function public.admin_create_category(category_name text)
returns public.categories language plpgsql security definer set search_path = '' as $$
declare
  clean_name text := trim(category_name);
  base_code text;
  candidate text;
  suffix integer := 1;
  result public.categories;
begin
  if not public.is_admin() then raise exception 'Yetkisiz erişim'; end if;
  if length(clean_name) not between 2 and 80 then raise exception 'Kategori adı 2-80 karakter olmalıdır'; end if;
  base_code := public.category_slug(clean_name);
  if base_code = '' then raise exception 'Geçerli bir kategori adı girin'; end if;
  candidate := base_code;
  while exists(select 1 from public.categories where code = candidate) loop
    suffix := suffix + 1;
    candidate := base_code || '_' || suffix;
  end loop;
  insert into public.categories(code, name, is_active, sort_order)
  values (candidate, clean_name, true, coalesce((select max(sort_order) + 10 from public.categories), 10))
  returning * into result;
  return result;
end;
$$;

create or replace function public.admin_remove_category(category_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz erişim'; end if;
  update public.categories set is_active = false where id = category_id and is_active;
  if not found then raise exception 'Aktif kategori bulunamadı'; end if;
end;
$$;

create or replace function public.notification_allowed(n public.notifications)
returns boolean language sql stable security definer set search_path = '' as $$
  select (n.audience = 'admin' and public.is_admin())
    or (n.audience = 'company' and n.company_id = public.current_company_id());
$$;

create or replace function public.mark_notification_read(notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications n set read_at = coalesce(n.read_at, now())
  where n.id = notification_id and public.notification_allowed(n);
end;
$$;

create function public.mark_all_notifications_read()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications n set read_at = coalesce(n.read_at, now())
  where public.notification_allowed(n);
end;
$$;

create function public.remove_notification(notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications n
  where n.id = notification_id and public.notification_allowed(n);
end;
$$;

create function public.clear_notifications()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications n where public.notification_allowed(n);
end;
$$;

revoke all on function public.category_slug(text), public.admin_create_category(text),
  public.admin_remove_category(uuid), public.notification_allowed(public.notifications),
  public.mark_all_notifications_read(), public.remove_notification(uuid),
  public.clear_notifications() from public, anon, authenticated;
grant execute on function public.admin_create_category(text), public.admin_remove_category(uuid),
  public.mark_all_notifications_read(), public.remove_notification(uuid),
  public.clear_notifications() to authenticated;

alter table public.locations enable row level security;
create policy locations_admin_read on public.locations for select to authenticated using (public.is_admin());
grant select on public.locations to authenticated;

-- Inactive category names remain readable for historical tickets. New ticket
-- creation is still restricted to active categories by tickets_company_insert.
drop policy categories_read on public.categories;
create policy categories_read on public.categories for select to authenticated using (true);

revoke insert, update, delete on public.categories from authenticated;
