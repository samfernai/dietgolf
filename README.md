# Diet Golf ⛳

Play your week like a round of golf. Seven holes, one a day, scored on what you
ate and drank. Mobile-first, multiplayer, and the leaderboard resets with a
brand new course every Monday morning.

> Monday morning I ate a bowl of porridge with fruit — one straight down the
> fairway. Lunch was pizza, so that's in the trees on the right. A healthy
> chicken dinner recovered it back to the green, and then a glass of wine lipped
> out the par putt. **Bogey 5.**

## The course

The layout never changes, so scores are comparable week to week.

| Hole | Day | Par | Stroke index | |
| ---- | --- | --- | ------------ | --- |
| 1 | Monday | 4 | 7 | |
| 2 | Tuesday | 4 | 6 | |
| 3 | Wednesday | 5 | 5 | |
| 4 | Thursday | 5 | 3 | |
| 5 | Friday | 4 | 2 | **Amen Corner** |
| 6 | Saturday | 5 | 1 | **Amen Corner** |
| 7 | Sunday | 3 | 4 | **Amen Corner** |
| | **Total** | **30** | | |

The hole names, yardages and the drawn layout are generated fresh each Monday
from the week's ISO key, so everybody plays the same course and it can be
recomputed from scratch at any time.

## How scoring works

Each day you play up to five shots, in order: **breakfast** off the tee,
**lunch**, **dinner** as the approach, **snacks** around the green, and whatever
you **drank** as the putt. Each one is rated, and the rating moves the hole score
relative to par:

| | Rating | Strokes |
| --- | ------ | ------- |
| 🎯 | Striped it | −1 |
| ⛳ | Fairway | level |
| 🌾 | Rough | +1 |
| 🌲 | Trees | +2 |
| 💦 | Water | +3 |

So a day of sensible choices is a par, one indulgence is a bogey, and a day
where everything went in the water is the kind of number you don't write down.
Every shot takes a note — "Hit one into the trees, as I had a burger for lunch"
— and the shots are plotted on a drawn map of the hole.

A few guardrails keep the cards honest:

- A hole can never be better than two under par, so a par 3 can be aced but an
  albatross is off the table.
- A hole can never be worse than six over par.
- A day in the past with nothing logged is a **no return**, worth five over par.
  That is deliberately worse than most honestly logged bad days, so the cheapest
  way to protect a score is never to stop filling the card in.
- You cannot play a hole before you get to it.

Leaderboards run in gross, net and Stableford. Handicaps are entered as ordinary
18-hole numbers and scaled to this seven-hole course, handed out hardest hole
first by stroke index — so a 24 handicapper has a real game against a scratch
player.

## Running it locally

You need Node 22+ and a PostgreSQL database.

```bash
git clone https://github.com/samfernai/dietgolf.git
cd dietgolf
npm install

cp .env.example .env          # point DATABASE_URL at your database
docker compose up -d          # or use any Postgres you already have

npm run db:migrate            # create the schema
npm run db:seed               # optional: five players with a week of scores
npm run dev
```

Then open http://localhost:3000 on a phone-sized window. The seeded players all
use PIN `1234`.

### Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server with hot reload. |
| `npm run build` | Production build, bundled for the container. |
| `npm start` | Serve the production build. |
| `npm test` | Scoring and calendar tests. |
| `npm run typecheck` | TypeScript, no emit. |
| `npm run db:generate` | Generate a migration after changing the schema. |
| `npm run db:migrate` | Apply pending migrations. |
| `npm run db:seed` | Fill the current week with sample players. |

## Deploying

`scripts/setup-gcp.sh` sets up Google Cloud from nothing — project, billing,
APIs, Cloud SQL, secrets, IAM and the first deploy — and is safe to re-run:

```bash
gcloud auth login
export BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX
./scripts/setup-gcp.sh
```

After that, a deploy is just:

```bash
gcloud run deploy diet-golf --source . --region=europe-west2
```

The container applies pending migrations on boot, so that is all it takes.
**[docs/DEPLOY_GOOGLE_CLOUD.md](docs/DEPLOY_GOOGLE_CLOUD.md)** walks through the
same steps individually, and covers domains, environment variables and costs.
Any PostgreSQL works — Neon and Supabase's free tiers are fine if you would
rather not run Cloud SQL.

## How it is put together

```
src/
  app/                  Next.js App Router pages and JSON API routes
  components/           Hole map, scorecard, leaderboard, shot entry
  lib/
    golf/
      course.ts         The fixed seven holes, plus weekly course generation
      shots.ts          Meal slots, ratings and the narrative for each one
      scoring.ts        Hole scores, handicapping, Stableford, round totals
      layout.ts         Hole map geometry and where each shot lands
    db/schema.ts        Drizzle schema
    game.ts             Loading and saving cards, leaderboards, season totals
    auth.ts             Name + PIN registration and signed session cookies
    time.ts             Calendar days and ISO weeks
```

The scoring rules live entirely in `src/lib/golf` and are pure functions with
no database behind them, which is what `npm test` exercises. Scores are
recomputed from the stored shots on every read, so the rules can change without
a migration.

### Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Drizzle ORM · PostgreSQL. Sessions are signed cookies, so there is no session
store to run.

### A note on sign-in

Players register with a name and a 4-digit PIN. There are no email addresses and
no password resets: this is a game for a group who know each other, and the PIN
exists so nobody else fills in your card. Do not reuse a PIN you use elsewhere.
