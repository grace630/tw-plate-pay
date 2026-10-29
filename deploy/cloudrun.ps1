# 部署 tw-plate-pay 到 Google Cloud Run 台灣機房（asia-east1），並套上省錢設定：
#   - 規模上限：最多 1 台、沒人用時 0 台、依請求計費、最小 CPU / 記憶體
#   - 映像檔只保留最近 2 版（Artifact Registry 免費 0.5 GB）
#   - 上傳的原始碼暫存檔 1 天後刪除（Cloud Storage）
#   - 有給 -BillingAccountId 時建立每月預算提醒（只通知，不會自動停機）
#
# 用法（在專案根目錄）：
#   .\deploy\cloudrun.ps1 -ProjectId my-project-id
#   .\deploy\cloudrun.ps1 -ProjectId my-project-id -BillingAccountId 012345-6789AB-CDEF01

param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$BillingAccountId,
  [string]$Region = 'asia-east1',
  [string]$Service = 'tw-plate-pay'
)

$ErrorActionPreference = 'Stop'

function Invoke-Gcloud {
  & gcloud @args
  if ($LASTEXITCODE -ne 0) { throw "gcloud $($args -join ' ') 失敗（exit $LASTEXITCODE）" }
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw '找不到 gcloud，請先安裝 Google Cloud CLI：https://cloud.google.com/sdk/docs/install'
}

Write-Host "== 1/5 設定專案 $ProjectId"
Invoke-Gcloud config set project $ProjectId

Write-Host '== 2/5 啟用需要的 API'
Invoke-Gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

Write-Host "== 3/5 部署到 Cloud Run（$Region）"
Invoke-Gcloud run deploy $Service `
  --source . `
  --region $Region `
  --allow-unauthenticated `
  --max-instances 1 `
  --min-instances 0 `
  --cpu 1 `
  --memory 256Mi `
  --cpu-throttling `
  --no-cpu-boost `
  --concurrency 80 `
  --timeout 60 `
  --set-env-vars NODE_ENV=production

Write-Host '== 4/5 設定映像檔與原始碼暫存的清理規則'
# --source 部署會自動建立這個 repo 與 bucket
Invoke-Gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy `
  --location $Region `
  --policy deploy/artifact-cleanup-policy.json `
  --no-dry-run
Invoke-Gcloud storage buckets update "gs://run-sources-$ProjectId-$Region" `
  --lifecycle-file deploy/source-bucket-lifecycle.json

if ($BillingAccountId) {
  Write-Host '== 5/5 建立每月預算提醒'
  Invoke-Gcloud services enable billingbudgets.googleapis.com
  $displayName = "$Service monthly cap"
  $existing = & gcloud billing budgets list --billing-account $BillingAccountId --filter "displayName=`"$displayName`"" --format 'value(name)'
  if ($existing) {
    Write-Host "已有預算「$displayName」，略過"
  } else {
    # 預算幣別必須和帳單帳戶一致；台灣信用卡常是 TWD
    $currency = & gcloud billing accounts describe $BillingAccountId --format 'value(currencyCode)'
    $amount = if ($currency -eq 'TWD') { '30TWD' } else { "1$currency" }
    Invoke-Gcloud billing budgets create `
      --billing-account $BillingAccountId `
      --display-name $displayName `
      --budget-amount $amount `
      --filter-projects "projects/$ProjectId" `
      --threshold-rule percent=0.5 `
      --threshold-rule percent=0.9 `
      --threshold-rule percent=1.0
    Write-Host "已建立每月 $amount 預算，用到 50% / 90% / 100% 會寄信給帳單管理員"
  }
} else {
  Write-Host '== 5/5 略過預算提醒（沒有給 -BillingAccountId），請到主控台「帳單 > 預算與快訊」手動設定'
}

$url = & gcloud run services describe $Service --region $Region --format 'value(status.url)'
Write-Host ''
Write-Host "完成：$url"
