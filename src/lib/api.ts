import type { Region } from '../../shared/cities.ts'
import type { CarType } from '../../shared/plate.ts'
import type { CityResult } from '../../shared/types.ts'

export interface CityInfo {
  id: string
  name: string
  region: Region
  officialUrl?: string
}

export async function fetchCities(): Promise<CityInfo[]> {
  const res = await fetch('/api/cities')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchPayBill(
  cityId: string,
  plate: string,
  carType: CarType,
  signal?: AbortSignal,
): Promise<CityResult> {
  const qs = new URLSearchParams({ plate, type: carType })
  try {
    const res = await fetch(`/api/paybill/${cityId}?${qs}`, { signal })
    const body = await res.json()
    if (!res.ok) {
      return { cityId, status: 'error', message: body.error ?? `HTTP ${res.status}`, queriedAt: new Date().toISOString() }
    }
    return body as CityResult
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return { cityId, status: 'error', message: '無法連線到查詢服務', queriedAt: new Date().toISOString() }
  }
}
