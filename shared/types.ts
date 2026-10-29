// 後端統一整理後回給前端的格式（各縣市原始欄位差異在 server/paybill.ts 處理）

export interface Bill {
  kind: 'bill' | 'reminder'
  /** 繳費單號 / 催繳單號 */
  no: string
  /** 停車日期（催繳單沒有，改看 children） */
  parkingDate?: string
  /** 停車時數 */
  parkingHours?: number
  /** 繳費期限 / 催繳期限 */
  payLimitDate?: string
  /** 應繳金額（催繳單含工本費） */
  amount: number
  /** 催繳單的催繳工本費 */
  extraCharge?: number
  /** 催繳單內含的原停車單數 */
  billCount?: number
  /** 催繳單內含的原停車單明細 */
  children?: Bill[]
  /** 催繳單是否已列入告發（逾期未繳會被開交通罰單） */
  prosecuted?: boolean
  /** 告發期限 */
  prosecuteLimitDate?: string
}

export type CityResult =
  | {
      cityId: string
      status: 'ok'
      bills: Bill[]
      totalAmount: number
      /** 縣市系統的資料更新時間 */
      updatedAt?: string
      queriedAt: string
    }
  | {
      cityId: string
      status: 'error'
      message: string
      queriedAt: string
    }
