import { prisma } from '@/lib/prisma'

/**
 * Round-robin: retorna o ID do próximo vendedor disponível,
 * priorizando quem recebeu lead há mais tempo (lastLeadAssignedAt asc).
 */
export async function getNextVendedor(tenantId: string): Promise<string | null> {
  const vendedor = await prisma.user.findFirst({
    where: { tenantId, role: 'VENDEDOR', status: 'ACTIVE' },
    orderBy: [
      { lastLeadAssignedAt: 'asc' },
      { createdAt: 'asc' },
    ],
  })
  if (!vendedor) return null

  await prisma.user.update({
    where: { id: vendedor.id },
    data: { lastLeadAssignedAt: new Date() },
  })
  return vendedor.id
}
