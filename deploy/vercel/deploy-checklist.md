# Deploy Checklist

## Database (Neon)

1. Provision a Neon database (the Vercel Marketplace integration sets `DATABASE_URL`
   automatically; otherwise copy the pooled connection string from the Neon console).
2. Run [`supabase/schema.neon.sql`](../../supabase/schema.neon.sql) against it.

## Vercel

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. In Vercel Project Settings, add:
   - `DATABASE_URL` (skip if the Neon Marketplace integration already set it)
   - `SESSION_SECRET` (generate with `openssl rand -base64 48`)
4. Deploy.

## After deploy

1. Open `/`.
2. Open `/invoices`.
3. Open one invoice detail page.
4. Open the PDF route for that invoice.
5. Create a test company or employee to verify write access.
