import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function MetricasPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  const { tenantSlug } = await params
  if (session.user.role === 'VENDEDOR') redirect(`/${tenantSlug}/fila`)

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) redirect('/auth/signin')

  const today = new Date()
  const from  = new Date(today.getFullYear(), today.getMonth(), 1) // 1º do mês
  const to    = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [totalLeads, byState, vendedores, hotLeads] = await Promise.all([
    prisma.lead.count({
      where: { tenantId: tenant.id, createdAt: { gte: from, lte: to } },
    }),
    prisma.lead.groupBy({
      by:     ['state'],
      where:  { tenantId: tenant.id, createdAt: { gte: from, lte: to } },
      _count: true,
    }),
    prisma.user.findMany({
      where:  { tenantId: tenant.id, role: 'VENDEDOR', status: 'ACTIVE' },
      select: {
        id: true, name: true,
        _count: { select: { assignedLeads: true } },
      },
    }),
    prisma.lead.count({
      where: { tenantId: tenant.id, isHot: true, createdAt: { gte: from, lte: to } },
    }),
  ])

  const stateMap = Object.fromEntries(byState.map(s => [s.state, s._count]))
  const sold  = stateMap['VENDIDO'] ?? 0
  const conversionRate = totalLeads > 0 ? ((sold / totalLeads) * 100).toFixed(1) : '0.0'

  const kpis = [
    { label: 'Leads Recebidos',  value: totalLeads,                   color: '' },
    { label: 'Leads Quentes',    value: hotLeads,                     color: 'text-primary' },
    { label: 'Vendas',           value: sold,                         color: 'text-emerald-400' },
    { label: 'Taxa Conversão',   value: `${conversionRate}%`,         color: '' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Métricas — {today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card rounded-lg border border-border p-4">
            <p className="text-muted-foreground text-sm">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color || ''}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Funil */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="font-medium mb-4">Funil de Vendas</h2>
        <div className="space-y-2">
          {[
            { label: 'Recebidos',       value: totalLeads },
            { label: 'Qualificados',    value: stateMap['QUALIFICADO']       ?? 0 },
            { label: 'Negociando',      value: stateMap['NEGOCIANDO']        ?? 0 },
            { label: 'Proposta Enviada',value: stateMap['PROPOSTA_ENVIADA']  ?? 0 },
            { label: 'Aguard. Visita',  value: stateMap['AGUARDANDO_VISITA'] ?? 0 },
            { label: 'Vendidos',        value: stateMap['VENDIDO']           ?? 0 },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm w-36">{item.label}</span>
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: totalLeads > 0 ? `${(item.value / totalLeads) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance vendedores */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="font-medium mb-4">Performance da Equipe</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left pb-2">Vendedor</th>
              <th className="text-right pb-2">Leads Atribuídos</th>
            </tr>
          </thead>
          <tbody>
            {vendedores
              .sort((a, b) => b._count.assignedLeads - a._count.assignedLeads)
              .map(v => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{v.name}</td>
                  <td className="py-2 text-right text-muted-foreground">{v._count.assignedLeads}</td>
                </tr>
              ))}
            {vendedores.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-muted-foreground">
                  Nenhum vendedor cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
