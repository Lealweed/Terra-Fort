<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/305059f1-40d7-4f46-96d1-226dbd1005d1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (or use the existing one) with:
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `VITE_STRIPE_PUBLIC_KEY`
   - `N8N_SHARED_SECRET`
3. Run the app:
   `npm run dev`

## Supabase bootstrap

- SQL migration: `supabase/migrations/20260506_init.sql`
- Detailed notes: `supabase/README.md`

## Agent context for n8n / WhatsApp

- Endpoint: `GET` or `POST` `/api/agent-context`
- Authentication: `Authorization: Bearer <N8N_SHARED_SECRET>` or header `x-integration-key`
- Accepted filters:
  - `phone`
  - `email`
  - `orderCode`
  - `productQuery`
- Response includes:
  - customer profile
  - latest orders with timeline and items
  - active promotions
  - matching products
  - integration status

## New operational tables

- `promotions`
- `integration_connections`
- `sync_runs`
