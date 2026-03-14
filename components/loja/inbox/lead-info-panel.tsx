'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

const LOSS_REASONS = [
  'Preço alto',
  'Comprou no concorrente',
  'Não quer mais',
  'Sem resposta',
  'Fora do perfil',
  'Outro',
]

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
    lossReason: string | null
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

export function LeadInfoPanel({ lead, handoffSummary, tenantSlug }: LeadInfoPanelProps) {
  const [showLostForm, setShowLostForm] = useState(false)
  const [lossReason, setLossReason]     = useState(lead.lossReason ?? '')
  const [saving, setSaving]             = useState(false)
  const [currentState, setCurrentState] = useState(lead.state)

  const markAsLost = async () => {
    if (!lossReason) return
    setSaving(true)
    try {
      await fetch(`/api/${tenantSlug}/leads/${lead.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ state: 'PERDIDO', lossReason }),
      })
      setCurrentState('PERDIDO')
      setShowLostForm(false)
    } finally {
      setSaving(false)
    }
  }

  const markAsSold = async () => {
    setSaving(true)
    try {
      await fetch(`/api/${tenantSlug}/leads/${lead.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ state: 'VENDIDO' }),
      })
      setCurrentState('VENDIDO')
    } finally {
      setSaving(false)
    }
  }

  const isDone = currentState === 'PERDIDO' || currentState === 'VENDIDO'

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
            <Badge variant="secondary" className="text-xs">{currentState}</Badge>
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

          {/* Ações de desfecho */}
          {!isDone && (
            <div className="pt-2 space-y-2 border-t border-border">
              <button
                onClick={markAsSold}
                disabled={saving}
                className="w-full text-xs py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                ✅ Marcar como Vendido
              </button>
              {!showLostForm ? (
                <button
                  onClick={() => setShowLostForm(true)}
                  className="w-full text-xs py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  ❌ Marcar como Perdido
                </button>
              ) : (
                <div className="space-y-1.5">
                  <select
                    value={lossReason}
                    onChange={e => setLossReason(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 rounded-md bg-background border border-border text-foreground"
                  >
                    <option value="">Motivo da perda…</option>
                    {LOSS_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={markAsLost}
                      disabled={saving || !lossReason}
                      className="flex-1 text-xs py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
                    >
                      {saving ? '…' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => setShowLostForm(false)}
                      className="flex-1 text-xs py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentState === 'PERDIDO' && lossReason && (
            <div className="pt-1">
              <p className="text-muted-foreground text-xs">Motivo da perda</p>
              <p className="text-xs text-red-400">{lossReason}</p>
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
