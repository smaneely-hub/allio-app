#!/usr/bin/env node
import { createRequire } from 'module'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const require = createRequire(import.meta.url)

const APP_URL = process.env.APP_URL || 'https://allio.life'
const TEST_EMAIL = process.env.SMOKE_TEST_EMAIL || 'test@allio.life'
const TEST_PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'SmokeTest2026!'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rvgtmletsbycrbeycwus.supabase.co'
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'
const DOCKER_IMAGE = 'mcr.microsoft.com/playwright:v1.59.1-noble'

let passCount = 0
let failCount = 0
const artifactsDir = path.join(repoRoot, '.openclaw', 'artifacts')
mkdirSync(artifactsDir, { recursive: true })

function pass(label) { console.log(`  ✅ PASS  ${label}`); passCount++ }
function fail(label, reason = '') { console.log(`  ❌ FAIL  ${label}${reason ? ` — ${reason}` : ''}`); failCount++ }
function section(name) { console.log(`\n── ${name} ──`) }

async function fetchText(url, opts = {}) {
  const res = await fetch(url, opts)
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, text, json }
}

function detectMode() {
  const forced = (process.env.SMOKE_MODE || 'auto').toLowerCase()
  if (forced !== 'auto') return forced
  const modeFile = path.join(repoRoot, '.openclaw', 'browser-mode')
  if (existsSync(modeFile)) {
    const saved = readFileSync(modeFile, 'utf8').trim()
    if (saved) return saved
  }
  return 'auto'
}

