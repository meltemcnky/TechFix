import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type ServiceClient = SupabaseClient;

export type EmailResult = {
  requested: boolean;
  accepted: boolean;
  deliveryId?: string;
  providerMessageId?: string;
  error?: string;
};

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const ticketStatusLabels: Record<string, string> = {
  new: 'Yeni', under_review: 'İnceleniyor', in_progress: 'İşlemde',
  resolved: 'Çözüldü', archived: 'Arşivlendi',
};

function configuredBaseUrl(allowedOrigins: string[]) {
  const raw = (Deno.env.get('APP_BASE_URL') ?? '').replace(/\/$/, '');
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && allowedOrigins.includes(url.origin) ? url.origin : null;
  } catch {
    return null;
  }
}

function emailContent(delivery: Record<string, unknown>, companyName: string, baseUrl: string, sensitiveMessage?: string) {
  if (delivery.event_type === 'ticket_updated') {
    const title = String(delivery.ticket_title ?? 'Talep');
    const status = ticketStatusLabels[String(delivery.status_snapshot)] ?? String(delivery.status_snapshot ?? '');
    const note = delivery.admin_note_snapshot ? String(delivery.admin_note_snapshot) : '';
    const ticketUrl = `${baseUrl}/firma/talepler?ticket=${encodeURIComponent(String(delivery.ticket_id))}`;
    const noteHtml = note ? `<p><strong>Yönetim Notu:</strong><br>${escapeHtml(note).replaceAll('\n', '<br>')}</p>` : '';
    return {
      subject: 'TeknoTakip | Talebiniz Güncellendi',
      html: `<p>Merhaba ${escapeHtml(companyName)},</p><p>“${escapeHtml(title)}” başlıklı talebiniz güncellendi.</p><p><strong>Yeni Durum:</strong><br>${escapeHtml(status)}</p>${noteHtml}<p><a href="${ticketUrl}">Talebi Görüntüle</a></p>`,
      text: `Merhaba ${companyName},\n\n“${title}” başlıklı talebiniz güncellendi.\n\nYeni Durum: ${status}${note ? `\n\nYönetim Notu: ${note}` : ''}\n\n${ticketUrl}`,
    };
  }
  const message = delivery.event_type === 'company_password_changed' && sensitiveMessage
    ? sensitiveMessage
    : String(delivery.message ?? 'Firma hesabınızla ilgili bir güncelleme yapıldı.');
  return {
    subject: String(delivery.subject ?? 'TeknoTakip | Firma Bilgileriniz Güncellendi'),
    html: `<p>Merhaba ${escapeHtml(companyName)},</p><p>${escapeHtml(message).replaceAll('\n', '<br>')}</p><p>TeknoTakip hesabınızdan güncel bilgilerinizi kontrol edebilirsiniz.</p>`,
    text: `Merhaba ${companyName},\n\n${message}\n\nTeknoTakip hesabınızdan güncel bilgilerinizi kontrol edebilirsiniz.`,
  };
}

export async function deliverCompanyEmail(
  service: ServiceClient,
  deliveryId: string,
  allowedOrigins: string[],
  sensitiveMessage?: string,
): Promise<EmailResult> {
  const { data: delivery } = await service.from('email_deliveries').select('*').eq('id', deliveryId).maybeSingle();
  if (!delivery) return { requested: true, accepted: false, error: 'delivery_not_found' };
  if (delivery.delivery_status === 'sent') return {
    requested: true, accepted: true, deliveryId,
    ...(delivery.provider_message_id ? { providerMessageId: String(delivery.provider_message_id) } : {}),
  };
  if (delivery.event_type === 'company_password_changed' && !sensitiveMessage)
    return { requested: true, accepted: false, error: 'password_required_for_retry', deliveryId };
  if (delivery.delivery_status === 'sending' && delivery.last_attempt_at
    && Date.now() - new Date(delivery.last_attempt_at).getTime() < 2 * 60_000)
    return { requested: true, accepted: false, error: 'delivery_in_progress', deliveryId };

  const now = new Date().toISOString();
  const { data: claimed } = await service.from('email_deliveries').update({
    delivery_status: 'sending', last_attempt_at: now,
    attempt_count: Number(delivery.attempt_count ?? 0) + 1, last_error_code: null,
  }).eq('id', deliveryId).eq('updated_at', delivery.updated_at).select('*').maybeSingle();
  if (!claimed) return { requested: true, accepted: false, error: 'delivery_in_progress', deliveryId };

  const [{ data: company }, apiKey, from, baseUrl] = await Promise.all([
    service.from('companies').select('name,email,is_active,removed_at').eq('id', claimed.company_id).maybeSingle(),
    Promise.resolve(Deno.env.get('RESEND_API_KEY')),
    Promise.resolve(Deno.env.get('RESEND_FROM')),
    Promise.resolve(configuredBaseUrl(allowedOrigins)),
  ]);
  const mayNotifyInactive = claimed.event_type !== 'ticket_updated';
  if (!company?.email || (!company.is_active && !mayNotifyInactive) || company.removed_at || !apiKey || !from || !baseUrl) {
    await service.from('email_deliveries').update({ delivery_status: 'failed', last_error_code: 'email_not_configured' }).eq('id', deliveryId);
    return { requested: true, accepted: false, error: 'email_not_configured', deliveryId };
  }

  const content = emailContent(claimed, company.name, baseUrl, sensitiveMessage);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': deliveryId,
      },
      body: JSON.stringify({ from, to: [company.email], subject: content.subject, html: content.html, text: content.text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id) {
      await service.from('email_deliveries').update({
        delivery_status: 'failed', last_error_code: `provider_${response.status}`,
        recipient_email: company.email,
      }).eq('id', deliveryId);
      return { requested: true, accepted: false, error: 'email_provider_failed', deliveryId };
    }
    await service.from('email_deliveries').update({
      delivery_status: 'sent', provider_message_id: String(payload.id),
      recipient_email: company.email, sent_at: new Date().toISOString(), last_error_code: null,
    }).eq('id', deliveryId);
    return { requested: true, accepted: true, deliveryId, providerMessageId: String(payload.id) };
  } catch {
    await service.from('email_deliveries').update({
      delivery_status: 'failed', last_error_code: 'provider_unreachable', recipient_email: company.email,
    }).eq('id', deliveryId);
    return { requested: true, accepted: false, error: 'email_provider_failed', deliveryId };
  }
}
