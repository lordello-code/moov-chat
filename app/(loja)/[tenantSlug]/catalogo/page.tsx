'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────
interface GlobalProduct {
  id: string; brand: string; model: string
  version: string | null; displacement: number | null
}
interface TenantProduct0km {
  id: string; price: string; modelYear: number | null
  color: string | null; availability: string; notes: string | null
  globalProduct: GlobalProduct
}
interface UsedMotorcycle {
  id: string; brand: string; model: string; version: string | null
  year: number; mileage: number; color: string | null
  price: string; condition: string; availability: string; notes: string | null
}
type ActiveTab = '0km' | 'usadas'
type DialogState =
  | { type: 'none' }
  | { type: 'add-0km' }
  | { type: 'edit-0km'; item: TenantProduct0km }
  | { type: 'add-used' }
  | { type: 'edit-used'; item: UsedMotorcycle }

// ─── Constants ─────────────────────────────────────────────────────────────
const AVAILABILITY_OPTIONS = [
  { value: 'AVAILABLE',   label: 'Disponível'      },
  { value: 'ON_ORDER',    label: 'Sob encomenda'   },
  { value: 'RESERVED',    label: 'Reservada'       },
  { value: 'UNAVAILABLE', label: 'Indisponível'    },
]
const CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excelente' },
  { value: 'GOOD',      label: 'Bom'       },
  { value: 'REGULAR',   label: 'Regular'   },
  { value: 'POOR',      label: 'Ruim'      },
]
const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE:   'Disponível',
  ON_ORDER:    'Sob encomenda',
  RESERVED:    'Reservada',
  UNAVAILABLE: 'Indisponível',
}

// ─── Form defaults ──────────────────────────────────────────────────────────
const DEFAULT_0KM = { globalProductId: '', price: '', modelYear: String(new Date().getFullYear()), color: '', availability: 'AVAILABLE', notes: '' }
const DEFAULT_USED = { brand: '', model: '', version: '', year: String(new Date().getFullYear()), mileage: '', color: '', price: '', condition: 'GOOD', availability: 'AVAILABLE', notes: '' }

