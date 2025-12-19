$ErrorActionPreference = "Stop"

param(
  [string]$ProjectId = $env:GCP_PROJECT,
  [string]$Region = $(if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }),
  [string]$ServiceName = $(if ($env:CLOUD_RUN_SERVICE) { $env:CLOUD_RUN_SERVICE } else { "sms" }),
  [string]$ImageRepo = $env:IMAGE_REPO,
  [switch]$NoTraffic
)

function Require([string]$name, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required value: $name. Pass -$name or set env var."
  }
}

Require "ProjectId" $ProjectId
Require "ServiceName" $ServiceName
Require "Region" $Region

if ([string]::IsNullOrWhiteSpace($ImageRepo)) {
  $ImageRepo = "$Region-docker.pkg.dev/$ProjectId/cloud-run-source-deploy/$ServiceName"
}

$tag = ""
try {
  $tag = (git rev-parse --short HEAD 2>$null).Trim()
} catch {
  $tag = ""
}
if ([string]::IsNullOrWhiteSpace($tag)) {
  $tag = (Get-Date -Format "yyyyMMddHHmmss")
}

$image = "$ImageRepo`:$tag"

Write-Host "Project:  $ProjectId"
Write-Host "Region:   $Region"
Write-Host "Service:  $ServiceName"
Write-Host "Image:    $image"

gcloud config set project $ProjectId | Out-Null

Write-Host "`nBuilding + pushing image via Cloud Build..."
gcloud builds submit --tag $image

Write-Host "`nDeploying to Cloud Run (new revision)..."
if ($NoTraffic) {
  gcloud run deploy $ServiceName --image $image --region $Region --platform managed --no-traffic
} else {
  gcloud run deploy $ServiceName --image $image --region $Region --platform managed
}

Write-Host "`nDeployed. Current service:"
gcloud run services describe $ServiceName --region $Region --format "value(status.url)"
