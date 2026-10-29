// 車種代碼依交通部「全國路邊停車費查詢 API 服務規範」：C 汽車、M 機車、O 其他（如拖車）
export type CarType = 'C' | 'M' | 'O'

export const CAR_TYPE_LABEL: Record<CarType, string> = {
  C: '汽車',
  M: '機車',
  O: '其他',
}

export function isCarType(value: unknown): value is CarType {
  return value === 'C' || value === 'M' || value === 'O'
}

/**
 * 去掉空白、全形與各種破折號統一成「-」並轉大寫。
 * 車號必須保留「-」：多數縣市（基隆、新竹、苗栗、彰化、南投、雲林、臺南、嘉義縣…）
 * 不帶「-」會回「輸入車牌格式有誤」，而臺北、新北等帶「-」也能查。
 * 「-」的位置無法從純英數字可靠推回（例如 AB1234 可能是 AB-1234 或 AB12-34），所以要求使用者輸入。
 */
export function normalizePlate(input: string): string {
  return input
    .replace(/\s/g, '')
    .replace(/[－—–‐_]/g, '-')
    .toUpperCase()
}

// 一般車牌為英數字；規範另提到軍、使、臨、外、試等特殊車牌會含中文字
const PLATE_PATTERN = /^[A-Z0-9軍使臨外試]{1,4}-[A-Z0-9軍使臨外試]{1,4}$/

export function isValidPlate(normalized: string): boolean {
  return PLATE_PATTERN.test(normalized) && /[0-9]/.test(normalized)
}

/** 顯示用遮罩：ABC-1234 → AB*-**34，避免畫面截圖外流完整車號 */
export function maskPlate(normalized: string): string {
  let seen = 0
  const total = normalized.replace('-', '').length
  return normalized.replace(/[^-]/g, (ch) => {
    seen++
    return seen <= 2 || seen > total - 2 ? ch : '*'
  })
}
