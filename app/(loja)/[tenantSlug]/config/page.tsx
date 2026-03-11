'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Opções disponíveis ───────────────────────────────────────────
const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartão', 'Financiamento', 'Consórcio']
const FOCO_OPTIONS     = [
  { value: 'zerokm',  label: 'Motos 0km'            },
  { value: 'usadas',  label: 'Motos Usadas'          },
  { value: 'ambos',   label: 'Ambos (0km e Usadas)'  },
]
const TOM_OPTIONS = [
  { value: 'Formal',       label: '👔 Formal'       },
  { value: 'Amigável',     label: '😊 Amigável'     },
  { value: 'Descontraído', label: '😄 Descontraído' },
]

type Meta = {
  cidade?: string; marcas?: string; foco?: string; diferencial?: string
  formasPagamento?: string[]; aceitaTroca?: boolean
  condicaoTroca?: string; prazoEntrega?: string
  validadeCampanha?: string; nomeAtendente?: string
}

type Form = {
  toneOfVoice: string
  businessHoursStart: string
  businessHoursEnd: string
  evolutionInstanceName: string
  currentCampaigns: string
  cidade: string; marcas: string; foco: string; diferencial: string
  formasPagamento: string[]; aceitaTroca: boolean
  condicaoTroca: string; prazoEntrega: string
  validadeCampanha: string; nomeAtendente: string
}

const DEFAULT: Form = {
  toneOfVoice: '', businessHoursStart: '', businessHoursEnd: '',
  evolutionInstanceName: '', currentCampaigns: '',
  cidade: '', marcas: '', foco: 'ambos', diferencial: '',
  formasPagamento: [], aceitaTroca: false, condicaoTroca: '',
  prazoEntrega: '', validadeCampanha: '', nomeAtendente: '',
}

