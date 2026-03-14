-- AddIndex for Lead model
CREATE INDEX "leads_tenantId_state_idx" ON "leads"("tenantId", "state");

CREATE INDEX "leads_tenantId_state_updatedAt_idx" ON "leads"("tenantId", "state", "updatedAt");

-- AddIndex for Conversation model
CREATE INDEX "conversations_tenantId_state_idx" ON "conversations"("tenantId", "state");

CREATE INDEX "conversations_state_humanSlaStartedAt_idx" ON "conversations"("state", "humanSlaStartedAt");

-- AddIndex for Message model
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- AddIndex for Alert model
CREATE INDEX "alerts_tenantId_type_idx" ON "alerts"("tenantId", "type");
