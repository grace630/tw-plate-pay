import { useState, type FormEvent } from 'react'
import { CAR_TYPE_LABEL, isValidPlate, normalizePlate, type CarType } from '../../shared/plate.ts'

interface Props {
  busy: boolean
  onSearch: (plate: string, carType: CarType) => void
}

const CAR_TYPES: CarType[] = ['C', 'M']

export function SearchForm({ busy, onSearch }: Props) {
  const [plate, setPlate] = useState('')
  const [carType, setCarType] = useState<CarType>('C')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = normalizePlate(plate)
    if (!isValidPlate(normalized)) {
      setError(normalized.includes('-') ? '車號格式不正確' : '請包含「-」，例如 ABC-1234')
      return
    }
    setError('')
    setPlate(normalized)
    onSearch(normalized, carType)
  }

  return (
    <form className="search" onSubmit={handleSubmit} noValidate>
      <label className="search__label" htmlFor="plate">
        車牌號碼
      </label>
      <input
        id="plate"
        className="search__plate"
        value={plate}
        onChange={(e) => setPlate(e.target.value.toUpperCase())}
        placeholder="ABC-1234"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={10}
        aria-invalid={error ? true : undefined}
        aria-describedby="plate-hint"
      />
      <p id="plate-hint" className={error ? 'search__hint search__hint--error' : 'search__hint'}>
        {error || '請輸入含「-」的完整車號'}
      </p>

      <div className="search__types" role="radiogroup" aria-label="車種">
        {CAR_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={carType === t}
            className="search__type"
            onClick={() => setCarType(t)}
          >
            {CAR_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <button className="search__submit" type="submit" disabled={busy}>
        {busy ? '查詢中…' : '查詢全台停車費'}
      </button>
    </form>
  )
}
