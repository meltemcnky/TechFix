import { authenticatedClient, requireAdmin } from '../_shared/admin.ts';
import { deliverCompanyEmail } from '../_shared/company-email.ts';

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

async function deliver(request: Request, admin: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>, deliveryId: string) {
  return deliverCompanyEmail(admin.service, deliveryId, allowedOrigins);
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
      return json(request, { ticketUpdated: false, email }, email.accepted ? 200 : 502);
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
      : { requested: false, accepted: false };
    return json(request, { ticketUpdated: true, changed: result.changed, notificationCreated: result.notificationCreated, email });
  } catch {
    return json(request, { error: 'İşlem tamamlanamadı.', code: 'unexpected' }, 500);
  }
});
