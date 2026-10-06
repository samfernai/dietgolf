# Diet Golf ⛳

Play your week like a round of golf. Seven holes, one a day, scored on the
calories you eat against the calories you need. Mobile-first, multiplayer, and
the leaderboard resets with a brand new course every Monday morning.

> Tuesday. Porridge and berries for breakfast, a burger and chips at lunch, and a
> bike ride that clawed back 620. Against the 2,118 my body needs, that is 1,308
> under. **Birdie.**

## The course

Each week is a real PGA Tour event, played over that course's **real closing
seven — holes 12 to 18**, with their real pars. Taking the finish rather than
the start means the week ends on the holes the tournament is actually decided
on, and it puts the famous ones where they belong: Sawgrass's island 17th on a
Saturday, Augusta's Redbud on a Friday.

So Masters week is Golden Bell through Holly, par 28. The Players is par 27. The
Sentry at Kapalua is par 30 and finishes on the 677-yard 18th. **The shape of
the week changes with the tournament**, which is the trade for authenticity:
scores within a week are directly comparable, across weeks less so.

Seventeen courses are mapped hole by hole, including all four majors:

| | |
| --- | --- |
| Augusta National | The Masters |
| TPC Sawgrass | The Players |
| Aronimink | PGA Championship |
| Shinnecock Hills | U.S. Open |
| Royal Birkdale | The Open |
| Pebble Beach · Kapalua · Riviera · Torrey Pines South | West coast swing |
| Bay Hill · Harbour Town · Quail Hollow · Colonial | Florida and the Carolinas |
| Muirfield Village · TPC River Highlands · TPC Scottsdale · East Lake | Summer and the finish |

Events without a mapped course fall back to a generated seven-hole layout, which
is obvious in the app rather than silently fabricated. Adding a venue is a block
of pars in `src/lib/golf/venues.ts`.

### What the data is, and is not

- **Par is dependable.** It is stable year to year and sources agree on it. A
  test asserts every venue's eighteen holes add up to that course's published
  par, so a mistyped hole cannot sit there unnoticed.
- **Yardage is approximate and optional.** Championship yardages move every year
  with tee placement — Augusta came back as both 7,475 and 7,555, each correct
  for its year. Where no dependable tournament-tee figure was available the
  field is simply absent and the app shows no yardage, rather than quoting a
  member-tee number.
- **Stroke index is derived** unless the course publishes one (Harbour Town
  does). Otherwise the seven holes are ranked by how long each plays for its
  par, which is the usual shape of difficulty.

## How scoring works

Registration asks for height, weight, age and sex, and works out the calories you
need to hold your weight (Mifflin-St Jeor, at a sedentary baseline — exercise is
logged separately, so multiplying by an activity factor as well would count your
bike ride twice).

A hole is scored on the day's **net balance**: what you ate, minus what you
burned, minus that maintenance figure.

| Score | vs par | Net calories |
| ----- | ------ | ------------ |
| Albatross | −3 | −3,500 or lower *(par 3 only — it aces the hole)* |
| Eagle | −2 | −2,000 or lower *(no eagle on a par 3)* |
| Birdie | −1 | −1,000 to −1,999 |
| Par | level | −999 to +250 |
| Bogey | +1 | +251 to +1,500 |
| Double bogey | +2 | +1,501 to +2,750 |
| Triple bogey | +3 | +2,751 to +3,500 |
| Snowman | +4 | +3,501 and above |

Women play off bands 15% tighter — the same deficit is a larger share of a
smaller maintenance, so the grades move in proportion. "Rather not say" uses the
base table.

### Shots are played against the clock

A hole is checked through the day, and the shot tracker moves as you log:

| Par | Checkpoints |
| --- | ----------- |
| 3 | 10:00, 20:00 |
| 4 | 10:00, 14:00, 20:00 |
| 5 | 10:00, 14:00, 18:00, 21:00 |

Maintenance is **pro-rated to the time of day**, so a checkpoint asks whether you
are on pace right now rather than whether you have already eaten a full day's
worth. Without that, every breakfast would read as an albatross. The hole settles
at midnight on the full day's figures, which is why a hole can show a birdie at
8pm and come back to a par.

The checkpoint counts work out as `par − 1`, which conveniently makes the
green-in-regulation shot the penultimate one on every hole.

### Guardrails

- A hole is never better than two under par, so a par 3 can be aced but an
  albatross is off the table elsewhere.
- A hole is never worse than six over par.
- **A hole only counts once you close the day out.** Otherwise a day with just
  breakfast logged would read as a 2,000-calorie deficit and an eagle.
- A past day you never closed is a **no return**, worth five over par.
- You cannot play a hole before you get to it.

The deepest bands are deliberately hard to reach. A −3,500 day is about a pound
of fat and is not meant as a daily target; it exists so an albatross stays rare.

Leaderboards run in gross, net and Stableford. Handicaps are entered as ordinary
18-hole numbers and scaled to this seven-hole course, handed out hardest hole
first by stroke index.

### Statistics

A PGA Tour-style stats page covers scoring average, driving distance, fairways
and greens in regulation, scrambling, putts per round, strokes gained off the
tee, on approach and putting, one-putt percentage, putting inside ten feet,
3-putt avoidance, and a scoring average for each day of the week.

None of these have a natural meaning in a calorie game, so each is given an
explicit definition in `src/lib/golf/stats.ts` and the same wording is shown
beside the number in the app. A "fairway hit" means you were on pace at 10:00,
not that a ball landed anywhere. Strokes gained is measured against everyone else
who played the same hole that week.

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
| `npm run db:refresh-course` | Rebuild a week's course after mapping a new venue. Refuses once anyone has closed a hole out. |

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
      calories.ts       Maintenance calories, the scoring bands, grades
      checkpoints.ts    Shot timing, and grading a hole against the clock
      stats.ts          The PGA Tour-style metrics, each defined in full
      tournaments.ts    The weekly event, and which venue it is played over
      venues.ts         Real tournament courses, hole by hole
      scoring.ts        Handicapping, Stableford, no returns, round totals
      layout.ts         Hole map geometry and where each shot lands
      shots.ts          v1's meal ratings, kept so old weeks still render
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
