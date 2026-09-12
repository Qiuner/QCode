export function notificationDecision(previous: number | undefined, seq: number, initialized: boolean, viewing: boolean) {
  if (previous !== undefined && previous >= seq) return { advance: false, unread: false, announce: false }
  const unread = (previous !== undefined || initialized) && !viewing
  return { advance: true, unread, announce: unread && initialized }
}
