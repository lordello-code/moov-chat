'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NovaLojaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    planId: '',
    gerenteNome: '',
    gerenteEmail: '',
    gerenteWhatsapp: '',
    email: '',
    phone: '',
    city: '',
    state: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Erro ao criar loja')
        return
      }
      router.push('/lojas')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Nova Loja</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados da Loja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={form.name} onChange={set('name')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug * <span className="text-muted-foreground text-xs">(URL única)</span></Label>
                <Input id="slug" value={form.slug} onChange={set('slug')} required pattern="[a-z0-9-]+" placeholder="minha-loja" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planId">Plan ID *</Label>
              <Input id="planId" value={form.planId} onChange={set('planId')} required placeholder="UUID do plano" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={form.city} onChange={set('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={form.state} onChange={set('state')} maxLength={2} placeholder="SP" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gerente Responsável</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gerenteNome">Nome *</Label>
              <Input id="gerenteNome" value={form.gerenteNome} onChange={set('gerenteNome')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gerenteEmail">E-mail *</Label>
                <Input id="gerenteEmail" type="email" value={form.gerenteEmail} onChange={set('gerenteEmail')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gerenteWhatsapp">WhatsApp</Label>
                <Input id="gerenteWhatsapp" value={form.gerenteWhatsapp} onChange={set('gerenteWhatsapp')} placeholder="5511999999999" />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">Senha inicial: <code className="bg-secondary px-1 rounded">mudar123</code></p>
          </CardContent>
        </Card>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
            {loading ? 'Criando...' : 'Criar Loja'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/lojas')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
