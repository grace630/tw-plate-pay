import { useEffect, useRef, useState } from 'react'
import { REGION_LABEL, UNSUPPORTED_CITIES } from '../shared/cities.ts'
import { CAR_TYPE_LABEL, maskPlate, type CarType } from '../shared/plate.ts'
import type { CityResult } from '../shared/types.ts'
import { CityCard } from './components/CityCard.tsx'
import { FinesCard } from './components/FinesCard.tsx'
import { SearchForm } from './components/SearchForm.tsx'
import { fetchCities, fetchPayBill, type CityInfo } from './lib/api.ts'
import { formatAmount } from './lib/format.ts'

interface Query {
  plate: string
  carType: CarType
}

export default function App() {
  const [cities, setCities] = useState<CityInfo[]>([])
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState<Query | null>(null)
  const [results, setResults] = useState<Record<string, CityResult>>({})
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchCities()
      .then(setCities)
      .catch(() => setLoadError(true))
  }, [])

  function runCity(cityId: string, q: Query, signal: AbortSignal) {
    fetchPayBill(cityId, q.plate, q.carType, signal)
      .then((r) => setResults((prev) => ({ ...prev, [cityId]: r })))
      .catch(() => {
        // 新查詢取消了舊請求，忽略
      })
  }

  function handleSearch(plate: string, carType: CarType) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const q = { plate, carType }
    setQuery(q)
    setResults({})
    // 每個縣市各自發請求，先回來的先顯示
    for (const c of cities) runCity(c.id, q, controller.signal)
  }

  function handleRetry(cityId: string) {
    if (!query || !abortRef.current) return
    setResults((prev) => {
      const next = { ...prev }
      delete next[cityId]
      return next
    })
    runCity(cityId, query, abortRef.current.signal)
  }

  const done = Object.keys(results).length
  const busy = query !== null && done < cities.length
  const list = Object.values(results)
  const due = list.filter((r) => r.status === 'ok' && r.bills.length > 0)
  const failed = list.filter((r) => r.status === 'error')
  const clear = cities.filter((c) => {
    const r = results[c.id]
    return r?.status === 'ok' && r.bills.length === 0
  })
  const pending = cities.filter((c) => !results[c.id])
  const totalAmount = due.reduce((sum, r) => sum + (r.status === 'ok' ? r.totalAmount : 0), 0)
  const totalBills = due.reduce((sum, r) => sum + (r.status === 'ok' ? r.bills.length : 0), 0)
  const cityById = (id: string) => cities.find((c) => c.id === id)!

  return (
    <div className="page">
      <header className="hero">
        <h1>全台路邊停車費查詢</h1>
        <p>輸入車號，一次查詢 {cities.length || 21} 個縣市的未繳停車費</p>
      </header>

      <main className="main">
        {loadError ? (
          <p className="banner banner--error">無法連線到查詢服務，請確認後端已啟動（npm run dev）。</p>
        ) : (
          <SearchForm busy={busy || cities.length === 0} onSearch={handleSearch} />
        )}

        {query && (
          <section className="results" aria-live="polite" aria-busy={busy}>
            <div className="summary">
              <div className="summary__plate">
                {maskPlate(query.plate)}
                <span>{CAR_TYPE_LABEL[query.carType]}</span>
              </div>
              <div className="summary__stats">
                <div>
                  <span className="summary__label">待繳總額</span>
                  <strong className={totalAmount > 0 ? 'summary__amount summary__amount--due' : 'summary__amount'}>
                    {formatAmount(totalAmount)}
                  </strong>
                </div>
                <div>
                  <span className="summary__label">待繳筆數</span>
                  <strong className="summary__amount">{totalBills}</strong>
                </div>
              </div>
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={cities.length} aria-valuenow={done}>
                <div className="progress__bar" style={{ width: `${(done / Math.max(cities.length, 1)) * 100}%` }} />
              </div>
              <p className="summary__status">
                {busy ? `查詢中… 已完成 ${done} / ${cities.length} 縣市` : `已查完 ${cities.length} 縣市`}
                {failed.length > 0 && `，${failed.length} 個查詢失敗`}
              </p>
            </div>

            {!busy && due.length === 0 && failed.length === 0 && (
              <p className="banner banner--ok">太好了！全台都沒有待繳的路邊停車費。</p>
            )}

            {due.map((r) => (
              <CityCard key={r.cityId} city={cityById(r.cityId)} result={r} onRetry={() => handleRetry(r.cityId)} />
            ))}
            {failed.map((r) => (
              <CityCard key={r.cityId} city={cityById(r.cityId)} result={r} onRetry={() => handleRetry(r.cityId)} />
            ))}

            {(clear.length > 0 || pending.length > 0) && (
              <div className="chips-block">
                <h2 className="chips-title">無待繳費用</h2>
                <ul className="chips">
                  {clear.map((c) => (
                    <li key={c.id} className="chip chip--clear" title={REGION_LABEL[c.region]}>
                      {c.name}
                    </li>
                  ))}
                  {pending.map((c) => (
                    <li key={c.id} className="chip chip--pending">
                      {c.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <FinesCard />
      </main>

      <footer className="footer">
        <p>
          資料來源：各縣市政府「全國路邊停車費查詢 API」（交通部 TDX 彙整）。{UNSUPPORTED_CITIES.join('、')}
          目前未提供查詢介面。
        </p>
        <p>超商或臨櫃繳費後，縣市系統可能需要數小時至數天才會銷帳，結果僅供參考，請以各縣市官方資料為準。</p>
        <p>本站不儲存您查詢的車號。</p>
      </footer>
    </div>
  )
}
