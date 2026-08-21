# TechFix Supabase workflow

The ordered migration chain is the complete TechFix schema. The personal
Supabase FREE project is DEV/test only; the corporate PRO project will be built
from the same baseline without demo data.

TechFix uses hosted Supabase. Docker and a local Supabase stack are not part of
the application architecture. The standalone Supabase CLI is used only to link
projects, inspect migration history, and apply reviewed SQL migrations.

## Link an environment

```sh
supabase login
supabase link --project-ref <project-ref>
supabase migration list --linked
```

Enter database passwords interactively. Do not put access tokens, database
passwords, secret/service-role keys, or connection strings in repository files.

## Schema changes

After the approved DEV-only reset, create every future database change as a new
migration and inspect the remote history before pushing:

```sh
supabase migration new <descriptive_name>
supabase db push --dry-run
supabase db push
```

Never use `supabase db reset --linked` against production. A linked reset is
allowed only for the disposable personal DEV project after its project ref is
verified and explicit destructive approval is received.

`seed.sql` does not contain Auth users, passwords, PINs, or production data. Stable category
records belong to the baseline; DEV companies are created through the secured
`company-credentials` function.

## Edge Function secrets

TechFix uses only `company-credentials` and `technician-access`. Configure the
server-only values in each hosted Supabase project:

```sh
supabase secrets set ALLOWED_ORIGINS=https://your-dev.vercel.app,http://localhost:3000
supabase secrets set TECHNICIAN_GRANT_SECRET=<at-least-32-random-characters>
```

Never expose the service-role or technician grant secret through a `VITE_*`
variable. Supabase supplies its built-in URL and API keys to hosted functions.

## DEV function deployment

```sh
supabase functions deploy company-credentials --use-api
supabase functions deploy technician-access --use-api
```

## Corporate production promotion

1. Create the corporate Supabase PRO project.
2. Link this repository to its project ref.
3. Confirm the project is empty, review the migration list, and run a dry-run.
4. Apply the baseline without DEV/test data.
5. Create production Auth users securely in the corporate project.
6. Point Vercel production variables at the corporate URL and public anon key.
