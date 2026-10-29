// 交通罰單沒有公開 API，且監理服務網需輸入驗證碼，所以只提供官方連結讓使用者自行查詢
const LINKS = [
  {
    title: '監理服務網｜交通違規查詢與繳費',
    desc: '可依身分證字號或車號查詢罰單，並線上繳納',
    href: 'https://www.mvdis.gov.tw/m3-emv-vil/vil/penaltyQueryPay',
  },
]

export function FinesCard() {
  return (
    <section className="fines" aria-labelledby="fines-title">
      <h2 id="fines-title">交通罰單</h2>
      <p className="fines__note">罰單需在監理服務網輸入驗證碼查詢，本站不代查，請點下方連結前往官方網站。</p>
      {LINKS.map((l) => (
        <a key={l.href} className="fines__link" href={l.href} target="_blank" rel="noopener noreferrer">
          <span className="fines__title">{l.title} ↗</span>
          <span className="fines__desc">{l.desc}</span>
        </a>
      ))}
    </section>
  )
}
