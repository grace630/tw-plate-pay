import type { CityResult } from '../shared/types.ts'

// 開發用假資料：輸入車號 TEST-0001 時不呼叫縣市 API，方便測試「有待繳」與「查詢失敗」的畫面。
// production 不會啟用（見 server/index.ts）。
export const DEV_TEST_PLATE = 'TEST-0001'

const now = () => new Date().toISOString()

export function devFixture(cityId: string): CityResult {
  switch (cityId) {
    case 'taichung':
      return {
        cityId,
        status: 'ok',
        totalAmount: 120,
        updatedAt: '2026-10-29T08:00:00+08:00',
        queriedAt: now(),
        bills: [
          { kind: 'bill', no: 'T0000000000001', parkingDate: '2026-10-02', parkingHours: 3, payLimitDate: '2026-10-17', amount: 60 },
          { kind: 'bill', no: 'T0000000000002', parkingDate: '2026-10-20', parkingHours: 3, payLimitDate: '2026-11-04', amount: 60 },
        ],
      }
    case 'tainan':
      return {
        cityId,
        status: 'ok',
        totalAmount: 84,
        updatedAt: '2026/10/29 06:30:00',
        queriedAt: now(),
        bills: [
          {
            kind: 'reminder',
            no: 'R0000000000001',
            payLimitDate: '2026-11-15',
            amount: 84,
            extraCharge: 24,
            billCount: 2,
            children: [
              { kind: 'bill', no: 'T0000000000003', parkingDate: '2026-08-11', parkingHours: 2, payLimitDate: '2026-08-26', amount: 40 },
              { kind: 'bill', no: 'T0000000000004', parkingDate: '2026-08-15', parkingHours: 1, payLimitDate: '2026-08-30', amount: 20 },
            ],
            prosecuted: true,
            prosecuteLimitDate: '2026-11-30',
          },
        ],
      }
    case 'hualien':
      return { cityId, status: 'error', message: '縣市系統逾時未回應', queriedAt: now() }
    default:
      return { cityId, status: 'ok', totalAmount: 0, bills: [], queriedAt: now() }
  }
}
