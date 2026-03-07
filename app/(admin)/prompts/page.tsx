'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Prompt = {
  id: string
  tenantId: string | null
  agentType: string
  version: number
  promptBase: string
  blockStoreContext: string | null
  blockPolicies: string | null
  blockSecurity: string | null
  blockCampaigns: string | null
  blockHandoff: string | null
  blockToneOfVoice: string | null
  isActive: boolean
  tenant: { name: string; slug: string } | null
}

type Tenant = { id: string; name: string; slug: string }

const AGENT_TYPES = ['SDR', 'VENDEDOR_IA', 'ORQUESTRADOR', 'QA', 'NOTIFICADOR_SLA']

export default function PromptsPage() {
  const [prompts, setPrompts]   = useState<Prompt[]>([])
  const [tenants, setTenants]   = useState<Tenant[]>([])
  const [selected, setSelected] = useState<Prompt | null>(null)
  const [loading, setLoading]   = useState(false)

  // Form state
  const [tenantId, setTenantId]               = useState('global')
  const [agentType, setAgentType]             = useState('SDR')
  const [promptBase, setPromptBase]           = useState('')
  const [blockStoreContext, setBlockStore]    = useState('')
  const [blockPolicies, setBlockPolicies]     = useState('')
  const [blockSecurity, setBlockSecurity]     = useState('')
  const [blockCampaigns, setBlockCampaigns]   = useState('')
  const [blockHandoff, setBlockHandoff]       = useState('')
  const [blockToneOfVoice, setBlockTone]      = useState('')

  useEffect(() => {
    fetch('/api/admin/prompts').then(r => r.json()).then(d => setPrompts(d.data ?? []))
    fetch('/api/admin/tenants').then(r => r.json()).then(d => setTenants(d.data ?? []))
  }, [])

  function loadPrompt(p: Prompt) {
    setSelected(p)
    setTenantId(p.tenantId ?? 'global')
    setAgentType(p.agentType)
    setPromptBase(p.promptBase)
    setBlockStore(p.blockStoreContext ?? '')
    setBlockPolicies(p.blockPolicies ?? '')
    setBlockSecurity(p.blockSecurity ?? '')
    setBlockCampaigns(p.blockCampaigns ?? '')
    setBlockHandoff(p.blockHandoff ?? '')
    setBlockTone(p.blockToneOfVoice ?? '')
  }

  function resetForm() {
    setSelected(null)
    setTenantId('global')
    setAgentType('SDR')
    setPromptBase('')
    setBlockStore('')
    setBlockPolicies('')
    setBlockSecurity('')
    setBlockCampaigns('')
    setBlockHandoff('')
    setBlockTone('')
  }

  async function handleSave() {
    if (!promptBase.trim()) { toast.error('Prompt base é obrigatório'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId === 'global' ? null : tenantId,
          agentType,
          promptBase,
          blockStoreContext: blockStoreContext || null,
          blockPolicies:     blockPolicies || null,
          blockSecurity:     blockSecurity || null,
          blockCampaigns:    blockCampaigns || null,
          blockHandoff:      blockHandoff || null,
          blockToneOfVoice:  blockToneOfVoice || null,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Prompt salvo com nova versão')
      resetForm()
      const updated = await fetch('/api/admin/prompts').then(r => r.json())
      setPrompts(updated.data ?? [])
    } catch {
      toast.error('Erro ao salvar prompt')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' })
    toast.success('Prompt desativado')
    const updated = await fetch('/api/admin/prompts').then(r => r.json())
    setPrompts(updated.data ?? [])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuração de Prompts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de prompts ativos */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Prompts Ativos</h2>
          {prompts.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Nenhum prompt configurado.</p>
          )}
          {prompts.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => loadPrompt(p)}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-xs font-mono">{p.agentType}</Badge>
                <span className="text-xs text-muted-foreground">v{p.version}</span>
              </div>
              <p className="text-sm font-medium">{p.tenant?.name ?? 'Global'}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.promptBase}</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive mt-2 h-6 px-2"
                onClick={(e) => { e.stopPropagation(); handleDeactivate(p.id) }}
              >
                Desativar
              </Button>
            </div>
          ))}
        </div>

        {/* Formulário de edição / criação */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {selected ? `Editando v${selected.version} — nova versão será criada` : 'Novo Prompt'}
            </h2>
            {selected && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs text-muted-foreground">
                Limpar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Loja (tenant)</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todas as lojas)</SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Tipo de Agente</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Prompt Base *</Label>
            <Textarea
              value={promptBase}
              onChange={e => setPromptBase(e.target.value)}
              rows={6}
              placeholder="Você é um assistente de vendas da loja..."
              className="font-mono text-sm resize-y"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Contexto da Loja', value: blockStoreContext,  set: setBlockStore    },
              { label: 'Políticas',        value: blockPolicies,      set: setBlockPolicies  },
              { label: 'Segurança',        value: blockSecurity,      set: setBlockSecurity  },
              { label: 'Campanhas',        value: blockCampaigns,     set: setBlockCampaigns },
              { label: 'Handoff',          value: blockHandoff,       set: setBlockHandoff   },
              { label: 'Tom de Voz',       value: blockToneOfVoice,   set: setBlockTone      },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-1">
                <Label className="text-muted-foreground text-xs">{label}</Label>
                <Textarea
                  value={value}
                  onChange={e => set(e.target.value)}
                  rows={2}
                  placeholder={`Bloco de ${label.toLowerCase()}...`}
                  className="font-mono text-xs resize-y"
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Versão'}
          </Button>
        </div>
      </div>
    </div>
  )
}
