'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConfigPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [form, setForm] = useState({
    toneOfVoice: '',
    businessHoursStart: '',
    businessHoursEnd: '',
    evolutionInstanceName: '',
    currentCampaigns: '',
    additionalPolicies: '',
  })

  useEffect(() => {
    if (!tenantSlug) return
    fetch(`/api/${tenantSlug}/config`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setForm({
            toneOfVoice:           d.data.toneOfVoice           ?? '',
            businessHoursStart:    d.data.businessHoursStart    ?? '',
            businessHoursEnd:      d.data.businessHoursEnd      ?? '',
            evolutionInstanceName: d.data.evolutionInstanceName ?? '',
            currentCampaigns:      d.data.briefing?.currentCampaigns   ?? '',
            additionalPolicies:    d.data.briefing?.additionalPolicies  ?? '',
          })
        }
      })
      .catch(() => {})
  }, [tenantSlug])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch(`/api/${tenantSlug}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      <form onSubmit={handleSave} className="space-y-6">

        <Card>
          <CardHeader><CardTitle>Atendimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="toneOfVoice">Tom de Voz da IA</Label>
              <Textarea
                id="toneOfVoice"
                value={form.toneOfVoice}
                onChange={set('toneOfVoice')}
                rows={3}
                placeholder="Ex: Seja sempre cordial, use linguagem informal, tutear o cliente..."
                className="text-sm resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessHoursStart">Horário de Abertura</Label>
                <Input
                  id="businessHoursStart"
                  value={form.businessHoursStart}
                  onChange={set('businessHoursStart')}
                  placeholder="08:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessHoursEnd">Horário de Fechamento</Label>
                <Input
                  id="businessHoursEnd"
                  value={form.businessHoursEnd}
                  onChange={set('businessHoursEnd')}
                  placeholder="18:00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evolutionInstanceName">Instância WhatsApp (Evolution API)</Label>
              <Input
                id="evolutionInstanceName"
                value={form.evolutionInstanceName}
                onChange={set('evolutionInstanceName')}
                placeholder="moto-teste"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Campanhas e Políticas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentCampaigns">Campanhas Ativas</Label>
              <Textarea
                id="currentCampaigns"
                value={form.currentCampaigns}
                onChange={set('currentCampaigns')}
                rows={3}
                placeholder="Descreva as promoções e campanhas atuais..."
                className="text-sm resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalPolicies">Políticas Adicionais</Label>
              <Textarea
                id="additionalPolicies"
                value={form.additionalPolicies}
                onChange={set('additionalPolicies')}
                rows={3}
                placeholder="Regras específicas da loja para o atendimento..."
                className="text-sm resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          {saveStatus === 'success' && (
            <p className="text-sm text-green-600 font-medium">✓ Configurações salvas com sucesso!</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-sm text-destructive">Erro ao salvar. Tente novamente.</p>
          )}
        </div>
      </form>
    </div>
  )
}
