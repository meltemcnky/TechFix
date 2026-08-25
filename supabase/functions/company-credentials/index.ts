import { createClient } from 'npm:@supabase/supabase-js@2';
import { authenticatedClient, serviceClient, requireAdmin, requireCompany } from '../_shared/admin.ts';
import { normalizeCompanyName } from '../_shared/http.ts';
import { deliverCompanyEmail, type EmailResult } from '../_shared/company-email.ts';

const allowedOrigins = [Deno.env.get('ALLOWED_ORIGINS'), Deno.env.get('ADDITIONAL_ALLOWED_ORIGINS')]
  .filter(Boolean).join(',')
  .split(',').map((x) => x.trim()).filter(Boolean);
const adminLoginUsername = (Deno.env.get('ADMIN_LOGIN_USERNAME') ?? '').trim();
const adminAuthEmail = (Deno.env.get('ADMIN_AUTH_EMAIL') ?? '').trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  const email = String(value ?? '').trim().toLocaleLowerCase('en-US');
  return email.length <= 254 && emailPattern.test(email) ? email : null;
}

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
  const payload = status >= 400 && body && typeof body === 'object' && 'error' in body && !('code' in body)
    ? { ...body, code: `http_${status}` }
    : body;
  return new Response(JSON.stringify(payload), {
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

type CompanyEvent = {
  type: 'company_password_changed' | 'company_email_changed' | 'company_info_changed' | 'company_status_changed';
  title: string;
  message: string;
  translationKey: string;
  translationParams?: Record<string, string>;
  emailSubject: string;
  emailMessage: string;
  emailRequested?: boolean;
  sensitiveEmailMessage?: string;
};

async function createCompanyEvent(
  request: Request,
  admin: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  companyId: string,
  event: CompanyEvent,
) {
  const requested = event.emailRequested !== false;
  const { data, error } = await authenticatedClient(request).rpc('create_company_event', {
    target_company_id: companyId,
    target_event_type: event.type,
    event_title: event.title,
    event_message: event.message,
    event_translation_key: event.translationKey,
    event_translation_params: event.translationParams ?? {},
    should_send_email: requested,
    email_subject: event.emailSubject,
    email_message: event.emailMessage,
  });
  if (error) return {
    notificationCreated: false,
    email: { requested, accepted: false, error: 'event_queue_failed' } satisfies EmailResult,
  };
  const result = data as { notificationId: string; deliveryId?: string | null };
  return {
    notificationCreated: Boolean(result.notificationId),
    email: result.deliveryId
      ? await deliverCompanyEmail(admin.service, result.deliveryId, allowedOrigins, event.sensitiveEmailMessage)
      : { requested: false, accepted: false } satisfies EmailResult,
  };
}

function combinedEmail(events: Array<{ email: EmailResult }>): EmailResult {
  const requested = events.filter((event) => event.email.requested);
  if (!requested.length) return { requested: false, accepted: false };
  const failed = requested.find((event) => !event.email.accepted)?.email;
  if (failed) return failed;
  return requested[requested.length - 1].email;
}

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
      const publicClient = createClient(
        Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      let loginEmail = username;
      if (!username.includes('@')) {
        const { data: legacyCompany } = await service.from('companies')
          .select('email,auth_email,is_active,removed_at')
          .eq('normalized_name', normalizeCompanyName(username)).maybeSingle();
        if (legacyCompany?.is_active && !legacyCompany.removed_at)
          loginEmail = legacyCompany.email ?? legacyCompany.auth_email ?? '';
        else if (adminLoginUsername && adminAuthEmail && username === adminLoginUsername)
          loginEmail = adminAuthEmail;
      }
      const { data, error } = await publicClient.auth.signInWithPassword({ email: loginEmail, password });
      if (!error && data.session) {
        const [{ data: admin }, { data: company }] = await Promise.all([
          service.from('admin_users').select('is_active').eq('user_id', data.user.id).maybeSingle(),
          service.from('companies').select('is_active,removed_at').eq('auth_user_id', data.user.id).maybeSingle(),
        ]);
        if (admin?.is_active) return json(request, { role: 'admin', session: data.session });
        if (company?.is_active && !company.removed_at)
          return json(request, { role: 'company', session: data.session });
      }
      return json(request, { error: 'Kullanıcı adı veya şifre hatalı.' }, 401);
    }

    if (action === 'request-reset') {
      const service = serviceClient();
      const username = String(body.username ?? body.companyName ?? '').trim();
      if (!username || username.length > 254) {
        return json(request, { ok: true, accountType: 'unknown', message: 'Bilgiler eşleşiyorsa şifre yenileme işlemi başlatıldı.' });
      }
      const companyEmail = normalizeEmail(username);
      const companyName = normalizeCompanyName(username);
      if (companyName) {
        let companyQuery = service.from('companies').select('id,name')
          .eq('is_active', true).is('removed_at', null);
        companyQuery = companyEmail
          ? companyQuery.eq('email', companyEmail)
          : companyQuery.eq('normalized_name', companyName);
        const { data: company } = await companyQuery.maybeSingle();
        if (company) {
          const { data: openRequest } = await service.from('notifications').select('id')
            .eq('audience', 'admin').eq('type', 'password_request').eq('company_id', company.id)
            .is('read_at', null).maybeSingle();
          if (!openRequest) {
            const { error } = await service.from('notifications').insert({
              audience: 'admin', company_id: company.id, type: 'password_request',
              title: 'Firma şifre talebi', message: `${company.name} yeni şifre talep etti.`,
              translation_key: 'notifications.passwordRequest', translation_params: {},
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

    if (action === 'update_company_email') {
      const authenticated = await requireCompany(request);
      if (!authenticated) return json(request, { error: 'Yetkisiz erişim.' }, 403);
      const nextEmail = normalizeEmail(body.email);
      const currentPassword = String(body.currentPassword ?? '');
      if (!nextEmail || !currentPassword || currentPassword.length > 128)
        return json(request, { error: 'E-posta veya şifre geçersiz.' }, 400);
      const currentEmail = authenticated.company.email ?? authenticated.user.email;
      if (!currentEmail) return json(request, { error: 'Firma e-postası yapılandırılmamış.' }, 409);
      if (nextEmail === currentEmail.toLocaleLowerCase('en-US'))
        return json(request, { error: 'Yeni e-posta mevcut e-posta ile aynı.' }, 409);
      const publicClient = createClient(
        Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error: passwordError } = await publicClient.auth.signInWithPassword({
        email: currentEmail, password: currentPassword,
      });
      if (passwordError) return json(request, { error: 'Mevcut şifre hatalı.' }, 401);
      const { error } = await authenticated.service.auth.admin.updateUserById(
        authenticated.user.id, { email: nextEmail, email_confirm: true },
      );
      return error
        ? json(request, { error: 'E-posta adresi kullanılamıyor.' }, 409)
        : json(request, { ok: true, email: nextEmail });
    }

    const admin = await requireAdmin(request);
    if (!admin) return json(request, { error: 'Yetkisiz erişim.' }, 403);
    const { service } = admin;

    if (action === 'create') {
      const name = String(body.name ?? '').trim();
      const corporateEmail = normalizeEmail(body.email);
      const locationId = String(body.locationId ?? '');
      if (!name || !corporateEmail || !locationId) return json(request, { error: 'Firma alanları geçersiz.' }, 400);
      const { data: location } = await service.from('locations').select('id,block,floor,office_code,is_active').eq('id', locationId).maybeSingle();
      const { data: occupied } = await service.from('companies').select('id').eq('location_id', locationId).is('removed_at', null).maybeSingle();
      if (!location?.is_active || occupied) return json(request, { error: 'Lokasyon kullanılamıyor.' }, 409);
      const password = generateCompanyPassword();
      const { data: authData, error: authError } = await service.auth.admin.createUser({
        email: corporateEmail, password, email_confirm: true,
        app_metadata: { role: 'company' }, user_metadata: { company_name: name },
      });
      if (authError || !authData.user) return json(request, { error: authError?.message ?? 'Auth kullanıcısı oluşturulamadı.' }, 400);
      const { data: company, error } = await service.from('companies').insert({
        name, normalized_name: normalizeCompanyName(name), auth_email: corporateEmail,
        email: corporateEmail,
        auth_user_id: authData.user.id, location_id: location.id, block: location.block,
        floor: location.floor, office_code: location.office_code, is_active: true,
      }).select('id,name').single();
      if (error) {
        await service.auth.admin.deleteUser(authData.user.id);
        return json(request, { error: error.message }, 400);
      }
      return json(request, { company, password }, 201);
    }

    if (action === 'retry-email') {
      const deliveryId = String(body.deliveryId ?? '');
      if (!deliveryId) return json(request, { error: 'Gönderim kaydı geçersiz.' }, 400);
      const retryPassword = String(body.password ?? '');
      if (retryPassword.length > 128) return json(request, { error: 'Şifre geçersiz.' }, 400);
      const sensitiveMessage = retryPassword
        ? `Firma giriş şifreniz yenilendi.\nYeni şifreniz: ${retryPassword}\nBu şifreyi güvenli bir yerde saklayın.`
        : undefined;
      const email = await deliverCompanyEmail(service, deliveryId, allowedOrigins, sensitiveMessage);
      return json(request, { email }, email.accepted ? 200 : 502);
    }

    const companyId = String(body.companyId ?? '');
    const { data: company } = await service.from('companies')
      .select('id,name,email,auth_user_id,auth_email,is_active,removed_at,location_id,block,floor,office_code,logo_path')
      .eq('id', companyId).maybeSingle();
    if (!company) return json(request, { error: 'Firma bulunamadı.' }, 404);

    if (action === 'reset') {
      if (!company.auth_user_id) return json(request, { error: 'Firma Auth hesabı bulunamadı.' }, 409);
      const password = generateCompanyPassword();
      const { error } = await service.auth.admin.updateUserById(company.auth_user_id, { password });
      if (error) return json(request, { error: error.message }, 400);
      await service.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('audience', 'admin').eq('type', 'password_request').eq('company_id', company.id).is('read_at', null);
      const event = await createCompanyEvent(request, admin, company.id, {
        type: 'company_password_changed',
        title: 'Firma giriş şifreniz yenilendi',
        message: 'Firma giriş şifreniz yönetim tarafından yenilendi.',
        translationKey: 'notifications.companyPasswordChanged',
        emailSubject: 'TeknoTakip | Firma Şifreniz Yenilendi',
        emailMessage: 'Firma giriş şifreniz yönetim tarafından yenilendi.',
        sensitiveEmailMessage: `Firma giriş şifreniz yenilendi.\nYeni şifreniz: ${password}\nBu şifreyi güvenli bir yerde saklayın.`,
      });
      return json(request, { password, notificationCreated: event.notificationCreated, email: event.email });
    }

    if (action === 'set-email') {
      if (company.removed_at) return json(request, { error: 'Kaldırılmış firma değiştirilemez.' }, 409);
      if (!company.auth_user_id) return json(request, { error: 'Firma Auth hesabı bulunamadı.' }, 409);
      const nextEmail = normalizeEmail(body.email);
      if (!nextEmail) return json(request, { error: 'E-posta adresi geçersiz.' }, 400);
      const { error } = await service.auth.admin.updateUserById(company.auth_user_id, {
        email: nextEmail, email_confirm: true,
      });
      if (error) return json(request, { error: 'E-posta adresi kullanılamıyor.' }, 409);
      const event = await createCompanyEvent(request, admin, company.id, {
        type: 'company_email_changed',
        title: 'Giriş e-posta adresiniz güncellendi',
        message: 'Firma giriş ve bildirim e-posta adresiniz yönetim tarafından güncellendi.',
        translationKey: 'notifications.companyEmailChanged',
        emailSubject: 'TeknoTakip | Giriş E-Postanız Güncellendi',
        emailMessage: 'Firma giriş ve bildirim e-posta adresiniz güncellendi. Bundan sonraki girişlerinizde yeni e-posta adresinizi kullanın.',
      });
      return json(request, { ok: true, email: nextEmail, notificationCreated: event.notificationCreated, emailResult: event.email });
    }

    if (action === 'update') {
      if (company.removed_at) return json(request, { error: 'Kaldırılmış firma değiştirilemez.' }, 409);
      const name = String(body.name ?? '').trim();
      const nextEmail = normalizeEmail(body.email);
      const locationId = String(body.locationId ?? '');
      const logoPath = body.logoPath ? String(body.logoPath) : null;
      const { data: location } = await service.from('locations').select('id,block,floor,office_code,is_active').eq('id', locationId).maybeSingle();
      const { data: occupied } = await service.from('companies').select('id').eq('location_id', locationId)
        .is('removed_at', null).neq('id', company.id).limit(1).maybeSingle();
      if (!name || !nextEmail || !location?.is_active || occupied) return json(request, { error: 'Firma veya lokasyon bilgisi geçersiz.' }, 409);
      const emailChanged = nextEmail !== company.email;
      const infoChanges = [
        ...(name !== company.name ? ['firma adı'] : []),
        ...(locationId !== company.location_id ? ['lokasyon'] : []),
        ...(logoPath !== company.logo_path ? ['logo'] : []),
      ];
      if (emailChanged && company.auth_user_id) {
        const { error: emailError } = await service.auth.admin.updateUserById(company.auth_user_id, {
          email: nextEmail, email_confirm: true,
        });
        if (emailError) return json(request, { error: 'E-posta adresi kullanılamıyor.' }, 409);
      }
      const { error } = await service.from('companies').update({
        name, normalized_name: normalizeCompanyName(name), location_id: location.id,
        block: location.block, floor: location.floor, office_code: location.office_code,
        logo_path: logoPath,
      }).eq('id', company.id);
      if (error) return json(request, { error: error.message }, 400);
      const events = [];
      if (emailChanged) events.push(await createCompanyEvent(request, admin, company.id, {
        type: 'company_email_changed',
        title: 'Giriş e-posta adresiniz güncellendi',
        message: 'Firma giriş ve bildirim e-posta adresiniz yönetim tarafından güncellendi.',
        translationKey: 'notifications.companyEmailChanged',
        emailSubject: 'TeknoTakip | Giriş E-Postanız Güncellendi',
        emailMessage: 'Firma giriş ve bildirim e-posta adresiniz güncellendi. Bundan sonraki girişlerinizde yeni e-posta adresinizi kullanın.',
      }));
      if (infoChanges.length) events.push(await createCompanyEvent(request, admin, company.id, {
        type: 'company_info_changed',
        title: 'Firma bilgileriniz güncellendi',
        message: `Yönetim şu firma bilgilerini güncelledi: ${infoChanges.join(', ')}.`,
        translationKey: 'notifications.companyInfoChanged',
        translationParams: { fields: infoChanges.join(', ') },
        emailSubject: 'TeknoTakip | Firma Bilgileriniz Güncellendi',
        emailMessage: `Yönetim şu firma bilgilerinizi güncelledi: ${infoChanges.join(', ')}.`,
        emailRequested: !emailChanged && body.sendEmail !== false,
      }));
      return json(request, {
        ok: true,
        notificationCreated: events.length > 0 && events.every((event) => event.notificationCreated),
        email: combinedEmail(events),
      });
    }

    if (action === 'set-active' && typeof body.isActive === 'boolean') {
      if (company.removed_at) return json(request, { error: 'Kaldırılmış firma değiştirilemez.' }, 409);
      const { error } = await service.from('companies').update({ is_active: body.isActive }).eq('id', company.id);
      let authError = null;
      if (!error && company.auth_user_id) {
        const result = await service.auth.admin.updateUserById(company.auth_user_id, {
          ban_duration: body.isActive ? 'none' : '876000h',
        });
        authError = result.error;
      }
      if (error || authError) return json(request, { error: (error ?? authError)?.message }, 400);
      const activeMessage = body.isActive
        ? 'Firma hesabınız yeniden aktif edildi. TeknoTakip sistemine giriş yapabilirsiniz.'
        : 'Firma hesabınız pasife alındı. Hesap yeniden aktif edilene kadar TeknoTakip sistemine giriş yapamazsınız.';
      const event = await createCompanyEvent(request, admin, company.id, {
        type: 'company_status_changed',
        title: 'Firma durumunuz güncellendi',
        message: activeMessage,
        translationKey: 'notifications.companyStatusChanged',
        translationParams: { status: body.isActive ? 'active' : 'inactive' },
        emailSubject: 'TeknoTakip | Firma Durumunuz Güncellendi',
        emailMessage: activeMessage,
      });
      return json(request, { ok: true, notificationCreated: event.notificationCreated, email: event.email });
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
