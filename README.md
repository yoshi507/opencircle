# OpenCircle

A free, modern community platform (Discord alternative) built with Next.js, Supabase and Vercel.

**Current status: Milestone 0 — Foundation** ✅

- ✅ Project scaffold (Next.js 15 + TypeScript + Tailwind)
- ✅ Supabase Auth (email + password)
- ✅ Protected `/app` routes + middleware
- ✅ Landing page, login, register
- ✅ App shell (server rail + sidebar + main area)
- ✅ Initial database schema + RLS skeleton
- ✅ Ready for Vercel deployment

---

## Quick start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy the **Project URL** and **anon public** key
3. In the SQL Editor, paste and run the contents of  
   `supabase/migrations/001_initial_schema.sql`
4. (Recommended) In Authentication → Providers, disable “Confirm email” while developing so you can sign in immediately

### 2. Local development

```bash
git clone https://github.com/yoshi507/opencircle.git
cd opencircle
cp .env.example .env.local
# edit .env.local with your Supabase URL + anon key
npm install
npm run dev
```

Open http://localhost:3000

### 3. Deploy to Vercel (recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `yoshi507/opencircle` repository
3. Add the two environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy 🚀

Every push to `main` will auto-deploy a new version.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/          # login + register
│   ├── app/             # protected application
│   ├── layout.tsx
│   └── page.tsx         # landing
├── components/
│   └── app-shell.tsx    # main UI chrome
├── lib/
│   ├── supabase/        # browser + server + middleware clients
│   └── utils.ts
└── middleware.ts        # session refresh + route protection
supabase/
└── migrations/          # SQL schema
```

---

## Roadmap (from the PRD)

| Milestone | Target        | Focus                                      |
|-----------|---------------|--------------------------------------------|
| 0         | ✅ Done       | Foundation, auth, shell                    |
| 1         | Weeks 2–3     | Servers, channels, roles, realtime messages, DMs |
| 2         | Weeks 4–5     | Invites, moderation, audit logs            |
| 3         | Weeks 6–8     | Voice / video (LiveKit)                    |
| 4         | Weeks 9–10    | Search, threads, AI summaries, polish      |
| 5         | Weeks 11–12   | Webhooks, security review, launch          |

---

## Tech stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Auth / DB / Realtime**: Supabase
- **Hosting**: Vercel
- **Voice (later)**: LiveKit

---

## Security notes (Milestone 0)

- All secrets live in environment variables / Supabase dashboard — never in the client
- Middleware refreshes the session on every request
- `/app/*` routes are protected server-side
- RLS is enabled on core tables (expand policies as features land)

---

Built with ❤️ for real communities.
