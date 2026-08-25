-- Record provider acceptance explicitly; delivery_status remains the retry state machine.

alter table public.email_deliveries
  add column email_requested boolean not null default true,
  add column email_accepted boolean not null default false;

update public.email_deliveries
set email_accepted = true
where delivery_status = 'sent' and provider_message_id is not null;
