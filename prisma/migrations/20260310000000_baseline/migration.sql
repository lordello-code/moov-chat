-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'GERENTE', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LeadState" AS ENUM ('NOVO_LEAD', 'INTERESSADO', 'QUALIFICADO', 'NEGOCIANDO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_VISITA', 'VISITOU', 'PROPOSTA_ENVIADA', 'PERDIDO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "ConversationState" AS ENUM ('ATIVA_IA', 'AGUARDANDO_RESPOSTA_CLIENTE', 'AGUARDANDO_VENDEDOR', 'EM_ATENDIMENTO_HUMANO', 'PAUSADA', 'FINALIZADA', 'REATIVACAO_AGENDADA');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('ORQUESTRADOR', 'SDR', 'VENDEDOR_IA', 'QA', 'NOTIFICADOR_SLA');

-- CreateEnum
CREATE TYPE "MessageActorType" AS ENUM ('SDR_IA', 'VENDEDOR_IA', 'ORQUESTRADORA_IA', 'HUMANO_VENDEDOR', 'HUMANO_GERENTE', 'SISTEMA');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ON_ORDER', 'RESERVED');

-- CreateEnum
CREATE TYPE "MotorcycleCondition" AS ENUM ('EXCELLENT', 'GOOD', 'REGULAR', 'POOR');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SLA_VENDEDOR', 'SLA_GERENTE', 'SLA_VENDEDOR_10MIN', 'SLA_VENDEDOR_30MIN', 'SLA_GERENTE_1H', 'SLA_GERENTE_2H', 'LEAD_QUENTE', 'HANDOFF_PENDENTE', 'CONCORRENTE_DETECTADO', 'URGENCIA_DETECTADA', 'ERRO_QA', 'PRECO_PENDENTE', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ScheduledTaskType" AS ENUM ('FOLLOWUP_10MIN', 'FOLLOWUP_6H', 'FOLLOWUP_3DIAS', 'SLA_ALERT_10MIN', 'SLA_ALERT_30MIN', 'SLA_ALERT_1H', 'SLA_ALERT_2H', 'RELATORIO_DIARIO', 'REATIVACAO');

