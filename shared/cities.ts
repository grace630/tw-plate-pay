// 各縣市「全國路邊停車費查詢 API」端點（交通部標準規範 V1，TDX 彙整）
// 路徑格式統一為 .../Parking/PayBill/CarID/{CarID}/CarType/{CarType}
// 端點來源：https://tdx.transportdata.tw/api-service-thirdParty/parkingFee

export type Region = 'north' | 'central' | 'south' | 'east' | 'islands'

export interface City {
  id: string
  name: string
  region: Region
  /** PayBill API 的 base URL，後面接 /Parking/PayBill/... */
  apiBase: string
  /** 官方查詢 / 繳費網頁（有確認過才填） */
  officialUrl?: string
}

export const REGION_LABEL: Record<Region, string> = {
  north: '北部',
  central: '中部',
  south: '南部',
  east: '東部',
  islands: '離島',
}

export const CITIES: City[] = [
  { id: 'taipei', name: '臺北市', region: 'north', apiBase: 'https://trafficapi.pma.gov.taipei' },
  {
    id: 'newtaipei',
    name: '新北市',
    region: 'north',
    apiBase: 'https://trafficapi.traffic.ntpc.gov.tw',
    officialUrl: 'https://parkweb.traffic.ntpc.gov.tw/',
  },
  {
    id: 'keelung',
    name: '基隆市',
    region: 'north',
    apiBase: 'https://park.klcg.gov.tw/TrafficPayBill',
    officialUrl: 'https://park.klcg.gov.tw/PaymentConfirmationAndPrinting',
  },
  {
    id: 'taoyuan',
    name: '桃園市',
    region: 'north',
    apiBase: 'https://bill-epark.tycg.gov.tw',
    officialUrl: 'https://epark.tycg.gov.tw/public/Ticket/UnpayTicket',
  },
  { id: 'hsinchu-city', name: '新竹市', region: 'north', apiBase: 'https://histmp.hccg.gov.tw:5443/TrafficPayBill' },
  {
    id: 'hsinchu-county',
    name: '新竹縣',
    region: 'north',
    apiBase: 'https://hcpark.hchg.gov.tw/NationalParkingPayBillInquiry',
  },
  { id: 'yilan', name: '宜蘭縣', region: 'north', apiBase: 'https://billparking.e-land.gov.tw' },
  { id: 'miaoli', name: '苗栗縣', region: 'central', apiBase: 'https://miaoliparking.jotangi.com.tw/TrafficPayBill' },
  {
    id: 'taichung',
    name: '臺中市',
    region: 'central',
    apiBase: 'http://tcparkingapi.taichung.gov.tw:8081/NationalParkingPayBillInquiry.Api',
  },
  { id: 'changhua', name: '彰化縣', region: 'central', apiBase: 'https://chpark.chcg.gov.tw/TrafficPayBill' },
  { id: 'nantou', name: '南投縣', region: 'central', apiBase: 'https://parking.nantou.gov.tw/TrafficPayBill' },
  {
    id: 'yunlin',
    name: '雲林縣',
    region: 'central',
    apiBase: 'https://parking.yunlin.gov.tw/TrafficPayBill',
    officialUrl: 'https://parking.yunlin.gov.tw/ParkingFeeInquiry/ParkingFee',
  },
  { id: 'chiayi-city', name: '嘉義市', region: 'south', apiBase: 'https://parking.chiayi.gov.tw/cypark/api' },
  {
    id: 'chiayi-county',
    name: '嘉義縣',
    region: 'south',
    apiBase: 'https://8voc0wuf1g.execute-api.ap-southeast-1.amazonaws.com/default/chiayi',
  },
  { id: 'tainan', name: '臺南市', region: 'south', apiBase: 'https://parkingbill.tainan.gov.tw' },
  { id: 'kaohsiung', name: '高雄市', region: 'south', apiBase: 'https://kpp.tbkc.gov.tw/parking/V1' },
  {
    id: 'pingtung',
    name: '屏東縣',
    region: 'south',
    apiBase: 'https://8voc0wuf1g.execute-api.ap-southeast-1.amazonaws.com/default/pingtung',
  },
  { id: 'hualien', name: '花蓮縣', region: 'east', apiBase: 'https://hl.parchere.com.tw/TrafficPayBill' },
  { id: 'taitung', name: '臺東縣', region: 'east', apiBase: 'https://tt.guoyun.com.tw/TrafficPayBill' },
  { id: 'penghu', name: '澎湖縣', region: 'islands', apiBase: 'https://parking.penghu.gov.tw/TrafficPayBill' },
  { id: 'kinmen', name: '金門縣', region: 'islands', apiBase: 'https://km.guoyun.com.tw/TrafficPayBill' },
]

// 連江縣（馬祖）目前沒有提供 PayBill API
export const UNSUPPORTED_CITIES = ['連江縣']

export function findCity(id: string): City | undefined {
  return CITIES.find((c) => c.id === id)
}
