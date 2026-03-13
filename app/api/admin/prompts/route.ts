import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'
import { AgentType } from '@prisma/client'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const tenantId  = searchParams.get('tenantId')
  const agentType = searchParams.get('agentType') as AgentType | null
  const showAll   = searchParams.get('showAll') === 'true'

  const prompts = await prisma.promptConfig.findMany({
    where: {
      ...(tenantId  ? { tenantId }  : {}),
      ...(agentType ? { agentType } : {}),
      ...(showAll   ? {}            : { isActive: true }),
    },
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: [{ tenantId: 'asc' }, { agentType: 'asc' }, { version: 'desc' }],
  })
  return ok(prompts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const { tenantId, agentType, promptBase, blockStoreContext, blockPolicies,
          blockSecurity, blockCampaigns, blockHandoff, blockToneOfVoice } = body

  // Desativar versão anterior
  await prisma.promptConfig.updateMany({
    where: { tenantId: tenantId ?? null, agentType, isActive: true },
    data:  { isActive: false },
  })

  // Calcular próxima versão
  const last = await prisma.promptConfig.findFirst({
    where: { tenantId: tenantId ?? null, agentType },
    orderBy: { version: 'desc' },
  })
  const version = (last?.version ?? 0) + 1

  const prompt = await prisma.promptConfig.create({
    data: {
      tenantId, agentType, version, promptBase,
      blockStoreContext, blockPolicies, blockSecurity,
      blockCampaigns, blockHandoff, blockToneOfVoice,
      isActive: true,
      createdById: session.user.id,
    },
  })
  return ok(prompt, 201)
}
