'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LeadInfoPanelProps {
  lead: {
    id: string
    name: string | null
    phone: string
    state: string
    primaryInterest: string | null
    notes: string | null
    isHot: boolean
    hasUrgency: boolean
    mentionedCompetitor: boolean
    leadScore: number
    assignedVendedor?: { name: string } | null
  }
  handoffSummary?: {
    contactReason: string | null
    modelInterest: string | null
    urgencySignals: string | null
    negotiationStatus: string | null
    nextStepSuggested: string | null
    handoffReason: string
  } | null
  tenantSlug: string
}

export function LeadInfoPanel({ lead, handoffSummary }: LeadInfoPanelProps) {
  return (
    <div className="w-72 space-y-3 overflow-y-auto">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Nome</p>
            <p className="font-medium">{lead.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Telefone</p>
            <p className="font-mono text-xs">{lead.phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Interesse</p>
            <p>{lead.primaryInterest ?? '—'}</p>
          </div>
          <div className="flex gap-1 flex-wrap pt-1">
            <Badge variant="secondary" className="text-xs">{lead.state}</Badge>
            {lead.isHot && <Badge className="text-xs bg-primary/20 text-primary">🔥 Quente</Badge>}
            {lead.hasUrgency && <Badge className="text-xs bg-amber-500/20 text-amber-400">⚡ Urgente</Badge>}
            {lead.mentionedCompetitor && <Badge className="text-xs bg-red-500/20 text-red-400">🏴 Concorrente</Badge>}
          </div>
          {lead.leadScore > 0 && (
            <div>
              <p className="text-muted-foreground text-xs">Score</p>
              <p className="font-bold text-primary">{lead.leadScore}</p>
            </div>
          )}
          {lead.assignedVendedor && (
            <div>
              <p className="text-muted-foreground text-xs">Vendedor</p>
              <p>{lead.assignedVendedor.name}</p>
            </div>
          )}
          {lead.notes && (
            <div>
              <p className="text-muted-foreground text-xs">Notas</p>
              <p className="text-xs">{lead.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {handoffSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo da IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {handoffSummary.contactReason && (
              <div>
                <p className="text-muted-foreground">Motivo</p>
                <p>{handoffSummary.contactReason}</p>
              </div>
            )}
            {handoffSummary.modelInterest && (
              <div>
                <p className="text-muted-foreground">Modelo de interesse</p>
                <p className="font-medium">{handoffSummary.modelInterest}</p>
              </div>
            )}
            {handoffSummary.urgencySignals && (
              <div>
                <p className="text-muted-foreground">Sinais de urgência</p>
                <p>{handoffSummary.urgencySignals}</p>
              </div>
            )}
            {handoffSummary.negotiationStatus && (
              <div>
                <p className="text-muted-foreground">Negociação</p>
                <p>{handoffSummary.negotiationStatus}</p>
              </div>
            )}
            {handoffSummary.nextStepSuggested && (
              <div>
                <p className="text-muted-foreground">Próximo passo</p>
                <p className="text-primary font-medium">{handoffSummary.nextStepSuggested}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Razão do handoff</p>
              <p>{handoffSummary.handoffReason}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
