import assert from 'node:assert/strict'

// The caller supplies Playwright and an authenticated local Harness URL.
export async function testPanelDuringWorldLoad(browser, url, sameSite = false) {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await page.addInitScript(({ sameSite }) => {
      if (window !== window.top) return
      window.worldStarting = false
      window.addEventListener('message', event => {
        if (event.data === 'test:world-starting') window.worldStarting = true
      })
      if (sameSite) {
        const original = Element.prototype.setAttribute
        Element.prototype.setAttribute = function (key, value) {
          if (this.tagName === 'IFRAME' && key === 'src') value = '/world/?embed=1'
          return original.call(this, key, value)
        }
      }
    }, { sameSite })
    await page.route('**/world/**', route => route.fulfill({
      contentType: 'text/html',
      body: `<script>
        parent.postMessage('test:world-starting', '*');
        setTimeout(() => {
          const until = performance.now() + 2500;
          while (performance.now() < until) {}
        }, 150);
      </script>`,
    }))
    await page.goto(url)
    await page.waitForFunction(() => window.worldStarting)
    await new Promise(resolve => setTimeout(resolve, 300))
    const started = Date.now()
    await page.getByRole('button', { name: '关闭居民面板' }).click({ timeout: 1000 })
    assert.equal(await page.locator('.town-panel').count(), 0)
    assert.ok(Date.now() - started < 1000, 'Closing must not wait for world initialization')
    await page.getByRole('button', { name: '向导 · 项目接待' }).click()
    assert.equal(await page.locator('.town-panel').count(), 1)
    return { closeMs: Date.now() - started }
  } finally {
    await context.close()
  }
}
