#!/usr/bin/env bash
#
# One-shot bootstrap for Diet Golf on Google Cloud: project, billing, APIs,
# Cloud SQL, secrets, IAM, and the first Cloud Run deploy.
#
# Safe to re-run. Every step checks for what it needs before creating it, so a
# second run after a failure picks up where the first left off rather than
# duplicating anything.
#
#   export BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX
#   ./scripts/setup-gcp.sh
#
# Override any of the defaults by exporting them first, e.g.
#   PROJECT_ID=diet-golf-prod REGION=us-central1 ./scripts/setup-gcp.sh
#
# The billing account ID is intentionally not hard-coded — this repository is
# public.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-diet-golf}"
PROJECT_NAME="${PROJECT_NAME:-Diet Golf}"
REGION="${REGION:-europe-west2}"
SERVICE="${SERVICE:-diet-golf}"
INSTANCE="${INSTANCE:-diet-golf-db}"
DB_NAME="${DB_NAME:-dietgolf}"
DB_USER="${DB_USER:-dietgolf}"
DB_TIER="${DB_TIER:-db-f1-micro}"
APP_TIMEZONE="${APP_TIMEZONE:-Europe/London}"

SECRET_DB_PASSWORD="diet-golf-db-password"
SECRET_DATABASE_URL="diet-golf-database-url"
SECRET_SESSION="diet-golf-session-secret"

step()  { printf '\n\033[1;32m==>\033[0m \033[1m%s\033[0m\n' "$1"; }
info()  { printf '    %s\n' "$1"; }
die()   { printf '\n\033[1;31mError:\033[0m %s\n' "$1" >&2; exit 1; }

[ -f Dockerfile ] && [ -f package.json ] && grep -q '"name": "diet-golf"' package.json 2>/dev/null \
  || die "Run this from the root of the Diet Golf repository — 'gcloud run deploy --source .' builds whatever directory you are standing in, and from anywhere else it quietly falls back to Buildpacks and ships the wrong thing.

    git clone https://github.com/samfernai/dietgolf.git
    cd dietgolf
    ./scripts/setup-gcp.sh"

command -v gcloud >/dev/null || die "The gcloud CLI is not installed. See https://cloud.google.com/sdk/docs/install"
gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . \
  || die "Not signed in. Run: gcloud auth login"

# ---------------------------------------------------------------- project ---
step "Project: $PROJECT_ID"
if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  info "Already exists."
else
  info "Creating…"
  gcloud projects create "$PROJECT_ID" --name="$PROJECT_NAME" \
    || die "Could not create '$PROJECT_ID'. Project IDs are globally unique across all of Google Cloud, so this one may be taken. Re-run with PROJECT_ID=diet-golf-$RANDOM"
fi
gcloud config set project "$PROJECT_ID" >/dev/null

# ---------------------------------------------------------------- billing ---
step "Billing"
if gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null | grep -qi true; then
  info "Already linked."
else
  [ -n "${BILLING_ACCOUNT:-}" ] \
    || die "Billing is not enabled and BILLING_ACCOUNT is not set. Export it and re-run:  export BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX"
  info "Linking $BILLING_ACCOUNT…"
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
fi

# ------------------------------------------------------------------- APIs ---
step "Enabling APIs (this can take a minute)"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
info "Service account: $COMPUTE_SA"

# -------------------------------------------------------------- Cloud SQL ---
step "Cloud SQL instance: $INSTANCE"
if gcloud sql instances describe "$INSTANCE" >/dev/null 2>&1; then
  info "Already exists."
else
  info "Creating (takes 5-10 minutes — this is the slow part)…"
  gcloud sql instances create "$INSTANCE" \
    --database-version=POSTGRES_16 \
    --edition=ENTERPRISE \
    --tier="$DB_TIER" \
    --region="$REGION" \
    --storage-size=10GB \
    --storage-auto-increase \
    --availability-type=zonal
fi

CONNECTION_NAME="$(gcloud sql instances describe "$INSTANCE" --format='value(connectionName)')"
info "Connection name: $CONNECTION_NAME"

step "Database: $DB_NAME"
if gcloud sql databases describe "$DB_NAME" --instance="$INSTANCE" >/dev/null 2>&1; then
  info "Already exists."
else
  gcloud sql databases create "$DB_NAME" --instance="$INSTANCE"
fi

# ---------------------------------------------------------------- secrets ---
# Helper: create a secret if missing, otherwise leave it alone.
ensure_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    info "Secret '$name' already exists — leaving it as is."
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic
    info "Secret '$name' created."
  fi
}

step "Database password"
if gcloud secrets describe "$SECRET_DB_PASSWORD" >/dev/null 2>&1; then
  info "Reusing the stored password."
else
  ensure_secret "$SECRET_DB_PASSWORD" "$(openssl rand -base64 30 | tr -d '/+=' | head -c 32)"
fi
DB_PASSWORD="$(gcloud secrets versions access latest --secret="$SECRET_DB_PASSWORD")"

step "Database user: $DB_USER"
if gcloud sql users list --instance="$INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
  info "Exists — resetting the password to match the stored secret."
  gcloud sql users set-password "$DB_USER" --instance="$INSTANCE" --password="$DB_PASSWORD"
else
  gcloud sql users create "$DB_USER" --instance="$INSTANCE" --password="$DB_PASSWORD"
fi

step "Connection string"
# Cloud Run reaches Cloud SQL over a Unix socket, so 'host' is a path.
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
if gcloud secrets describe "$SECRET_DATABASE_URL" >/dev/null 2>&1; then
  CURRENT="$(gcloud secrets versions access latest --secret="$SECRET_DATABASE_URL" 2>/dev/null || true)"
  if [ "$CURRENT" = "$DATABASE_URL" ]; then
    info "Already up to date."
  else
    printf '%s' "$DATABASE_URL" | gcloud secrets versions add "$SECRET_DATABASE_URL" --data-file=-
    info "Added a new version."
  fi
else
  ensure_secret "$SECRET_DATABASE_URL" "$DATABASE_URL"
fi

step "Session secret"
# Never rotated automatically: changing it signs every player out.
ensure_secret "$SECRET_SESSION" "$(openssl rand -base64 48)"

# -------------------------------------------------------------------- IAM ---
step "Permissions"
for secret in "$SECRET_DATABASE_URL" "$SECRET_SESSION"; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role=roles/secretmanager.secretAccessor --quiet >/dev/null
  info "$COMPUTE_SA can read $secret"
done

for role in roles/cloudsql.client roles/cloudbuild.builds.builder roles/storage.objectViewer roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" --role="$role" --quiet >/dev/null
  info "$COMPUTE_SA granted $role"
done

# ----------------------------------------------------------------- deploy ---
step "Deploying to Cloud Run"
gcloud run deploy "$SERVICE" \
  --source . \
  --region="$REGION" \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=4 \
  --cpu=1 \
  --memory=512Mi \
  --add-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=${SECRET_DATABASE_URL}:latest,SESSION_SECRET=${SECRET_SESSION}:latest" \
  --set-env-vars="APP_TIMEZONE=${APP_TIMEZONE}"

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"

step "Done"
cat <<SUMMARY

    Diet Golf is live at:

        $URL

    The container applied the database migrations on boot, so the course is
    already open. Register the first player and tee off.

    Re-deploy after a change with:

        gcloud run deploy $SERVICE --source . --region=$REGION

SUMMARY
