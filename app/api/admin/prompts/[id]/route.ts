import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const prompt = await prisma.promptConfig.findUnique({
    where: { id },
    include: { tenant: { select: { name: true, slug: true } } },
  })
  if (!prompt) return notFound('Prompt')
  return ok(prompt)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const body = await req.json()

  if (body.reactivate === true) {
    const target = await prisma.promptConfig.findUnique({ where: { id } })
    if (!target) return notFound('Prompt')

    // Atomicamente: desativa ativos do mesmo (tenant, agentType), ativa o alvo
    const reactivated = await prisma.$transaction(async (tx) => {
      await tx.promptConfig.updateMany({
        where: {
          tenantId:  target.tenantId,
          agentType: target.agentType,
          isActive:  true,
        },
        data: { isActive: false },
      })
      return tx.promptConfig.update({
        where: { id },
        data:  { isActive: true },
      })
    })
    return ok(reactivated)
  }

  // Allowlist dos campos editáveis — nunca aceitar body raw
  const { promptBase, blockStoreContext, blockPolicies, blockSecurity,
          blockCampaigns, blockHandoff, blockToneOfVoice } = body
  const prompt = await prisma.promptConfig.update({
    where: { id },
    data: { promptBase, blockStoreContext, blockPolicies, blockSecurity,
            blockCampaigns, blockHandoff, blockToneOfVoice },
  })
  return ok(prompt)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  await prisma.promptConfig.update({
    where: { id },
    data: { isActive: false },
  })
  return ok({ message: 'Prompt desativado' })
}
