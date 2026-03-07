'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface MessageInputProps {
  conversationId: string
  tenantSlug: string
  onSent: (msg: unknown) => void
}

export function MessageInput({ conversationId, tenantSlug, onSent }: MessageInputProps) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/${tenantSlug}/conversations/${conversationId}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contentType: 'TEXT', contentText: text }),
      })
      if (res.ok) {
        const { data } = await res.json()
        onSent(data)
        setText('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border-t border-border flex gap-2 items-end">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Digite sua mensagem... (Enter para enviar)"
        className="flex-1 bg-secondary border-border resize-none"
        rows={2}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
      />
      <Button
        onClick={handleSend}
        disabled={loading || !text.trim()}
        className="bg-primary hover:bg-primary/90 self-end"
        size="sm"
      >
        <Send size={16} />
      </Button>
    </div>
  )
}
