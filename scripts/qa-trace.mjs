import { chromium } from '@playwright/test'

const BASE_URL = 'https://www.allio.life'
const EMAIL = 'autotest1775707558@test.allio.life'
const PASSWORD = 'TestPass123!'
const PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Tonight', path: '/tonight' },
  { name: 'Planner', path: '/planner' },
  { name: 'Recipes', path: '/recipes' },
  { name: 'Groceries', path: '/shop' },
  { name: 'Settings', path: '/settings' },
]

const trace = []
let currentPageName = 'bootstrap'

function push(entry) {
  trace.push(entry)
  console.log(JSON.stringify(entry))
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    try {
      return await response.text()
    } catch {
      return null
    }
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

page.on('console', async (msg) => {
  const type = msg.type()
  if (type !== 'error') return
  push({
    kind: 'console_error',
    page: currentPageName,
    text: msg.text(),
  })
})

page.on('pageerror', (error) => {
  push({
    kind: 'page_error',
    page: currentPageName,
    text: error.message,
  })
})

page.on('requestfailed', async (request) => {
  push({
    kind: 'request_failed',
    page: currentPageName,
    url: request.url(),
    method: request.method(),
    requestBody: request.postData() || null,
    failure: request.failure(),
  })
})

page.on('response', async (response) => {
  const status = response.status()
  if (status < 400) return
  const request = response.request()
  let postData = request.postData() || null
  let body = await safeJson(response)
  push({
    kind: 'http_error',
    page: currentPageName,
    url: request.url(),
    method: request.method(),
    requestBody: postData,
    status,
    responseBody: body,
  })
})

try {
  await page.context().tracing.start({ screenshots: true, snapshots: true })

  currentPageName = 'Login'
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await page.waitForTimeout(2000)

  for (const target of PAGES) {
    currentPageName = target.name
    await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2500)
  }
} finally {
  const fs = await import('fs')
  fs.writeFileSync('/tmp/qa-trace.txt', trace.map((entry) => JSON.stringify(entry)).join('\n'))
  await page.context().tracing.stop({ path: '/tmp/qa-trace.zip' })
  await browser.close()
}
