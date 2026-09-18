import React from 'react'
import { createRoot } from 'react-dom/client'
import { ResidentNotifications } from '../../src/client/ResidentNotifications.tsx'
import { WORLD_STYLES } from '../../src/client/styles.ts'
import { zh } from '../../src/client/locales.ts'

const t = (key, params = {}) => Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), zh[key])

const style = document.createElement('style')
style.textContent = WORLD_STYLES
document.head.append(style)
document.body.innerHTML = '<div class="town-shell" id="fixture"></div>'
const root = createRoot(document.getElementById('fixture'))
let end = { seq: 1, failed: false, worked: true }
const read = async () => ({ ended: end })
const open = item => { window.openedNotification = item }
const onCount = count => { window.notificationCount = count }
window.setNotificationScenario = ({ seq = 1, running = false, pending, activeSession, failed = false }) => {
  end = { seq, failed, worked: true }
  root.render(<ResidentNotifications sessions={[{ id: 'session-a', projectId: 'project-a', projectName: '练习项目', resident: 'coder', updatedAt: seq, running, pending }]} activeSession={activeSession} read={read} open={open} onCount={onCount} t={t} />)
}
window.setNotificationScenario({})
