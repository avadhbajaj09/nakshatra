# Nakshatra WhatsApp Studio

A multi-tenant WhatsApp Business management dashboard for hospitality teams. Built with Next.js, Vercel, Supabase, and Meta's WhatsApp Cloud API.

## Included

- Responsive shared-inbox dashboard
- Meta webhook verification and `x-hub-signature-256` validation
- Inbound message and delivery-status persistence
- Authenticated outbound text-message endpoint
- Multi-organization PostgreSQL schema with Row Level Security
- Contacts, conversations, messages, workflows, runs, and audit events
- Realtime-ready conversation and message tables

## Local setup

1. Copy `.env.example` to `.env.local` and fill in your credentials.
2. Install dependencies with `npm install`.
3. Apply `supabase/migrations/20260716170000_initial_schema.sql` through the Supabase CLI or SQL editor.
4. Start the app with `npm run dev`.

The Meta callback URL is:

```text
https://YOUR_DOMAIN/api/webhooks/whatsapp
```

Use the same private value for Meta's **Verify token** field and `WHATSAPP_VERIFY_TOKEN` in Vercel.

## Deployment

Import the GitHub repository into Vercel, add all variables from `.env.example`, and deploy. Never commit production access tokens, database passwords, Supabase secret keys, or Meta app secrets.
