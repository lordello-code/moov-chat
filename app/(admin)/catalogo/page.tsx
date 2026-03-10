'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'

interface GlobalProduct {
  id:           string
  brand:        string
  model:        string
  version:      string | null
  displacement: number | null
  isActive:     boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; product: GlobalProduct }

export default function AdminCatalogoPage() {
  const [products, setProducts] = useState<GlobalProduct[]>([])
  const [dialog, setDialog]     = useState<DialogState>({ type: 'none' })
  const [form, setForm]         = useState({ brand: '', model: '', version: '', displacement: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const res = await fetch('/api/admin/global-products')
    if (res.ok) {
      const { data } = await res.json()
      setProducts(data)
    }
  }

  function openAdd() {
    setForm({ brand: '', model: '', version: '', displacement: '' })
    setError('')
    setDialog({ type: 'add' })
  }

  function openEdit(product: GlobalProduct) {
    setForm({
      brand:        product.brand,
      model:        product.model,
      version:      product.version      ?? '',
      displacement: product.displacement?.toString() ?? '',
    })
    setError('')
    setDialog({ type: 'edit', product })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = {
        brand:        form.brand.trim(),
        model:        form.model.trim(),
        version:      form.version.trim()      || null,
        displacement: form.displacement        ? Number(form.displacement) : null,
      }
      const isEdit = dialog.type === 'edit'
      const url    = isEdit
        ? `/api/admin/global-products/${dialog.product.id}`
        : '/api/admin/global-products'
      const res = await fetch(url, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const { error: e } = await res.json()
        setError(e?.message ?? 'Erro ao salvar')
        return
      }
      await fetchProducts()
      setDialog({ type: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo Global</h1>
          <p className="text-muted-foreground text-sm">
            Produtos base que as lojas usam para montar seu catálogo 0km.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Marca</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Modelo</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Versão</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cilindrada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-12">
                  Nenhum produto cadastrado. Clique em &quot;Novo Produto&quot; para começar.
                </td>
              </tr>
            )}
            {products.map(p => (
              <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3 font-medium">{p.brand}</td>
                <td className="px-4 py-3">{p.model}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.version ?? '\u2014'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.displacement ? `${p.displacement}cc` : '\u2014'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(p)}
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

      {/* Dialog Add/Edit */}
      {dialog.type !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {dialog.type === 'add' ? 'Novo Produto Global' : 'Editar Produto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Marca *</label>
                <input
                  required
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="Honda"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Modelo *</label>
                <input
                  required
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="CG 160"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Versão</label>
                <input
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  placeholder="Titan / Fan / Start (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Cilindrada (cc)</label>
                <input
                  type="number"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.displacement}
                  onChange={e => setForm(f => ({ ...f, displacement: e.target.value }))}
                  placeholder="160"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialog({ type: 'none' })}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                >
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
