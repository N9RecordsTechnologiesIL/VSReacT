import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = process.env.SHOT_DIR || 'shots'
mkdirSync(OUT, { recursive: true })

const only = process.argv[2] ? process.argv[2].split(',') : null

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({
  viewport: { width: 1680, height: 1050 },
  deviceScaleFactor: 2,
})
await page.goto('http://localhost:3000/components', { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(1800)

const articles = page.locator('article')
const n = await articles.count()
console.log(`families: ${n}`)
for (let i = 0; i < n; i++) {
  const el = articles.nth(i)
  const raw = (await el.locator('h2').first().textContent()) || `fam${i}`
  const slug = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  if (only && !only.some((o) => slug.includes(o))) continue
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  await el.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}-${slug}.png` })
  console.log(`shot ${slug}`)
}

// modals: open each theme's dialog, shoot it, close
if (!only || only.includes('modal')) {
  const modalFam = page.locator('article', { has: page.locator('h2', { hasText: /^Modal$/ }) })
  if ((await modalFam.count()) === 1) {
    const buttons = modalFam.locator('button')
    const bn = await buttons.count()
    let shot = 0
    for (let i = 0; i < bn; i++) {
      const b = buttons.nth(i)
      await b.scrollIntoViewIfNeeded()
      await b.click()
      await page.waitForTimeout(350)
      const dialog = page.locator('[role="dialog"], [class*="mBase"]').last()
      if (await dialog.isVisible().catch(() => false)) {
        await dialog.screenshot({ path: `${OUT}/modal-${shot}.png` })
        console.log(`shot modal-${shot}`)
        shot++
        await page.keyboard.press('Escape')
        await page.waitForTimeout(250)
        // fallback close if Escape isn't wired
        const still = await dialog.isVisible().catch(() => false)
        if (still) {
          await dialog.locator('button').last().click().catch(() => {})
          await page.waitForTimeout(250)
        }
      }
    }
  }
}

await browser.close()
console.log('done')
