# Deploy Checklist

## Supabase

1. Open your Supabase project.
2. Run [`supabase/schema.sql`](../../supabase/schema.sql).
3. Optionally run [`supabase/seed.sql`](../../supabase/seed.sql).

## Vercel

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. In Vercel Project Settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
4. Deploy.

## After deploy

1. Open `/`.
2. Open `/invoices`.
3. Open one invoice detail page.
4. Open the PDF route for that invoice.
5. Create a test company or employee to verify write access.
