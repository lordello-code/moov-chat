'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MessageInput } from './message-input'
import { LeadInfoPanel } from './lead-info-panel'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  direction: string
  contentText: string | null
  actorType: string
  isInternal: boolean
  createdAt: string
}

interface ConversationViewProps {
  conversation: {
    id: string
    state: string
    humanAttendantId: string | null
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
    messages: Message[]
    handoffSummaries?: Array<{
      contactReason: string | null
      modelInterest: string | null
      urgencySignals: string | null
      negotiationStatus: string | null
      nextStepSuggested: string | null
      handoffReason: string
    }>
    humanAttendant?: { id: string; name: string } | null
  }
  tenantSlug: string
  currentUserId: string
  currentUserRole: string
}

export function ConversationView({
  conversation,
  tenantSlug,
  currentUserId,
  currentUserRole,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>(conversation.messages)
  const [convState, setConvState] = useState(conversation.state)
  const [humanAttendantId, setHumanAttendantId] = useState(conversation.humanAttendantId)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Polling a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/${tenantSlug}/conversations/${conversation.id}/messages`)
      if (res.ok) {
        const { data } = await res.json()
        setMessages(data)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [conversation.id, tenantSlug])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleTakeover() {
    const res = await fetch(`/api/${tenantSlug}/conversations/${conversation.id}/takeover`, {
      method: 'POST',
    })
    if (res.ok) {
      setConvState('EM_ATENDIMENTO_HUMANO')
      setHumanAttendantId(currentUserId)
    }
  }

  async function handleRelease() {
    const res = await fetch(`/api/${tenantSlug}/conversations/${conversation.id}/release`, {
      method: 'POST',
    })
    if (res.ok) {
      setConvState('ATIVA_IA')
      setHumanAttendantId(null)
    }
  }

  const isMyConversation =
    humanAttendantId === currentUserId || currentUserRole === 'GERENTE'
  const canSend = convState === 'EM_ATENDIMENTO_HUMANO' && isMyConversation

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Painel da conversa */}
      <div className="flex-1 flex flex-col bg-card rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="font-medium">{conversation.lead.name ?? conversation.lead.phone}</p>
            <p className="text-muted-foreground text-sm">
              {conversation.lead.primaryInterest ?? 'Interesse não informado'}
            </p>
          </div>
          <div className="flex gap-2">
            {convState === 'AGUARDANDO_VENDEDOR' && (
              <Button
                onClick={handleTakeover}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Assumir Atendimento
              </Button>
            )}
            {convState === 'EM_ATENDIMENTO_HUMANO' && isMyConversation && (
              <Button onClick={handleRelease} variant="outline" size="sm">
                Devolver para IA
              </Button>
            )}
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-3 py-2 text-sm',
                  msg.isInternal
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : msg.direction === 'OUTBOUND'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                )}
              >
                {msg.isInternal && (
                  <span className="text-xs text-amber-400 block mb-1">📌 Nota interna</span>
                )}
                <p>{msg.contentText}</p>
                <p
                  className={cn(
                    'text-xs mt-1',
                    msg.direction === 'OUTBOUND' && !msg.isInternal
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {msg.actorType}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input ou status */}
        {canSend ? (
          <MessageInput
            conversationId={conversation.id}
            tenantSlug={tenantSlug}
            onSent={msg => setMessages(prev => [...prev, msg as Message])}
          />
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm border-t border-border">
            {convState === 'ATIVA_IA'
              ? '🤖 IA está atendendo'
              : convState === 'AGUARDANDO_VENDEDOR'
              ? '⏳ Clique em "Assumir Atendimento" para responder'
              : '🔒 Outro vendedor está atendendo'}
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <LeadInfoPanel
        lead={conversation.lead}
        handoffSummary={conversation.handoffSummaries?.[0]}
        tenantSlug={tenantSlug}
      />
    </div>
  )
}