-- CreateEnum
CREATE TYPE "ScheduledTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PriceApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadDistributionType" AS ENUM ('ROUND_ROBIN', 'VENDEDOR_FIXO', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeadOrigin" AS ENUM ('WHATSAPP', 'MANUAL', 'IMPORTADO');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "maxLeadsPerMonth" INTEGER NOT NULL,
    "maxVendedores" INTEGER NOT NULL,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "razaoSocial" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ONBOARDING',
    "planId" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "evolutionInstanceName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "businessHoursStart" TEXT,
    "businessHoursEnd" TEXT,
    "businessDays" TEXT[],
    "leadDistributionType" "LeadDistributionType" NOT NULL DEFAULT 'ROUND_ROBIN',
    "policyPriceApproval" BOOLEAN NOT NULL DEFAULT false,
    "policyReservation" BOOLEAN NOT NULL DEFAULT false,
    "policyExchange" BOOLEAN NOT NULL DEFAULT false,
    "policyOnOrder" BOOLEAN NOT NULL DEFAULT false,
    "policyPixEnabled" BOOLEAN NOT NULL DEFAULT false,
    "policyPaymentWarning" TEXT,
    "policySecurityMessage" TEXT,
    "toneOfVoice" TEXT,
    "iaMaxConsecutiveMessages" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brands" TEXT[],
    "currentCampaigns" TEXT,
    "additionalPolicies" TEXT,
    "meta" JSONB,
    "completedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappNotif" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLeadAssignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "origin" "LeadOrigin" NOT NULL DEFAULT 'WHATSAPP',
    "state" "LeadState" NOT NULL DEFAULT 'NOVO_LEAD',
    "assignedVendedorId" TEXT,
    "assignedGerenteId" TEXT,
    "primaryInterest" TEXT,
    "notes" TEXT,
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "hasUrgency" BOOLEAN NOT NULL DEFAULT false,
    "mentionedCompetitor" BOOLEAN NOT NULL DEFAULT false,
    "lossReason" TEXT,
    "lossDetail" TEXT,
    "firstContactAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_assignments" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "reason" TEXT,

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "state" "ConversationState" NOT NULL DEFAULT 'ATIVA_IA',
    "currentAgent" "AgentType",
    "humanAttendantId" TEXT,
    "humanTookOverAt" TIMESTAMP(3),
    "humanSlaStartedAt" TIMESTAMP(3),
    "consecutiveIaMessages" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastClientMessageAt" TIMESTAMP(3),
    "lastIaMessageAt" TIMESTAMP(3),
    "lastHumanMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "actorType" "MessageActorType" NOT NULL,
    "actorId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "contentType" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "contentText" TEXT,
    "mediaUrl" TEXT,
    "mediaCaption" TEXT,
    "whatsappMsgId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_summaries" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "clientName" TEXT,
    "clientPhone" TEXT NOT NULL,
    "contactReason" TEXT,
    "modelInterest" TEXT,
    "answeredQuestions" TEXT,
    "urgencySignals" TEXT,
    "negotiationStatus" TEXT,
    "handoffReason" TEXT NOT NULL,
    "nextStepSuggested" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handoff_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_products_0km" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "displacement" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_products_0km_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_products_0km" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "globalProductId" TEXT NOT NULL,
    "modelYear" INTEGER,
    "color" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "imageUrls" TEXT[],
    "videoUrl" TEXT,
    "notes" TEXT,
    "campaignId" TEXT,
    "pendingPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_products_0km_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_motorcycles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "color" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "condition" "MotorcycleCondition" NOT NULL,
    "notes" TEXT,
    "imageUrls" TEXT[],
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_motorcycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "compatibility" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "campaignId" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotional_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eligibility" TEXT,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotional_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_approvals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentPrice" DECIMAL(10,2) NOT NULL,
    "proposedPrice" DECIMAL(10,2) NOT NULL,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "status" "PriceApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "agentType" "AgentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "promptBase" TEXT NOT NULL,
    "blockStoreContext" TEXT,
    "blockPolicies" TEXT,
    "blockSecurity" TEXT,
    "blockCampaigns" TEXT,
    "blockHandoff" TEXT,
    "blockToneOfVoice" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "conversationId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "conversationId" TEXT,
    "taskType" "ScheduledTaskType" NOT NULL,
    "executeAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledTaskStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "conversationId" TEXT,
    "userId" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "sentViaWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_whatsappPhone_key" ON "tenants"("whatsappPhone");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_evolutionInstanceName_key" ON "tenants"("evolutionInstanceName");

-- CreateIndex
CREATE UNIQUE INDEX "briefings_tenantId_key" ON "briefings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "leads_tenantId_isHot_idx" ON "leads"("tenantId", "isHot");

-- CreateIndex
CREATE INDEX "leads_assignedVendedorId_idx" ON "leads"("assignedVendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_tenantId_phone_key" ON "leads"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "lead_assignments_leadId_idx" ON "lead_assignments"("leadId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_idx" ON "conversations"("tenantId");

-- CreateIndex
CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_whatsappMsgId_key" ON "messages"("whatsappMsgId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_tenantId_idx" ON "messages"("tenantId");

-- CreateIndex
CREATE INDEX "handoff_summaries_conversationId_idx" ON "handoff_summaries"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "global_products_0km_brand_model_version_key" ON "global_products_0km"("brand", "model", "version");

-- CreateIndex
CREATE INDEX "tenant_products_0km_tenantId_idx" ON "tenant_products_0km"("tenantId");

-- CreateIndex
CREATE INDEX "used_motorcycles_tenantId_idx" ON "used_motorcycles"("tenantId");

-- CreateIndex
CREATE INDEX "accessories_tenantId_idx" ON "accessories"("tenantId");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_idx" ON "campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "promotional_items_tenantId_idx" ON "promotional_items"("tenantId");

-- CreateIndex
CREATE INDEX "price_approvals_tenantId_idx" ON "price_approvals"("tenantId");

-- CreateIndex
CREATE INDEX "prompt_configs_tenantId_idx" ON "prompt_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_configs_tenantId_agentType_version_key" ON "prompt_configs"("tenantId", "agentType", "version");

-- CreateIndex
CREATE INDEX "event_logs_tenantId_eventType_idx" ON "event_logs"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "event_logs_conversationId_idx" ON "event_logs"("conversationId");

-- CreateIndex
CREATE INDEX "scheduled_tasks_status_executeAt_idx" ON "scheduled_tasks"("status", "executeAt");

-- CreateIndex
CREATE INDEX "scheduled_tasks_tenantId_idx" ON "scheduled_tasks"("tenantId");

-- CreateIndex
CREATE INDEX "alerts_tenantId_isRead_idx" ON "alerts"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX "daily_reports_tenantId_idx" ON "daily_reports"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_tenantId_reportDate_key" ON "daily_reports"("tenantId", "reportDate");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedVendedorId_fkey" FOREIGN KEY ("assignedVendedorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedGerenteId_fkey" FOREIGN KEY ("assignedGerenteId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_humanAttendantId_fkey" FOREIGN KEY ("humanAttendantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_summaries" ADD CONSTRAINT "handoff_summaries_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_products_0km" ADD CONSTRAINT "tenant_products_0km_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_products_0km" ADD CONSTRAINT "tenant_products_0km_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "global_products_0km"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_products_0km" ADD CONSTRAINT "tenant_products_0km_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "used_motorcycles" ADD CONSTRAINT "used_motorcycles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotional_items" ADD CONSTRAINT "promotional_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotional_items" ADD CONSTRAINT "promotional_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_configs" ADD CONSTRAINT "prompt_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_configs" ADD CONSTRAINT "prompt_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

