# Deploying Diet Golf to Google Cloud

The app is a single container: a Next.js standalone server that talks to
PostgreSQL. It runs happily on Cloud Run with Cloud SQL behind it, and scales to
zero between rounds.

Everything below assumes the `gcloud` CLI is installed and you are logged in:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Set a couple of shell variables to keep the commands short:

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=europe-west2          # London. Pick whichever is closest to you.
export SERVICE=diet-golf
export INSTANCE=diet-golf-db
```

## 1. Turn on the APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

## 2. Create the database

The smallest Cloud SQL tier is plenty — this is a handful of rows per player per
week.

```bash
gcloud sql instances create $INSTANCE \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-size=10GB \
  --storage-auto-increase

gcloud sql databases create dietgolf --instance=$INSTANCE

# Pick a strong password and keep it — it goes into the secret below.
gcloud sql users create dietgolf --instance=$INSTANCE --password='CHANGE_ME'
```

Grab the instance connection name, which looks like
`your-project:europe-west2:diet-golf-db`:

```bash
export CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE \
  --format='value(connectionName)')
echo $CONNECTION_NAME
```

> **Cheaper alternative.** Any PostgreSQL will do. A free Neon or Supabase
> database works with no other changes — skip this step, and use their
> connection string in step 3 with `DATABASE_SSL=true` set on the service.

## 3. Store the secrets

Cloud Run reaches Cloud SQL over a Unix socket, so the host is a path rather
than a hostname:

```bash
printf 'postgresql://dietgolf:CHANGE_ME@localhost/dietgolf?host=/cloudsql/%s' "$CONNECTION_NAME" \
  | gcloud secrets create diet-golf-database-url --data-file=-

openssl rand -base64 48 \
  | gcloud secrets create diet-golf-session-secret --data-file=-
```

Let the Cloud Run service account read them:

```bash
export SA=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com

for secret in diet-golf-database-url diet-golf-session-secret; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
done

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" --role=roles/cloudsql.client
```

## 4. Deploy

Cloud Run can build the container straight from the repository — no local
Docker needed:

```bash
gcloud run deploy $SERVICE \
  --source . \
  --region=$REGION \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=4 \
  --memory=512Mi \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --set-secrets=DATABASE_URL=diet-golf-database-url:latest,SESSION_SECRET=diet-golf-session-secret:latest \
  --set-env-vars=APP_TIMEZONE=Europe/London
```

The container applies any pending migrations on boot, so the schema is created
on the first deploy and kept up to date on every one after. The command prints
the service URL when it finishes — that is the app.

To deploy from a prebuilt image instead (useful from CI), use the included
[`cloudbuild.yaml`](../cloudbuild.yaml):

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_INSTANCE=$CONNECTION_NAME
```

## 5. Point a domain at it (optional)

```bash
gcloud beta run domain-mappings create --service=$SERVICE \
  --domain=dietgolf.example.com --region=$REGION
```

Then add the DNS records it prints. Cloud Run provisions the TLS certificate.

## Environment variables

| Variable         | Required | What it does |
| ---------------- | -------- | ------------ |
| `DATABASE_URL`   | yes      | PostgreSQL connection string. |
| `SESSION_SECRET` | yes      | Signs session cookies. At least 16 characters; 32+ is better. Changing it signs everyone out. |
| `APP_TIMEZONE`   | no       | Which timezone decides when a day ends. Defaults to `Europe/London`. |
| `DATABASE_SSL`   | no       | Set to `true` for managed providers that require TLS but present their own certificate authority. |
| `DATABASE_POOL_MAX` | no    | Connections per instance. Defaults to 5, which suits Cloud SQL's small tiers. |
| `PORT`           | no       | Set by Cloud Run. Defaults to 8080. |

## Keeping costs down

- `--min-instances=0` means you pay nothing while nobody is playing. The first
  request after an idle spell takes a second or two to wake up.
- `db-f1-micro` is the cheapest Cloud SQL tier and is far more than this needs.
  If even that is too much, a free Neon or Supabase database works as well.
- `--max-instances=4` caps runaway spend.

## Running the migrations by hand

Normally the container does it for you. If you want to run them yourself, from
a machine with the Cloud SQL Auth Proxy running:

```bash
DATABASE_URL="postgresql://dietgolf:CHANGE_ME@127.0.0.1:5432/dietgolf" npm run db:migrate
```

## Troubleshooting

**"DATABASE_URL is not set"** — the secret is not attached to the revision.
Check `gcloud run services describe $SERVICE --region=$REGION`.

**Connection timeouts** — the service is missing
`--add-cloudsql-instances`, or its service account lacks `roles/cloudsql.client`.

**Everyone signed out after a deploy** — `SESSION_SECRET` changed. Point the
service at a fixed secret rather than generating a new one each time.

**The day rolls over at the wrong time** — set `APP_TIMEZONE` to your group's
timezone. It decides when today's hole closes and when Monday's new course opens.
