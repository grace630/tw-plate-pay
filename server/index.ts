import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { CITIES, findCity } from '../shared/cities.ts'
import { isCarType, isValidPlate, normalizePlate } from '../shared/plate.ts'
import { DEV_TEST_PLATE, devFixture } from './fixtures.ts'
import { queryCity } from './paybill.ts'

const isProduction = process.env.NODE_ENV === 'production'
const app = new Hono()

app.get('/api/cities', (c) => c.json(CITIES.map(({ id, name, region, officialUrl }) => ({ id, name, region, officialUrl }))))

// 前端對每個縣市各打一次，結果才能逐筆顯示，不用等最慢的縣市
app.get('/api/paybill/:cityId', async (c) => {
  const city = findCity(c.req.param('cityId'))
  if (!city) return c.json({ error: '不支援的縣市' }, 404)

  const plate = normalizePlate(c.req.query('plate') ?? '')
  const carType = c.req.query('type')
  if (!isValidPlate(plate)) return c.json({ error: '車號格式不正確' }, 400)
  if (!isCarType(carType)) return c.json({ error: '車種不正確' }, 400)

  c.header('Cache-Control', 'no-store')
  if (!isProduction && plate === DEV_TEST_PLATE) return c.json(devFixture(city.id))
  return c.json(await queryCity(city, plate, carType))
})

if (isProduction) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`tw-plate-pay API listening on http://localhost:${info.port}`)
})
