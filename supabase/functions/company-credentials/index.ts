import { createClient } from 'npm:@supabase/supabase-js@2';
import { serviceClient, requireAdmin } from '../_shared/admin.ts';
import { normalizeCompanyName } from '../_shared/http.ts';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((x) => x.trim()).filter(Boolean);

function headers(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const allowed = allowedOrigins.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function generatePin(length = 6) {
  const size = Math.min(8, Math.max(6, length));
  const limit = Math.floor(0x1_0000_0000 / 10 ** size) * 10 ** size;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return String(values[0] % 10 ** size).padStart(size, '0');
}

const internalEmail = () => `company-${crypto.randomUUID()}@auth.techfix.invalid`;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin)) return json(request, { error: 'Origin izinli değil.' }, 403);

  try {
    const body = await request.json();
    const action = String(body.action ?? '');

    if (action === 'login') {
      const companyName = String(body.companyName ?? '');
      const pin = String(body.pin ?? '');
      if (!companyName.trim() || !/^\d{6,8}$/.test(pin)) {
        return json(request, { error: 'Firma adı veya PIN hatalı.' }, 401);
      }
      const service = serviceClient();
      const { data: company } = await service.from('companies')
        .select('id,name,auth_email,is_active')
        .eq('normalized_name', normalizeCompanyName(companyName)).maybeSingle();
      if (!company?.is_active || !company.auth_email) {
        return json(request, { error: 'Firma adı veya PIN hatalı.' }, 401);
      }
      const publicClient = createClient(
        Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await publicClient.auth.signInWithPassword({ email: company.auth_email, password: pin });
      if (error || !data.session) return json(request, { error: 'Firma adı veya PIN hatalı.' }, 401);
      return json(request, { session: data.session, company: { id: company.id, name: company.name } });
    }

    if (action === 'request-reset') {
      const service = serviceClient();
      const companyName = normalizeCompanyName(String(body.companyName ?? ''));
      if (companyName) {
        const { data: company } = await service.from('companies').select('id,name')
          .eq('normalized_name', companyName).eq('is_active', true).maybeSingle();
        if (company) {
          await service.from('notifications').insert({
            audience: 'admin', company_id: company.id, type: 'pin_request',
            title: 'Firma PIN talebi', message: `${company.name} yeni PIN talep etti.`,
          });
        }
      }
      return json(request, { ok: true, message: 'Firma eşleşiyorsa talebiniz yönetime iletildi.' });
    }

    const admin = await requireAdmin(request);
    if (!admin) return json(request, { error: 'Yetkisiz erişim.' }, 403);
    const { service } = admin;

    if (action === 'create') {
      const name = String(body.name ?? '').trim();
      const block = String(body.block ?? '').trim();
      const floor = String(body.floor ?? '').trim();
      const officeCode = String(body.officeCode ?? '').trim();
      const pinLength = Number(body.pinLength ?? 6);
      if (!name || !block || !floor || !officeCode || ![6, 7, 8].includes(pinLength)) {
        return json(request, { error: 'Firma alanları geçersiz.' }, 400);
      }
      const pin = generatePin(pinLength);
      const email = internalEmail();
      const { data: authData, error: authError } = await service.auth.admin.createUser({
        email, password: pin, email_confirm: true,
        app_metadata: { role: 'company' }, user_metadata: { company_name: name },
      });
      if (authError || !authData.user) return json(request, { error: authError?.message ?? 'Auth kullanıcısı oluşturulamadı.' }, 400);
      const { data: company, error } = await service.from('companies').insert({
        name, normalized_name: normalizeCompanyName(name), auth_email: email,
        auth_user_id: authData.user.id, block, floor, office_code: officeCode, is_active: true,
      }).select('id,name').single();
      if (error) {
        await service.auth.admin.deleteUser(authData.user.id);
        return json(request, { error: error.message }, 400);
      }
      return json(request, { company, pin }, 201);
    }

    const companyId = String(body.companyId ?? '');
    const { data: company } = await service.from('companies')
      .select('id,name,auth_user_id,auth_email').eq('id', companyId).maybeSingle();
    if (!company) return json(request, { error: 'Firma bulunamadı.' }, 404);

    if (action === 'reset') {
      if (!company.auth_user_id) return json(request, { error: 'Firma Auth hesabı bulunamadı.' }, 409);
      const pinLength = Number(body.pinLength ?? 6);
      if (![6, 7, 8].includes(pinLength)) return json(request, { error: 'PIN uzunluğu geçersiz.' }, 400);
      const pin = generatePin(pinLength);
      const { error } = await service.auth.admin.updateUserById(company.auth_user_id, { password: pin });
      if (error) return json(request, { error: error.message }, 400);
      await service.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('audience', 'admin').eq('type', 'pin_request').eq('company_id', company.id).is('read_at', null);
      return json(request, { pin });
    }

    if (action === 'set-active' && typeof body.isActive === 'boolean') {
      const { error } = await service.from('companies').update({ is_active: body.isActive }).eq('id', company.id);
      if (!error && company.auth_user_id) {
        await service.auth.admin.updateUserById(company.auth_user_id, {
          ban_duration: body.isActive ? 'none' : '876000h',
        });
      }
      return error ? json(request, { error: error.message }, 400) : json(request, { ok: true });
    }

    return json(request, { error: 'Geçersiz işlem.' }, 400);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' }, 500);
  }
});
