import type {
  SidebarBrandMarkOwnerProps,
} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'

export function AgentIslesBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <AgentIslesMark size={size} />
}

export function AgentIslesHeroMark({ size, className }: HeroBrandMarkOwnerProps) {
  return <AgentIslesMark size={size} className={className} hero />
}

function AgentIslesMark({ size, className, hero = false }: {
  size: number
  className?: string | undefined
  hero?: boolean
}) {
  return <img
    aria-hidden="true"
    className={`${className ?? ''}${hero ? ' agent-isles-hero-mark' : ''}`.trim() || undefined}
    src="/agent-isles/brand/android-chrome-192x192.png"
    style={{ display: 'block', flex: 'none', height: size, objectFit: 'contain', width: size }}
  />
}

export function AgentIslesBrandName() {
  return (
    <span style={{
      color: 'var(--dsw-alias-label-primary)',
      fontSize: 16,
      fontWeight: 650,
      letterSpacing: 0,
      lineHeight: '24px',
      whiteSpace: 'nowrap',
    }}>
      agent-isles
    </span>
  )
}
