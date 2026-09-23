const communityDialog = document.querySelector('#community-dialog')
const communityLink = document.querySelector('[data-community-open]')
let copyStatus = null

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
  const dictionary = window.qcodeSiteTranslations?.[document.documentElement.lang === 'en' ? 'en' : 'zh']
  try {
    await navigator.clipboard.writeText('543293474')
    copyStatus = 'community.copied'
    status.textContent = dictionary?.[copyStatus] ?? 'Group number copied.'
  } catch {
    copyStatus = 'community.copyFailed'
    status.textContent = dictionary?.[copyStatus] ?? 'Could not copy the group number.'
  }
})

window.addEventListener('qcode-language-change', event => {
  const status = communityDialog.querySelector('[role="status"]')
  if (copyStatus) status.textContent = event.detail.dictionary[copyStatus]
})
