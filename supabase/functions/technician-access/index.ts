import bcrypt from 'npm:bcryptjs@2.4.3';
import { requireAdmin, serviceClient } from '../_shared/admin.ts';

const allowedOrigins = [Deno.env.get('ALLOWED_ORIGINS'), Deno.env.get('ADDITIONAL_ALLOWED_ORIGINS')]
  .filter(Boolean).join(',').split(',').map((x) => x.trim()).filter(Boolean);
const encoder = new TextEncoder();

function cors(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  };
}
function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function decodeB64url(value: string) {
  const input = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
}
async function hmac(value: string) {
  const secret = Deno.env.get('TECHNICIAN_GRANT_SECRET');
  if (!secret || secret.length < 32) throw new Error('Tekniker grant secret yapılandırılmamış.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
async function createGrant(method: 'qr' | 'pin', version: number) {
  const expiresAt = Date.now() + 15 * 60_000;
  const payload = b64url(encoder.encode(JSON.stringify({ method, version, exp: expiresAt, nonce: crypto.randomUUID() })));
  return { grant: `${payload}.${b64url(await hmac(payload))}`, expiresAt };
}
async function verifyGrant(grant: string) {
  const [payload, signature] = grant.split('.');
  if (!payload || !signature) return null;
  const expected = await hmac(payload);
  const actual = decodeB64url(signature);
  if (expected.length !== actual.length) return null;
  let mismatch = 0;
  expected.forEach((byte, index) => { mismatch |= byte ^ actual[index]; });
  if (mismatch !== 0) return null;
  const data = JSON.parse(new TextDecoder().decode(decodeB64url(payload)));
  return data.exp > Date.now() && Number.isInteger(data.version) && ['qr', 'pin'].includes(data.method)
    ? data as { method: 'qr' | 'pin'; version: number; exp: number } : null;
}
function randomDigits(length: number) {
  const values = new Uint32Array(1);
  const base = 10 ** length;
  const limit = Math.floor(0x1_0000_0000 / base) * base;
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return String(values[0] % base).padStart(length, '0');
}
async function isSupportedImage(file: File) {
  if (file.type !== 'image/webp' || file.size === 0 || file.size > 5 * 1024 * 1024) return false;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return new TextDecoder().decode(header.slice(0, 4)) === 'RIFF'
    && new TextDecoder().decode(header.slice(8, 12)) === 'WEBP';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin)) return json(request, { error: 'Origin izinli değil.' }, 403);
  const service = serviceClient();
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const grant = await verifyGrant(String(form.get('grant') ?? ''));
      const meterType = String(form.get('meterType') ?? '');
      const rawValue = String(form.get('readingValue') ?? '').trim();
      const readingValue = rawValue === '' ? null : Number(rawValue);
      const notes = String(form.get('notes') ?? '').trim().slice(0, 2000) || null;
      const photo = form.get('photo');
      const { data: activeAccess } = grant
        ? await service.from('technician_access').select('credential_version,is_active').eq('is_active', true).maybeSingle()
        : { data: null };
      if (!grant || !activeAccess?.is_active || activeAccess.credential_version !== grant.version) {
        return json(request, { error: 'Tekniker erişim süresi doldu.', code: 'grant_expired' }, 401);
      }
      if (
          !['electricity', 'natural_gas'].includes(meterType) ||
          (readingValue !== null && (!Number.isFinite(readingValue) || readingValue < 0)) ||
          !(photo instanceof File) || !(await isSupportedImage(photo))) {
        return json(request, { error: 'Gönderim alanları veya erişim süresi geçersiz.' }, 400);
      }
      const id = crypto.randomUUID();
      const now = new Date();
      const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.webp`;
      const { error: uploadError } = await service.storage.from('meter-photos').upload(path, photo, {
        contentType: 'image/webp', upsert: false, cacheControl: '3600',
      });
      if (uploadError) return json(request, { error: 'Fotoğraf yüklenemedi.' }, 400);
      const { error } = await service.from('meter_readings').insert({
        id, meter_type: meterType, photo_path: path,
        reading_value: readingValue, notes, access_method: grant.method,
      });
      if (error) {
        await service.storage.from('meter-photos').remove([path]);
        return json(request, { error: 'Sayaç kaydı oluşturulamadı.' }, 400);
      }
      await service.from('notifications').insert({
        audience: 'admin', meter_reading_id: id, type: 'meter_created',
        title: 'Yeni sayaç kaydı',
        message: `${meterType === 'electricity' ? 'Elektrik' : 'Doğalgaz'} sayaç kaydı oluşturuldu.`,
      });
      return json(request, { ok: true }, 201);
    }

    const body = await request.json();
    const action = String(body.action ?? 'validate');
    if (action === 'validate') {
      const method = body.qrToken ? 'qr' : 'pin';
      const credential = String(body.qrToken ?? body.pin ?? '');
      if ((method === 'pin' && !/^\d{4,6}$/.test(credential)) || !credential) {
        return json(request, { error: 'Tekniker erişimi geçersiz.' }, 403);
      }
      const { data: access } = await service.from('technician_access').select('*').eq('is_active', true).maybeSingle();
      if (!access || (access.locked_until && new Date(access.locked_until) > new Date()) ||
          (method === 'qr' && access.qr_expires_at && new Date(access.qr_expires_at) <= new Date())) {
        return json(request, { error: 'Tekniker erişimi geçersiz.' }, 403);
      }
      const valid = method === 'qr'
        ? await sha256(credential) === access.qr_token_hash
        : await bcrypt.compare(credential, access.fallback_pin_hash);
      if (!valid) {
        const attempts = Number(access.failed_attempts ?? 0) + 1;
        await service.from('technician_access').update({
          failed_attempts: attempts >= 5 ? 0 : attempts,
          locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
        }).eq('id', access.id);
        return json(request, { error: 'Tekniker erişimi geçersiz.' }, 403);
      }
      await service.from('technician_access').update(method === 'qr'
        ? { last_qr_used_at: new Date().toISOString(), failed_attempts: 0, locked_until: null }
        : { last_pin_used_at: new Date().toISOString(), failed_attempts: 0, locked_until: null }).eq('id', access.id);
      return json(request, await createGrant(method, access.credential_version));
    }

    if (action === 'rotate') {
      const admin = await requireAdmin(request);
      if (!admin) return json(request, { error: 'Yetkisiz erişim.' }, 403);
      const target = String(body.target ?? 'qr');
      if (!['qr', 'pin'].includes(target)) return json(request, { error: 'Yenileme hedefi geçersiz.' }, 400);
      const { data: current } = await service.from('technician_access').select('id,qr_token_hash,fallback_pin_hash,credential_version,qr_expires_at').eq('is_active', true).maybeSingle();
      const rawQr = target === 'qr' ? b64url(crypto.getRandomValues(new Uint8Array(32))) : null;
      const pinLength = Math.min(6, Math.max(4, Number(body.pinLength ?? 6)));
      const rawPin = randomDigits(pinLength);
      const values = {
        qr_token_hash: rawQr ? await sha256(rawQr) : current?.qr_token_hash,
        fallback_pin_hash: await bcrypt.hash(rawPin, 12),
        credential_version: Number(current?.credential_version ?? 0) + 1,
        qr_expires_at: target === 'qr' ? body.expiresAt || null : current?.qr_expires_at ?? null,
        updated_by: admin.user.id,
      };
      if (!values.qr_token_hash) return json(request, { error: 'İlk işlem QR yenileme olmalıdır.' }, 409);
      const query = current
        ? service.from('technician_access').update(values).eq('id', current.id)
        : service.from('technician_access').insert({ ...values, is_active: true });
      const { error } = await query;
      return error ? json(request, { error: error.message }, 400) : json(request, { rawToken: rawQr, pin: rawPin });
    }
    return json(request, { error: 'Geçersiz işlem.' }, 400);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' }, 500);
  }
});