export default function ConfigPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [form, setForm]             = useState<Form>(DEFAULT)
  const [saving, setSaving]         = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!tenantSlug) return
    fetch(`/api/${tenantSlug}/config`)
      .then(r => r.json())
      .then(d => {
        if (!d.data) return
        const meta: Meta = (d.data.briefing?.meta ?? {}) as Meta
        setForm({
          toneOfVoice:           d.data.toneOfVoice           ?? '',
          businessHoursStart:    d.data.businessHoursStart    ?? '',
          businessHoursEnd:      d.data.businessHoursEnd      ?? '',
          evolutionInstanceName: d.data.evolutionInstanceName ?? '',
          currentCampaigns:      d.data.briefing?.currentCampaigns ?? '',
          cidade:           meta.cidade           ?? '',
          marcas:           meta.marcas           ?? '',
          foco:             meta.foco             ?? 'ambos',
          diferencial:      meta.diferencial      ?? '',
          formasPagamento:  meta.formasPagamento  ?? [],
          aceitaTroca:      meta.aceitaTroca      ?? false,
          condicaoTroca:    meta.condicaoTroca    ?? '',
          prazoEntrega:     meta.prazoEntrega     ?? '',
          validadeCampanha: meta.validadeCampanha ?? '',
          nomeAtendente:    meta.nomeAtendente    ?? '',
        })
      })
      .catch(() => {})
  }, [tenantSlug])

  const set = <K extends keyof Form>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function togglePagamento(fp: string) {
    setForm(f => ({
      ...f,
      formasPagamento: f.formasPagamento.includes(fp)
        ? f.formasPagamento.filter(x => x !== fp)
        : [...f.formasPagamento, fp],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveStatus('idle')
    try {
      const res = await fetch(`/api/${tenantSlug}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Atendimento ── */}
        <Card>
          <CardHeader><CardTitle>Atendimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessHoursStart">Horário de Abertura</Label>
                <Input id="businessHoursStart" value={form.businessHoursStart}
                  onChange={set('businessHoursStart')} placeholder="08:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessHoursEnd">Horário de Fechamento</Label>
                <Input id="businessHoursEnd" value={form.businessHoursEnd}
                  onChange={set('businessHoursEnd')} placeholder="18:00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evolutionInstanceName">Instância WhatsApp (Evolution API)</Label>
              <Input id="evolutionInstanceName" value={form.evolutionInstanceName}
                onChange={set('evolutionInstanceName')} placeholder="moto-teste" className="font-mono" />
            </div>
          </CardContent>
        </Card>

        {/* ── Sobre a Loja ── */}
        <Card>
          <CardHeader><CardTitle>🏦 Sobre a Loja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Em qual cidade/bairro fica sua loja?
              </Label>
              <Input value={form.cidade} onChange={set('cidade')}
                placeholder="Ex: Curitiba / Bairro Portão" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Quais marcas você trabalha?
              </Label>
              <Input value={form.marcas} onChange={set('marcas')}
                placeholder="Ex: Honda, Yamaha, Shineray" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Sua loja foca em qual segmento?
              </Label>
              <select value={form.foco} onChange={set('foco')} className={inp}>
                {FOCO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Qual é o grande diferencial da sua loja?
              </Label>
              <Textarea value={form.diferencial} onChange={set('diferencial')} rows={2}
                placeholder="Ex: Maior estoque da região, financiamento próprio, 20 anos no mercado..." />
            </div>
          </CardContent>
        </Card>

        {/* ── Políticas Comerciais ── */}
        <Card>
          <CardHeader><CardTitle>📋 Políticas Comerciais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">
                Quais formas de pagamento aceita?
              </Label>
              <div className="flex flex-wrap gap-2">
                {FORMAS_PAGAMENTO.map(fp => (
                  <label key={fp}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${form.formasPagamento.includes(fp) ? 'bg-primary/20 border-primary text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.formasPagamento.includes(fp)}
                      onChange={() => togglePagamento(fp)}
                      className="sr-only"
                    />
                    {fp}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">
                Aceita troca de moto?
              </Label>
              <div className="flex gap-3">
                {([true, false] as const).map(v => (
                  <label key={String(v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${form.aceitaTroca === v ? 'bg-primary/20 border-primary text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                  >
                    <input type="radio" checked={form.aceitaTroca === v}
                      onChange={() => setForm(f => ({ ...f, aceitaTroca: v }))}
                      className="sr-only"
                    />
                    {v ? 'Sim' : 'Não'}
                  </label>
                ))}
              </div>
            </div>
            {form.aceitaTroca && (
              <div>
                <Label className="text-muted-foreground text-sm mb-1 block">
                  Se sim, quais condições?
                </Label>
                <Textarea value={form.condicaoTroca} onChange={set('condicaoTroca')} rows={2}
                  placeholder="Ex: Aceitamos apenas motos até 5 anos e com documentação em dia..." />
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Qual o prazo de entrega para motos 0km?
              </Label>
              <Input value={form.prazoEntrega} onChange={set('prazoEntrega')}
                placeholder="Ex: até 7 dias úteis, entrega imediata, sob encomenda..." />
            </div>
          </CardContent>
        </Card>

        {/* ── Campanhas Ativas ── */}
        <Card>
          <CardHeader><CardTitle>📣 Campanhas Ativas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Tem alguma promoção ou campanha ativa agora?
              </Label>
              <Textarea value={form.currentCampaigns} onChange={set('currentCampaigns')} rows={3}
                placeholder="Ex: Feirão de motos — desconto de R$ 1.000 em todas as Honda até 30/03..." />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Válida até quando?
              </Label>
              <Input type="date" value={form.validadeCampanha} onChange={set('validadeCampanha')} />
            </div>
          </CardContent>
        </Card>

        {/* ── Tom de Voz ── */}
        <Card>
          <CardHeader><CardTitle>🎙 Tom de Voz da IA</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">
                Como a IA deve se comunicar com o cliente?
              </Label>
              <div className="flex gap-3">
                {TOM_OPTIONS.map(o => (
                  <label key={o.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${form.toneOfVoice === o.value ? 'bg-primary/20 border-primary text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                  >
                    <input type="radio" checked={form.toneOfVoice === o.value}
                      onChange={() => setForm(f => ({ ...f, toneOfVoice: o.value }))}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Como a IA deve se apresentar ao cliente?
              </Label>
              <Input value={form.nomeAtendente} onChange={set('nomeAtendente')}
                placeholder="Ex: Mavi da Moto Center, Ana da Central de Motos..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {saveStatus === 'success' && (
            <p className="text-sm text-emerald-500 font-medium">✓ Salvo com sucesso!</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-sm text-destructive">Erro ao salvar. Tente novamente.</p>
          )}
        </div>
      </form>
    </div>
  )
}