import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export async function testComputerWorld(browser, url, output, pixelStats) {
  await mkdir(output, { recursive: true })
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (/SCRIPT ERROR|Parse Error|Failed loading resource/.test(message.text())) errors.push(message.text())
    })
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.querySelector('#gate')?.hidden, undefined, { timeout: 120_000 })
      const canvas = page.locator('#canvas')
      await canvas.click({ position: { x: 20, y: 20 } })
      await page.waitForTimeout(1500)
      const shot = await page.screenshot({ path: path.join(output, `computer-web-${viewport.width}.png`) })
      const stats = await pixelStats(shot)
      assert.ok(stats.channels.slice(0, 3).some(channel => channel.stdev > 20), 'real world canvas contains varied pixels')
      assert.ok(stats.channels.slice(0, 3).some(channel => channel.mean > 30), 'real world canvas is not black')
      const box = await canvas.boundingBox()
      assert.ok(box.width > 0 && box.width <= viewport.width + 1)
      assert.ok(box.height > 0 && box.height <= viewport.height + 1)
      await page.keyboard.press('3')
      await page.keyboard.down('w')
      await page.waitForTimeout(300)
      await page.keyboard.up('w')
      await page.waitForTimeout(250)
      const moved = await page.screenshot({ path: path.join(output, `computer-web-${viewport.width}-first-person.png`) })
      assert.ok(!shot.equals(moved), 'view change and movement change rendered pixels')
      assert.deepEqual(errors, [])
      console.log(`Computer Web: ${viewport.width}x${viewport.height} real export, canvas pixels, view switch, input and script errors passed`)
    } finally {
      await context.close()
    }
  }
}