// ─── Component ──────────────────────────────────────────────────────────────
export default function CatalogoPage() {
  const { tenantSlug: slug } = useParams<{ tenantSlug: string }>()

  const [tab, setTab]                       = useState<ActiveTab>('0km')
  const [products0km, setProducts0km]       = useState<TenantProduct0km[]>([])
  const [usedMoto, setUsedMoto]             = useState<UsedMotorcycle[]>([])
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([])
  const [dialog, setDialog]                 = useState<DialogState>({ type: 'none' })
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [form0km, setForm0km]               = useState(DEFAULT_0KM)
  const [formUsed, setFormUsed]             = useState(DEFAULT_USED)

  useEffect(() => {
    fetch0km()
    fetchUsed()
    fetchGlobalProducts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function fetch0km() {
    const res = await fetch(`/api/${slug}/catalog/products-0km`)
    if (res.ok) { const { data } = await res.json(); setProducts0km(data) }
  }
  async function fetchUsed() {
    const res = await fetch(`/api/${slug}/catalog/used`)
    if (res.ok) { const { data } = await res.json(); setUsedMoto(data) }
  }
  async function fetchGlobalProducts() {
    const res = await fetch('/api/admin/global-products')
    if (res.ok) { const { data } = await res.json(); setGlobalProducts(data) }
  }

  function openAdd0km() {
    setForm0km(DEFAULT_0KM)
    setError('')
    setDialog({ type: 'add-0km' })
  }
  function openEdit0km(item: TenantProduct0km) {
    setForm0km({
      globalProductId: item.globalProduct.id,
      price:           item.price,
      modelYear:       item.modelYear?.toString() ?? '',
      color:           item.color ?? '',
      availability:    item.availability,
      notes:           item.notes ?? '',
    })
    setError('')
    setDialog({ type: 'edit-0km', item })
  }
  function openAddUsed() {
    setFormUsed(DEFAULT_USED)
    setError('')
    setDialog({ type: 'add-used' })
  }
  function openEditUsed(item: UsedMotorcycle) {
    setFormUsed({
      brand: item.brand, model: item.model, version: item.version ?? '',
      year: item.year.toString(), mileage: item.mileage.toString(),
      color: item.color ?? '', price: item.price,
      condition: item.condition, availability: item.availability, notes: item.notes ?? '',
    })
    setError('')
    setDialog({ type: 'edit-used', item })
  }

  async function submit(url: string, method: string, body: object, refresh: () => void) {
    setLoading(true); setError('')
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error: e } = await res.json()
        setError(e?.message ?? 'Erro ao salvar')
        return
      }
      refresh()
      setDialog({ type: 'none' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit0km(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      globalProductId: form0km.globalProductId,
      price:           Number(form0km.price),
      modelYear:       form0km.modelYear ? Number(form0km.modelYear) : null,
      color:           form0km.color || null,
      availability:    form0km.availability,
      notes:           form0km.notes || null,
    }
    const isEdit = dialog.type === 'edit-0km'
    const url    = isEdit
      ? `/api/${slug}/catalog/products-0km/${(dialog as { item: TenantProduct0km }).item.id}`
      : `/api/${slug}/catalog/products-0km`
    await submit(url, isEdit ? 'PUT' : 'POST', body, fetch0km)
  }

  async function handleSubmitUsed(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      brand:        formUsed.brand.trim(),
      model:        formUsed.model.trim(),
      version:      formUsed.version.trim() || null,
      year:         Number(formUsed.year),
      mileage:      Number(formUsed.mileage),
      color:        formUsed.color || null,
      price:        Number(formUsed.price),
      condition:    formUsed.condition,
      availability: formUsed.availability,
      notes:        formUsed.notes || null,
    }
    const isEdit = dialog.type === 'edit-used'
    const url    = isEdit
      ? `/api/${slug}/catalog/used/${(dialog as { item: UsedMotorcycle }).item.id}`
      : `/api/${slug}/catalog/used`
    await submit(url, isEdit ? 'PUT' : 'POST', body, fetchUsed)
  }

  // ─── Input class helper ─────────────────────────────────────────────────
  const inp = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <button
          onClick={tab === '0km' ? openAdd0km : openAddUsed}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <Plus size={16} />
          {tab === '0km' ? 'Adicionar 0km' : 'Adicionar Usada'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['0km', 'usadas'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === '0km' ? '🏍 0km' : '🔄 Usadas'}
          </button>
        ))}
      </div>

      {/* ── Tab 0km ── */}
      {tab === '0km' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Produto</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cor / Ano</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Preço</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Disponibilidade</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products0km.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-12">
                    Nenhum produto 0km cadastrado.
                  </td>
                </tr>
              )}
              {products0km.map(p => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium">
                    {p.globalProduct.brand} {p.globalProduct.model}
                    {p.globalProduct.version ? ` ${p.globalProduct.version}` : ''}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.color ?? '—'}{p.modelYear ? ` · ${p.modelYear}` : ''}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    R$ {Number(p.price).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.availability === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {AVAILABILITY_LABEL[p.availability] ?? p.availability}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit0km(p)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-border hover:bg-secondary"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab Usadas ── */}
      {tab === 'usadas' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Moto</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ano / KM</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Preço</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Condição</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Disponibilidade</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {usedMoto.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhuma moto usada cadastrada.
                  </td>
                </tr>
              )}
              {usedMoto.map(m => (
                <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium">
                    {m.brand} {m.model}{m.version ? ` ${m.version}` : ''}
                    {m.color ? ` · ${m.color}` : ''}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.year} · {m.mileage.toLocaleString('pt-BR')} km
                  </td>
                  <td className="px-4 py-3 font-medium">
                    R$ {Number(m.price).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CONDITION_OPTIONS.find(c => c.value === m.condition)?.label ?? m.condition}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.availability === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {AVAILABILITY_LABEL[m.availability] ?? m.availability}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditUsed(m)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-border hover:bg-secondary"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dialog Add/Edit 0km ── */}
      {(dialog.type === 'add-0km' || dialog.type === 'edit-0km') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {dialog.type === 'add-0km' ? 'Adicionar Moto 0km' : 'Editar Moto 0km'}
            </h2>
            <form onSubmit={handleSubmit0km} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Produto *</label>
                <select
                  required
                  className={inp}
                  value={form0km.globalProductId}
                  onChange={e => setForm0km(f => ({ ...f, globalProductId: e.target.value }))}
                >
                  <option value="">Selecione o modelo...</option>
                  {globalProducts.map(gp => (
                    <option key={gp.id} value={gp.id}>
                      {gp.brand} {gp.model}{gp.version ? ` ${gp.version}` : ''}{gp.displacement ? ` (${gp.displacement}cc)` : ''}
                    </option>
                  ))}
                </select>
                {globalProducts.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚠ Cadastre produtos no Admin → Catálogo Global antes.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Preço (R$) *</label>
                  <input
                    type="number" step="0.01" required className={inp}
                    value={form0km.price}
                    onChange={e => setForm0km(f => ({ ...f, price: e.target.value }))}
                    placeholder="14000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Ano</label>
                  <input
                    type="number" className={inp}
                    value={form0km.modelYear}
                    onChange={e => setForm0km(f => ({ ...f, modelYear: e.target.value }))}
                    placeholder="2024"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Cor</label>
                <input
                  className={inp} value={form0km.color}
                  onChange={e => setForm0km(f => ({ ...f, color: e.target.value }))}
                  placeholder="Azul Metálico"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Disponibilidade</label>
                <select
                  className={inp} value={form0km.availability}
                  onChange={e => setForm0km(f => ({ ...f, availability: e.target.value }))}
                >
                  {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Observações</label>
                <textarea
                  rows={2} className={`${inp} resize-none`} value={form0km.notes}
                  onChange={e => setForm0km(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Informações adicionais..."
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDialog({ type: 'none' })} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog Add/Edit Usada ── */}
      {(dialog.type === 'add-used' || dialog.type === 'edit-used') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {dialog.type === 'add-used' ? 'Adicionar Moto Usada' : 'Editar Moto Usada'}
            </h2>
            <form onSubmit={handleSubmitUsed} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Marca *</label>
                  <input required className={inp} value={formUsed.brand} onChange={e => setFormUsed(f => ({ ...f, brand: e.target.value }))} placeholder="Honda" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Modelo *</label>
                  <input required className={inp} value={formUsed.model} onChange={e => setFormUsed(f => ({ ...f, model: e.target.value }))} placeholder="Pop 110i" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Versão</label>
                <input className={inp} value={formUsed.version} onChange={e => setFormUsed(f => ({ ...f, version: e.target.value }))} placeholder="(opcional)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Ano *</label>
                  <input type="number" required className={inp} value={formUsed.year} onChange={e => setFormUsed(f => ({ ...f, year: e.target.value }))} placeholder="2021" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Quilometragem *</label>
                  <input type="number" required className={inp} value={formUsed.mileage} onChange={e => setFormUsed(f => ({ ...f, mileage: e.target.value }))} placeholder="18000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Cor</label>
                  <input className={inp} value={formUsed.color} onChange={e => setFormUsed(f => ({ ...f, color: e.target.value }))} placeholder="Preta" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Preço (R$) *</label>
                  <input type="number" step="0.01" required className={inp} value={formUsed.price} onChange={e => setFormUsed(f => ({ ...f, price: e.target.value }))} placeholder="7500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Condição</label>
                  <select className={inp} value={formUsed.condition} onChange={e => setFormUsed(f => ({ ...f, condition: e.target.value }))}>
                    {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Disponibilidade</label>
                  <select className={inp} value={formUsed.availability} onChange={e => setFormUsed(f => ({ ...f, availability: e.target.value }))}>
                    {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Observações</label>
                <textarea rows={2} className={`${inp} resize-none`} value={formUsed.notes} onChange={e => setFormUsed(f => ({ ...f, notes: e.target.value }))} placeholder="Revisada, única dona..." />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDialog({ type: 'none' })} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
