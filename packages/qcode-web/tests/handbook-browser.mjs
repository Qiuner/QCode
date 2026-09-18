import assert from 'node:assert/strict'

export async function testHandbook(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  let run
  const commands = []
  try {
    await page.route('**/world/**', route => route.fulfill({ contentType: 'text/html', body: `<script>setInterval(()=>{for(const type of ['world:ready','world:playable'])parent.postMessage({source:'qcode-world',version:1,type},'*')},300)</script>` }))
    await page.route('**/qcode/tutorial', async route => {
      const body = route.request().postDataJSON()
      if (body) {
        commands.push(body.action)
        if (body.action === 'start') run = { id: 'handbook-test', version: 1, revision: 0, updatedAt: Date.now(), projectName: '练习作品', draft: '', step: 'idea', paused: false, encounterSeen: false, left: false, returned: false, assistance: [] }
        if (body.action === 'pause') run.paused = true
        if (body.action === 'resume') run.paused = false
      }
      await route.fulfill({ json: body ? run : run ? [run] : [] })
    })
    await page.goto(url)
    const open = () => page.getByRole('button', { name: '创作手册', exact: true }).click()
    const panel = page.getByRole('complementary', { name: '创作手册', exact: true })
    await page.locator('.town-project-trigger').waitFor()
    const initialProject = await page.locator('.town-project-trigger').textContent()
    await open()
    await panel.getByRole('heading', { name: '跟着学' }).waitFor()
    assert.equal(await panel.locator('[aria-label="居民创作记录"]').count(), 0)
    assert.deepEqual(commands, [])
    await panel.getByRole('button', { name: '开始创作', exact: true }).click()
    await page.locator('.town-work-entry').waitFor()
    assert.equal(await page.locator('.town-conversation, .town-native-chat-seat').count(), 0)
    assert.deepEqual(commands, [])
    assert.equal(await page.locator('.town-project-trigger').textContent(), initialProject)
    await open()
    await page.screenshot({ path: '.qcode-home/handbook-desktop.png' })
    await page.setViewportSize({ width: 390, height: 844 })
    const box = await panel.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 391)
    await page.screenshot({ path: '.qcode-home/handbook-mobile.png' })
    await panel.getByRole('button', { name: '开始学习', exact: true }).click()
    await page.getByLabel('我的第一个作品', { exact: true }).waitFor()
    assert.ok(commands.includes('start'))
    await page.getByRole('button', { name: '回到小岛', exact: true }).click()
    await open()
    await panel.getByRole('button', { name: '开始创作', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('.town-handbook'))
    assert.ok(commands.includes('pause'))
    assert.equal(await page.locator('.town-tutorial').count(), 0)
    await page.locator('.town-work-entry').waitFor()
    assert.equal(await page.locator('.town-conversation, .town-native-chat-seat').count(), 0)
    assert.equal(await page.locator('.town-project-trigger').textContent(), initialProject)
    await open()
    await panel.getByRole('button', { name: '继续学习 · 练习作品' }).click()
    await page.getByLabel('我的第一个作品', { exact: true }).waitFor()
    assert.ok(commands.includes('resume'))
    console.log('Handbook: free creation returns to island with project retained and no chat; start/pause/resume and desktop/mobile passed (mock tutorial and world)')
  } finally { await page.close() }
}
