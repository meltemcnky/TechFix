import { authenticatedClient, requireAdmin } from '../_shared/admin.ts';

const allowedOrigins = [Deno.env.get('ALLOWED_ORIGINS'), Deno.env.get('ADDITIONAL_ALLOWED_ORIGINS')]
  .filter(Boolean).join(',').split(',').map((x) => x.trim()).filter(Boolean);

function cors(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const statusLabels: Record<string, string> = {
  new: 'Yeni', under_review: 'İnceleniyor', in_progress: 'İşlemde',
  resolved: 'Çözüldü', archived: 'Arşivlendi',
};

function configuredBaseUrl() {
  const raw = (Deno.env.get('APP_BASE_URL') ?? '').replace(/\/$/, '');
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && allowedOrigins.includes(url.origin) ? url.origin : null;
  } catch {
    return null;
  }
}

async function deliver(request: Request, admin: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>, deliveryId: string) {
  const { service } = admin;
  const { data: delivery } = await service.from('email_deliveries').select('*').eq('id', deliveryId).maybeSingle();
  if (!delivery) return { status: 'failed' as const, code: 'delivery_not_found' };
  if (delivery.delivery_status === 'sent') return { status: 'sent' as const, deliveryId };
  if (delivery.delivery_status === 'sending' && delivery.last_attempt_at
    && Date.now() - new Date(delivery.last_attempt_at).getTime() < 2 * 60_000)
    return { status: 'failed' as const, code: 'delivery_in_progress', deliveryId };

  const now = new Date().toISOString();
  const { data: claimed } = await service.from('email_deliveries').update({
    delivery_status: 'sending', last_attempt_at: now,
    attempt_count: Number(delivery.attempt_count ?? 0) + 1, last_error_code: null,
  }).eq('id', deliveryId).eq('updated_at', delivery.updated_at).select('*').maybeSingle();
  if (!claimed) return { status: 'failed' as const, code: 'delivery_in_progress', deliveryId };

  const [{ data: company }, apiKey, from, baseUrl] = await Promise.all([
    service.from('companies').select('name,email,is_active,removed_at').eq('id', claimed.company_id).maybeSingle(),
    Promise.resolve(Deno.env.get('RESEND_API_KEY')),
    Promise.resolve(Deno.env.get('RESEND_FROM')),
    Promise.resolve(configuredBaseUrl()),
  ]);
  if (!company?.email || !company.is_active || company.removed_at || !apiKey || !from || !baseUrl) {
    await service.from('email_deliveries').update({ delivery_status: 'failed', last_error_code: 'email_not_configured' }).eq('id', deliveryId);
    return { status: 'failed' as const, code: 'email_not_configured', deliveryId };
  }

  const ticketUrl = `${baseUrl}/firma/talepler?ticket=${encodeURIComponent(claimed.ticket_id)}`;
  const companyName = escapeHtml(company.name);
  const title = escapeHtml(claimed.ticket_title);
  const status = escapeHtml(statusLabels[claimed.status_snapshot] ?? claimed.status_snapshot);
  const note = claimed.admin_note_snapshot ? escapeHtml(claimed.admin_note_snapshot) : '';
  const noteHtml = note ? `<p><strong>Yönetim Notu:</strong><br>${note.replaceAll('\n', '<br>')}</p>` : '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;color:#172033;line-height:1.6">
    <h2 style="color:#173968">TeknoTakip</h2><p>Merhaba ${companyName},</p>
    <p>“${title}” başlıklı talebiniz güncellendi.</p>
    <p><strong>Yeni Durum:</strong><br>${status}</p>${noteHtml}
    <p>Talebinizin detaylarını TeknoTakip üzerinden görüntüleyebilirsiniz.</p>
    <p><a href="${ticketUrl}" style="display:inline-block;background:#173968;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Talebi Görüntüle</a></p>
  </div>`;
  const text = `Merhaba ${company.name},\n\n“${claimed.ticket_title}” başlıklı talebiniz güncellendi.\n\nYeni Durum:\n${statusLabels[claimed.status_snapshot] ?? claimed.status_snapshot}${claimed.admin_note_snapshot ? `\n\nYönetim Notu:\n${claimed.admin_note_snapshot}` : ''}\n\nTalebiniz: ${ticketUrl}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': deliveryId,
      },
      body: JSON.stringify({ from, to: [company.email], subject: 'TeknoTakip | Talebiniz Güncellendi', html, text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id) {
      await service.from('email_deliveries').update({ delivery_status: 'failed', last_error_code: `provider_${response.status}` }).eq('id', deliveryId);
      return { status: 'failed' as const, code: 'email_provider_failed', deliveryId };
    }
    await service.from('email_deliveries').update({
      delivery_status: 'sent', provider_message_id: String(payload.id), sent_at: new Date().toISOString(), last_error_code: null,
    }).eq('id', deliveryId);
    return { status: 'sent' as const, deliveryId };
  } catch {
    await service.from('email_deliveries').update({ delivery_status: 'failed', last_error_code: 'provider_unreachable' }).eq('id', deliveryId);
    return { status: 'failed' as const, code: 'email_provider_failed', deliveryId };
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed', code: 'method_not_allowed' }, 405);
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin)) return json(request, { error: 'Origin izinli değil.', code: 'origin_denied' }, 403);
  const admin = await requireAdmin(request);
  if (!admin) return json(request, { error: 'Yetkisiz erişim.', code: 'admin_required' }, 403);

  try {
    const body = await request.json();
    const action = String(body.action ?? 'update_ticket');
    if (action === 'retry_email') {
      const deliveryId = String(body.deliveryId ?? '');
      if (!deliveryId) return json(request, { error: 'Gönderim kaydı geçersiz.', code: 'invalid_delivery' }, 400);
      const email = await deliver(request, admin, deliveryId);
      return json(request, { ticketUpdated: false, email }, email.status === 'sent' ? 200 : 502);
    }
    if (action !== 'update_ticket') return json(request, { error: 'Geçersiz işlem.', code: 'invalid_action' }, 400);

    const client = authenticatedClient(request);
    const { data, error } = await client.rpc('admin_update_ticket_and_queue_email', {
      target_ticket_id: String(body.ticketId ?? ''),
      next_status: String(body.status ?? ''),
      next_admin_public_note: String(body.adminPublicNote ?? ''),
      should_send_email: body.sendEmail !== false,
    });
    if (error) return json(request, { error: 'Talep güncellenemedi.', code: 'ticket_update_failed' }, 400);
    const result = data as { ticketId: string; changed: boolean; notificationCreated: boolean; deliveryId?: string | null };
    const email = result.deliveryId
      ? await deliver(request, admin, result.deliveryId)
      : { status: 'skipped' as const };
    return json(request, { ticketUpdated: true, changed: result.changed, notificationCreated: result.notificationCreated, email });
  } catch {
    return json(request, { error: 'İşlem tamamlanamadı.', code: 'unexpected' }, 500);
  }
});
