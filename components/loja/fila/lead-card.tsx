'use client'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Flame } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LeadCardProps {
  lead: {
    id: string
    name: string | null
    phone: string
    state: string
    isHot: boolean
    hasUrgency: boolean
    leadScore: number
    mentionedCompetitor: boolean
    primaryInterest: string | null
    conversations: Array<{
      id: string
      state: string
      humanSlaStartedAt: string | null
    }>
  }
  tenantSlug: string
}

export function LeadCard({ lead, tenantSlug }: LeadCardProps) {
  const conv = lead.conversations?.[0]
  const isAwaitingHuman = conv?.state === 'AGUARDANDO_VENDEDOR'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const minutesWaiting = conv?.humanSlaStartedAt
    ? Math.floor((now - new Date(conv.humanSlaStartedAt).getTime()) / 60000)
    : null

  return (
    <div
      className={cn(
        'bg-secondary rounded-lg border p-4 flex items-center justify-between',
        isAwaitingHuman ? 'border-primary/50' : 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        {lead.isHot && <Flame size={16} className="text-primary shrink-0" />}
        <div>
          <p className="font-medium">{lead.name ?? lead.phone}</p>
          <p className="text-muted-foreground text-sm">{lead.primaryInterest ?? 'Interesse não definido'}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {lead.isHot && (
              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                🔥 Lead Quente
              </span>
            )}
            {lead.hasUrgency && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                ⚡ Urgente
              </span>
            )}
            {lead.mentionedCompetitor && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                🎯 Concorrente
              </span>
            )}
            {lead.leadScore > 50 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                Score {lead.leadScore}
              </span>
            )}
          </div>
          {minutesWaiting !== null && (
            <p className={cn('text-xs mt-1', minutesWaiting > 30 ? 'text-red-400' : 'text-amber-400')}>
              Aguardando há {minutesWaiting}min
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{lead.state}</Badge>
        {conv?.id && (
          <Link
            href={`/${tenantSlug}/inbox/${conv.id}`}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
          >
            {isAwaitingHuman ? 'Assumir' : 'Ver'}
          </Link>
        )}
      </div>
    </div>
  )
}
