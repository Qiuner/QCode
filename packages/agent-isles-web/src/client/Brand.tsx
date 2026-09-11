import type {
  SidebarBrandMarkOwnerProps,
} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'

const colors = ['#1f6f5c', '#e0a12f', '#d45b48', '#3977b8']

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
  return (
    <span
      aria-hidden="true"
      className={`${className ?? ''}${hero ? ' agent-isles-hero-mark' : ''}`.trim() || undefined}
      style={{
        boxSizing: 'border-box',
        display: 'grid',
        flex: 'none',
        gap: 2,
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        height: size,
        padding: 2,
        width: size,
      }}
    >
      {colors.map(color => <span key={color} style={{ background: color, borderRadius: 2 }} />)}
    </span>
  )
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
