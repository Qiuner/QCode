import assert from 'node:assert/strict'
import { WORLD_STYLES } from '../lib/types/client/styles.js'

// Exercise the shell/chat stacking boundary with the production stylesheet.
export async function testWorkOptions(browser) {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    try {
      await page.setContent(`<style>${WORLD_STYLES}
        [data-shell-overlay] { position: fixed; inset: 0; z-index: 20; }
        [data-agent-isles-town] [data-slot="conversation"] { position: fixed; inset: 250px 0 150px; z-index: 21; visibility: visible; pointer-events: auto; background: white; }
      </style><div data-agent-isles-town>
        <div data-slot="conversation"><button id="message">Existing conversation</button></div>
        <div data-shell-overlay><div class="town-shell"><aside class="town-panel town-conversation town-studio" style="width:100%">
          <div class="town-studio-toolbar"><button popovertarget="town-work-options">作品选项</button>
            <nav id="town-work-options" class="town-chat-menu" popover="auto" style="top:40px;right:8px"><button>展开工作区</button></nav>
          </div><div class="town-native-chat-seat"></div>
        </aside></div></div>
      </div>`)
      const message = page.locator('#message')
      const before = await message.boundingBox()
      await page.getByRole('button', { name: '作品选项', exact: true }).click()
      assert.equal(await page.locator('.town-chat-menu:popover-open').count(), 1)
      assert.deepEqual(await message.boundingBox(), before)
      assert.equal(await message.evaluate(el => {
        const box = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(box.x + 5, box.y + 5))
      }), true, 'The shell must not cover existing chat when the menu opens')
      await page.getByRole('button', { name: '展开工作区', exact: true }).click({ trial: true })
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('.town-chat-menu:popover-open').count(), 0)
      await page.getByRole('button', { name: '作品选项', exact: true }).click()
      await message.click()
      assert.equal(await page.locator('.town-chat-menu:popover-open').count(), 0)
      console.log(`work options stacking and dismissal passed: ${width}px`)
    } finally { await page.close() }
  }
}
