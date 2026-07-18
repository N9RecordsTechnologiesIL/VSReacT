import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

mkdirSync('shots2', { recursive: true })

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({
  viewport: { width: 1680, height: 1050 },
  deviceScaleFactor: 2,
})
await page.goto('http://localhost:3000/components', { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(1500)

const fam = page.locator('article', { has: page.locator('h2', { hasText: /^Tooltip$/ }) })
await fam.scrollIntoViewIfNeeded()
await page.waitForTimeout(300)

const tiles = fam.locator('[class*="tile"][class*="t_"]')
const n = await tiles.count()
console.log(`tooltip tiles: ${n}`)
for (let i = 0; i < n; i++) {
  const tile = tiles.nth(i)
  const trigger = tile.getByText(/HOVER ME/i).first()
  await trigger.hover()
  await page.waitForTimeout(600)
  await fam.screenshot({ path: `shots2/tooltip-hover-${i}.png` })
  console.log(`shot tooltip-hover-${i}`)
  await page.mouse.move(0, 0)
  await page.waitForTimeout(150)
}

await browser.close()
console.log('done')
