import assert from 'node:assert/strict'

export async function testWorldHud(browser, url, screenshotDirectory) {
  const page = await browser.newPage()
  try {
    await page.route('**/world/**', route => route.fulfill({ contentType: 'text/html', body: `<body style="background:#6c9c90"><script>setInterval(()=>{for(const type of ['world:ready','world:playable'])parent.postMessage({source:'qcode-world',version:1,type},'*')},300)</script>` }))
    await page.goto(url)
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 })
      const project = page.locator('.town-project-trigger')
      await project.waitFor({ state: 'visible' })
      const journal = page.getByRole('button', { name: '创作手册', exact: true })
      const a = await project.boundingBox(), b = await journal.boundingBox()
      assert.ok(a.x + a.width <= b.x && b.x + b.width <= width)
      assert.equal(await project.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), true)
      await project.click()
      await page.getByRole('region', { name: '切换项目' }).waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      assert.equal(await project.getAttribute('aria-expanded'), 'false')
      if (screenshotDirectory) await page.screenshot({ path: `${screenshotDirectory}/hud-${width}.png` })
    }
    await page.getByRole('button', { name: '创作手册', exact: true }).click()
    await page.getByRole('complementary', { name: '创作手册', exact: true }).waitFor({ state: 'visible' })
    console.log('HUD: desktop/mobile bounds, logo, project menu, Escape and records passed (stub world)')
  } finally { await page.close() }
}
