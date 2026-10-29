import type { City } from '../shared/cities.ts'
import type { CarType } from '../shared/plate.ts'
import type { Bill, CityResult } from '../shared/types.ts'

// 規範的回應外層：{ Status, Message, Result }，成功時 Status 為 "SUCCESS"，查無資料時 Result 為 null。
// Result 內欄位依規範命名，但各縣市實作不一定完全一致，所以全部當成 optional 解析。
interface RawBill {
  BillNo?: string
  ParkingDate?: string
  PayLimitDate?: string
  ParkingHours?: number | string
  Amount?: number | string
  PayAmount?: number | string
}

interface RawReminder {
  ReminderNo?: string
  ReminderLimitDate?: string
  Amount?: number | string
  PayAmount?: number | string
  ExtraCharge?: number | string
  Bills?: RawBill[] | null
  /** 規範 v1.03：無告發時填 0 */
  IsProsecuted?: number | boolean
  /** 規範 v1.03：無告發時填空字串 */
  ProsecuteLimitDate?: string | null
}

interface RawResult {
  TotalAmount?: number | string
  Bills?: RawBill[] | null
  Reminders?: RawReminder[] | null
  UpdateTime?: string
}

interface RawResponse {
  Status?: string
  Message?: string
  Result?: RawResult | null
}

const TIMEOUT_MS = 15000
// 規範要求同一 IP 每秒呼叫同一縣市不超過 1 次；本服務對外只有一個 IP，所以每個縣市各排一條佇列
const MIN_INTERVAL_MS = 1100
const MAX_QUEUE = 30
const MAX_ATTEMPTS = 2
const CACHE_TTL_MS = 60_000

const queues = new Map<string, { tail: Promise<unknown>; size: number; lastAt: number }>()
const cache = new Map<string, { at: number; value: CityResult }>()

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseResult(cityId: string, raw: RawResponse): CityResult {
  const queriedAt = new Date().toISOString()
  if (raw.Status !== 'SUCCESS') {
    return { cityId, status: 'error', message: raw.Message || `查詢失敗（${raw.Status ?? '未知狀態'}）`, queriedAt }
  }

  const result = raw.Result
  const bills: Bill[] = (result?.Bills ?? []).map(toBill)
  for (const r of result?.Reminders ?? []) {
    const children = (r.Bills ?? []).map(toBill)
    bills.push({
      kind: 'reminder',
      no: r.ReminderNo ?? '',
      payLimitDate: r.ReminderLimitDate,
      amount: toNumber(r.PayAmount ?? toNumber(r.Amount) + toNumber(r.ExtraCharge)),
      extraCharge: r.ExtraCharge != null ? toNumber(r.ExtraCharge) : undefined,
      billCount: children.length,
      children: children.length > 0 ? children : undefined,
      prosecuted: Boolean(r.IsProsecuted),
      prosecuteLimitDate: r.ProsecuteLimitDate || undefined,
    })
  }

  const summed = bills.reduce((sum, b) => sum + b.amount, 0)
  const totalAmount = result?.TotalAmount != null ? toNumber(result.TotalAmount) : summed
  return { cityId, status: 'ok', bills, totalAmount, updatedAt: result?.UpdateTime || undefined, queriedAt }
}

// BillStatus 規範公開資料查不到代碼定義，先不解析
function toBill(b: RawBill): Bill {
  return {
    kind: 'bill',
    no: b.BillNo ?? '',
    parkingDate: b.ParkingDate,
    parkingHours: b.ParkingHours != null ? toNumber(b.ParkingHours) : undefined,
    payLimitDate: b.PayLimitDate,
    amount: toNumber(b.PayAmount ?? b.Amount),
  }
}

async function fetchCity(city: City, plate: string, carType: CarType): Promise<CityResult> {
  const url = `${city.apiBase}/Parking/PayBill/CarID/${encodeURIComponent(plate)}/CarType/${carType}`
  // 連線 / TLS 中斷（例如基隆偶發 "socket disconnected before secure TLS connection"）通常重試一次就好；
  // 逾時不重試，否則使用者要多等一輪 TIMEOUT_MS
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        return { cityId: city.id, status: 'error', message: `縣市系統回應 HTTP ${res.status}`, queriedAt: new Date().toISOString() }
      }
      return parseResult(city.id, (await res.json()) as RawResponse)
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError'
      // 不記錄車號，只記縣市與錯誤原因
      console.warn(`[paybill] ${city.id} (attempt ${attempt}): ${err instanceof Error ? (err.cause ?? err.message) : err}`)
      if (!timedOut && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS))
        continue
      }
      const message = timedOut ? '縣市系統目前沒有回應，可能是對方系統異常' : '無法連線到縣市系統'
      return { cityId: city.id, status: 'error', message, queriedAt: new Date().toISOString() }
    }
  }
}

/** 依縣市排隊呼叫，並快取 60 秒避免重複查詢打爆縣市 API */
export async function queryCity(city: City, plate: string, carType: CarType): Promise<CityResult> {
  const key = `${city.id}:${carType}:${plate}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  let q = queues.get(city.id)
  if (!q) {
    q = { tail: Promise.resolve(), size: 0, lastAt: 0 }
    queues.set(city.id, q)
  }
  if (q.size >= MAX_QUEUE) {
    return { cityId: city.id, status: 'error', message: '查詢人數過多，請稍後再試', queriedAt: new Date().toISOString() }
  }

  const queue = q
  queue.size++
  const run = queue.tail.then(async () => {
    const wait = queue.lastAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    queue.lastAt = Date.now()
    return fetchCity(city, plate, carType)
  })
  queue.tail = run.catch(() => undefined)

  try {
    const value = await run
    // 錯誤結果不快取，讓使用者可以馬上重試
    if (value.status === 'ok') cache.set(key, { at: Date.now(), value })
    return value
  } finally {
    queue.size--
  }
}
