import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } })
await page.goto('http://localhost:3000/components', { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(1200)

const fam = (title) => page.locator('article', { has: page.locator(`h2:text-is("${title}")`) })
const tile = (title, i) => fam(title).locator('[class*="tile"][class*="t_"]').nth(i)
// theme order: 0 inst, 1 metal, 2 std, 3 glass/ether, 4 carbon/ember, 5 neon

const css = async (loc, sel, pseudo, props) =>
  loc.locator(sel).first().evaluate(
    (el, { pseudo, props }) => {
      const s = getComputedStyle(el, pseudo || undefined)
      const out = {}
      for (const p of props) out[p] = s.getPropertyValue(p)
      return out
    },
    { pseudo, props },
  )

const P = ['background-image', 'background-color', 'width', 'height', 'border-radius', 'border', 'box-shadow', 'inset', 'display', 'position', 'left', 'top', 'bottom', 'right']

console.log('── METAL hwKnob s:', JSON.stringify(await css(tile('HardwareKnob', 1), 's', null, P)))
console.log('── METAL hwKnob i:', JSON.stringify(await css(tile('HardwareKnob', 1), 'i', null, P)))
console.log('── METAL hwKnob classes:', await tile('HardwareKnob', 1).locator('[class*="hwKnob"]').first().getAttribute('class'))

console.log('── METAL fader root class:', await tile('Fader', 1).locator('[class*="fade"]').first().getAttribute('class'))
console.log('── METAL fader ::before:', JSON.stringify(await css(tile('Fader', 1), '[class*="fadeMetal"]', '::before', P)))
console.log('── METAL fader b:', JSON.stringify(await css(tile('Fader', 1), '[class*="fadeMetal"] b', null, P)))
console.log('── METAL slider ::before:', JSON.stringify(await css(tile('Slider', 1), '[class*="fadeMetal"]', '::before', P)))
console.log('── METAL slider DOM:', await tile('Slider', 1).locator('[class*="fadeMetal"]').first().evaluate((el) => el.outerHTML.slice(0, 400)))

console.log('── ETHER toggle rocker HTML:', await tile('Toggle', 3).locator('[class*="rocker"]').first().evaluate((el) => el.outerHTML.slice(0, 500)))
console.log('── ETHER rocker b0:', JSON.stringify(await css(tile('Toggle', 3), '[class*="rocker"] b', null, P)))

console.log('── ETHER xf HTML:', await tile('Crossfader', 3).locator('[class*="xf"]').first().evaluate((el) => el.outerHTML.slice(0, 500)))

console.log('── STD GE thumb:', JSON.stringify(await css(tile('GenericEditor', 2), 'input[type="range"], [class*="geForm"] b, [class*="geForm"] i', null, P)).slice(0, 400))
console.log('── STD GE HTML:', await tile('GenericEditor', 2).locator('[class*="ge"]').first().evaluate((el) => el.outerHTML.slice(0, 700)))

console.log('── EMBER vu svg:', await tile('Meter', 4).locator('svg').first().evaluate((el) => el.outerHTML.slice(0, 700)))

await browser.close()
