'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Eye, X, History } from 'lucide-react'

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

// ─── Monta o texto completo do prompt ────────────────────────────────────────────
function assemblePrompt(p: {
  promptBase: string
  blockStoreContext: string | null
  blockPolicies: string | null
  blockSecurity: string | null
  blockCampaigns: string | null
  blockHandoff: string | null
  blockToneOfVoice: string | null
}): string {
  const sections: string[] = [p.promptBase.trim()]
  const blocks: [string, string | null][] = [
    ['=== Contexto da Loja ===',     p.blockStoreContext],
    ['=== Políticas Comerciais ===', p.blockPolicies],
    ['=== Segurança ===',            p.blockSecurity],
    ['=== Campanhas Ativas ===',     p.blockCampaigns],
    ['=== Handoff ===',              p.blockHandoff],
    ['=== Tom de Voz ===',          p.blockToneOfVoice],
  ]
  for (const [header, content] of blocks) {
    if (content?.trim()) sections.push(`${header}\n${content.trim()}`)
  }
  return sections.join('\n\n')
}

export default function PromptsPage() {
  const [prompts, setPrompts]       = useState<Prompt[]>([])
  const [tenants, setTenants]       = useState<Tenant[]>([])
  const [selected, setSelected]     = useState<Prompt | null>(null)
  const [loading, setLoading]       = useState(false)
  const [showAll, setShowAll]       = useState(false)
  const [previewOpen, setPreview]   = useState(false)
  const [compareWith, setCompareWith]   = useState<Prompt | null>(null)
  const [compareOpen, setCompareOpen]   = useState(false)

  // Form state
  const [tenantId, setTenantId]             = useState('global')
  const [agentType, setAgentType]           = useState('SDR')
  const [promptBase, setPromptBase]         = useState('')
  const [blockStoreContext, setBlockStore]  = useState('')
  const [blockPolicies, setBlockPolicies]   = useState('')
  const [blockSecurity, setBlockSecurity]   = useState('')
  const [blockCampaigns, setBlockCampaigns] = useState('')
  const [blockHandoff, setBlockHandoff]     = useState('')
  const [blockToneOfVoice, setBlockTone]    = useState('')

  const fetchPrompts = useCallback(async () => {
    const url = showAll ? '/api/admin/prompts?showAll=true' : '/api/admin/prompts'
    const d = await fetch(url).then(r => r.json())
    setPrompts(d.data ?? [])
  }, [showAll])

  useEffect(() => {
    fetchPrompts()
    fetch('/api/admin/tenants').then(r => r.json()).then(d => setTenants(d.data?.data ?? []))
  }, [fetchPrompts])

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

  // Texto do preview (usa o estado atual do formulário)
  const previewText = assemblePrompt({
    promptBase, blockStoreContext, blockPolicies,
    blockSecurity, blockCampaigns, blockHandoff, blockToneOfVoice,
  })
  const charCount  = previewText.length
  const tokenEst   = Math.ceil(charCount / 4)

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
      fetchPrompts()
    } catch {
      toast.error('Erro ao salvar prompt')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Prompt desativado'); fetchPrompts() }
    else toast.error('Erro ao desativar')
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/admin/prompts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactivate: true }),
    })
    if (res.ok) { toast.success('Versão reativada'); fetchPrompts() }
    else toast.error('Erro ao reativar')
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuração de Prompts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Lista de prompts ── */}
        <div className="lg:col-span-1 space-y-3">
          {/* Toggle histórico */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Prompts
            </h2>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                className="rounded"
              />
              <History size={12} />
              Histórico
            </label>
          </div>

          {prompts.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Nenhum prompt configurado.</p>
          )}

          {prompts.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border bg-card p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                selected?.id === p.id ? 'border-primary' : 'border-border'
              }`}
              onClick={() => loadPrompt(p)}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-xs font-mono">{p.agentType}</Badge>
                <div className="flex items-center gap-1">
                  {p.isActive
                    ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Ativo</span>
                    : <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Inativo</span>
                  }
                  {!p.isActive && showAll && (() => {
                    const activeVersion = prompts.find(
                      ap => ap.isActive && ap.agentType === p.agentType && ap.tenantId === p.tenantId
                    )
                    if (!activeVersion) return null
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompareWith(p)
                          setCompareOpen(true)
                        }}
                        className="ml-1 text-xs text-primary hover:underline"
                      >
                        Comparar
                      </button>
                    )
                  })()}
                  <span className="text-xs text-muted-foreground">v{p.version}</span>
                </div>
              </div>
              <p className="text-sm font-medium">{p.tenant?.name ?? 'Global'}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.promptBase}</p>
              <div className="flex gap-2 mt-2">
                {p.isActive ? (
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs text-destructive hover:text-destructive h-6 px-2"
                    onClick={(e) => { e.stopPropagation(); handleDeactivate(p.id) }}
                  >
                    Desativar
                  </Button>
                ) : (
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs text-primary hover:text-primary h-6 px-2"
                    onClick={(e) => { e.stopPropagation(); handleReactivate(p.id) }}
                  >
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* ── Formulário ── */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {selected ? `Editando v${selected.version} — nova versão será criada` : 'Novo Prompt'}
            </h2>
            <div className="flex items-center gap-2">
              {promptBase && (
                <Button
                  variant="outline" size="sm"
                  className="text-xs gap-1"
                  onClick={() => setPreview(true)}
                >
                  <Eye size={12} /> Preview
                </Button>
              )}
              {selected && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs text-muted-foreground">
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Loja (tenant)</Label>
              <Select value={tenantId} onValueChange={(v) => setTenantId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
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
              <Select value={agentType} onValueChange={(v) => setAgentType(v ?? '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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

          <Button onClick={handleSave} disabled={loading} className="w-full bg-primary hover:bg-primary/90">
            {loading ? 'Salvando...' : 'Salvar Nova Versão'}
          </Button>
        </div>
      </div>
      {/* ── Dialog de Preview ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-semibold">Preview do Prompt Montado</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {charCount.toLocaleString('pt-BR')} caracteres · ~{tokenEst.toLocaleString('pt-BR')} tokens
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreview(false)}>
                <X size={16} />
              </Button>
            </div>
            <textarea
              readOnly
              value={previewText}
              className="flex-1 p-4 font-mono text-xs bg-secondary/30 resize-none focus:outline-none overflow-y-auto"
            />
          </div>
        </div>
      )}
      {/* ── Dialog de Comparação ── */}
      {compareOpen && compareWith && (() => {
        const activeVersion = prompts.find(
          ap => ap.isActive && ap.agentType === compareWith.agentType && ap.tenantId === compareWith.tenantId
        )
        const leftText  = activeVersion ? assemblePrompt(activeVersion) : '(sem versão ativa)'
        const rightText = assemblePrompt(compareWith)
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => { setCompareOpen(false); setCompareWith(null) }}
          >
            <div
              className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col gap-3 p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Comparar versões — {compareWith.agentType}
                  {activeVersion ? ` v${activeVersion.version} vs v${compareWith.version}` : ''}
                </h3>
                <button
                  onClick={() => { setCompareOpen(false); setCompareWith(null) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0">
                <div className="flex flex-col gap-1 overflow-hidden">
                  <p className="text-xs font-medium text-green-500">
                    ✅ Versão Ativa {activeVersion ? `(v${activeVersion.version})` : ''}
                  </p>
                  <pre className="flex-1 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap font-mono">
                    {leftText}
                  </pre>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  <p className="text-xs font-medium text-muted-foreground">
                    📜 Versão Histórica (v{compareWith.version})
                  </p>
                  <pre className="flex-1 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap font-mono">
                    {rightText}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}