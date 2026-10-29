const currency = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })

export function formatAmount(amount: number): string {
  return `NT$ ${currency.format(amount)}`
}

/** 各縣市日期格式不一（2025-07-10、2025/07/10、含時間），統一成 YYYY/MM/DD */
export function formatDate(value?: string): string {
  if (!value) return '—'
  const m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!m) return value
  return `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}`
}

/** 資料更新時間：YYYY/MM/DD HH:mm（沒有時間就只顯示日期） */
export function formatDateTime(value?: string): string {
  if (!value) return '—'
  const time = value.match(/[T ](\d{1,2}):(\d{2})/)
  const date = formatDate(value)
  return time ? `${date} ${time[1].padStart(2, '0')}:${time[2]}` : date
}

export function isOverdue(value?: string): boolean {
  if (!value) return false
  const d = new Date(formatDate(value).replace(/\//g, '-') + 'T23:59:59+08:00')
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
}
