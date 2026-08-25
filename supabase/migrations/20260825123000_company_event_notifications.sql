-- Generalize durable company notifications without changing existing ticket delivery semantics.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'ticket_updated', 'password_request', 'meter_created',
  'company_password_changed', 'company_email_changed',
  'company_info_changed', 'company_status_changed'
));

alter table public.email_deliveries alter column ticket_id drop not null;
alter table public.email_deliveries alter column ticket_title drop not null;
alter table public.email_deliveries alter column status_snapshot drop not null;
alter table public.email_deliveries
  add column event_type text not null default 'ticket_updated',
  add column notification_id uuid references public.notifications(id) on delete set null,
  add column subject text,
  add column message text,
  add column recipient_email text;

alter table public.email_deliveries add constraint email_deliveries_event_type_check check (event_type in (
  'ticket_updated', 'company_password_changed', 'company_email_changed',
  'company_info_changed', 'company_status_changed'
));
alter table public.email_deliveries add constraint email_deliveries_target_check check (
  ticket_id is not null or notification_id is not null
);
alter table public.email_deliveries add constraint email_deliveries_recipient_format_check check (
  recipient_email is null or (
    recipient_email = lower(trim(recipient_email))
    and length(recipient_email) between 5 and 254
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create index email_deliveries_company_created_idx
  on public.email_deliveries(company_id, created_at desc);
create unique index email_deliveries_provider_message_unique
  on public.email_deliveries(provider_message_id) where provider_message_id is not null;

create function public.create_company_event(
  target_company_id uuid,
  target_event_type text,
  event_title text,
  event_message text,
  event_translation_key text,
  event_translation_params jsonb default '{}'::jsonb,
  should_send_email boolean default true,
  email_subject text default null,
  email_message text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  notification_id uuid;
  delivery_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz erişim'; end if;
  if target_event_type not in (
    'company_password_changed', 'company_email_changed',
    'company_info_changed', 'company_status_changed'
  ) then raise exception 'Geçersiz firma olayı'; end if;
  if not exists(select 1 from public.companies where id = target_company_id and removed_at is null) then
    raise exception 'Firma bulunamadı';
  end if;

  insert into public.notifications(
    audience, company_id, type, title, message, translation_key, translation_params
  ) values (
    'company', target_company_id, target_event_type, event_title, event_message,
    event_translation_key, coalesce(event_translation_params, '{}'::jsonb)
  ) returning id into notification_id;

  if should_send_email then
    insert into public.email_deliveries(
      company_id, event_type, notification_id, subject, message
    ) values (
      target_company_id, target_event_type, notification_id, email_subject, email_message
    ) returning id into delivery_id;
  end if;

  return jsonb_build_object(
    'notificationId', notification_id,
    'deliveryId', delivery_id
  );
end;
$$;

revoke all on function public.create_company_event(uuid, text, text, text, text, jsonb, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.create_company_event(uuid, text, text, text, text, jsonb, boolean, text, text)
  to authenticated;
