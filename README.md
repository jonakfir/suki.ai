# suki.ai

**Skincare that knows your skin.** An AI-powered skincare app that builds a
personalised routine from your skin profile + the products you've loved and
hated, powered by Claude.

Think of it as a warm older-sister stylist for your bathroom shelf: log what
you use, tell it what works and what broke you out, and it hands back real
product picks (with links to buy) and a morning-to-night plan tuned to your
skin type, budget, and how involved you want your routine to be.

---

## What's inside

- **Next.js 15 (App Router) + Turbopack**
- **Tailwind v4** for styling, **Framer Motion** for the sparkle, a scroll-driven
  hero frame sequence on the landing page
- **Supabase** for auth + Postgres (profile, products, recommendations tables)
- **Claude (Anthropic)** for recommendations, routine plans, and product search
- **Zustand** for client state

### Screens
- `/` — Landing page (hero frames, features, CTA)
- `/auth` — Sign in / sign up (email + password, Google OAuth)
- `/onboard` — 6-step skin profile builder
- `/dashboard` — Welcome screen with routine snapshot and top picks
- `/products` — Log products with rating (love / neutral / bad reaction) and
  a catalogue search powered by Claude
- `/recommendations` — Two views:
  - **Products** tab: AI picks with image, price, shop link, and a
    Daytrip-style **Change** button to swap an item for an alternative
  - **Plan** tab: full morning / evening / weekly routine with step order,
    amount, frequency, how-to, and a Change button on each step
- `/profile` — Edit skin type, concerns, tone, age, allergies, budget,
  complexity, sign out

---

## Run it locally

### 1. Prerequisites
- **Node.js 22** (other versions *may* work but this is what's tested)
- **bun** (used for install — it's faster and more reliable than npm here):
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

### 2. Clone + install
```bash
git clone https://github.com/jonakfir/suki.ai.git
cd suki.ai
bun install
```

### 3. Configure environment variables

**If Jonathan sent you the Supabase keys already** (shared project — all test
data lives in the same DB so you don't have to set anything up):

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and paste the three Supabase values he sent you into:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Get your own Anthropic key (free trial credit covers development) at
<https://console.anthropic.com/settings/keys> and paste it as:
```env
ANTHROPIC_API_KEY=sk-ant-...
```

Skip the "Set up Supabase" section below and jump to **step 4**.

> ⚠️ The `SUPABASE_SERVICE_ROLE_KEY` is full-admin access to the shared DB.
> Don't commit it, don't paste it in Slack/Discord/screenshots, don't share
> it with anyone else. Keep `.env.local` local.

**If you're setting up your own Supabase project** (fully isolated — your own
database and users):

1. Create a free project at <https://supabase.com>.
2. In **SQL Editor**, paste and run the migration at
   `supabase/migrations/001_initial.sql` (creates enums, tables, and the RLS
   policies for `users_profile`, `user_products`, and `recommendations`).
3. In **Authentication → Providers**, enable **Email** (and **Google** if you
   want that login button — you'll need a Google OAuth client).
4. From **Project Settings → API** grab `Project URL`, `anon` key, and
   `service_role` key. Paste them into `.env.local` along with your
   Anthropic key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Start the dev server
```bash
bun run dev
```
Open **<http://localhost:3000>** in your browser.

> On first load, the landing page preloads ~170 hero frames — give it a
> moment the first time.

---

## Quick tour

1. Open `/auth` → **Create account** → you'll land in `/onboard`.
2. Walk through the 6 onboarding steps (skin type, concerns, tone/age,
   allergies, budget/complexity). Hit **Go to my dashboard** on the last step.
3. On `/dashboard`, click **Refresh recommendations** — it calls Claude with
   your profile and inserts ~10 recommendations into Supabase.
4. Go to `/recommendations`:
   - The **Products** tab shows the 5 picks + 5 things to avoid, with image,
     price, ingredients, a **Shop it** link, and a **Change** button for
     swapping.
   - Flip to the **Plan** tab and click **Build my plan** to get a full
     AM/PM/weekly routine with step-by-step instructions and per-step
     Change buttons.
5. Under `/products`, add things you already use with a rating — future
   recommendations honour what you love and avoid what burned you.

---

## Troubleshooting

**"Failed to generate recommendations" / 401 invalid x-api-key**
Your `ANTHROPIC_API_KEY` is missing or wrong. Double-check `.env.local`
and restart the dev server.

**Onboarding save fails with an RLS error**
Your Supabase migration hasn't been run. Paste
`supabase/migrations/001_initial.sql` into the SQL editor and run it.

**Dev server hangs silently on first compile**
The Tailwind v4 oxide scanner walks every file under the project root. If
you have a huge unrelated folder in here (old `node_modules` copies, a
`.nm_trash` dir, etc.), move it out of the project directory.

**Images don't load in the recommendations grid**
The image URLs come from loremflickr.com with category-matched tags. If
they're blocked on your network, the cards fall back to the gradient
placeholder — functional but not pretty.

---

## Project layout

```
src/
  app/
    api/              # route handlers (auth, products, recommendations, plan)
    auth/             # /auth page + OAuth callback
    onboard/          # 6-step onboarding
    dashboard/        # summary screen
    products/         # product log + catalogue search
    recommendations/  # Products + Plan tabs with swap
    profile/          # edit skin profile
    layout.tsx        # root layout (nav, footer, global background)
    page.tsx          # landing
  components/
    landing/          # Hero, Features, SocialProof, etc.
    ui/               # Card, Pill, Modal, Nav, FadeIn, etc.
  lib/
    supabase/         # browser + server + service-role clients
    claude-client.ts  # routes through proxy OR direct Anthropic SDK
    store.ts          # zustand state
    admin.ts          # optional admin-mode helpers
supabase/
  migrations/
    001_initial.sql   # run this in Supabase SQL editor
public/
  hero-frames/        # scroll-driven video frames for landing
```

That's it — ping me if anything's weird.
