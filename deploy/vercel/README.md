# Vercel Deploy Folder

This folder is the deployment handoff bundle for the project.

Important:

- Vercel reads the real project config from the repo root, not from this folder.
- The root config file is [`vercel.json`](../../vercel.json).
- Supabase SQL files stay in [`supabase/`](../../supabase/).

## What is in this folder

- `env.production.example` for required Vercel environment variables
- `deploy-checklist.md` for push-and-deploy steps

## Before you deploy

1. Confirm `supabase/schema.sql` has been run on your Supabase project.
2. Confirm optional `supabase/seed.sql` has been run if you want starter data.
3. Add the required environment variables in Vercel Project Settings.
4. Push this repo to GitHub.
5. Import the repo into Vercel and deploy.
