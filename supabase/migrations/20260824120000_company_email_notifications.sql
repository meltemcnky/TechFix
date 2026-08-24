-- Additive transition to corporate company emails and durable ticket email delivery.
-- Existing companies remain usable until their corporate email is assigned.

alter table public.companies
  add column email text;

alter table public.companies
  add constraint companies_email_format_check check (
    email is null or (
      email = lower(trim(email))
      and length(email) between 5 and 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

create unique index companies_email_lower_unique
  on public.companies(lower(email)) where email is not null;

-- Supabase Auth and companies.email are updated in the same database
-- transaction. A uniqueness error therefore rejects the Auth change too.
create function public.sync_company_auth_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.companies
      set email = lower(trim(new.email))
      where auth_user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger auth_user_company_email_sync
after update of email on auth.users
for each row execute function public.sync_company_auth_email();

revoke all on function public.sync_company_auth_email() from public, anon, authenticated;

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  ticket_title text not null,
  status_snapshot text not null check (status_snapshot in ('new', 'under_review', 'in_progress', 'resolved', 'archived')),
  admin_note_snapshot text,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_message_id text,
  last_error_code text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index email_deliveries_ticket_created_idx
  on public.email_deliveries(ticket_id, created_at desc);
create index email_deliveries_retry_idx
  on public.email_deliveries(delivery_status, created_at)
  where delivery_status in ('pending', 'failed', 'sending');

create trigger email_deliveries_set_updated_at before update on public.email_deliveries
for each row execute function public.set_updated_at();

alter table public.email_deliveries enable row level security;
revoke all on public.email_deliveries from anon, authenticated;

create function public.admin_update_ticket_and_queue_email(
  target_ticket_id uuid,
  next_status text,
  next_admin_public_note text,
  should_send_email boolean default true
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_ticket public.tickets;
  updated_ticket public.tickets;
  delivery_id uuid;
  clean_note text := nullif(trim(next_admin_public_note), '');
  relevant_change boolean;
begin
  if not public.is_admin() then raise exception 'Yetkisiz erişim'; end if;
  if next_status not in ('new', 'under_review', 'in_progress', 'resolved', 'archived') then
    raise exception 'Talep durumu geçersiz';
  end if;
  if clean_note is not null and length(clean_note) > 3000 then
    raise exception 'Yönetim notu 3000 karakteri aşamaz';
  end if;

  select * into current_ticket from public.tickets
    where id = target_ticket_id for update;
  if not found then raise exception 'Talep bulunamadı'; end if;

  relevant_change := next_status is distinct from current_ticket.status
    or clean_note is distinct from current_ticket.admin_public_note;

  if relevant_change then
    update public.tickets set
      status = next_status,
      admin_public_note = clean_note,
      resolved_at = case
        when next_status = 'resolved' then coalesce(current_ticket.resolved_at, now())
        else null
      end
    where id = target_ticket_id
    returning * into updated_ticket;

    if should_send_email then
      insert into public.email_deliveries(
        ticket_id, company_id, ticket_title, status_snapshot, admin_note_snapshot
      ) values (
        updated_ticket.id, updated_ticket.company_id, updated_ticket.title,
        updated_ticket.status, updated_ticket.admin_public_note
      ) returning id into delivery_id;
    end if;
  else
    updated_ticket := current_ticket;
  end if;

  return jsonb_build_object(
    'ticketId', updated_ticket.id,
    'changed', relevant_change,
    'notificationCreated', relevant_change,
    'deliveryId', delivery_id
  );
end;
$$;

revoke all on function public.admin_update_ticket_and_queue_email(uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_update_ticket_and_queue_email(uuid, text, text, boolean)
  to authenticated;
