'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EditarMembroPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const userId = params.id as string

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappNotif: '',
    role: 'VENDEDOR',
  })

  useEffect(() => {
    fetch(`/api/${tenantSlug}/users`)
      .then(r => r.json())
      .then(d => {
        const user = (d.data ?? []).find((u: { id: string }) => u.id === userId)
        if (user) {
          setForm({
            name: user.name ?? '',
            email: user.email ?? '',
            phone: user.phone ?? '',
            whatsappNotif: user.whatsappNotif ?? '',
            role: user.role ?? 'VENDEDOR',
          })
        }
      })
      .catch(() => setError('Erro ao carregar dados do usuário'))
  }, [tenantSlug, userId])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/${tenantSlug}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          whatsappNotif: form.whatsappNotif,
          role: form.role,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Erro ao salvar')
        return
      }
      router.push(`/${tenantSlug}/equipe`)
    } catch {
      setError('Erro de conexão com o servidor')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!confirm('Desativar este membro? Ele não poderá mais fazer login.')) return
    setLoading(true)
    try {
      await fetch(`/api/${tenantSlug}/users/${userId}`, { method: 'DELETE' })
      router.push(`/${tenantSlug}/equipe`)
    } catch {
      setError('Erro ao desativar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Editar Membro</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados do Membro</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={form.name} onChange={set('name')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={form.email} disabled className="opacity-60 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">E-mail não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <select
                id="role"
                value={form.role}
                onChange={set('role')}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="VENDEDOR">Vendedor</option>
                <option value="GERENTE">Gerente</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappNotif">WhatsApp Notif</Label>
                <Input id="whatsappNotif" value={form.whatsappNotif} onChange={set('whatsappNotif')} placeholder="5511999999999" />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex gap-3 justify-between">
          <div className="flex gap-3">
            <Button type="submit" disabled={saving || loading} className="bg-primary hover:bg-primary/90">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/${tenantSlug}/equipe`)}>
              Cancelar
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={loading || saving}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {loading ? 'Desativando...' : 'Desativar Membro'}
          </Button>
        </div>
      </form>
    </div>
  )
}
