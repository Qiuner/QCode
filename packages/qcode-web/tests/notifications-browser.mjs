import assert from 'node:assert/strict'
import { rolldown } from 'rolldown'

export async function testNotifications(browser, screenshotPath) {
  const bundle = await rolldown({ input: 'packages/qcode-web/tests/fixtures/notifications.jsx', platform: 'browser', transform: { jsx: { runtime: 'automatic' }, define: { 'process.env.NODE_ENV': JSON.stringify('production') } } })
  const { output } = await bundle.generate({ format: 'iife' })
  await bundle.close()
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  try {
    await page.route('http://notifications.test/', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://notifications.test/')
    await page.addScriptTag({ content: output[0].code })
    await page.waitForFunction(() => window.notificationCount === 0)
    await page.evaluate(() => window.setNotificationScenario({ running: true }))
    await page.waitForTimeout(100)
    await page.evaluate(() => window.setNotificationScenario({ seq: 2 }))
    await page.waitForFunction(() => window.notificationCount === 1)
    await page.locator('.town-notification-toast button').first().click()
    assert.equal(await page.evaluate(() => window.openedNotification.id), 'session-a')
    assert.equal(await page.evaluate(() => window.openedNotification.projectId), 'project-a')
    await page.getByRole('button', { name: '居民通知，1 条未读或待处理', exact: true }).click()
    await page.getByRole('button', { name: '标记已读：芽芽做完这一轮了，去看看结果', exact: true }).click()
    await page.waitForFunction(() => window.notificationCount === 0)
    await page.evaluate(() => window.setNotificationScenario({ seq: 3, activeSession: 'session-a' }))
    await page.waitForTimeout(100)
    assert.equal(await page.locator('.town-notification-toast').count(), 0)
    await page.evaluate(() => window.setNotificationScenario({ seq: 4, pending: 'approval:call-a' }))
    await page.waitForFunction(() => window.notificationCount === 1)
    assert.equal(await page.getByRole('button', { name: /标记已读/ }).count(), 0)
    const box = await page.locator('.town-notification-list').boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 390)
    await page.evaluate(() => window.setNotificationScenario({ seq: 4, running: true }))
    await page.waitForFunction(() => window.notificationCount === 0)
    await page.evaluate(() => window.setNotificationScenario({ seq: 5, failed: true }))
    await page.waitForFunction(() => window.notificationCount === 1)
    await page.reload()
    await page.addScriptTag({ content: output[0].code })
    await page.waitForFunction(() => window.notificationCount === 1)
    assert.equal(await page.locator('.town-notification-toast').count(), 0)
    if (screenshotPath) {
      await page.getByRole('button', { name: '居民通知，1 条未读或待处理', exact: true }).click()
      await page.screenshot({ path: screenshotPath })
    }
    console.log('Notifications: completion, active conversation, original target, acknowledgement, approval resolution, failure, reload and mobile bounds passed')
  } finally { await context.close() }
}
