import { getConnInfo } from '@hono/node-server/conninfo'
import type { MiddlewareHandler } from 'hono'

// 公開部署後每個 IP 的查詢上限。一次完整查詢 = 21 個縣市請求，
// 60 次 / 分鐘約可查 2～3 輪，正常使用不會碰到，但能擋住腳本大量打縣市 API
const WINDOW_MS = 60_000
const MAX_REQUESTS = 60

const hits = new Map<string, { windowStart: number; count: number }>()

// 定期清掉過期紀錄，避免 Map 一直長大
setInterval(() => {
  const now = Date.now()
  for (const [ip, h] of hits) {
    if (now - h.windowStart >= WINDOW_MS) hits.delete(ip)
  }
}, WINDOW_MS).unref()

export const rateLimit: MiddlewareHandler = async (c, next) => {
  // Render 等平台的 proxy 會把使用者 IP 放在 X-Forwarded-For 第一個
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || getConnInfo(c).remote.address || 'unknown'
  const now = Date.now()
  let h = hits.get(ip)
  if (!h || now - h.windowStart >= WINDOW_MS) {
    h = { windowStart: now, count: 0 }
    hits.set(ip, h)
  }
  h.count++
  if (h.count > MAX_REQUESTS) {
    c.header('Retry-After', String(Math.ceil((h.windowStart + WINDOW_MS - now) / 1000)))
    return c.json({ error: '查詢太頻繁，請稍後再試' }, 429)
  }
  await next()
}
