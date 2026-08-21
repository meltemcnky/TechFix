# TechFix deployment

## Architecture

- DNS: Cloudflare
- Frontend: Vercel (GitHub-connected Vite deployment)
- Backend: hosted Supabase (PostgreSQL, Auth, Storage, optional Edge Functions)

No application server, Docker runtime, or local Supabase stack is required.

## Current DEV deployment status

As of 2026-08-21, the Vercel Production deployment is live and reports
`Ready`. Vercel has the public `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` build variables configured.

The linked Supabase DEV project has the server-only `ALLOWED_ORIGINS` and
`TECHNICIAN_GRANT_SECRET` secrets configured. The active Edge Functions are
`company-credentials` and `technician-access`. Secret values and local
environment files are intentionally not recorded in Git.

## Technician QR operation

TechFix has no public QR generator, PDF flow, or simulator. An authenticated
admin can rotate the single physical QR and fallback PIN, preview the resulting
QR+PIN sheet, and download it as PNG for the meter cabinet. The QR contains
`/tekniker#token=<server-generated-token>` on the configured public origin. A
valid token is exchanged by `technician-access` for a 15-minute,
meter-submit-only grant; the raw token is never stored in the frontend bundle
or a `VITE_*` variable. Opening `/tekniker` without the QR uses the fallback
PIN.

## Environments

Vercel Preview may use the personal Supabase FREE project. Vercel Production
temporarily uses that project for the presentation and must later be switched
to the corporate Supabase PRO project.

Configure these public Vercel variables separately for Preview and Production:

- `VITE_PUBLIC_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never configure a service-role key, database password, Supabase access token,
or connection string as a `VITE_*` variable.

## Database changes

Use the standalone Supabase CLI. Project links are local and ignored by Git.

```sh
supabase login
supabase link --project-ref <project-ref>
supabase migration list --linked
supabase db push --dry-run
```

Review the dry-run before running `supabase db push`. Do not use hosted database
reset or migration repair as part of the normal workflow.

## Vercel

1. Import the GitHub repository into Vercel.
2. Select the Vite framework preset.
3. Use `npm run build` and output directory `dist`.
4. Add the environment variables above without committing their values.
5. Deploy and record the generated Vercel URL.

The existing `vercel.json` supplies the SPA fallback rewrite.

## Cloudflare DNS

Add the custom domain in Vercel first. Then create exactly the DNS record Vercel
shows in Cloudflare; do not guess its target. Keep the record DNS-only while
Vercel verifies the domain and provisions TLS. Vercel already provides the CDN,
so Cloudflare proxying is not required.

After the domain is active, add its exact callback/site URLs to Supabase Auth.

## DEV database rebuild

The personal FREE project is disposable DEV/test infrastructure. A linked reset
deletes its data and must only be run after confirming the project ref and
receiving explicit approval:

```sh
supabase migration list --linked
supabase db reset --linked --no-seed
supabase secrets set TECHNICIAN_GRANT_SECRET=<random-32-byte-secret>
supabase secrets set ALLOWED_ORIGINS=<exact-comma-separated-origins>
supabase functions deploy company-credentials --use-api
supabase functions deploy technician-access --use-api
```

Never run the reset command against the corporate PRO project.

## Corporate Supabase promotion

1. Create the corporate PRO project in the selected production region.
2. Link the repository to the new project ref.
3. Confirm the remote migration history is empty.
4. Dry-run and apply the clean baseline migration.
5. Load the approved corporate reference data separately.
6. Create the corporate admin Auth user without placing credentials in SQL.
7. Configure Auth site/redirect URLs for the production domain.
8. Replace only the Vercel Production Supabase URL and public anon key.
9. Smoke-test Auth, RLS, Storage, and the application before releasing traffic.
