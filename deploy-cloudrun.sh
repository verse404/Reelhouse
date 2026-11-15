#!/usr/bin/env bash
# ==============================================================================
# One-Command Public Deployment to Google Cloud Run (Melbourne, Sydney & Shanghai)
# Usage:
#   GCP_PROJECT_ID="your-gcp-project-id" bash ./deploy-cloudrun.sh
# ==============================================================================
set -euo pipefail

if [ -z "${GCP_PROJECT_ID:-}" ]; then
  echo "Error: Set GCP_PROJECT_ID first, e.g.:"
  echo "  GCP_PROJECT_ID=\"my-cinema-project\" bash ./deploy-cloudrun.sh"
  exit 1
fi

SERVICE_NAME="${SERVICE_NAME:-reelhouse-cinema-guide}"
REGION="${REGION:-australia-southeast1}" # Sydney (or australia-southeast2 for Melbourne)

cd "$(dirname "$0")"

# Load local .env keys into shell memory (never echoed or written into image layers)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo "Deploying ${SERVICE_NAME} to Google Cloud Run (${REGION}) in project ${GCP_PROJECT_ID}..."
echo "Note: API key mutation endpoint (/api/configure-keys) is automatically locked via PUBLIC_READONLY_MODE=1."

gcloud run deploy "${SERVICE_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --region="${REGION}" \
  --source="." \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=4 \
  --set-env-vars="SERVE_STATIC=1,PUBLIC_READONLY_MODE=1,CONTAINER_RUNTIME=1,CACHE_TTL_HOURS=24,RATINGS_TTL_HOURS=24,TMDB_API_KEY=${TMDB_API_KEY:-},OMDB_API_KEY=${OMDB_API_KEY:-},MDBLIST_API_KEY=${MDBLIST_API_KEY:-},SERPAPI_API_KEY=${SERPAPI_API_KEY:-}"
