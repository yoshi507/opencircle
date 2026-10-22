# OpenCircle

A free, modern community platform (Discord alternative) built with Next.js, Supabase, LiveKit and Vercel.

## Status

| Milestone | Focus | Status |
|-----------|--------|--------|
| 0 | Foundation, auth, shell | ✅ |
| 1 | Servers, channels, messages, DMs | ✅ |
| 2 | Invites, moderation, audit | ✅ |
| 3 | Voice / video (LiveKit) | ✅ |
| 4 | Search, threads, AI summaries | ✅ |
| 5 | Webhooks, security, launch | ✅ |

## Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind
- **Auth / DB / Realtime**: Supabase
- **Voice / video**: LiveKit
- **Hosting**: Vercel

## Environment variables (Vercel)

Use short names (one underscore) so mobile Vercel UI works:

| Key | Purpose |
|-----|----------|
| `SB_URL` | Supabase project URL |
| `SB_KEY` | Supabase anon key |
| `LK_URL` | LiveKit `wss://…` URL |
| `LK_KEY` | LiveKit API key |
| `LK_SECRET` | LiveKit API secret |
| `AI_KEY` | Optional OpenAI key for better channel summaries |

## SQL migrations

Run in order in the Supabase SQL editor:

1. `001_initial_schema.sql`
2. `003_fix_rls_recursion.sql`
3. `004_invites_rls.sql`
4. `005_m1_m2_complete_rls.sql`
5. `006_dms_roles_rls.sql`
6. `007_discovery_rls.sql`
7. `008_threads_search.sql` (or just `parent_id` on messages)
8. `009_webhooks.sql`

## Security (launch checklist)

- RLS on all user data tables; membership checked before messages / voice tokens
- Secrets only in env vars (`LK_*`, `SB_*`) — never in client bundles except public URL/key
- Webhooks owner-only; secret returned once on create
- Voice tokens issued server-side after membership check
- Soft-delete messages; rate limit on client composer

## License

Built for real communities. Ship fewer features that work.
