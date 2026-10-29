# tw-plate-pay

🚗 輸入車號，一次查詢全台路邊停車未繳費用（RWD，支援手機）。交通罰單提供監理服務網官方連結。

## 功能

- 一次查詢 21 縣市路邊停車費（停車單與催繳單），結果依回應先後逐筆顯示
- 顯示待繳總額、繳費期限、逾期與已移送裁處提醒
- 單一縣市查詢失敗可以單獨重試
- 交通罰單：連到[監理服務網](https://www.mvdis.gov.tw/m3-emv-vil/vil/penaltyQueryPay)自行查詢（需輸入驗證碼，本站不代查）
- Mobile-first RWD，支援深色模式

## 技術架構

```
瀏覽器（React + Vite + TS）
   │  /api/paybill/:cityId?plate=ABC-1234&type=C
   ▼
後端（Hono on Node，server/）
   │  每個縣市各一條佇列，間隔 ≥ 1.1 秒；成功結果快取 60 秒
   ▼
各縣市「全國路邊停車費查詢 API」 …/Parking/PayBill/CarID/{CarID}/CarType/{CarType}
```

縣市 API 沒有開放 CORS，所以前端不能直接呼叫，一定要經過後端。

| 路徑 | 說明 |
|---|---|
| `shared/cities.ts` | 21 縣市端點設定 |
| `shared/plate.ts` | 車號正規化與驗證、車種代碼 |
| `server/paybill.ts` | 呼叫縣市 API、限速、解析回應 |
| `server/fixtures.ts` | 開發用假資料 |
| `src/` | 前端頁面 |

## 開發

需要 Node.js 24 以上（直接執行 `.ts`，不需 tsx）。

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- API：http://localhost:8787
- 開發模式輸入車號 **`TEST-0001`** 會回傳假資料（含待繳、催繳、查詢失敗），不會呼叫縣市 API

## 部署

```bash
npm run build
NODE_ENV=production PORT=8080 npm start
```

production 模式由同一個 Node 程式提供 `dist/` 靜態檔與 `/api`。
（Windows PowerShell 請改用 `$env:NODE_ENV="production"; npm start`）

### 部署到 Render（免費）

repo 內已有 [`render.yaml`](render.yaml)：

1. 用 GitHub 帳號登入 [Render](https://render.com)
2. **New → Blueprint**，選這個 repo，按 **Apply**
3. 完成後網址為 `https://tw-plate-pay.onrender.com`（名稱被占用時 Render 會加上亂數）

之後 push 到 `main` 就會自動重新部署。

- 免費方案閒置 15 分鐘後會休眠，下次打開需要等 30～60 秒喚醒
- 機房在新加坡；若某些縣市擋國外 IP，那些縣市會顯示查詢失敗
- `/api/paybill` 每個 IP 每分鐘最多 60 次請求（約 2～3 次完整查詢），超過回 429

> 實測（2026/10）：從 Render 新加坡只能查到 10 個縣市，桃園、新竹市、新竹縣、宜蘭、彰化、南投、雲林、高雄、花蓮、臺東、金門會擋國外 IP。要查全台請用下方的 Cloud Run 台灣機房。

### 部署到 Google Cloud Run 台灣機房（在免費額度內）

需要 Google Cloud 帳號並綁定信用卡。用 [`deploy/cloudrun.ps1`](deploy/cloudrun.ps1) 部署，它會自動套用下列省錢設定。

**事前準備（自己在主控台操作）**

1. 到 [Google Cloud 主控台](https://console.cloud.google.com/) 建立專案，記下**專案 ID**
2. 到「帳單」記下**帳單帳戶 ID**（格式 `XXXXXX-XXXXXX-XXXXXX`）
3. 安裝 [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)，執行 `gcloud auth login`

**部署**（PowerShell，在專案根目錄）

```powershell
.\deploy\cloudrun.ps1 -ProjectId <專案ID> -BillingAccountId <帳單帳戶ID>
```

之後改了程式要更新，再執行一次同樣的指令即可（預算已存在會自動略過）。

**四層費用防護**

| 層 | 做法 | 在哪裡 |
|---|---|---|
| 1. 免費試用 | 新帳號有 US$300 / 90 天試用，期間不收費；試用結束要**自己手動升級**才會開始計費 | Google Cloud 帳號 |
| 2. 規模上限 | 最多 1 台（`--max-instances 1`）、沒人用時 0 台、依請求計費、1 vCPU / 256 MiB、關閉啟動加速 | `deploy/cloudrun.ps1` |
| 3. 程式限流 | 每 IP 每分鐘 60 次請求 | `server/rateLimit.ts` |
| 4. 預算提醒 | 每月 US$1（TWD 帳戶為 NT$30），用到 50% / 90% / 100% 寄信通知。**只通知、不會自動停機** | `deploy/cloudrun.ps1` 建立 |

另外會自動清理容易默默累積費用的儲存空間：

- Artifact Registry 映像檔只保留最近 2 版（免費 0.5 GB，每版約 100 MB）：`deploy/artifact-cleanup-policy.json`
- 部署時上傳的原始碼暫存檔 1 天後刪除：`deploy/source-bucket-lifecycle.json`

**唯一不在免費額度內的項目**：從台灣機房傳到網際網路的流量（免費額度只有北美）。每 1,000 次查詢約 0.1 GB，約 NT$0.3。

**如果想完全停用**：主控台 → Cloud Run → 刪除 `tw-plate-pay` 服務；或直接關閉整個專案。

## 縣市 API 注意事項

- **車號必須含「-」**（例如 `ABC-1234`）。多數縣市不帶「-」會回「輸入車牌格式有誤」。
- 車種：`C` 汽車、`M` 機車、`O` 其他。
- 規範限制同一 IP 每秒呼叫同一縣市不超過 1 次，後端已排隊處理。
- 超商或臨櫃繳費後，縣市系統可能延遲銷帳。
- 連江縣目前沒有提供 API。
- 端點可能異動，最新清單請見 [TDX 路邊停車費查詢 API](https://tdx.transportdata.tw/api-service-thirdParty/parkingFee)。

## 隱私與資安

- 後端不記錄、不儲存車號（log 只記縣市與錯誤原因）；畫面上車號會遮罩
- 用真實車號測試時，請勿把查詢結果截圖或寫進 issue / commit
- 金鑰、憑證放 `.env`（已在 `.gitignore`），不要 commit
