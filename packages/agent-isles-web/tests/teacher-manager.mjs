import assert from 'node:assert/strict'

export async function testTeacherManager(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await page.route('**/world/**', route => route.fulfill({ contentType: 'text/html', body: `<body><script>
      window.addEventListener('message', event => { if(event.data === 'test:teacher') parent.postMessage({source:'agent-isles-world',version:1,type:'resident:selected',payload:{residentId:'teacher'}},'*') });
      setInterval(()=>{for(const type of ['world:ready','world:playable'])parent.postMessage({source:'agent-isles-world',version:1,type},'*')},300)
    </script>` }))
    await page.goto(url)
    await page.getByRole('button', { name: '创作手册', exact: true }).waitFor()
    await page.locator('.town-shell > iframe').evaluate(frame => frame.contentWindow.postMessage('test:teacher', '*'))
    const panel = page.getByRole('complementary', { name: '苔伯 · 项目与对话管理', exact: true })
    await panel.waitFor()
    assert.equal(await panel.locator('textarea').count(), 0)
    assert.equal(await page.locator('.town-native-chat-seat').count(), 0)
    await panel.getByRole('button', { name: '查看项目与历史对话', exact: true }).click()
    const manager = page.getByRole('complementary', { name: '项目与历史对话', exact: true })
    await manager.waitFor()
    assert.notEqual(new URL(page.url()).pathname, '/workbench')
    const sidebar = page.locator('[data-slot="sidebar"] > div')
    await sidebar.waitFor({ state: 'visible' })
    await page.getByRole('button', { name: '搜索会话', exact: true }).click()
    await page.getByPlaceholder('搜索会话…').fill('不存在的测试会话')
    await page.getByPlaceholder('搜索会话…').fill('')
    const desktop = await sidebar.boundingBox()
    assert.ok(desktop.x > 900 && desktop.x + desktop.width <= 1280)
    await page.screenshot({ path: '.agent-isles-home/teacher-sidebar-desktop.png' })
    const view = manager.getByRole('button', { name: '查看当前对话', exact: true })
    if (await view.isEnabled()) {
      await view.click()
      await page.locator('.town-native-chat-seat').waitFor()
      await page.getByRole('button', { name: '返回项目与历史对话' }).click()
    }
    await page.setViewportSize({ width: 390, height: 844 })
    const box = await manager.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 390)
    await page.screenshot({ path: '.agent-isles-home/teacher-sidebar-mobile.png' })
    await manager.getByRole('button', { name: '关闭项目与历史对话' }).click()
    await manager.waitFor({ state: 'detached' })
    assert.equal(await page.locator('.town-shell > iframe').count(), 1)
    console.log('Teacher native sidebar: island route, native search, chat when available, close and desktop/mobile bounds passed (stub world)')
  } finally { await page.close() }
}
