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

function generateCompanyPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [letters[crypto.getRandomValues(new Uint32Array(1))[0] % letters.length],
    digits[crypto.getRandomValues(new Uint32Array(1))[0] % digits.length]];
  while (chars.length < 8) chars.push(all[crypto.getRandomValues(new Uint32Array(1))[0] % all.length]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
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
      const username = String(body.username ?? body.companyName ?? '').trim();
      const password = String(body.password ?? body.pin ?? '');
      if (!username || !password || password.length > 128) return json(request, { error: 'Kullanıcı adı veya şifre hatalı.' }, 401);
      const service = serviceClient();
      const { data: company } = await service.from('companies')
        .select('id,name,auth_email,is_active,removed_at')
        .eq('normalized_name', normalizeCompanyName(username)).maybeSingle();
      const publicClient = createClient(
        Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      if (company?.is_active && !company.removed_at && company.auth_email) {
        const { data, error } = await publicClient.auth.signInWithPassword({ email: company.auth_email, password });
        if (!error && data.session) return json(request, { role: 'company', session: data.session });
      } else {
        const { data, error } = await publicClient.auth.signInWithPassword({ email: username, password });
        if (!error && data.session) {
          const { data: admin } = await service.from('admin_users').select('is_active')
            .eq('user_id', data.user.id).maybeSingle();
          if (admin?.is_active) return json(request, { role: 'admin', session: data.session });
        }
      }
      return json(request, { error: 'Kullanıcı adı veya şifre hatalı.' }, 401);
    }

    if (action === 'request-reset') {
      const service = serviceClient();
      const username = String(body.username ?? body.companyName ?? '').trim();
      if (!username || username.length > 254) {
        return json(request, { ok: true, accountType: 'unknown', message: 'Bilgiler eşleşiyorsa şifre yenileme işlemi başlatıldı.' });
      }
      const companyName = normalizeCompanyName(username);
      if (companyName) {
        const { data: company } = await service.from('companies').select('id,name')
          .eq('normalized_name', companyName).eq('is_active', true).is('removed_at', null).maybeSingle();
        if (company) {
          const { data: openRequest } = await service.from('notifications').select('id')
            .eq('audience', 'admin').eq('type', 'password_request').eq('company_id', company.id)
            .is('read_at', null).maybeSingle();
          if (!openRequest) {
            const { error } = await service.from('notifications').insert({
              audience: 'admin', company_id: company.id, type: 'password_request',
              title: 'Firma şifre talebi', message: `${company.name} yeni şifre talep etti.`,
            });
            if (error && error.code !== '23505') return json(request, { error: 'Şifre talebi oluşturulamadı.' }, 500);
          }
          return json(request, { ok: true, accountType: 'company', message: 'Şifre yenileme talebiniz yönetime iletildi.' });
        }
      }

      if (username.includes('@')) {
        const { data: admins } = await service.from('admin_users').select('user_id').eq('is_active', true);
        for (const admin of admins ?? []) {
          const { data: authUser } = await service.auth.admin.getUserById(admin.user_id);
          if (authUser.user?.email?.toLocaleLowerCase('en-US') === username.toLocaleLowerCase('en-US')) {
            const publicClient = createClient(
              Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
              { auth: { persistSession: false, autoRefreshToken: false } },
            );
            const origin = request.headers.get('origin') ?? '';
            const redirectOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
            if (!redirectOrigin) return json(request, { error: 'Şifre yenileme yönlendirmesi yapılandırılmamış.' }, 503);
            const { error } = await publicClient.auth.resetPasswordForEmail(username, {
              redirectTo: `${redirectOrigin.replace(/\/$/, '')}/sifre-yenile`,
            });
            if (error) return json(request, { error: 'Şifre yenileme e-postası şu anda gönderilemedi.' }, 429);
            return json(request, { ok: true, accountType: 'admin', message: 'Şifre yenileme bağlantısı ilgili e-posta adresine gönderildi.' });
          }
        }
      }
      return json(request, { ok: true, accountType: 'unknown', message: 'Bilgiler eşleşiyorsa şifre yenileme işlemi başlatıldı.' });
    }

    const admin = await requireAdmin(request);
    if (!admin) return json(request, { error: 'Yetkisiz erişim.' }, 403);
    const { service } = admin;

    if (action === 'create') {
      const name = String(body.name ?? '').trim();
      const locationId = String(body.locationId ?? '');
      if (!name || !locationId) return json(request, { error: 'Firma alanları geçersiz.' }, 400);
      const { data: location } = await service.from('locations').select('id,block,floor,office_code,is_active').eq('id', locationId).maybeSingle();
      const { data: occupied } = await service.from('companies').select('id').eq('location_id', locationId).is('removed_at', null).maybeSingle();
      if (!location?.is_active || occupied) return json(request, { error: 'Lokasyon kullanılamıyor.' }, 409);
      const password = generateCompanyPassword();
      const email = internalEmail();
      const { data: authData, error: authError } = await service.auth.admin.createUser({
        email, password, email_confirm: true,
        app_metadata: { role: 'company' }, user_metadata: { company_name: name },
      });
      if (authError || !authData.user) return json(request, { error: authError?.message ?? 'Auth kullanıcısı oluşturulamadı.' }, 400);
      const { data: company, error } = await service.from('companies').insert({
        name, normalized_name: normalizeCompanyName(name), auth_email: email,
        auth_user_id: authData.user.id, location_id: location.id, block: location.block,
        floor: location.floor, office_code: location.office_code, is_active: true,
      }).select('id,name').single();
      if (error) {
        await service.auth.admin.deleteUser(authData.user.id);
        return json(request, { error: error.message }, 400);
      }
      return json(request, { company, password }, 201);
    }

    const companyId = String(body.companyId ?? '');
    const { data: company } = await service.from('companies')
      .select('id,name,auth_user_id,auth_email,is_active,removed_at').eq('id', companyId).maybeSingle();
    if (!company) return json(request, { error: 'Firma bulunamadı.' }, 404);

    if (action === 'reset') {
      if (!company.auth_user_id) return json(request, { error: 'Firma Auth hesabı bulunamadı.' }, 409);
      const password = generateCompanyPassword();
      const { error } = await service.auth.admin.updateUserById(company.auth_user_id, { password });
      if (error) return json(request, { error: error.message }, 400);
      await service.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('audience', 'admin').eq('type', 'password_request').eq('company_id', company.id).is('read_at', null);
      return json(request, { password });
    }

    if (action === 'update') {
      if (company.removed_at) return json(request, { error: 'Kaldırılmış firma değiştirilemez.' }, 409);
      const name = String(body.name ?? '').trim();
      const locationId = String(body.locationId ?? '');
      const logoPath = body.logoPath ? String(body.logoPath) : null;
      const { data: location } = await service.from('locations').select('id,block,floor,office_code,is_active').eq('id', locationId).maybeSingle();
      const { data: occupied } = await service.from('companies').select('id').eq('location_id', locationId)
        .is('removed_at', null).neq('id', company.id).limit(1).maybeSingle();
      if (!name || !location?.is_active || occupied) return json(request, { error: 'Firma veya lokasyon bilgisi geçersiz.' }, 409);
      const { error } = await service.from('companies').update({
        name, normalized_name: normalizeCompanyName(name), location_id: location.id,
        block: location.block, floor: location.floor, office_code: location.office_code,
        logo_path: logoPath,
      }).eq('id', company.id);
      return error ? json(request, { error: error.message }, 400) : json(request, { ok: true });
    }

    if (action === 'set-active' && typeof body.isActive === 'boolean') {
      if (company.removed_at) return json(request, { error: 'Kaldırılmış firma değiştirilemez.' }, 409);
      const { error } = await service.from('companies').update({ is_active: body.isActive }).eq('id', company.id);
      if (!error && company.auth_user_id) {
        await service.auth.admin.updateUserById(company.auth_user_id, {
          ban_duration: body.isActive ? 'none' : '876000h',
        });
      }
      return error ? json(request, { error: error.message }, 400) : json(request, { ok: true });
    }

    if (action === 'remove') {
      if (company.is_active || company.removed_at) return json(request, { error: 'Firma önce pasife alınmalıdır.' }, 409);
      const { error } = await service.from('companies').update({
        removed_at: new Date().toISOString(), removed_by: admin.user.id, location_id: null,
      }).eq('id', company.id).eq('is_active', false).is('removed_at', null);
      if (error) return json(request, { error: error.message }, 400);
      if (company.auth_user_id) await service.auth.admin.deleteUser(company.auth_user_id);
      return json(request, { ok: true });
    }

    return json(request, { error: 'Geçersiz işlem.' }, 400);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' }, 500);
  }
});
