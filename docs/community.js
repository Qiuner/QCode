const communityDialog = document.querySelector('#community-dialog')
const communityLink = document.querySelector('[data-community-open]')

communityLink.addEventListener('click', event => {
  event.preventDefault()
  communityDialog.showModal()
})
communityDialog.querySelector('[data-community-close]').addEventListener('click', () => communityDialog.close())
communityDialog.addEventListener('click', event => {
  const box = communityDialog.getBoundingClientRect()
  if (event.target === communityDialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) communityDialog.close()
})
communityDialog.querySelector('[data-community-copy]').addEventListener('click', async () => {
  const status = communityDialog.querySelector('[role="status"]')
  try {
    await navigator.clipboard.writeText('543293474')
    status.textContent = '群号已复制，打开 QQ 搜索加入。'
  } catch {
    status.textContent = '未能复制，请手动选择群号：543293474。'
  }
})
