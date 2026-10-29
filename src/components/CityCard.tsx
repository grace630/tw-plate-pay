import type { Bill, CityResult } from '../../shared/types.ts'
import type { CityInfo } from '../lib/api.ts'
import { formatAmount, formatDate, formatDateTime, isOverdue } from '../lib/format.ts'

interface Props {
  city: CityInfo
  result: CityResult
  onRetry: () => void
}

/** 有待繳費用的縣市才用完整卡片，沒費用的縣市在 App 用小標籤顯示 */
export function CityCard({ city, result, onRetry }: Props) {
  if (result.status === 'error') {
    return (
      <article className="card card--error">
        <header className="card__head">
          <h3>{city.name}</h3>
          <button type="button" className="card__retry" onClick={onRetry}>
            重試
          </button>
        </header>
        <p className="card__message">{result.message}</p>
        {city.officialUrl && (
          <a className="card__link" href={city.officialUrl} target="_blank" rel="noopener noreferrer">
            改到{city.name}官方網站查詢 ↗
          </a>
        )}
      </article>
    )
  }

  return (
    <article className="card card--due">
      <header className="card__head">
        <h3>{city.name}</h3>
        <strong className="card__total">{formatAmount(result.totalAmount)}</strong>
      </header>
      {result.updatedAt && <p className="card__updated">縣市資料更新：{formatDateTime(result.updatedAt)}</p>}
      <ul className="bills">
        {result.bills.map((b, i) => (
          <li key={b.no || i} className="bill">
            {b.kind === 'reminder' ? <ReminderItem bill={b} /> : <BillItem bill={b} />}
          </li>
        ))}
      </ul>
      {city.officialUrl && (
        <a className="card__link" href={city.officialUrl} target="_blank" rel="noopener noreferrer">
          前往{city.name}官方網站繳費 ↗
        </a>
      )}
    </article>
  )
}

function DueDate({ value }: { value?: string }) {
  const overdue = isOverdue(value)
  return (
    <dd className={overdue ? 'overdue' : undefined}>
      {formatDate(value)}
      {overdue && ' 已逾期'}
    </dd>
  )
}

function BillItem({ bill }: { bill: Bill }) {
  return (
    <>
      <div className="bill__row">
        <span className="tag">停車單</span>
        <span className="bill__amount">{formatAmount(bill.amount)}</span>
      </div>
      <dl className="bill__meta">
        <dt>停車日期</dt>
        <dd>
          {formatDate(bill.parkingDate)}
          {bill.parkingHours ? `（${bill.parkingHours} 小時）` : ''}
        </dd>
        <dt>繳費期限</dt>
        <DueDate value={bill.payLimitDate} />
        <dt>單號</dt>
        <dd className="mono">{bill.no || '—'}</dd>
      </dl>
    </>
  )
}

function ReminderItem({ bill }: { bill: Bill }) {
  const children = bill.children ?? []
  const parkingFee = children.reduce((sum, c) => sum + c.amount, 0)
  return (
    <>
      <div className="bill__row">
        <span className="tag tag--warn">催繳單</span>
        <span className="bill__amount">{formatAmount(bill.amount)}</span>
      </div>
      <dl className="bill__meta">
        {bill.extraCharge ? (
          <>
            <dt>金額組成</dt>
            <dd>
              停車費 {formatAmount(parkingFee || bill.amount - bill.extraCharge)} ＋ 工本費 {formatAmount(bill.extraCharge)}
            </dd>
          </>
        ) : null}
        <dt>催繳期限</dt>
        <DueDate value={bill.payLimitDate} />
        <dt>單號</dt>
        <dd className="mono">{bill.no || '—'}</dd>
      </dl>

      {bill.prosecuted && (
        <p className="bill__alert">
          {bill.prosecuteLimitDate
            ? `請在 ${formatDate(bill.prosecuteLimitDate)} 前繳納，逾期將被告發（開立交通罰單）`
            : '此催繳單已列入告發，請儘速處理'}
        </p>
      )}

      {children.length > 0 && (
        <details className="bill__children">
          <summary>內含 {children.length} 張停車單</summary>
          <ul>
            {children.map((c, i) => (
              <li key={c.no || i}>
                <span>
                  {formatDate(c.parkingDate)}
                  {c.parkingHours ? `（${c.parkingHours} 小時）` : ''}
                </span>
                <span className="bill__amount">{formatAmount(c.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
