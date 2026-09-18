import { resourcePath } from './resource-path.js'
import type {
  SidebarBrandMarkOwnerProps,
} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'

export function QCodeBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <QCodeMark size={size} />
}

export function QCodeHeroMark({ size, className }: HeroBrandMarkOwnerProps) {
  return <QCodeMark size={size} className={className} hero />
}

function QCodeMark({ size, className, hero = false }: {
  size: number
  className?: string | undefined
  hero?: boolean
}) {
  return <img
    aria-hidden="true"
    className={`${className ?? ''}${hero ? ' qcode-hero-mark' : ''}`.trim() || undefined}
    src={resourcePath("/qcode/brand/android-chrome-192x192.png")}
    style={{ display: 'block', flex: 'none', height: size, objectFit: 'contain', width: size }}
  />
}

export function QCodeBrandName() {
  return (
    <span style={{
      color: 'var(--dsw-alias-label-primary)',
      fontSize: 16,
      fontWeight: 650,
      letterSpacing: 0,
      lineHeight: '24px',
      whiteSpace: 'nowrap',
    }}>
      QCode
    </span>
  )
}
