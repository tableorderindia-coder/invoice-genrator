# Vercel Deploy Folder

This folder is the deployment handoff bundle for the project.

Important:

- Vercel reads the real project config from the repo root, not from this folder.
- The root config file is [`vercel.json`](../../vercel.json).
- The Postgres schema/history lives in [`supabase/`](../../supabase/) (name kept for
  history - the app now runs on plain Postgres via Neon, not Supabase).
  `supabase/schema.neon.sql` is the current target schema for a fresh Neon database.

## What is in this folder

- `env.production.example` for required Vercel environment variables
- `deploy-checklist.md` for push-and-deploy steps

## Before you deploy

1. Provision a Neon database (via the Vercel Marketplace integration is easiest -
   it sets `DATABASE_URL` for you automatically).
2. Confirm `supabase/schema.neon.sql` has been run against it.
3. Add `SESSION_SECRET` (and `DATABASE_URL` if not auto-set) in Vercel Project Settings.
4. Push this repo to GitHub.
5. Import the repo into Vercel and deploy.
