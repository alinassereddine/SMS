#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-sms}"
IMAGE_REPO="${IMAGE_REPO:-}"
NO_TRAFFIC="${NO_TRAFFIC:-0}"

require() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "Missing required value: ${name}. Set env var or edit script." >&2
    exit 1
  fi
}

require "GCP_PROJECT" "${PROJECT_ID}"

if [[ -z "${IMAGE_REPO}" ]]; then
  IMAGE_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE_NAME}"
fi

TAG="$(git rev-parse --short HEAD 2>/dev/null || true)"
if [[ -z "${TAG}" ]]; then
  TAG="$(date +"%Y%m%d%H%M%S")"
fi

IMAGE="${IMAGE_REPO}:${TAG}"

echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Image:   ${IMAGE}"

gcloud config set project "${PROJECT_ID}" >/dev/null

echo
echo "Building + pushing image via Cloud Build..."
gcloud builds submit --tag "${IMAGE}"

echo
echo "Deploying to Cloud Run (new revision)..."
if [[ "${NO_TRAFFIC}" == "1" ]]; then
  gcloud run deploy "${SERVICE_NAME}" --image "${IMAGE}" --region "${REGION}" --platform managed --no-traffic
else
  gcloud run deploy "${SERVICE_NAME}" --image "${IMAGE}" --region "${REGION}" --platform managed
fi

echo
echo "Deployed. Service URL:"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format "value(status.url)"
