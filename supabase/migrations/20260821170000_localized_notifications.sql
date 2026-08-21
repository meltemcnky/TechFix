-- Store system notifications as language-neutral events while preserving the
-- legacy title/message columns for older clients.
alter table public.notifications
  add column translation_key text,
  add column translation_params jsonb not null default '{}'::jsonb;

update public.notifications
set translation_key = case type
  when 'ticket_updated' then 'notifications.ticketUpdated'
  when 'password_request' then 'notifications.passwordRequest'
  when 'meter_created' then 'notifications.meterCreated'
end,
translation_params = case
  when type = 'ticket_updated' then jsonb_build_object('status', case message
    when 'Talebiniz alındı.' then 'new'
    when 'Talebiniz inceleniyor.' then 'under_review'
    when 'Talebiniz üzerinde çalışılıyor.' then 'in_progress'
    when 'Talebiniz çözüldü.' then 'resolved'
    when 'Talebiniz arşivlendi.' then 'archived'
    else 'updated' end)
  when type = 'meter_created' then jsonb_build_object('meterType',
    case when message ilike 'Elektrik%' then 'electricity' else 'natural_gas' end)
  else '{}'::jsonb
end;

alter table public.notifications alter column translation_key set not null;

create or replace function public.notify_ticket_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.admin_public_note is distinct from old.admin_public_note then
    insert into public.notifications(
      audience, company_id, ticket_id, type, title, message,
      translation_key, translation_params
    ) values (
      'company', new.company_id, new.id, 'ticket_updated', 'Talebiniz güncellendi',
      case new.status when 'new' then 'Talebiniz alındı.' when 'under_review' then 'Talebiniz inceleniyor.'
      when 'in_progress' then 'Talebiniz üzerinde çalışılıyor.' when 'resolved' then 'Talebiniz çözüldü.'
      when 'archived' then 'Talebiniz arşivlendi.' end,
      'notifications.ticketUpdated', jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;
