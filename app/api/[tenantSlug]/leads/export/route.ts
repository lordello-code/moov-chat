import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenantSlug } = await params
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow users of this tenant (or SUPER_ADMIN)
  if (session.user.tenantId !== tenant.id && session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      state: true,
      primaryInterest: true,
      leadScore: true,
      isHot: true,
      hasUrgency: true,
      mentionedCompetitor: true,
      lossReason: true,
      lossDetail: true,
      createdAt: true,
      assignedVendedor: { select: { name: true } },
    },
  })

  const escape = (v: string | null | undefined) => {
    if (v == null) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const headers = [
    'ID', 'Nome', 'Telefone', 'Estado', 'Interesse',
    'Score', 'Quente', 'Urgência', 'Citou Concorrente',
    'Motivo Perda', 'Detalhe Perda', 'Vendedor', 'Criado em',
  ]

  const rows = leads.map(l => [
    escape(l.id),
    escape(l.name),
    escape(l.phone),
    escape(l.state),
    escape(l.primaryInterest),
    escape(String(l.leadScore)),
    escape(l.isHot ? 'Sim' : 'Não'),
    escape(l.hasUrgency ? 'Sim' : 'Não'),
    escape(l.mentionedCompetitor ? 'Sim' : 'Não'),
    escape(l.lossReason),
    escape(l.lossDetail),
    escape(l.assignedVendedor?.name),
    escape(new Date(l.createdAt).toLocaleString('pt-BR')),
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