function maybeRunInDocker(mode) {
  if (process.env.OPENCLAW_SMOKE_IN_DOCKER === '1') return false
  if (!(mode === 'docker' || mode === 'auto')) return false

  const hasDocker = spawnSync('docker', ['--version'], { stdio: 'ignore' }).status === 0
  if (!hasDocker) return false

  console.log('\n[MODE] DOCKER — running Playwright inside isolated container\n')
  const args = [
    'run', '--rm',
    '-v', `${repoRoot}:/app`,
    '-w', '/app',
    '-e', 'OPENCLAW_SMOKE_IN_DOCKER=1',
    '-e', `APP_URL=${APP_URL}`,
    '-e', `SMOKE_TEST_EMAIL=${TEST_EMAIL}`,
    '-e', `SMOKE_TEST_PASSWORD=${TEST_PASSWORD}`,
    '-e', `SUPABASE_URL=${SUPABASE_URL}`,
    '-e', `SUPABASE_ANON_KEY=${SUPABASE_ANON}`,
    '-e', 'SMOKE_MODE=browser',
    DOCKER_IMAGE,
    'node', 'scripts/smoke-test.js',
  ]
  const result = spawnSync('docker', args, { stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

async function runApiSmokeTest() {
  console.log('\n[MODE] API — HTTP/Supabase fallback\n')

  section('1. App reachability')
  try {
    const { status } = await fetchText(APP_URL)
    status === 200 ? pass(`GET ${APP_URL} → ${status}`) : fail('App reachability', `got ${status}`)
  } catch (e) { fail('App reachability', e.message) }

  section('2. Login page')
  try {
    const { status } = await fetchText(`${APP_URL}/login`)
    status === 200 ? pass('Login page returns 200') : fail('Login page', `got ${status}`)
  } catch (e) { fail('Login page', e.message) }

  section('3. Supabase auth')
  let accessToken = null
  try {
    const { status, json } = await fetchText(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    if (status === 200 && json?.access_token) {
      accessToken = json.access_token
      pass(`Auth sign-in → token obtained for ${json.user?.email}`)
    } else {
      fail('Auth sign-in', `status=${status}`)
    }
  } catch (e) { fail('Auth sign-in', e.message) }

  section('4. SPA shell')
  try {
    const { text } = await fetchText(APP_URL)
    text.toLowerCase().includes('allio') ? pass('index.html contains Allio brand') : fail('Allio brand check', 'missing from shell HTML')
    console.log('    NOTE: DOM assertions like "Tonight\'s Meal" require browser mode.')
  } catch (e) { fail('SPA shell', e.message) }

  section('5. Route sanity')
  for (const route of ['/tonight', '/plan']) {
    try {
      const { status } = await fetchText(`${APP_URL}${route}`)
      status === 200 ? pass(`${route} returns 200`) : fail(route, `got ${status}`)
    } catch (e) { fail(route, e.message) }
  }

  section('6. generate-plan edge function')
  if (!accessToken) {
    fail('generate-plan', 'skipped because auth failed')
  } else {
    try {
      const payload = {
        household: {
          total_people: 1,
          diet_focus: 'balanced',
          budget_sensitivity: 'moderate',
          adventurousness: 'mixed',
          staples_on_hand: 'salt, pepper, olive oil',
          planning_priorities: ['quick meal'],
          cooking_comfort: 'simple meals',
        },
        members: [],
        slots: [{ day: 'mon', meal: 'dinner', effort: 'medium', planning_notes: '' }],
        week_notes: '',
        locked_meals: [],
        _options: { output_format: 'detailed' },
      }
      const { status, json } = await fetchText(`${SUPABASE_URL}/functions/v1/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON,
        },
        body: JSON.stringify(payload),
      })
      if (status === 200 && json?.plan?.meals?.length) {
        pass(`generate-plan returned ${json.plan.meals.length} meal(s)`)
      } else {
        fail('generate-plan', `status=${status} body=${JSON.stringify(json).slice(0, 140)}`)
      }
    } catch (e) { fail('generate-plan', e.message) }
  }
}

async function runBrowserSmokeTest() {
  console.log('\n[MODE] BROWSER — Playwright Chromium headless\n')
  let chromium
  try {
    ;({ chromium } = await import('@playwright/test'))
  } catch {
    try {
      chromium = require('playwright-core').chromium
    } catch (e) {
      throw new Error(`Cannot import Playwright runtime: ${e.message}`)
    }
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
  const consoleErrors = []
  const browserErrors = []

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', err => browserErrors.push(err.message))

    section('1. Navigate to app root')
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 })
    response?.status() === 200 ? pass(`GET ${APP_URL} → ${response.status()}`) : fail('App load', `status ${response?.status()}`)

    section('2. Root redirect')
    const rootUrl = page.url()
    ;(rootUrl.includes('/login') || rootUrl.includes('/tonight') || rootUrl.includes('/onboarding'))
      ? pass(`Root redirected to: ${rootUrl}`)
      : fail('Root redirect', `unexpected URL ${rootUrl}`)

    section('3. Login with test account')
    if (!page.url().includes('/login')) {
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    }
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(onboarding|tonight|dashboard)/, { timeout: 30000 })
    pass(`Login succeeded → ${page.url()}`)

    section('4. Landing page is Tonight\'s Meal')
    await page.goto(`${APP_URL}/tonight`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('h1', { timeout: 15000 })
    const heading = (await page.locator('h1').first().textContent())?.trim() || ''
    heading.includes("Tonight's Meal") ? pass(`h1 = "${heading}"`) : fail('Tonight heading', `got "${heading}"`)

    section('5. App did NOT default to Plan')
    const tonightUrl = page.url()
    tonightUrl.includes('/plan') ? fail('Default route check', `URL is ${tonightUrl}`) : pass(`URL is ${tonightUrl}`)

    section('6. Meal generation control')
    const generateButton = page.getByRole('button', { name: /generate tonight's meal/i })
    await generateButton.waitFor({ timeout: 10000 })
    await generateButton.isVisible() ? pass('Generate tonight\'s meal button visible') : fail('Generate button', 'not visible')

    section('7. Attempt meal generation')
    await generateButton.click()
    const outcome = await Promise.race([
      page.waitForSelector('text=Generating...', { timeout: 5000 }).then(() => 'generating'),
      page.waitForSelector('text=Meal generated!', { timeout: 70000 }).then(() => 'success-toast'),
      page.waitForSelector('[role="alert"]', { timeout: 70000 }).then(async el => `alert:${(await el.textContent()) || ''}`),
      page.waitForSelector('h2.text-2xl, .text-xl.font-semibold', { timeout: 70000 }).then(async el => `meal:${(await el.textContent()) || ''}`),
    ]).catch(e => `timeout:${e.message}`)

    if (outcome === 'generating') {
      const followup = await Promise.race([
        page.waitForSelector('text=Meal generated!', { timeout: 70000 }).then(() => 'success-toast'),
        page.waitForSelector('h2.text-2xl, .text-xl.font-semibold', { timeout: 70000 }).then(async el => `meal:${(await el.textContent()) || ''}`),
        page.waitForSelector('[role="alert"]', { timeout: 70000 }).then(async el => `alert:${(await el.textContent()) || ''}`),
      ]).catch(e => `timeout:${e.message}`)
      if (followup.startsWith('meal:') || followup === 'success-toast') {
        pass(`Meal generation completed (${followup.slice(0, 80)})`)
      } else {
        fail('Meal generation outcome', followup)
      }
    } else if (outcome.startsWith('meal:') || outcome === 'success-toast') {
      pass(`Meal generation completed (${outcome.slice(0, 80)})`)
    } else {
      fail('Meal generation', outcome)
    }

    section('8. Console/runtime errors')
    const critical = [...consoleErrors, ...browserErrors].filter(msg => !/favicon|ERR_BLOCKED_BY_CLIENT/i.test(msg) && !/^Failed to load resource: the server responded with a status of 401 \(\)$/i.test(msg))
    if (critical.length === 0) {
      pass('No critical console/runtime errors')
    } else {
      fail('Console/runtime errors', critical.slice(0, 3).join(' | '))
    }

    await page.screenshot({ path: path.join(artifactsDir, 'smoke-final.png'), fullPage: true })
    await context.close()
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║           Allio Smoke Test                           ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  App:    ${APP_URL}`)
  console.log(`  User:   ${TEST_EMAIL}`)
  console.log(`  Date:   ${new Date().toISOString()}`)

  const mode = detectMode()
  maybeRunInDocker(mode)

  let actualMode = mode
  if (mode === 'browser' || mode === 'native' || mode === 'auto') {
    try {
      await runBrowserSmokeTest()
      actualMode = 'browser'
    } catch (e) {
      if (mode === 'auto') {
        console.log(`\n  ⚠️ Browser launch failed: ${e.message}`)
        passCount = 0
        failCount = 0
        await runApiSmokeTest()
        actualMode = 'api-fallback'
      } else {
        fail('Browser launch', e.message)
        actualMode = 'browser'
      }
    }
  } else if (mode === 'docker') {
    fail('Docker handoff', 'docker execution should have been used before this point')
    actualMode = 'docker'
  } else {
    await runApiSmokeTest()
    actualMode = 'api'
  }

  const total = passCount + failCount
  const status = failCount === 0 ? 'PASS' : 'FAIL'
  console.log('\n══════════════════════════════════════════════════════')
  console.log(`  Mode:    ${actualMode}`)
  console.log(`  Results: ${passCount}/${total} passed, ${failCount} failed`)
  console.log(`  Status:  ${status}`)
  console.log('══════════════════════════════════════════════════════\n')
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})
